import { getCached, setCached } from "./cache";
import { engagementRate, parseISODuration, velocity } from "./metrics";
import type { Category, CommentItem, VideoItem } from "./types";

const API_BASE = "https://www.googleapis.com/youtube/v3";

/** 실제 소비된 YouTube 할당량(유닛)을 누적하는 출력 파라미터 */
export interface QuotaCost {
  units: number;
}

/** 엔드포인트별 유닛 비용 (search만 100, 나머지 1) */
function unitCost(path: string): number {
  return path === "search" ? 100 : 1;
}

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
  apiKey: string,
  cost?: QuotaCost
): Promise<T> {
  const url = new URL(`${API_BASE}/${path}`);
  url.searchParams.set("key", apiKey);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }

  // 호출 시점에 할당량이 소비되므로 요청 직전에 카운트
  if (cost) cost.units += unitCost(path);

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
  apiKey: string,
  cost?: QuotaCost
): Promise<Category[]> {
  const key = `categories:${regionCode}`;
  const hit = getCached<Category[]>(key);
  if (hit !== undefined) return hit; // 캐시 적중 → 할당량 0

  const data = await ytFetch<CategoryListResponse>(
    "videoCategories",
    { part: "snippet", regionCode },
    apiKey,
    cost
  );
  const result = data.items
    .filter((i) => i.snippet.assignable)
    .map((i) => ({ id: i.id, title: i.snippet.title }));
  // 카테고리는 거의 변하지 않으므로 24시간 캐시
  setCached(key, result, 24 * 60 * 60 * 1000);
  return result;
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

type RawVideo = VideoListResponse["items"][number];

/** 숏츠 판정 기준: 이 길이 이하(초)는 숏츠로 간주해 전 구간에서 제외 */
export const SHORTS_MAX_SEC = 60;

function isShorts(durationSec: number): boolean {
  // duration이 0인 경우(라이브 등)는 숏츠가 아님 → 유지
  return durationSec > 0 && durationSec <= SHORTS_MAX_SEC;
}

/** 원본 videos.list 항목을 VideoItem으로 정규화 */
function mapVideo(v: RawVideo): VideoItem {
  const views = Number(v.statistics?.viewCount || 0);
  const likes = Number(v.statistics?.likeCount || 0);
  const comments = Number(v.statistics?.commentCount || 0);
  return {
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
  };
}

/**
 * mostPopular 차트를 페이징하며 숏츠를 제외한 롱폼만 max개까지 수집.
 * (숏츠를 건너뛰므로 max를 채우려면 더 많은 페이지를 조회할 수 있음)
 */
async function collectPopular(
  regionCode: string,
  categoryId: string | undefined,
  max: number,
  apiKey: string,
  cost?: QuotaCost
): Promise<VideoItem[]> {
  const items: VideoItem[] = [];
  let pageToken: string | undefined;
  let pages = 0;
  const MAX_PAGES = 5; // mostPopular는 최대 ~200개 → 안전 상한

  while (items.length < max && pages < MAX_PAGES) {
    const data = await ytFetch<VideoListResponse>(
      "videos",
      {
        part: "snippet,statistics,contentDetails",
        chart: "mostPopular",
        regionCode,
        videoCategoryId: categoryId,
        maxResults: 50,
        pageToken,
      },
      apiKey,
      cost
    );
    pages++;

    for (const v of data.items) {
      const item = mapVideo(v);
      if (isShorts(item.durationSec)) continue; // 숏츠 제외
      items.push(item);
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
  apiKey: string,
  cost?: QuotaCost
): Promise<TrendingResult> {
  const key = `trending:${regionCode}:${categoryId || "all"}:${max}`;
  const hit = getCached<TrendingResult>(key);
  if (hit !== undefined) return hit; // 캐시 적중 → 할당량 0

  const result = await (async (): Promise<TrendingResult> => {
    if (!categoryId) {
      return {
        videos: await collectPopular(regionCode, undefined, max, apiKey, cost),
        fallback: false,
      };
    }
    try {
      // 1차: 카테고리 필터 차트 직접 요청 (지역이 지원하면 가장 정확)
      const videos = await collectPopular(regionCode, categoryId, max, apiKey, cost);
      return { videos, fallback: false };
    } catch (e) {
      // 일부 지역은 mostPopular + videoCategoryId 조합 미지원 → 404 notFound.
      // 이 경우 전체 급상승 차트를 넓게 가져와 해당 카테고리만 필터링.
      if (e instanceof YouTubeError && (e.reason === "notFound" || e.status === 404)) {
        const all = await collectPopular(regionCode, undefined, FALLBACK_SCAN, apiKey, cost);
        const videos = all.filter((v) => v.categoryId === categoryId).slice(0, max);
        return { videos, fallback: true };
      }
      throw e;
    }
  })();

  setCached(key, result, 10 * 60 * 1000);
  return result;
}

/* ----------------------- Curated: IT · 우주/천문 ----------------------- */

interface SearchResponse {
  items: { id: { videoId?: string } }[];
}

/**
 * 주제별 큐레이션 카테고리. 급상승 차트에는 이 주제가 거의 없어,
 * search.list로 키워드 기반 수집한 뒤 videos.list로 통계를 채우고 숏츠를 제외한다.
 *
 * 국가별로 결과가 달라지도록, 지역 언어에 맞는 검색어 + relevanceLanguage를 사용한다.
 * 지원 언어가 없으면 영어(en)로 폴백.
 *
 * 비용: search.list = 100유닛 + videos.list = 1유닛 (사용자 키 기준, 10분 캐시).
 */
export const CURATED_TOPICS = {
  it: {
    label: "IT",
    queries: {
      ko: "IT 인공지능 반도체 기술 리뷰 개발",
      en: "tech AI semiconductor gadget review software",
      ja: "IT テクノロジー AI 半導体 ガジェット レビュー",
      de: "Technik KI Halbleiter Gadget Test Software",
      fr: "tech IA intelligence artificielle semi-conducteur informatique",
      es: "tecnología IA inteligencia artificial chip review software",
      pt: "tecnologia IA inteligência artificial semicondutor review",
      ru: "технологии ИИ искусственный интеллект процессор обзор",
      "zh-Hant": "科技 人工智慧 半導體 評測 軟體",
      vi: "công nghệ AI trí tuệ nhân tạo chip đánh giá",
      id: "teknologi AI kecerdasan buatan semikonduktor ulasan",
    } as Record<string, string>,
  },
  space: {
    label: "우주/천문",
    queries: {
      ko: "우주 천문학 천체 망원경 NASA 블랙홀 우주탐사",
      en: "space astronomy universe telescope NASA black hole cosmos",
      ja: "宇宙 天文学 望遠鏡 NASA ブラックホール 銀河",
      de: "Weltraum Astronomie Universum Teleskop NASA schwarzes Loch",
      fr: "espace astronomie univers télescope NASA trou noir",
      es: "espacio astronomía universo telescopio NASA agujero negro",
      pt: "espaço astronomia universo telescópio NASA buraco negro",
      ru: "космос астрономия вселенная телескоп NASA чёрная дыра",
      "zh-Hant": "太空 天文學 宇宙 望遠鏡 NASA 黑洞",
      vi: "vũ trụ thiên văn học kính viễn vọng NASA hố đen",
      id: "luar angkasa astronomi alam semesta teleskop NASA lubang hitam",
    } as Record<string, string>,
  },
} as const;

export type CuratedTopic = keyof typeof CURATED_TOPICS;

export function isCuratedTopic(v: string): v is CuratedTopic {
  return v in CURATED_TOPICS;
}

/** 지역(regionCode) → 검색 언어(relevanceLanguage) 매핑. 미지정 지역은 영어. */
const LANG_BY_REGION: Record<string, string> = {
  KR: "ko",
  JP: "ja",
  DE: "de",
  FR: "fr",
  BR: "pt",
  MX: "es",
  RU: "ru",
  TW: "zh-Hant",
  VN: "vi",
  ID: "id",
  US: "en",
  GB: "en",
  CA: "en",
  AU: "en",
  IN: "en",
};

export async function fetchCurated(
  regionCode: string,
  topic: CuratedTopic,
  max: number,
  apiKey: string,
  cost?: QuotaCost
): Promise<TrendingResult> {
  const key = `curated:${topic}:${regionCode}:${max}`;
  const hit = getCached<TrendingResult>(key);
  if (hit !== undefined) return hit; // 캐시 적중 → 할당량 0

  // 최근 90일 내 영상으로 한정해 "소식" 성격 유지
  const publishedAfter = new Date(
    Date.now() - 90 * 24 * 60 * 60 * 1000
  ).toISOString();

  const lang = LANG_BY_REGION[regionCode] || "en";
  const queries = CURATED_TOPICS[topic].queries;
  const q = queries[lang] || queries.en;

  const search = await ytFetch<SearchResponse>(
    "search",
    {
      part: "snippet",
      type: "video",
      q,
      regionCode,
      relevanceLanguage: lang,
      publishedAfter,
      maxResults: 50,
    },
    apiKey,
    cost
  );

  const ids = search.items
    .map((i) => i.id.videoId)
    .filter((v): v is string => Boolean(v));
  if (ids.length === 0) {
    const empty = { videos: [], fallback: false };
    setCached(key, empty, 10 * 60 * 1000);
    return empty;
  }

  // 검색 결과 ID로 통계/길이 보강
  const detail = await ytFetch<VideoListResponse>(
    "videos",
    {
      part: "snippet,statistics,contentDetails",
      id: ids.join(","),
      maxResults: 50,
    },
    apiKey,
    cost
  );

  const videos = detail.items
    .map(mapVideo)
    .filter((v) => !isShorts(v.durationSec)) // 숏츠 제외
    .sort((a, b) => b.views - a.views)
    .slice(0, max);

  const result = { videos, fallback: false };
  setCached(key, result, 10 * 60 * 1000);
  return result;
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
  apiKey: string,
  cost?: QuotaCost
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
      apiKey,
      cost
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
