import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "개발·IT·AI 영상 트렌드",
  description:
    "개발·IT·AI 유튜브에서 뜨는 기술과 시청자 반응을 한눈에 — 주제별 큐레이션·급상승 속도·댓글 분석",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
