"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import Controls, { type ControlsState } from "@/components/Controls";
import VideoList from "@/components/VideoList";
import CommentDrawer from "@/components/CommentDrawer";
import Analytics from "@/components/Analytics";
import ApiKeyBar from "@/components/ApiKeyBar";
import { downloadCsv, videosToCsv } from "@/lib/csv";
import { keyedFetcher } from "@/lib/fetcher";
import { useApiKey } from "@/lib/useApiKey";
import { EDUCATION_CATEGORY_ID } from "@/lib/regions";
import type { Category, VideoItem } from "@/lib/types";

const DEFAULT_STATE: ControlsState = {
  regionCode: "KR",
  categoryId: "",
  sort: "views",
  search: "",
  minViews: 0,
  length: "all",
  view: "grid",
};

export default function Home() {
  const { apiKey, setApiKey, loaded } = useApiKey();
  const [state, setState] = useState<ControlsState>(DEFAULT_STATE);
  const [max, setMax] = useState(100);
  const [tab, setTab] = useState<"list" | "analytics">("list");
  const [active, setActive] = useState<VideoItem | null>(null);

  // 카테고리 (지역별) — 키가 있을 때만 요청
  const { data: catData } = useSWR<{ categories: Category[] }>(
    apiKey
      ? [`/api/categories?regionCode=${state.regionCode}`, apiKey]
      : null,
    keyedFetcher
  );
  const categories = catData?.categories ?? [];

  // 급상승 영상 — 키가 있을 때만 요청
  const trendingUrl = `/api/trending?regionCode=${state.regionCode}&categoryId=${state.categoryId}&max=${max}`;
  const {
    data: trendData,
    error,
    isLoading,
    mutate,
  } = useSWR<{ videos: VideoItem[]; fallback?: boolean }>(
    apiKey ? [trendingUrl, apiKey] : null,
    keyedFetcher
  );
  const rawVideos = trendData?.videos ?? [];

  // 프리셋 판별
  const preset: "top100" | "edu30" | "custom" =
    state.categoryId === "" && max === 100
      ? "top100"
      : state.categoryId === EDUCATION_CATEGORY_ID && max === 30
        ? "edu30"
        : "custom";

  // 클라이언트 정렬·필터
  const videos = useMemo(
    () => applyFilters(rawVideos, state),
    [rawVideos, state]
  );

  const onPreset = (p: "top100" | "edu30") => {
    if (p === "top100") {
      setMax(100);
      setState((s) => ({ ...s, categoryId: "" }));
    } else {
      setMax(30);
      setState((s) => ({ ...s, categoryId: EDUCATION_CATEGORY_ID }));
    }
  };

  const onChange = (patch: Partial<ControlsState>) =>
    setState((s) => ({ ...s, ...patch }));

  const onExport = () => {
    const region = state.regionCode;
    const date = new Date().toISOString().slice(0, 10);
    downloadCsv(`youtube-trending-${region}-${date}.csv`, videosToCsv(videos));
  };

  return (
    <main className="container">
      <div className="header">
        <div>
          <h1>📊 YouTube 트렌드 분석</h1>
          <span className="sub">
            지역·카테고리별 급상승 영상을 지표·집계로 분석
          </span>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <ApiKeyBar apiKey={apiKey} onSave={setApiKey} />
        </div>
      </div>

      {loaded && !apiKey ? (
        <div className="banner info onboard">
          <b>시작하려면 본인의 YouTube Data API v3 키를 입력하세요.</b>
          <br />
          각 사용자가 자신의 키(=자신의 무료 할당량)로 조회하므로, 별도 비용이
          발생하지 않습니다. 키는 이 브라우저에만 저장되며 서버에 보관되지
          않습니다.{" "}
          <a
            href="https://console.cloud.google.com/apis/library/youtube.googleapis.com"
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: "underline" }}
          >
            키 발급 방법 ↗
          </a>
        </div>
      ) : null}

      {apiKey ? (
        <Controls
          state={state}
          categories={categories}
          preset={preset}
          resultCount={videos.length}
          onPreset={onPreset}
          onChange={onChange}
          onExport={onExport}
          onRefresh={() => mutate()}
        />
      ) : null}

      {error && (
        <div className="banner error">⚠️ {(error as Error).message}</div>
      )}

      {apiKey &&
        !isLoading &&
        !error &&
        trendData?.fallback &&
        rawVideos.length > 0 && (
        <div className="banner info">
          ℹ️ 이 지역은 해당 카테고리 급상승 차트를 직접 지원하지 않아, 전체 급상승
          영상에서 카테고리를 추출했습니다.
        </div>
      )}

      {apiKey && !isLoading && !error && rawVideos.length === 0 && (
        <div className="banner info">
          결과가 없습니다. 이 지역의 전체 급상승 영상 중 선택한 카테고리에 해당하는
          영상이 없을 수 있습니다. 다른 카테고리나 국가를 선택해 보세요.
        </div>
      )}

      {apiKey && (
        <>
          <div className="tabs">
            <button
              className={`tab ${tab === "list" ? "active" : ""}`}
              onClick={() => setTab("list")}
            >
              영상 목록 ({videos.length})
            </button>
            <button
              className={`tab ${tab === "analytics" ? "active" : ""}`}
              onClick={() => setTab("analytics")}
            >
              분석
            </button>
          </div>

          {isLoading ? (
            <Skeletons view={state.view} />
          ) : tab === "list" ? (
            <VideoList
              videos={videos}
              view={state.view}
              onOpenComments={setActive}
            />
          ) : (
            <Analytics videos={videos} categories={categories} />
          )}
        </>
      )}

      {active && (
        <CommentDrawer
          video={active}
          apiKey={apiKey}
          onClose={() => setActive(null)}
        />
      )}
    </main>
  );
}

function applyFilters(videos: VideoItem[], s: ControlsState): VideoItem[] {
  const q = s.search.trim().toLowerCase();
  let out = videos.filter((v) => {
    if (v.views < s.minViews) return false;
    if (s.length === "short" && v.durationSec >= 60) return false;
    if (s.length === "mid" && (v.durationSec < 60 || v.durationSec > 1200))
      return false;
    if (s.length === "long" && v.durationSec <= 1200) return false;
    if (
      q &&
      !v.title.toLowerCase().includes(q) &&
      !v.channelTitle.toLowerCase().includes(q)
    )
      return false;
    return true;
  });

  out = [...out].sort((a, b) => {
    switch (s.sort) {
      case "likes":
        return b.likes - a.likes;
      case "comments":
        return b.comments - a.comments;
      case "engagement":
        return b.engagementRate - a.engagementRate;
      case "velocity":
        return b.velocity - a.velocity;
      case "newest":
        return (
          new Date(b.publishedAt).getTime() -
          new Date(a.publishedAt).getTime()
        );
      case "views":
      default:
        return b.views - a.views;
    }
  });

  return out;
}

function Skeletons({ view }: { view: "grid" | "list" }) {
  const items = Array.from({ length: 12 });
  if (view === "list") {
    return (
      <div className="list">
        {items.map((_, i) => (
          <div className="skeleton" key={i} style={{ height: 96 }} />
        ))}
      </div>
    );
  }
  return (
    <div className="grid">
      {items.map((_, i) => (
        <div className="skeleton" key={i} style={{ height: 250 }} />
      ))}
    </div>
  );
}
