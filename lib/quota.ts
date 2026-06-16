"use client";

import { useSyncExternalStore } from "react";

/**
 * 이번 세션의 추정 할당량 사용량(유닛) 스토어.
 * 서버가 X-Yt-Quota-Cost 헤더로 실제 소비량을 알려주고,
 * Vercel CDN 적중(x-vercel-cache: HIT/STALE)은 0으로 계산한다.
 */
let used = 0;
const listeners = new Set<() => void>();

export function addQuota(n: number): void {
  if (!n) return;
  used += n;
  listeners.forEach((l) => l());
}

function getSnapshot(): number {
  return used;
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useQuotaUsed(): number {
  return useSyncExternalStore(subscribe, getSnapshot, () => 0);
}
