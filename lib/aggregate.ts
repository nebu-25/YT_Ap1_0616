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

/**
 * 한글 자모만으로 이뤄진 토큰(ㅋㅋㅋ·ㅎㅎ·ㅠㅠ 등 웃음/감탄)을 판별.
 * 완성형 음절(가-힣)이 없고 호환/조합 자모(U+1100–11FF, U+3130–318F)만 있으면 노이즈로 본다.
 */
const JAMO_ONLY = new RegExp(
  "^[\\u1100-\\u11FF\\u3130-\\u318F\\uA960-\\uA97F\\uD7B0-\\uD7FF]+$"
);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ") // URL 제거
    // 유니코드 문자/숫자만 토큰으로 분리 (한글·라틴·키릴·CJK 등 지원).
    // 참고: 일본어·중국어는 공백이 없어 형태소 분석 없이 런(run) 단위로 묶인다.
    .split(/[^\p{L}\p{N}]+/u)
    .map((t) => t.trim())
    .filter(
      (t) =>
        t.length >= 2 &&
        !STOPWORDS.has(t) &&
        !/^\d+$/.test(t) &&
        !JAMO_ONLY.test(t)
    );
}

/** 댓글에서만 추가로 거르는 흔한 필러/관용어 (영상 제목 집계에는 미적용) */
const COMMENT_STOPWORDS = new Set([
  // en
  "lol", "lmao", "lmfao", "omg", "haha", "hahaha", "wow", "yeah", "yes", "no",
  "pls", "plz", "bro",
  // ko
  "이거", "그거", "저거", "이건", "그건", "저건", "근데", "그래서", "그래도",
  "역시", "완전", "약간", "그치", "ㅋㅋ", "ㅎㅎ", "구독", "좋아요", "감사합니다",
  "감사해요", "최고", "사랑해요",
]);

/** 댓글 본문 토큰의 빈도 TopN (한 댓글 내 중복 토큰은 1회만 카운트) */
export function commentKeywordFrequency(
  comments: CommentItem[],
  topN = 16
): CountDatum[] {
  const map = new Map<string, number>();
  for (const c of comments) {
    const tokens = tokenize(c.text).filter((t) => !COMMENT_STOPWORDS.has(t));
    for (const t of new Set(tokens)) {
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
