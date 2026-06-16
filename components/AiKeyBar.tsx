"use client";

import { useEffect, useState } from "react";

interface Props {
  aiKey: string;
  onSave: (key: string) => void;
}

/**
 * 선택 사용하는 Gemini 키 입력 바. YouTube 키와 동일한 BYO 패턴이지만
 * AI 분석을 쓰지 않으면 입력하지 않아도 된다(미입력 시 경고 대신 추가 버튼만 노출).
 */
export default function AiKeyBar({ aiKey, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(aiKey);

  useEffect(() => {
    setDraft(aiKey);
    setEditing(false);
  }, [aiKey]);

  if (aiKey && !editing) {
    return (
      <div className="apikey-bar">
        <span className="apikey-status ok">🤖 AI 키 저장됨</span>
        <span className="apikey-mask">{maskKey(aiKey)}</span>
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

  if (!editing) {
    return (
      <div className="apikey-bar">
        <button className="btn ghost" onClick={() => setEditing(true)}>
          🤖 AI 분석 키 추가 (선택)
        </button>
      </div>
    );
  }

  return (
    <div className="apikey-bar">
      <span className="apikey-status">🤖 AI 키 (선택)</span>
      <input
        type="password"
        autoComplete="off"
        placeholder="Gemini API 키를 입력하세요"
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
      <button
        className="btn ghost"
        onClick={() => {
          setDraft(aiKey);
          setEditing(false);
        }}
      >
        취소
      </button>
      <a
        className="apikey-help"
        href="https://aistudio.google.com/app/apikey"
        target="_blank"
        rel="noreferrer"
      >
        무료 키 발급 ↗
      </a>
      <details className="apikey-tip">
        <summary>🔒 보안 팁</summary>
        <div className="apikey-tip-body">
          Gemini 키는 댓글 <b>AI 요약·감정 분석</b>에만 쓰입니다. 키는 이
          브라우저에만 저장되고 서버에 보관되지 않으며, 요청 시 헤더로만
          전달됩니다. 각자 자신의 <b>무료 티어</b> 키를 쓰므로 별도 비용이
          발생하지 않습니다.
        </div>
      </details>
    </div>
  );
}

function maskKey(key: string): string {
  if (key.length <= 8) return "••••";
  return `${key.slice(0, 4)}••••••••${key.slice(-4)}`;
}
