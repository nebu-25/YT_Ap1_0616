/**
 * SWR 공용 fetcher. 키 배열 [url, apiKey]을 받아 헤더로 API 키를 전달한다.
 * 키를 SWR 키에 포함시켜, 키가 바뀌면 자동으로 재요청되도록 한다.
 */
export const keyedFetcher = async ([url, apiKey]: [string, string]) => {
  const res = await fetch(url, {
    headers: apiKey ? { "x-youtube-api-key": apiKey } : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "요청에 실패했습니다.");
  }
  return data;
};
