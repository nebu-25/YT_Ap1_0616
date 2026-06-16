import type { VideoItem } from "./types";

const HEADERS = [
  "rank",
  "title",
  "channel",
  "views",
  "likes",
  "comments",
  "engagementRate",
  "velocityPerHour",
  "durationSec",
  "publishedAt",
  "videoUrl",
  "channelUrl",
];

function escapeCell(value: string | number): string {
  const s = String(value);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function videosToCsv(videos: VideoItem[]): string {
  const rows = videos.map((v, i) =>
    [
      i + 1,
      v.title,
      v.channelTitle,
      v.views,
      v.likes,
      v.comments,
      v.engagementRate.toFixed(4),
      Math.round(v.velocity),
      v.durationSec,
      v.publishedAt,
      v.videoUrl,
      v.channelUrl,
    ]
      .map(escapeCell)
      .join(",")
  );
  // Excel 한글 깨짐 방지를 위해 BOM 추가
  return "﻿" + [HEADERS.join(","), ...rows].join("\n");
}

/** 브라우저에서 CSV 파일 다운로드 트리거 */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
