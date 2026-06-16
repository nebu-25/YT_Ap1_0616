"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "yt_api_key";

/**
 * 사용자의 YouTube API 키를 브라우저 localStorage에 보관하는 훅.
 * 키는 서버에 영구 저장되지 않고, 요청 시 헤더로만 전달된다.
 */
export function useApiKey() {
  const [apiKey, setApiKeyState] = useState<string>("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      setApiKeyState(localStorage.getItem(STORAGE_KEY) || "");
    } catch {
      /* localStorage 미지원 환경 무시 */
    }
    setLoaded(true);
  }, []);

  const setApiKey = useCallback((raw: string) => {
    const value = raw.trim();
    setApiKeyState(value);
    try {
      if (value) localStorage.setItem(STORAGE_KEY, value);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  return { apiKey, setApiKey, loaded };
}
