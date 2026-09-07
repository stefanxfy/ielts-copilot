/**
 * WritingGradingCard — 写作 AI 四维批改展示(P5)
 *
 * 职责:
 * - 展示 T1/T2 批改结果:四维雷达图 + 逐维诊断(band/评语/原文依据/建议)
 *   + 亮点/不足 + 问题标注 + 改写范文
 * - 批改进行中:每 4s 轮询 GET /api/grading/[recordId],完成后 router.refresh()
 *   让服务端页面(场次总分/写作 band)同步更新
 * - 未批改/失败:提供「开始批改 / 重试 / 重新批改」入口(POST,force 控制重跑)
 *
 * initial 为服务端首帧快照,避免已完成的批改先闪「批改中」再变结果。
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
import type { AiGrading } from "@/db/schema";

export interface GradingStatusDTO {
  recordId: number;
  subject: string;
  bandScore: number | null;
  T1: AiGrading | null;
  T2: AiGrading | null;
  sessionId: string | null;
  running: boolean;
  done: boolean;
}

const DIM_LABEL: Record<string, string> = {
  TR: "任务回应 Task Response",
  CC: "连贯与衔接 Coherence & Cohesion",
  LR: "词汇丰富度 Lexical Resource",
  GRA: "语法多样与准确 Grammatical Range & Accuracy",
};

const ISSUE_TYPE_LABEL: Record<string, string> = {
  grammar: "语法",
  vocabulary: "词汇",
  cohesion: "衔接",
  task: "任务回应",
  other: "其他",
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/* ---------- 小组件 ---------- */

function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}

