"use client";

import type { Preset } from "./Controls";
import { TOPIC_META, type CuratedTopic } from "@/lib/topics";

interface Props {
  preset: Preset;
  onPreset: (p: "top100" | CuratedTopic) => void;
}

export default function Sidebar({ preset, onPreset }: Props) {
  return (
    <aside className="sidebar">
      <div className="sidebar-title">전체</div>
      <nav className="sidebar-nav">
        <button
          className={`nav-item ${preset === "top100" ? "active" : ""}`}
          onClick={() => onPreset("top100")}
        >
          <span className="ni-label">🔥 급상승 TOP 100</span>
          <span className="ni-sub">기술 카테고리 전체</span>
        </button>
      </nav>

      <div className="sidebar-title">개발·IT·AI 주제</div>
      <nav className="sidebar-nav">
        {TOPIC_META.map((t) => (
          <button
            key={t.key}
            className={`nav-item ${preset === t.key ? "active" : ""}`}
            onClick={() => onPreset(t.key)}
          >
            <span className="ni-label">
              {t.icon} {t.label}
            </span>
            <span className="ni-sub">{t.sub}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
