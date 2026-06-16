import { addQuota } from "./quota";

/**
 * SWR 공용 fetcher. 키 배열 [url, apiKey]을 받아 헤더로 API 키를 전달한다.
 * 키를 SWR 키에 포함시켜, 키가 바뀌면 자동으로 재요청되도록 한다.
 * 응답 헤더로 할당량 사용량을 누적한다 (CDN 캐시 적중分은 제외).
 */
export const keyedFetcher = async ([url, apiKey]: [string, string]) => {
  const res = await fetch(url, {
    headers: apiKey ? { "x-youtube-api-key": apiKey } : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "요청에 실패했습니다.");
  }
  // CDN(Vercel Edge) 적중이면 YouTube를 호출하지 않았으므로 할당량 0
  const vercelCache = res.headers.get("x-vercel-cache");
  const servedFromCdn = vercelCache === "HIT" || vercelCache === "STALE";
  const cost = servedFromCdn
    ? 0
    : Number(res.headers.get("x-yt-quota-cost") || 0);
  addQuota(cost);
  return data;
};
