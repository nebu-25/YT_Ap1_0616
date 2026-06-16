import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YouTube 트렌드 분석",
  description:
    "지역·카테고리별 급상승 동영상을 지표·집계로 분석하는 트렌드 분석 툴",
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
