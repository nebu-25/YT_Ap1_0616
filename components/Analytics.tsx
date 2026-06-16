"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Category, VideoItem } from "@/lib/types";
import {
  categoryDistribution,
  channelFrequency,
  keywordFrequency,
  lengthDistribution,
  uploadHourDistribution,
  type CountDatum,
} from "@/lib/aggregate";

interface Props {
  videos: VideoItem[];
  categories: Category[];
}

const COLORS = [
  "#ff3b5c",
  "#4f8cff",
  "#38d39f",
  "#ffb020",
  "#a06bff",
  "#ff7ab8",
];

export default function Analytics({ videos, categories }: Props) {
  if (videos.length === 0) {
    return <div className="muted">분석할 데이터가 없습니다.</div>;
  }

  const channels = channelFrequency(videos, 12);
  const keywords = keywordFrequency(videos, 20);
  const cats = categoryDistribution(videos, categories);
  const lengths = lengthDistribution(videos);
  const hours = uploadHourDistribution(videos);

  return (
    <div className="charts">
      <ChartCard title="🏆 채널 등장 빈도 (TOP 12)">
        <HBar data={channels} color="#4f8cff" />
      </ChartCard>

      <ChartCard title="🔠 인기 키워드·태그 (TOP 20)">
        <HBar data={keywords} color="#38d39f" />
      </ChartCard>

      <ChartCard title="🗂 카테고리 분포">
        <HBar data={cats} color="#ffb020" multicolor />
      </ChartCard>

      <ChartCard title="⏱ 영상 길이 분포">
        <HBar data={lengths} color="#a06bff" multicolor />
      </ChartCard>

      <ChartCard title="🕐 업로드 시간대 분포 (UTC)">
        <VBar data={hours} color="#ff3b5c" />
      </ChartCard>
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="chart-card">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

const AXIS = { fontSize: 11, fill: "#9aa3b2" };
const TOOLTIP_STYLE = {
  background: "#151821",
  border: "1px solid #2a2f40",
  borderRadius: 8,
  fontSize: 12,
};

/** 가로 막대 (라벨이 긴 항목용) */
function HBar({
  data,
  color,
  multicolor,
}: {
  data: CountDatum[];
  color: string;
  multicolor?: boolean;
}) {
  const height = Math.max(160, data.length * 26);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
      >
        <CartesianGrid horizontal={false} stroke="#2a2f40" />
        <XAxis type="number" tick={AXIS} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={120}
          tick={AXIS}
          interval={0}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {data.map((_, i) => (
            <Cell
              key={i}
              fill={multicolor ? COLORS[i % COLORS.length] : color}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** 세로 막대 (시간대용) */
function VBar({ data, color }: { data: CountDatum[]; color: string }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
        <CartesianGrid vertical={false} stroke="#2a2f40" />
        <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#9aa3b2" }} interval={1} />
        <YAxis tick={AXIS} allowDecimals={false} width={28} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
        />
        <Bar dataKey="count" fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
