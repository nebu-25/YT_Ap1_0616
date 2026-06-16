import { withCache } from "./cache";
import { engagementRate, parseISODuration, velocity } from "./metrics";
import type { Category, CommentItem, VideoItem } from "./types";

const API_BASE = "https://www.googleapis.com/youtube/v3";

/** YouTube API 호출 시 발생하는 정규화된 에러. reason으로 클라이언트 메시지 분기. */
export class YouTubeError extends Error {
  reason: string;
  status: number;
  constructor(message: string, reason: string, status: number) {
    super(message);
    this.name = "YouTubeError";
    this.reason = reason;
    this.status = status;
  }
}

interface YTErrorBody {
  error?: {
    code?: number;
    message?: string;
    errors?: { reason?: string }[];
  };
}

async function ytFetch<T>(
  path: string,
  params: Record<string, string | number | undefined>,
  apiKey: string
): Promise<T> {
  const url = new URL(`${API_BASE}/${path}`);
  url.searchParams.set("key", apiKey);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    let body: YTErrorBody = {};
    try {
      body = (await res.json()) as YTErrorBody;
    } catch {
      /* ignore parse errors */
    }
    const reason = body.error?.errors?.[0]?.reason || "unknown";
    const message = body.error?.message || `요청 실패 (${res.status})`;
    throw new YouTubeError(message, reason, res.status);
  }
  return (await res.json()) as T;
}

/* ----------------------------- Categories ----------------------------- */

interface CategoryListResponse {
  items: {
    id: string;
    snippet: { title: string; assignable: boolean };
  }[];
}

export async function fetchCategories(
  regionCode: string,
  apiKey: string
): Promise<Category[]> {
  const key = `categories:${regionCode}`;
  // 카테고리는 거의 변하지 않으므로 24시간 캐시
  return withCache(key, 24 * 60 * 60 * 1000, async () => {
    const data = await ytFetch<CategoryListResponse>(
      "videoCategories",
      { part: "snippet", regionCode },
      apiKey
    );
    return data.items
      .filter((i) => i.snippet.assignable)
      .map((i) => ({ id: i.id, title: i.snippet.title }));
  });
}

/* ------------------------------ Trending ------------------------------ */

interface VideoListResponse {
  nextPageToken?: string;
  items: {
    id: string;
    snippet: {
      title: string;
      description: string;
      channelId: string;
      channelTitle: string;
      categoryId: string;
      publishedAt: string;
      tags?: string[];
      thumbnails: Record<string, { url: string } | undefined>;
    };
    statistics: {
      viewCount?: string;
      likeCount?: string;
      commentCount?: string;
    };
    contentDetails: { duration: string };
  }[];
}

function pickThumb(
  thumbs: Record<string, { url: string } | undefined>
): string {
  return (
    thumbs.medium?.url ||
    thumbs.high?.url ||
    thumbs.standard?.url ||
    thumbs.default?.url ||
    ""
  );
}

/** mostPopular 차트를 max개까지 페이징 수집 (categoryId 지정 가능) */
async function collectPopular(
  regionCode: string,
  categoryId: string | undefined,
  max: number,
  apiKey: string
): Promise<VideoItem[]> {
  const items: VideoItem[] = [];
  let pageToken: string | undefined;

  while (items.length < max) {
    const remaining = max - items.length;
    const data = await ytFetch<VideoListResponse>(
      "videos",
      {
        part: "snippet,statistics,contentDetails",
        chart: "mostPopular",
        regionCode,
        videoCategoryId: categoryId,
        maxResults: Math.min(50, remaining),
        pageToken,
      },
      apiKey
    );

    for (const v of data.items) {
      const views = Number(v.statistics.viewCount || 0);
      const likes = Number(v.statistics.likeCount || 0);
      const comments = Number(v.statistics.commentCount || 0);
      items.push({
        id: v.id,
        title: v.snippet.title,
        description: v.snippet.description,
        channelId: v.snippet.channelId,
        channelTitle: v.snippet.channelTitle,
        categoryId: v.snippet.categoryId,
        publishedAt: v.snippet.publishedAt,
        thumbnail: pickThumb(v.snippet.thumbnails),
        tags: v.snippet.tags || [],
        views,
        likes,
        comments,
        durationSec: parseISODuration(v.contentDetails?.duration),
        engagementRate: engagementRate(likes, comments, views),
        velocity: velocity(views, v.snippet.publishedAt),
        videoUrl: `https://www.youtube.com/watch?v=${v.id}`,
        channelUrl: `https://www.youtube.com/channel/${v.snippet.channelId}`,
      });
    }

    if (!data.nextPageToken || data.items.length === 0) break;
    pageToken = data.nextPageToken;
  }

  return items.slice(0, max);
}

