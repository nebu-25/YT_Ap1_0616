/**
 * ISO 8601 duration(PT#H#M#S)을 초 단위로 변환.
 * 예: "PT1H2M10S" -> 3730, "PT45S" -> 45, "PT0S" -> 0
 */
export function parseISODuration(iso: string | undefined | null): number {
  if (!iso) return 0;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  const h = Number(m[1] || 0);
  const min = Number(m[2] || 0);
  const s = Number(m[3] || 0);
  return h * 3600 + min * 60 + s;
}

/** engagement rate = (likes + comments) / views (views=0이면 0) */
export function engagementRate(
  likes: number,
  comments: number,
  views: number
): number {
  if (!views) return 0;
  return (likes + comments) / views;
}

/** velocity = 조회수 / 업로드 후 경과 시간(시간). 최소 1시간으로 클램프해 초신영상 폭주 방지. */
export function velocity(views: number, publishedAt: string): number {
  const published = new Date(publishedAt).getTime();
  if (Number.isNaN(published)) return 0;
  const hours = Math.max(1, (Date.now() - published) / 3_600_000);
  return views / hours;
}

/** 초 -> "1:02:10" / "5:09" 형태 */
export function formatDuration(sec: number): string {
  if (!sec) return "0:00";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** 큰 수를 1.2만 / 3.4천만 형태로 (한국어) */
export function formatCount(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`;
  if (n >= 10_000) return `${(n / 10_000).toFixed(1)}만`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}천`;
  return String(n);
}

/** 0.0123 -> "1.23%" */
export function formatPercent(ratio: number): string {
  return `${(ratio * 100).toFixed(2)}%`;
}
