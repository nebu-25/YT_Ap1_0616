"use client";

import Image from "next/image";
import type { VideoItem } from "@/lib/types";
import {
  formatCount,
  formatDuration,
  formatPercent,
} from "@/lib/metrics";

interface Props {
  videos: VideoItem[];
  view: "grid" | "list";
  onOpenComments: (v: VideoItem) => void;
}

export default function VideoList({ videos, view, onOpenComments }: Props) {
  if (view === "list") {
    return (
      <div className="list">
        {videos.map((v, i) => (
          <div className="row" key={v.id}>
            <div className="rank">{i + 1}</div>
            <a href={v.videoUrl} target="_blank" rel="noreferrer">
              <Image
                className="thumb-sm"
                src={v.thumbnail}
                alt={v.title}
                width={160}
                height={90}
              />
            </a>
            <div>
              <a
                href={v.videoUrl}
                target="_blank"
                rel="noreferrer"
                className="title"
                style={{ display: "block" }}
              >
                {v.title}
              </a>
              <a
                href={v.channelUrl}
                target="_blank"
                rel="noreferrer"
                className="channel"
              >
                {v.channelTitle}
              </a>
              <div className="metrics" style={{ marginTop: 6 }}>
                <Metrics v={v} />
              </div>
            </div>
            <button
              className="btn"
              onClick={() => onOpenComments(v)}
              style={{ alignSelf: "center" }}
            >
              💬 {formatCount(v.comments)}
            </button>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid">
      {videos.map((v, i) => (
        <div className="card" key={v.id}>
          <a href={v.videoUrl} target="_blank" rel="noreferrer">
            <div className="thumb-wrap">
              <span className="rank-badge">#{i + 1}</span>
              <Image
                src={v.thumbnail}
                alt={v.title}
                fill
                sizes="(max-width: 600px) 100vw, 300px"
                style={{ objectFit: "cover" }}
              />
              <span className="dur-badge">{formatDuration(v.durationSec)}</span>
            </div>
          </a>
          <div className="body">
            <a
              href={v.videoUrl}
              target="_blank"
              rel="noreferrer"
              className="title"
            >
              {v.title}
            </a>
            <a
              href={v.channelUrl}
              target="_blank"
              rel="noreferrer"
              className="channel"
            >
              {v.channelTitle}
            </a>
            <div className="metrics">
              <Metrics v={v} />
            </div>
            <div className="actions">
              <a
                href={v.videoUrl}
                target="_blank"
                rel="noreferrer"
                className="btn"
              >
                ▶ YouTube
              </a>
              <button className="btn" onClick={() => onOpenComments(v)}>
                💬 댓글
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Metrics({ v }: { v: VideoItem }) {
  return (
    <>
      <span className="metric">
        조회 <b>{formatCount(v.views)}</b>
      </span>
      <span className="metric">
        👍 <b>{formatCount(v.likes)}</b>
      </span>
      <span className="metric">
        참여율 <b>{formatPercent(v.engagementRate)}</b>
      </span>
      <span className="metric" title="시간당 조회수(velocity)">
        🚀 <b>{formatCount(Math.round(v.velocity))}/h</b>
      </span>
    </>
  );
}
