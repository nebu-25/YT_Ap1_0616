"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import useSWR from "swr";
import type { CommentsResponse, VideoItem } from "@/lib/types";
import { formatCount } from "@/lib/metrics";
import { keyedFetcher } from "@/lib/fetcher";

interface Props {
  video: VideoItem;
  apiKey: string;
  onClose: () => void;
}

export default function CommentDrawer({ video, apiKey, onClose }: Props) {
  const [order, setOrder] = useState<"relevance" | "time">("relevance");
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

        <div
          style={{
            display: "flex",
            gap: 6,
            padding: "10px 16px 0",
          }}
        >
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
            data.items.length === 0 &&
            !isLoading && <div className="muted">댓글이 없습니다.</div>}

          {data?.items.map((c) => (
            <div className="comment" key={c.id}>
              <Image src={c.authorImage} alt={c.author} width={36} height={36} />
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