/** 四维雷达图(T1/T2 双系列,缺哪个 task 就只画另一个) */
function RadarBlock({ t1, t2 }: { t1: AiGrading | null; t2: AiGrading | null }) {
  const hasT1 = t1?.status === "DONE" && t1.bands;
  const hasT2 = t2?.status === "DONE" && t2.bands;
  if (!hasT1 && !hasT2) return null;

  const dims = ["TR", "CC", "LR", "GRA"] as const;
  const data = dims.map((d) => ({
    dim: d,
    T1: hasT1 ? (t1!.bands![d] ?? 0) : undefined,
    T2: hasT2 ? (t2!.bands![d] ?? 0) : undefined,
  }));

  return (
    <div className="border-b border-border px-4 py-4">
      <div className="mb-1 text-[13px] font-medium">四维雷达图</div>
      <div className="mb-2 text-[11px] text-muted-foreground">
        TR 任务回应 · CC 连贯衔接 · LR 词汇 · GRA 语法(满分 9)
      </div>
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="72%">
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis dataKey="dim" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
            <PolarRadiusAxis
              domain={[0, 9]}
              tickCount={4}
              tick={{ fill: "var(--muted-foreground)", fontSize: 10, opacity: 0.6 }}
              axisLine={false}
            />
            {hasT1 && (
              <Radar
                name="Task 1"
                dataKey="T1"
                stroke="var(--chart-1)"
                fill="var(--chart-1)"
                fillOpacity={0.22}
                strokeWidth={2}
              />
            )}
            {hasT2 && (
              <Radar
                name="Task 2"
                dataKey="T2"
                stroke="var(--chart-4)"
                fill="var(--chart-4)"
                fillOpacity={0.22}
                strokeWidth={2}
              />
            )}
            <Legend />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** 单个 task 的批改详情(DONE 时渲染全部内容) */
function TaskBlock({ task, ai }: { task: "T1" | "T2"; ai: AiGrading | null }) {
  const label = task === "T1" ? "Task 1 · 图表作文" : "Task 2 · 议论文";

  if (!ai || ai.status === "PENDING") {
    return (
      <div className="border-b border-border px-4 py-4 text-[13px] text-muted-foreground">
        {label} · 等待批改
      </div>
    );
  }

  if (ai.status === "RUNNING") {
    return (
      <div className="border-b border-border px-4 py-4 text-[13px] text-warning">
        <Spinner className="mr-2 align-[-2px]" />
        {label} · AI 正在批改…
      </div>
    );
  }

  if (ai.status === "FAILED") {
    const empty = ai.error?.includes("未作答");
    return (
      <div className="border-b border-border px-4 py-4">
        <div className="text-[13px] font-medium text-destructive">{label} · 批改失败</div>
        <div className="mt-1 break-all text-xs text-muted-foreground">
          {empty ? "该任务未作答,无法批改。" : ai.error ?? "原因未知"}
        </div>
      </div>
    );
  }

  /* DONE */
  const dims = ai.dimensions ?? [];
  return (
    <div className="border-b border-border px-4 py-4 last:border-0">
      {/* 标题行:band + 元数据 */}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-[13px] font-medium">
          {label}
          {ai.overall != null && (
            <span className="ml-2 rounded-md bg-primary/10 px-2 py-0.5 text-[15px] font-bold text-primary">
              {ai.overall.toFixed(1)}
            </span>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground">
          {ai.wordCount ? `${ai.wordCount} 词 · ` : ""}
          {ai.model ?? ""}
          {ai.tokens ? ` · ${ai.tokens} tokens` : ""}
          {ai.latencyMs ? ` · ${(ai.latencyMs / 1000).toFixed(0)}s` : ""}
          {ai.retryCount ? ` · 重试 ${ai.retryCount} 次` : ""}
        </div>
      </div>

      {/* 四维诊断卡 */}
      {dims.length > 0 && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {dims.map((d) => (
            <div key={d.name} className="rounded-lg border border-border/70 p-3">
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-[13px] font-medium" title={DIM_LABEL[d.name]}>
                  {d.name}
                  <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                    {DIM_LABEL[d.name]?.split(" ")[1] ?? ""}
                  </span>
                </div>
                <div className="text-lg font-bold text-primary">{d.band.toFixed(1)}</div>
              </div>
              {d.comment && (
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{d.comment}</p>
              )}
              {d.evidence.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {d.evidence.map((ev, i) => (
                    <li
                      key={i}
                      className="border-l-2 border-primary/30 pl-2 text-xs italic leading-relaxed text-muted-foreground"
                    >
                      “{ev}”
                    </li>
                  ))}
                </ul>
              )}
              {d.improvement && (
                <p className="mt-2 rounded-md bg-warning/10 px-2 py-1.5 text-xs font-medium leading-relaxed text-warning">
                  <span className="font-medium">建议：</span>
                  {d.improvement}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 亮点 / 不足 */}
      {(ai.strengths?.length ?? 0) + (ai.weaknesses?.length ?? 0) > 0 && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {(ai.strengths?.length ?? 0) > 0 && (
            <div className="rounded-lg border border-border/70 p-3">
              <div className="text-xs font-medium text-success">亮点</div>
              <ul className="mt-1.5 space-y-1 text-[13px] leading-relaxed text-muted-foreground">
                {ai.strengths!.map((s, i) => (
                  <li key={i} className="flex gap-1.5">
                    <span className="shrink-0 text-success">+</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(ai.weaknesses?.length ?? 0) > 0 && (
            <div className="rounded-lg border border-border/70 p-3">
              <div className="text-xs font-medium text-warning">不足</div>
              <ul className="mt-1.5 space-y-1 text-[13px] leading-relaxed text-muted-foreground">
                {ai.weaknesses!.map((s, i) => (
                  <li key={i} className="flex gap-1.5">
                    <span className="shrink-0 text-warning">−</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 问题标注:原句 → 建议 */}
      {(ai.flaggedIssues?.length ?? 0) > 0 && (
        <div className="mt-3 rounded-lg border border-border/70 p-3">
          <div className="text-xs font-medium text-muted-foreground">
            问题标注({ai.flaggedIssues!.length})
          </div>
          <div className="mt-2 space-y-2">
            {ai.flaggedIssues!.map((f, i) => (
              <div key={i} className="rounded-md bg-muted/50 px-3 py-2 text-[13px] leading-relaxed">
                <span className="mr-2 inline-block rounded bg-destructive/10 px-1.5 py-0.5 align-[1px] text-[11px] text-destructive">
                  {ISSUE_TYPE_LABEL[f.type] ?? f.type}
                </span>
                {f.quote && (
                  <span className="text-destructive line-through decoration-destructive/30">
                    {f.quote}
                  </span>
                )}
                {f.quote && f.suggestion && (
                  <span className="mx-1.5 text-muted-foreground">→</span>
                )}
                {f.suggestion && <span className="text-success">{f.suggestion}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 改写范文(默认折叠) */}
      {ai.rewrittenSample && (
        <details className="mt-3 rounded-lg border border-border bg-success/5">
          <summary className="cursor-pointer px-3 py-2 text-[13px] font-medium text-success">
            查看同题高分改写范文
          </summary>
          <pre className="max-h-[420px] overflow-auto border-t border-border px-3 py-3 text-[13px] leading-relaxed whitespace-pre-wrap text-foreground">
            {ai.rewrittenSample}
          </pre>
        </details>
      )}
    </div>
  );
}

/* ---------- 主组件 ---------- */

export default function WritingGradingCard({
  initial,
  essays,
}: {
  /** 服务端首帧快照(GET /api/grading/[recordId] 的返回) */
  initial: GradingStatusDTO;
  /** 两篇作文是否有内容(决定失败时是否给「重试」入口) */
  essays: { T1: boolean; T2: boolean };
}) {
  const router = useRouter();
  const [status, setStatus] = useState<GradingStatusDTO>(initial);
  const [triggering, setTriggering] = useState(false);
  /** 本次挂载后是否经历过 running(从 running → 静止时刷新服务端数据) */
  const wasRunning = useRef(initial.running);

  const refresh = useCallback(async (): Promise<GradingStatusDTO | null> => {
    try {
      const res = await fetch(`/api/grading/${initial.recordId}`, { cache: "no-store" });
      if (!res.ok) return null;
      const data = (await res.json()) as GradingStatusDTO;
      setStatus(data);
      return data;
    } catch {
      return null;
    }
  }, [initial.recordId]);

  /* 批改进行中:4s 轮询 */
  useEffect(() => {
    if (!status.running) return;
    const t = setInterval(() => void refresh(), 4000);
    return () => clearInterval(t);
  }, [status.running, refresh]);

  /* running → 静止:band/总分已在服务端回写,刷新页面数据 */
  useEffect(() => {
    if (wasRunning.current && !status.running) {
      wasRunning.current = false;
      router.refresh();
    }
    if (status.running) wasRunning.current = true;
  }, [status.running, router]);

  const trigger = useCallback(
    async (force: boolean) => {
      setTriggering(true);
      try {
        await fetch(
          `/api/grading/${initial.recordId}${force ? "?force=1" : ""}`,
          { method: "POST" },
        );
        // after() 异步启动有延迟:轮询到 RUNNING 才停,最多等 ~5s
        for (let i = 0; i < 6; i++) {
          await sleep(800);
          const s = await refresh();
          if (s?.running) break;
        }
      } finally {
        setTriggering(false);
      }
    },
    [initial.recordId, refresh],
  );

  const { T1, T2, running } = status;
  const everGraded = T1 != null || T2 != null;
  const allDone = T1?.status === "DONE" && T2?.status === "DONE";
  const firstError =
    (essays.T2 === false ? "Task 2 未作答" : T2?.status === "FAILED" ? T2.error : null) ??
    (essays.T1 === false ? "Task 1 未作答" : T1?.status === "FAILED" ? T1.error : null) ??
    null;
  const canRetry = !running && !allDone && (essays.T1 || essays.T2);

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3 text-[15px] font-medium">
        AI 写作批改 · 四维诊断(TR / CC / LR / GRA)
      </div>

      {/* 状态条 */}
      <div className="border-b border-border px-4 py-3">
        {running ? (
          <div className="flex items-center gap-2 text-[13px] text-warning">
            <Spinner />
            AI 批改进行中,完成后自动刷新(通常 10–60 秒)…
          </div>
        ) : allDone ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-[13px] text-success">
              批改完成
              {status.bandScore != null && status.bandScore > 0 && (
                <span className="ml-2 font-bold">写作 Band {status.bandScore.toFixed(1)}</span>
              )}
            </div>
            <button
              type="button"
              disabled={triggering}
              onClick={() => void trigger(true)}
              className="text-xs text-muted-foreground underline-offset-2 hover:text-primary hover:underline disabled:opacity-50"
            >
              {triggering ? "提交中…" : "重新批改"}
            </button>
          </div>
        ) : everGraded && firstError ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0 flex-1 text-[13px] text-destructive">
              批改未完成:
              <span className="ml-1 break-all text-xs text-muted-foreground">{firstError}</span>
            </div>
            {canRetry && (
              <button
                type="button"
                disabled={triggering}
                onClick={() => void trigger(true)}
                className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {triggering ? "提交中…" : "重试批改"}
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-[13px] text-muted-foreground">
              写作尚未批改。AI 将按雅思官方四维标准给出分数、逐维诊断与高分范文。
            </div>
            <button
              type="button"
              disabled={triggering}
              onClick={() => void trigger(false)}
              className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {triggering ? "提交中…" : "开始 AI 批改"}
            </button>
          </div>
        )}
      </div>

      {/* 雷达图(至少一个 task 完成才显示) */}
      <RadarBlock t1={T1} t2={T2} />

      {/* 两个 task 的详情 */}
      <TaskBlock task="T1" ai={T1} />
      <TaskBlock task="T2" ai={T2} />
    </div>
  );
}
