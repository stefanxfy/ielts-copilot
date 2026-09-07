/**
 * ScoreCurveChart — 分数曲线(P6 仪表盘)
 *
 * 维度切换:总分 / 听力 / 阅读 / 写作(口语无真题数据不出维度)
 * 口径:总分 = 仅 COMPLETED 完整套卷场次;单科 = 场次内成绩 + 单科散考交卷一并统计
 *       (实心点 = 完整场次,空心点 = 散考)
 * 目标线:targetOverall 非空时叠加对应虚线(总分→总目标;分科→该科目标)
 * tooltip:该点四科 band + 来源标记 + 成绩单/试卷链接
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
  overall: { label: "总分", color: "var(--chart-1)" },
  listening: { label: "听力", color: "var(--chart-5)" },
  reading: { label: "阅读", color: "var(--chart-3)" },
  writing: { label: "写作", color: "var(--chart-4)" },
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
  const fmt = (v: number | null) => (v != null ? v.toFixed(1) : "—");
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <div className="flex items-center gap-1.5 font-medium text-foreground">
        {p.setTitle}
        <span
          className={`rounded px-1 py-px text-[10px] ${
            p.kind === "full"
              ? "bg-primary/10 text-primary"
              : "bg-warning/15 text-warning"
          }`}
        >
          {p.kind === "full" ? "完整场次" : "单科练习"}
        </span>
      </div>
      <div className="mt-1 space-y-0.5 text-muted-foreground">
        <div>
          总分 <span className="font-semibold text-primary">{fmt(p.overall)}</span>
        </div>
        <div>听力 {fmt(p.listening)}</div>
        <div>阅读 {fmt(p.reading)}</div>
        <div>写作 {fmt(p.writing)}</div>
      </div>
      {p.sessionId ? (
        <Link
          href={`/session/${p.sessionId}`}
          className="mt-1.5 inline-block text-primary hover:underline"
        >
          查看成绩单 →
        </Link>
      ) : p.examId ? (
        <Link
          href={`/exam/${p.examId}`}
          className="mt-1.5 inline-block text-primary hover:underline"
        >
          再练这份卷 →
        </Link>
      ) : null}
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
    () =>
      data
        // 总分维度只统计完整套卷场次;单科维度含单科散考
        .filter((p) => (dim === "overall" ? p.kind === "full" : true))
        .map((p) => ({ ...p, value: p[dim] })),
    [data, dim],
  );
  const target = targets[dim] ?? null;
  const hasSingle = dim !== "overall" && chartData.some((p) => p.kind === "single");

  return (
    <div className="rounded-xl border border-border bg-popover">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="text-[15px] font-medium">分数曲线</div>
        <div className="flex gap-1">
          {(Object.keys(DIM_META) as CurveDim[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDim(d)}
              className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                dim === d
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:bg-accent"
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
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              axisLine={{ stroke: "var(--border)" }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 9]}
              ticks={[0, 2, 4, 5, 6, 7, 8, 9]}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CurveTooltip />} />
            {target != null && (
              <ReferenceLine
                y={target}
                stroke="var(--destructive)"
                strokeDasharray="6 4"
                label={{
                  value: `目标 ${target.toFixed(1)}`,
                  position: "right",
                  fill: "var(--destructive)",
                  fontSize: 11,
                }}
              />
            )}
            {/* 完整套卷场次点:实线 + 实心点(散考点对该系列为 null) */}
            <Line
              type="monotone"
              dataKey={(row: (typeof chartData)[number]) =>
                row.kind === "full" ? row.value : null
              }
              name={meta.label}
              stroke={meta.color}
              strokeWidth={2.5}
              dot={{ r: 4, fill: meta.color, strokeWidth: 0 }}
              activeDot={{ r: 6 }}
              connectNulls
            />
            {/* 单科散考点:虚线 + 空心点,与场次点视觉区分 */}
            {hasSingle && (
              <Line
                type="monotone"
                dataKey={(row: (typeof chartData)[number]) =>
                  row.kind === "single" ? row.value : null
                }
                name={`${meta.label}·散考`}
                stroke={meta.color}
                strokeWidth={2}
                strokeDasharray="5 4"
                strokeOpacity={0.75}
                dot={{
                  r: 3.5,
                  fill: "var(--card)",
                  stroke: meta.color,
                  strokeWidth: 2,
                }}
                activeDot={{ r: 6 }}
                connectNulls
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="border-t border-border/60 px-4 py-2 text-[11px] text-muted-foreground">
        {dim === "overall"
          ? "总分仅统计完整套卷场次"
          : `● 完整套卷场次 · ○ 单科散考(两类成绩均计入)`}
      </div>
    </div>
  );
}
