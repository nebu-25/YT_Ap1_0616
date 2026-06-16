"use client";

import type { Category, LengthBucket, SortKey } from "@/lib/types";
import type { CuratedTopic } from "@/lib/topics";
import { REGIONS } from "@/lib/regions";

export interface ControlsState {
  regionCode: string;
  categoryId: string; // "" = 전체
  sort: SortKey;
  search: string;
  minViews: number;
  length: LengthBucket;
  view: "grid" | "list";
}

export type Preset = "top100" | CuratedTopic | "custom";

interface Props {
  state: ControlsState;
  categories: Category[];
  preset: Preset;
  resultCount: number;
  refreshing?: boolean;
  onChange: (patch: Partial<ControlsState>) => void;
  onExport: () => void;
  onRefresh: () => void;
}

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "views", label: "조회수" },
  { value: "velocity", label: "급상승(velocity)" },
  { value: "engagement", label: "참여율(engagement)" },
  { value: "likes", label: "좋아요" },
  { value: "comments", label: "댓글수" },
  { value: "newest", label: "최신순" },
];

const LENGTH_OPTIONS: { value: LengthBucket; label: string }[] = [
  { value: "all", label: "전체 길이" },
  { value: "mid", label: "중간 (1~20분)" },
  { value: "long", label: "롱폼 (>20분)" },
];

export default function Controls({
  state,
  categories,
  preset,
  resultCount,
  refreshing,
  onChange,
  onExport,
  onRefresh,
}: Props) {
  const curated = preset !== "top100" && preset !== "custom";
  return (
    <div className="controls">
      <div className="field">
        <label htmlFor="ctl-region">국가</label>
        <select
          id="ctl-region"
          value={state.regionCode}
          onChange={(e) => onChange({ regionCode: e.target.value })}
        >
          {REGIONS.map((r) => (
            <option key={r.code} value={r.code}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="ctl-category">카테고리</label>
        <select
          id="ctl-category"
          value={state.categoryId}
          disabled={curated}
          title={
            curated
              ? "큐레이션 주제에서는 카테고리 필터가 적용되지 않습니다"
              : undefined
          }
          onChange={(e) => onChange({ categoryId: e.target.value })}
        >
          <option value="">전체</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="ctl-sort">정렬</label>
        <select
          id="ctl-sort"
          value={state.sort}
          onChange={(e) => onChange({ sort: e.target.value as SortKey })}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="ctl-length">길이</label>
        <select
          id="ctl-length"
          value={state.length}
          onChange={(e) =>
            onChange({ length: e.target.value as LengthBucket })
          }
        >
          {LENGTH_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="ctl-minviews">최소 조회수</label>
        <input
          id="ctl-minviews"
          type="number"
          min={0}
          step={10000}
          value={state.minViews || ""}
          placeholder="0"
          onChange={(e) => onChange({ minViews: Number(e.target.value) || 0 })}
          style={{ width: 110 }}
        />
      </div>

      <div className="field" style={{ flex: 1, minWidth: 160 }}>
        <label htmlFor="ctl-search">검색 (제목·채널)</label>
        <input
          id="ctl-search"
          type="text"
          value={state.search}
          placeholder="키워드 입력"
          onChange={(e) => onChange({ search: e.target.value })}
        />
      </div>

      <div className="view-group" role="group" aria-label="보기 형태">
        <button
          className={`btn ${state.view === "grid" ? "active" : ""}`}
          onClick={() => onChange({ view: "grid" })}
          title="그리드 보기"
          aria-label="그리드 보기"
          aria-pressed={state.view === "grid"}
        >
          ▦
        </button>
        <button
          className={`btn ${state.view === "list" ? "active" : ""}`}
          onClick={() => onChange({ view: "list" })}
          title="리스트 보기"
          aria-label="리스트 보기"
          aria-pressed={state.view === "list"}
        >
          ☰
        </button>
      </div>

      <button
        className="btn ghost"
        onClick={onRefresh}
        disabled={refreshing}
        title="새로고침"
        aria-label={refreshing ? "새로고침 중" : "새로고침"}
      >
        <span className={refreshing ? "spin" : undefined}>↻</span>
      </button>

      <button
        className="btn accent"
        onClick={onExport}
        disabled={resultCount === 0}
      >
        ⬇ CSV ({resultCount})
      </button>
    </div>
  );
}
