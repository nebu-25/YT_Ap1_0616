import type { Category, CommentItem, VideoItem } from "./types";

export interface CountDatum {
  name: string;
  count: number;
}

/** 한/영 기본 불용어 + 자주 등장하는 무의미 토큰 */
const STOPWORDS = new Set([
  // en
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with", "is",
  "it", "this", "that", "you", "your", "my", "we", "i", "at", "by", "from",
  "vs", "feat", "ft", "official", "video", "mv", "hd", "full", "ep", "part",
  // ko (조사/흔한 단어)
  "그리고", "그러나", "하지만", "그냥", "진짜", "정말", "너무", "오늘",
  "영상", "공식", "최신", "라이브", "다시보기", "모음", "shorts", "쇼츠",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    // 한글/영문/숫자만 남기고 구분
    .split(/[^0-9a-z가-힣]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t) && !/^\d+$/.test(t));
}

/** 댓글 본문 토큰의 빈도 TopN (한 댓글 내 중복 토큰은 1회만 카운트) */
export function commentKeywordFrequency(
  comments: CommentItem[],
  topN = 16
): CountDatum[] {
  const map = new Map<string, number>();
  for (const c of comments) {
    for (const t of new Set(tokenize(c.text))) {
      map.set(t, (map.get(t) || 0) + 1);
    }
  }
  return toSortedTop(map, topN);
}

/** 채널 등장 빈도 TopN */
export function channelFrequency(videos: VideoItem[], topN = 12): CountDatum[] {
  const map = new Map<string, number>();
  for (const v of videos) {
    map.set(v.channelTitle, (map.get(v.channelTitle) || 0) + 1);
  }
  return toSortedTop(map, topN);
}

/** 제목 + 태그 토큰의 빈도 TopN */
export function keywordFrequency(videos: VideoItem[], topN = 20): CountDatum[] {
  const map = new Map<string, number>();
  for (const v of videos) {
    const tokens = [
      ...tokenize(v.title),
      ...v.tags.flatMap((t) => tokenize(t)),
    ];
    // 한 영상 내 중복 토큰은 1회만 카운트
    for (const t of new Set(tokens)) {
      map.set(t, (map.get(t) || 0) + 1);
    }
  }
  return toSortedTop(map, topN);
}

/** 카테고리 분포 (categoryId -> title 매핑) */
export function categoryDistribution(
  videos: VideoItem[],
  categories: Category[]
): CountDatum[] {
  const titleById = new Map(categories.map((c) => [c.id, c.title]));
  const map = new Map<string, number>();
  for (const v of videos) {
    const name = titleById.get(v.categoryId) || `기타(${v.categoryId})`;
    map.set(name, (map.get(name) || 0) + 1);
  }
  return toSortedTop(map, 50);
}

/** 길이 버킷 분포 (숏츠는 수집 단계에서 제외됨): 중간(1~20분) / 롱폼(>20분) */
export function lengthDistribution(videos: VideoItem[]): CountDatum[] {
  const buckets = { "중간 (1~20분)": 0, "롱폼 (>20분)": 0 };
  for (const v of videos) {
    if (v.durationSec <= 20 * 60) buckets["중간 (1~20분)"]++;
    else buckets["롱폼 (>20분)"]++;
  }
  return Object.entries(buckets).map(([name, count]) => ({ name, count }));
}

/** 업로드 시간대(0~23시, 뷰어 로컬 시간대) 히스토그램 */
export function uploadHourDistribution(videos: VideoItem[]): CountDatum[] {
  const hours = new Array(24).fill(0);
  for (const v of videos) {
    const h = new Date(v.publishedAt).getHours();
    if (!Number.isNaN(h)) hours[h]++;
  }
  return hours.map((count, h) => ({ name: `${h}시`, count }));
}

function toSortedTop(map: Map<string, number>, topN: number): CountDatum[] {
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}
