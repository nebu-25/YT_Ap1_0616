"use client";

import type { Preset } from "./Controls";

interface Props {
  preset: Preset;
  onPreset: (p: "top100" | "it" | "space") => void;
}

const ITEMS: {
  key: "top100" | "it" | "space";
  icon: string;
  label: string;
  sub: string;
}[] = [
  { key: "top100", icon: "🔥", label: "급상승 TOP 100", sub: "전체 급상승" },
  { key: "it", icon: "💻", label: "IT 30", sub: "기술·AI·반도체" },
  { key: "space", icon: "🔭", label: "우주/천문 30", sub: "천문·우주 소식" },
];

export default function Sidebar({ preset, onPreset }: Props) {
  return (
    <aside className="sidebar">
      <div className="sidebar-title">프리셋</div>
      <nav className="sidebar-nav">
        {ITEMS.map((it) => (
          <button
            key={it.key}
            className={`nav-item ${preset === it.key ? "active" : ""}`}
            onClick={() => onPreset(it.key)}
          >
            <span className="ni-label">
              {it.icon} {it.label}
            </span>
            <span className="ni-sub">{it.sub}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
