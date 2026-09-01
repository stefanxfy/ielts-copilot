/**
 * ScoreCurveChart — 分数曲线(P6 仪表盘)
 *
 * 维度切换:总分 / 听力 / 阅读 / 写作(口语无真题数据不出维度)
 * 目标线:targetOverall 非空时叠加对应虚线(总分→总目标;分科→该科目标)
 * tooltip:该场四科 band + 成绩单链接
 * 空态由父级(服务端)渲染,本组件收到的 data 保证非空。
 */
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CurvePoint } from "@/lib/dashboard";

export type CurveDim = "overall" | "listening" | "reading" | "writing";

const DIM_META: Record<CurveDim, { label: string; color: string }> = {
  overall: { label: "总分", color: "#1a6feb" },
  listening: { label: "听力", color: "#7c3aed" },
  reading: { label: "阅读", color: "#18925c" },
  writing: { label: "写作", color: "#e8871e" },
};

export interface CurveTargets {
  overall?: number | null;
  listening?: number | null;
  reading?: number | null;
  writing?: number | null;
}

interface CustomTipProps {
  active?: boolean;
  payload?: { payload: CurvePoint }[];
}

function CurveTooltip({ active, payload }: CustomTipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-[#dfe4ec] bg-white px-3 py-2 text-xs shadow-lg">
      <div className="font-medium text-[#10233f]">{p.setTitle}</div>
      <div className="mt-1 space-y-0.5 text-[#5b6574]">
        <div>
          总分 <span className="font-semibold text-[#1a6feb]">{p.overall.toFixed(1)}</span>
        </div>
        <div>听力 {p.listening ? p.listening.toFixed(1) : "—"}</div>
        <div>阅读 {p.reading ? p.reading.toFixed(1) : "—"}</div>
        <div>写作 {p.writing ? p.writing.toFixed(1) : "—"}</div>
      </div>
      <Link
        href={`/session/${p.sessionId}`}
        className="mt-1.5 inline-block text-[#1a6feb] hover:underline"
      >
        查看成绩单 →
      </Link>
    </div>
  );
}

export default function ScoreCurveChart({
  data,
  targets,
}: {
  data: CurvePoint[];
  targets: CurveTargets;
}) {
  const [dim, setDim] = useState<CurveDim>("overall");
  const meta = DIM_META[dim];

  const chartData = useMemo(
    () => data.map((p) => ({ ...p, value: p[dim] || null })),
    [data, dim],
  );
  const target = targets[dim] ?? null;

  return (
    <div className="rounded-xl border border-[#dfe4ec] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#dfe4ec] px-4 py-3">
        <div className="text-[15px] font-medium">分数曲线</div>
        <div className="flex gap-1">
          {(Object.keys(DIM_META) as CurveDim[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDim(d)}
              className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                dim === d
                  ? "bg-[#1a6feb] text-white"
                  : "bg-[#f2f5f9] text-[#5b6574] hover:bg-[#e6edf6]"
              }`}
            >
              {DIM_META[d].label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-[300px] w-full px-2 py-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
            <CartesianGrid stroke="#eef1f6" strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tick={{ fill: "#8a93a2", fontSize: 11 }}
              axisLine={{ stroke: "#dfe4ec" }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 9]}
              ticks={[0, 2, 4, 5, 6, 7, 8, 9]}
              tick={{ fill: "#8a93a2", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CurveTooltip />} />
            {target != null && (
              <ReferenceLine
                y={target}
                stroke="#c0392b"
                strokeDasharray="6 4"
                label={{
                  value: `目标 ${target.toFixed(1)}`,
                  position: "right",
                  fill: "#c0392b",
                  fontSize: 11,
                }}
              />
            )}
            <Line
              type="monotone"
              dataKey="value"
              name={meta.label}
              stroke={meta.color}
              strokeWidth={2.5}
              dot={{ r: 4, fill: meta.color, strokeWidth: 0 }}
              activeDot={{ r: 6 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
