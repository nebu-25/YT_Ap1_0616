"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import Controls, {
  type ControlsState,
  type Preset,
} from "@/components/Controls";
import VideoList from "@/components/VideoList";
import CommentDrawer from "@/components/CommentDrawer";
import Analytics from "@/components/Analytics";
import ApiKeyBar from "@/components/ApiKeyBar";
import Sidebar from "@/components/Sidebar";
import QuotaBadge from "@/components/QuotaBadge";
import { downloadCsv, videosToCsv } from "@/lib/csv";
import { velocity } from "@/lib/metrics";
import { keyedFetcher } from "@/lib/fetcher";
import { useApiKey } from "@/lib/useApiKey";
import { isCuratedTopic, type CuratedTopic } from "@/lib/topics";
import type { Category, SortKey, LengthBucket, VideoItem } from "@/lib/types";

type Topic = CuratedTopic;

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
  // topic이 null이면 일반 급상승(trending), 값이 있으면 큐레이션 모드
  const [topic, setTopic] = useState<Topic | null>(null);
  const [tab, setTab] = useState<"list" | "analytics">("list");
  const [active, setActive] = useState<VideoItem | null>(null);

  // 가벼운 토스트 (자동 사라짐)
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  };

  // --- URL 쿼리 동기화 (공유 가능 + 새로고침 유지) ---
  const hydrated = useRef(false);

  // 마운트 시 URL에서 상태 복원
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const t = p.get("topic");
    if (t && isCuratedTopic(t)) {
      setTopic(t);
      setMax(30);
    }
    setState((s) => ({
      ...s,
      regionCode: p.get("r") || s.regionCode,
      categoryId: t ? "" : p.get("cat") || s.categoryId,
      sort: (p.get("sort") as SortKey) || s.sort,
      length: (p.get("len") as LengthBucket) || s.length,
      search: p.get("q") || s.search,
      minViews: Number(p.get("minv")) || s.minViews,
      view: p.get("view") === "list" ? "list" : s.view,
    }));
    hydrated.current = true;
  }, []);

  // 상태 변경 시 URL 갱신 (히스토리 오염 없이 replace)
  useEffect(() => {
    if (!hydrated.current) return;
    const p = new URLSearchParams();
    p.set("r", state.regionCode);
    if (topic) p.set("topic", topic);
    else if (state.categoryId) p.set("cat", state.categoryId);
    if (state.sort !== "views") p.set("sort", state.sort);
    if (state.length !== "all") p.set("len", state.length);
    if (state.search) p.set("q", state.search);
    if (state.minViews) p.set("minv", String(state.minViews));
    if (state.view !== "grid") p.set("view", state.view);
    const qs = p.toString();
    window.history.replaceState(
      null,
      "",
      qs ? `?${qs}` : window.location.pathname
    );
  }, [state, topic]);

  // 카테고리 (지역별) — 키가 있을 때만 요청
  const { data: catData } = useSWR<{ categories: Category[] }>(
    apiKey
      ? [`/api/categories?regionCode=${state.regionCode}`, apiKey]
      : null,
    keyedFetcher
  );
  const categories = catData?.categories ?? [];

  // 데이터 소스: 큐레이션 토픽이면 /api/curated, 아니면 /api/trending
  const dataUrl = topic
    ? `/api/curated?regionCode=${state.regionCode}&topic=${topic}&max=${max}`
    : `/api/trending?regionCode=${state.regionCode}&categoryId=${state.categoryId}&max=${max}`;
  const {
    data: trendData,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<{ videos: VideoItem[]; fallback?: boolean }>(
    apiKey ? [dataUrl, apiKey] : null,
    keyedFetcher
  );
  const rawVideos = trendData?.videos ?? [];

  // 프리셋 판별
  const preset: Preset = topic
    ? topic
    : state.categoryId === "" && max === 100
      ? "top100"
      : "custom";

  // 클라이언트 정렬·필터
  const videos = useMemo(
    () => applyFilters(rawVideos, state),
    [rawVideos, state]
  );

  const onPreset = (p: "top100" | CuratedTopic) => {
    if (p === "top100") {
      setTopic(null);
      setMax(100);
      setState((s) => ({ ...s, categoryId: "" }));
    } else {
      setTopic(p);
      setMax(30);
    }
  };

  const onChange = (patch: Partial<ControlsState>) => {
    // 카테고리를 직접 바꾸면 큐레이션 모드에서 일반 급상승 모드로 전환
    if (patch.categoryId !== undefined && topic) {
      setTopic(null);
    }
    setState((s) => ({ ...s, ...patch }));
  };

  const onExport = () => {
    const region = state.regionCode;
    const date = new Date().toISOString().slice(0, 10);
    downloadCsv(`youtube-trending-${region}-${date}.csv`, videosToCsv(videos));
    showToast(`CSV ${videos.length.toLocaleString()}개 항목을 내보냈습니다.`);
  };

  // 검색·최소조회수·길이 등 결과를 줄이는 필터만 초기화
  const onResetFilters = () =>
    setState((s) => ({ ...s, search: "", minViews: 0, length: "all" }));

  return (
    <main className="container">
      <div className="header">
        <div>
          <h1>🧑‍💻 개발·IT·AI 영상 트렌드</h1>
          <span className="sub">
            개발·IT·AI 유튜브에서 뜨는 기술과 시청자 반응을 한눈에
          </span>
        </div>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 6,
          }}
        >
          <ApiKeyBar apiKey={apiKey} onSave={setApiKey} />
          {apiKey ? <QuotaBadge /> : null}
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

      {apiKey && (
        <div className="layout">
          <Sidebar preset={preset} onPreset={onPreset} />

          <section className="content">
            <Controls
              state={state}
              categories={categories}
              preset={preset}
              resultCount={videos.length}
              refreshing={isValidating}
              onChange={onChange}
              onExport={onExport}
              onRefresh={() => mutate()}
            />

            {error && (
              <div className="banner error">⚠️ {(error as Error).message}</div>
            )}

            {isLoading && topic && (
              <div className="banner info">
                🔍 검색 기반 큐레이션은 최초 조회가 몇 초 걸릴 수 있어요 (약
                100유닛 사용, 이후 10분간은 캐시).
              </div>
            )}

            {!isLoading &&
              !error &&
              trendData?.fallback &&
              rawVideos.length > 0 && (
                <div className="banner info">
                  ℹ️ 이 지역은 해당 카테고리 급상승 차트를 직접 지원하지 않아,
                  전체 급상승 영상에서 카테고리를 추출했습니다.
                </div>
              )}

            {!isLoading && !error && rawVideos.length === 0 && (
              <div className="banner info">
                결과가 없습니다. 이 지역의 전체 급상승 영상 중 선택한 카테고리에
                해당하는 영상이 없을 수 있습니다. 다른 카테고리나 국가를 선택해
                보세요.
              </div>
            )}

            <div className="tabs" role="tablist" aria-label="보기 전환">
              <button
                role="tab"
                id="tab-list"
                aria-selected={tab === "list"}
                aria-controls="panel-list"
                className={`tab ${tab === "list" ? "active" : ""}`}
                onClick={() => setTab("list")}
              >
                영상 목록 ({videos.length})
              </button>
              <button
                role="tab"
                id="tab-analytics"
                aria-selected={tab === "analytics"}
                aria-controls="panel-analytics"
                className={`tab ${tab === "analytics" ? "active" : ""}`}
                onClick={() => setTab("analytics")}
              >
                분석
              </button>
            </div>

            <div
              role="tabpanel"
              id={tab === "list" ? "panel-list" : "panel-analytics"}
              aria-labelledby={tab === "list" ? "tab-list" : "tab-analytics"}
            >
              {isLoading ? (
                <Skeletons view={state.view} />
              ) : tab === "list" ? (
                videos.length === 0 && rawVideos.length > 0 ? (
                  <div className="banner info">
                    적용한 필터(검색·최소 조회수·길이)에 맞는 영상이 없습니다.{" "}
                    <button
                      className="btn ghost"
                      onClick={onResetFilters}
                      style={{ marginLeft: 8 }}
                    >
                      필터 초기화
                    </button>
                  </div>
                ) : (
                  <VideoList
                    videos={videos}
                    view={state.view}
                    onOpenComments={setActive}
                  />
                )
              ) : (
                <Analytics videos={videos} categories={categories} />
              )}
            </div>
          </section>
        </div>
      )}

      {active && (
        <CommentDrawer
          video={active}
          apiKey={apiKey}
          onClose={() => setActive(null)}
        />
      )}

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </main>
  );
}

function applyFilters(videos: VideoItem[], s: ControlsState): VideoItem[] {
  const q = s.search.trim().toLowerCase();
  // velocity는 시간 의존 지표라 서버 계산값이 캐시되면 과거 기준이 된다.
  // 현재 시각 기준으로 클라이언트에서 재계산해 정렬·표시·CSV에 반영한다.
  // (engagementRate는 시간 무관이므로 서버 값을 그대로 사용)
  let out = videos
    .map((v) => ({ ...v, velocity: velocity(v.views, v.publishedAt) }))
    .filter((v) => {
    if (v.views < s.minViews) return false;
    if (s.length === "mid" && v.durationSec > 1200) return false;
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
