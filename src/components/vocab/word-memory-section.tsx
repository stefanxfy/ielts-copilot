"use client";

/**
 * WordMemorySection — 单词记忆轨迹(词表详情面板内嵌一节)
 *
 * 按 wordId 拉 /api/vocab-memory?wordId=,服务端用评分流水重放完整 FSRS
 * 遗忘路径;未加入计划的词显示"尚未学过"占位。随选中词切换懒加载,
 * 每词只拉一次(模块内 Map 缓存,切走再切回不重复请求)。
 */
import { useEffect, useState } from "react";
import type { TrailPoint } from "@/components/vocab/today-memory-panel";

interface WordMemory {
  studied: boolean;
  word?: { word: string; phoneticUk: string | null; translation: string[] };
  progress?: {
    reps: number;
    lapses: number;
    due: number;
    lastReviewAt: number | null;
    stateName: string;
    stability: number;
    difficulty: number;
    difficultyLabel: string;
  };
  logsCount?: number;
  trail?: TrailPoint[];
}

const RATING_META: Record<number, { label: string; cls: string }> = {
  1: { label: "不认识", cls: "tmr-again" },
  2: { label: "模糊", cls: "tmr-hard" },
  3: { label: "认识", cls: "tmr-good" },
};

function fmtDue(due: number): string {
  const diff = due - Date.now();
  if (diff <= 0) return "已到期";
  const m = Math.round(diff / 60000);
  if (m < 60) return `${m} 分钟后`;
  if (m < 1440) return `${Math.floor(m / 60)} 小时后`;
  const d = new Date(due);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
function fmtGap(ms: number): string {
  const m = Math.round(ms / 60000);
  if (m < 1) return "刚刚";
  if (m < 60) return `${m} 分钟`;
  if (m < 1440) return `${(m / 60).toFixed(1)} 小时`;
  return `${(m / 1440).toFixed(1)} 天`;
}
function fmtTime(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 模块级缓存:wordId → 已拉取数据(本页会话内不重复请求) */
const cache = new Map<number, WordMemory>();

export function WordMemorySection({ wordId, word }: { wordId: number; word: string }) {
  const [data, setData] = useState<WordMemory | null>(cache.get(wordId) ?? null);
  const [loading, setLoading] = useState(!cache.has(wordId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hit = cache.get(wordId);
    if (hit) {
      // 微任务延迟置态,规避 set-state-in-effect(同步 setState 会级联渲染)
      void Promise.resolve().then(() => {
        setData(hit);
        setLoading(false);
        setError(null);
      });
      return;
    }
    let aborted = false;
    fetch(`/api/vocab-memory?wordId=${wordId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: WordMemory) => {
        if (aborted) return;
        cache.set(wordId, d);
        setData(d);
      })
      .catch((e) => {
        if (!aborted) setError(e instanceof Error ? e.message : "加载失败");
      })
      .finally(() => {
        if (!aborted) setLoading(false);
      });
    // 微任务延迟置态,规避 set-state-in-effect;fetch 本身仍立即发起
    void Promise.resolve().then(() => {
      if (!aborted) {
        setLoading(true);
        setError(null);
      }
    });
    return () => {
      aborted = true;
    };
  }, [wordId]);

  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
        记忆轨迹{data?.studied && data.progress ? ` · ${data.progress.stateName} · ${data.progress.difficultyLabel}(D ${data.progress.difficulty})` : ""}
      </div>

      {loading && <div className="mt-1 text-[12px] text-muted-foreground">加载中…</div>}
      {error && <div className="mt-1 text-[12px] text-destructive">加载失败:{error}</div>}

      {data && !data.studied && (
        <div className="mt-1 rounded-md border border-dashed border-border px-3 py-2 text-[12px] text-muted-foreground">
          「{word}」尚未加入背词计划,还没有学习记录。
        </div>
      )}

      {data?.studied && data.progress && (
        <div className="mt-1.5 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
            <span className="rounded-full border border-border px-2 py-0.5">
              答题 {data.progress.reps} 次
            </span>
            <span className="rounded-full border border-border px-2 py-0.5">
              答错 {data.progress.lapses} 次
            </span>
            <span className="rounded-full border border-border px-2 py-0.5">
              稳定度 S {data.progress.stability}
            </span>
            <span className="rounded-full border border-border px-2 py-0.5">
              下次 {fmtDue(data.progress.due)}
            </span>
          </div>

          {data.trail && data.trail.length > 0 && (
            <ol className="space-y-0.5">
              {data.trail.map((p, i) => {
                const meta = RATING_META[p.rating];
                return (
                  <li key={i} className="flex items-baseline gap-2 text-[12px]">
                    <span className="w-9 shrink-0 font-mono text-muted-foreground">{fmtTime(p.t)}</span>
                    <span className={`shrink-0 font-semibold ${meta.cls}`}>{meta.label}</span>
                    <span className="truncate text-muted-foreground">
                      {i === 0 ? "首次学习" : `距上次 ${fmtGap(p.gapMs!)}`} → {fmtGap(p.nextDue - p.t)}后到期
                    </span>
                    <span className="ml-auto shrink-0 font-mono text-[11px] text-muted-foreground">
                      D {p.difficulty} · S {p.stability}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
          {data.logsCount === 0 && (
            <div className="text-[12px] text-muted-foreground">
              已加入计划但还没背过——到期后会在复习队列出现。
            </div>
          )}
        </div>
      )}
    </div>
  );
}
