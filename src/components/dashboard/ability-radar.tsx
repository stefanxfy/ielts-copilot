/**
 * AbilityRadar — 四科能力雷达(P6 仪表盘)
 *
 * 双系列:各科最近成绩 vs 该科全部交卷均值(含完整场次与单科散考);
 * 无数据维度自动隐藏(口语无真题恒不出现)。
 * 与写作批改卡雷达同一视觉语言(#1a6feb/#e8871e)。
 */
"use client";

import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { ChartSubject } from "@/lib/dashboard";

export interface RadarEntry {
  subject: ChartSubject;
  latest: number;
  avg: number;
}

const DIM_SHORT: Record<ChartSubject | "speaking", string> = {
  listening: "听力",
  reading: "阅读",
  writing: "写作",
  speaking: "口语",
};

export default function AbilityRadar({ items }: { items: RadarEntry[] }) {
  const data = items.map((it) => ({
    dim: DIM_SHORT[it.subject] ?? it.subject,
    最近: it.latest,
    均值: it.avg,
  }));

  return (
    <div className="h-[300px] w-full px-2 py-3">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="#e3e8f0" />
          <PolarAngleAxis dataKey="dim" tick={{ fill: "#5b6574", fontSize: 12 }} />
          <PolarRadiusAxis
            domain={[0, 9]}
            tickCount={4}
            tick={{ fill: "#b6bdc9", fontSize: 10 }}
            axisLine={false}
          />
          <Radar
            name="最近成绩"
            dataKey="最近"
            stroke="#1a6feb"
            fill="#1a6feb"
            fillOpacity={0.22}
            strokeWidth={2}
          />
          <Radar
            name="历史均值(含散考)"
            dataKey="均值"
            stroke="#e8871e"
            fill="#e8871e"
            fillOpacity={0.18}
            strokeWidth={2}
          />
          <Legend />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