export interface TrendingResult {
  videos: VideoItem[];
  /** categoryId 차트가 미지원이라 전체 급상승에서 필터링한 경우 true */
  fallback: boolean;
}

// 카테고리 필터 미지원 시 전체 차트에서 스캔할 최대 개수
const FALLBACK_SCAN = 200;

export async function fetchTrending(
  regionCode: string,
  categoryId: string | undefined,
  max: number,
  apiKey: string
): Promise<TrendingResult> {
  const key = `trending:${regionCode}:${categoryId || "all"}:${max}`;
  return withCache(key, 10 * 60 * 1000, async () => {
    if (!categoryId) {
      return {
        videos: await collectPopular(regionCode, undefined, max, apiKey),
        fallback: false,
      };
    }

    try {
      // 1차: 카테고리 필터 차트 직접 요청 (지역이 지원하면 가장 정확)
      const videos = await collectPopular(regionCode, categoryId, max, apiKey);
      return { videos, fallback: false };
    } catch (e) {
      // 일부 지역은 mostPopular + videoCategoryId 조합 미지원 → 404 notFound.
      // 이 경우 전체 급상승 차트를 넓게 가져와 해당 카테고리만 필터링.
      if (e instanceof YouTubeError && (e.reason === "notFound" || e.status === 404)) {
        const all = await collectPopular(regionCode, undefined, FALLBACK_SCAN, apiKey);
        const videos = all.filter((v) => v.categoryId === categoryId).slice(0, max);
        return { videos, fallback: true };
      }
      throw e;
    }
  });
}

/* ------------------------------ Comments ------------------------------ */

interface CommentThreadResponse {
  items: {
    id: string;
    snippet: {
      totalReplyCount: number;
      topLevelComment: {
        snippet: {
          authorDisplayName: string;
          authorProfileImageUrl: string;
          textDisplay: string;
          likeCount: number;
          publishedAt: string;
        };
      };
    };
  }[];
}

export async function fetchComments(
  videoId: string,
  order: "relevance" | "time",
  max: number,
  apiKey: string
): Promise<{ disabled: boolean; items: CommentItem[] }> {
  try {
    const data = await ytFetch<CommentThreadResponse>(
      "commentThreads",
      {
        part: "snippet",
        videoId,
        order,
        maxResults: Math.min(100, max),
        textFormat: "plainText",
      },
      apiKey
    );
    const items: CommentItem[] = data.items.map((t) => {
      const c = t.snippet.topLevelComment.snippet;
      return {
        id: t.id,
        author: c.authorDisplayName,
        authorImage: c.authorProfileImageUrl,
        text: c.textDisplay,
        likes: c.likeCount,
        publishedAt: c.publishedAt,
        replyCount: t.snippet.totalReplyCount,
      };
    });
    return { disabled: false, items };
  } catch (e) {
    // 댓글이 비활성화된 영상은 403 commentsDisabled 반환 → 에러 대신 안내로 변환
    if (e instanceof YouTubeError && e.reason === "commentsDisabled") {
      return { disabled: true, items: [] };
    }
    throw e;
  }
}
