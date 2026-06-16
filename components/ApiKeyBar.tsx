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
      <details className="apikey-tip">
        <summary>🔒 보안 팁</summary>
        <div className="apikey-tip-body">
          Google Cloud{" "}
          <a
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank"
            rel="noreferrer"
          >
            사용자 인증 정보
          </a>
          에서 이 키를 <b>YouTube Data API v3</b>로 <b>API 제한</b>하고,{" "}
          <b>HTTP 리퍼러</b>(이 사이트 주소)로 <b>애플리케이션 제한</b>을 걸어
          두세요. 유출되어도 악용을 막을 수 있습니다.
        </div>
      </details>
    </div>
  );
}

function maskKey(key: string): string {
  if (key.length <= 8) return "••••";
  return `${key.slice(0, 4)}••••••••${key.slice(-4)}`;
}
