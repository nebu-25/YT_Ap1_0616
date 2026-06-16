"use client";

import { useEffect, useState } from "react";

interface Props {
  apiKey: string;
  onSave: (key: string) => void;
}

export default function ApiKeyBar({ apiKey, onSave }: Props) {
  const [editing, setEditing] = useState(!apiKey);
  const [draft, setDraft] = useState(apiKey);

  // 외부에서 키가 로드되면 입력창 동기화
  useEffect(() => {
    setDraft(apiKey);
    setEditing(!apiKey);
  }, [apiKey]);

  if (!editing) {
    return (
      <div className="apikey-bar">
        <span className="apikey-status ok">● 키 저장됨</span>
        <span className="apikey-mask">{maskKey(apiKey)}</span>
        <button className="btn ghost" onClick={() => setEditing(true)}>
          변경
        </button>
        <button
          className="btn ghost"
          onClick={() => {
            onSave("");
            setDraft("");
          }}
        >
          지우기
        </button>
      </div>
    );
  }

  return (
    <div className="apikey-bar">
      <span className="apikey-status warn">● API 키 필요</span>
      <input
        type="password"
        autoComplete="off"
        placeholder="YouTube Data API v3 키를 입력하세요"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && draft.trim()) onSave(draft);
        }}
        style={{ minWidth: 280 }}
      />
      <button
        className="btn accent"
        disabled={!draft.trim()}
        onClick={() => onSave(draft)}
      >
        저장
      </button>
      <a
        className="apikey-help"
        href="https://console.cloud.google.com/apis/library/youtube.googleapis.com"
        target="_blank"
        rel="noreferrer"
      >
        키 발급 방법 ↗
      </a>
    </div>
  );
}

function maskKey(key: string): string {
  if (key.length <= 8) return "••••";
  return `${key.slice(0, 4)}••••••••${key.slice(-4)}`;
}
