"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import useSWR from "swr";
import type { CommentItem, CommentsResponse, VideoItem } from "@/lib/types";
import { formatCount } from "@/lib/metrics";
import { commentKeywordFrequency } from "@/lib/aggregate";
import { keyedFetcher } from "@/lib/fetcher";

interface Props {
  video: VideoItem;
  apiKey: string;
  onClose: () => void;
}

export default function CommentDrawer({ video, apiKey, onClose }: Props) {
  const [order, setOrder] = useState<"relevance" | "time">("relevance");
  const [mode, setMode] = useState<"list" | "analysis">("list");
  const closeRef = useRef<HTMLButtonElement>(null);

  // Esc로 닫기 + 열릴 때 닫기 버튼에 포커스 + 닫힐 때 직전 포커스 복원
  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prevFocus?.focus();
    };
  }, [onClose]);

  const { data, error, isLoading } = useSWR<CommentsResponse>(
    apiKey
      ? [`/api/comments?videoId=${video.id}&order=${order}&max=50`, apiKey]
      : null,
    keyedFetcher
  );

  const items = data?.disabled ? [] : data?.items ?? [];

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} aria-hidden="true" />
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`${video.title} 댓글`}
      >
        <div className="drawer-head">
          <div style={{ overflow: "hidden" }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {video.title}
            </div>
            <div className="muted" style={{ fontSize: 12 }}>
              댓글 {formatCount(video.comments)}개 · {video.channelTitle}
            </div>
          </div>
          <button
            ref={closeRef}
            className="icon-btn"
            onClick={onClose}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="drawer-toolbar">
          <div className="seg" role="tablist" aria-label="댓글 보기">
            <button
              role="tab"
              aria-selected={mode === "list"}
              className={`btn ${mode === "list" ? "active" : ""}`}
              onClick={() => setMode("list")}
            >
              댓글
            </button>
            <button
              role="tab"
              aria-selected={mode === "analysis"}
              className={`btn ${mode === "analysis" ? "active" : ""}`}
              onClick={() => setMode("analysis")}
            >
              분석
            </button>
          </div>

          {mode === "list" && (
            <div className="seg" aria-label="정렬">
              <button
                className={`btn ${order === "relevance" ? "active" : ""}`}
                onClick={() => setOrder("relevance")}
              >
                관련성순
              </button>
              <button
                className={`btn ${order === "time" ? "active" : ""}`}
                onClick={() => setOrder("time")}
              >
                최신순
              </button>
            </div>
          )}
        </div>

        <div className="drawer-body">
          {isLoading && <div className="muted">댓글 불러오는 중…</div>}
          {error && (
            <div className="banner error">{(error as Error).message}</div>
          )}
          {data?.disabled && (
            <div className="banner info">
              이 영상은 댓글이 사용 중지되어 있습니다.
            </div>
          )}
          {data &&
            !data.disabled &&
            items.length === 0 &&
            !isLoading && <div className="muted">댓글이 없습니다.</div>}

          {!isLoading && !error && items.length > 0 && mode === "analysis" && (
            <CommentAnalysis items={items} />
          )}

          {mode === "list" &&
            items.map((c) => (
              <div className="comment" key={c.id}>
                <Image
                  src={c.authorImage}
                  alt={c.author}
                  width={36}
                  height={36}
                />
                <div>
                  <div className="c-author">{c.author}</div>
                  <div className="c-text">{c.text}</div>
                  <div className="c-meta">
                    👍 {formatCount(c.likes)}
                    {c.replyCount > 0 && ` · 답글 ${c.replyCount}`}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </aside>
    </>
  );
}

/** 드로어에 불러온 댓글(최대 50개)로 키워드·상위 댓글 분석 */
function CommentAnalysis({ items }: { items: CommentItem[] }) {
  const keywords = useMemo(() => commentKeywordFrequency(items, 16), [items]);
  const topLiked = useMemo(
    () => [...items].sort((a, b) => b.likes - a.likes).slice(0, 5),
    [items]
  );
  const mostReplied = useMemo(
    () =>
      items
        .filter((c) => c.replyCount > 0)
        .sort((a, b) => b.replyCount - a.replyCount)
        .slice(0, 5),
    [items]
  );
  const max = keywords[0]?.count || 1;

  return (
    <div className="comment-analysis">
      <div className="muted" style={{ fontSize: 11 }}>
        불러온 댓글 {items.length}개 기준
      </div>

      <section>
        <h4>🔠 키워드</h4>
        {keywords.length > 0 ? (
          <div className="chips">
            {keywords.map((k) => (
              <span
                className="chip"
                key={k.name}
                style={{
                  fontSize: 12 + (k.count / max) * 6,
                  opacity: 0.6 + (k.count / max) * 0.4,
                }}
                title={`${k.count}개 댓글에서 등장`}
              >
                {k.name}
                <b>{k.count}</b>
              </span>
            ))}
          </div>
        ) : (
          <div className="muted">추출된 키워드가 없습니다.</div>
        )}
      </section>

      <section>
        <h4>👍 좋아요 많은 댓글</h4>
        {topLiked.map((c) => (
          <div className="mini-comment" key={c.id}>
            <span className="mini-metric">👍 {formatCount(c.likes)}</span>
            <span className="mini-text">
              <b>{c.author}</b> {c.text}
            </span>
          </div>
        ))}
      </section>

      <section>
        <h4>💬 답글 많은 댓글</h4>
        {mostReplied.length > 0 ? (
          mostReplied.map((c) => (
            <div className="mini-comment" key={c.id}>
              <span className="mini-metric">답글 {c.replyCount}</span>
              <span className="mini-text">
                <b>{c.author}</b> {c.text}
              </span>
            </div>
          ))
        ) : (
          <div className="muted">답글이 달린 댓글이 없습니다.</div>
        )}
      </section>
    </div>
  );
}
