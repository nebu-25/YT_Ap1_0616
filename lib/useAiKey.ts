"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "yt_ai_key";

/**
 * 사용자의 Gemini API 키를 브라우저 localStorage에 보관하는 훅.
 * AI 분석 기능에만 쓰이는 선택 키 — 입력하지 않아도 나머지 기능은 동작한다.
 * 키는 서버에 영구 저장되지 않고, 요청 시 헤더(x-ai-api-key)로만 전달된다.
 */
export function useAiKey() {
  const [aiKey, setAiKeyState] = useState<string>("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      setAiKeyState(localStorage.getItem(STORAGE_KEY) || "");
    } catch {
      /* localStorage 미지원 환경 무시 */
    }
    setLoaded(true);
  }, []);

  const setAiKey = useCallback((raw: string) => {
    const value = raw.trim();
    setAiKeyState(value);
    try {
      if (value) localStorage.setItem(STORAGE_KEY, value);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  return { aiKey, setAiKey, loaded };
}
