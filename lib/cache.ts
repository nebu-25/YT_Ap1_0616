/**
 * 아주 단순한 인메모리 TTL 캐시.
 * Next.js dev/serverless에서 모듈 스코프로 유지되며, API 할당량 절약이 목적.
 * (영속성이 필요하면 추후 Redis 등으로 교체)
 */
interface Entry<T> {
  value: T;
  expires: number;
}

const store = new Map<string, Entry<unknown>>();

export function getCached<T>(key: string): T | undefined {
  const e = store.get(key);
  if (!e) return undefined;
  if (Date.now() > e.expires) {
    store.delete(key);
    return undefined;
  }
  return e.value as T;
}

export function setCached<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expires: Date.now() + ttlMs });
}
