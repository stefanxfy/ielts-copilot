/**
 * recent-sessions.tsx — 仪表盘「最近模考」列表(客户端筛选)
 *
 * 数据由服务端 / 页面合并下发(整套场次 + 单科独立交卷,统一行形状),
 * 本组件只做筛选与渲染:
 *   - 模式切换:全部 / 整套 / 单科(默认全部)
 *   - 科目多选:听力/阅读/写作/口语,不选 = 不过滤(只作用于单科行)
 * 无新请求:数据量小(本地库),一次下发客户端过滤即可。
 */
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Subject } from "@/db/schema";

/** 统一行形状(服务端合并好下发) */
export interface RecentExamRow {
  kind: "set" | "single";
  /** 整套 = sessionId;单科 = exam_records.id */
  key: string;
  title: string;
  /** 单科行有值;整套行 null */
  subject: Subject | null;
  /** 整套 = 场次状态;单科恒 SUBMITTED */
  status: string;
  /** 整套 = overallBand;单科 = bandScore(写作占位 0 视为待批改) */
  band: number | null;
  usedSec: number | null;
  /** 整套 = startedAt;单科 = submittedAt ?? startedAt */
  timeMs: number;
  /** 整套 = /session/<id>;单科 = /records/<id> */
  href: string;
}

type KindFilter = "all" | "set" | "single";

const KIND_TABS: ReadonlyArray<{ v: KindFilter; label: string }> = [
  { v: "all", label: "全部" },
  { v: "set", label: "整套" },
  { v: "single", label: "单科" },
];

/** 可筛选科目(与 SUBJECTS 枚举一致;口语预留未上线,不出筛选项) */
const SUBJECT_FILTERS: ReadonlyArray<[Subject, string]> = [
  ["listening", "听力"],
  ["reading", "阅读"],
  ["writing", "写作"],
];

const fmtDuration = (sec: number) => `${Math.round(sec / 60)} 分钟`;
const fmtTime = (ms: number) =>
  new Date(ms).toLocaleString("zh-CN", { hour12: false });

const CHIP =
  "rounded-full border px-2.5 py-1 text-xs transition-colors";
const CHIP_ON = `${CHIP} border-primary bg-primary/10 text-primary`;
const CHIP_OFF = `${CHIP} border-border text-muted-foreground hover:border-primary hover:text-primary`;

export function RecentSessionsList({ rows }: { rows: RecentExamRow[] }) {
  const [kind, setKind] = useState<KindFilter>("all");
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (kind !== "all" && r.kind !== kind) return false;
        // 科目多选只作用于单科行;不选 = 不过滤
        if (
          r.kind === "single" &&
          subjects.length > 0 &&
          (!r.subject || !subjects.includes(r.subject))
        )
          return false;
        return true;
      }),
    [rows, kind, subjects],
  );

  const toggleSubject = (s: Subject) =>
    setSubjects((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <h3 className="text-[15px]">最近模考</h3>
        <div className="flex items-center gap-1.5">
          {KIND_TABS.map((t) => (
            <button
              key={t.v}
              type="button"
              className={kind === t.v ? CHIP_ON : CHIP_OFF}
              onClick={() => setKind(t.v)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">科目(可多选,不选=全部):</span>
          {SUBJECT_FILTERS.map(([s, label]) => (
            <button
              key={s}
              type="button"
              className={subjects.includes(s) ? CHIP_ON : CHIP_OFF}
              onClick={() => toggleSubject(s)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card px-4 py-2">
        {filtered.length === 0 ? (
          <div className="py-4 text-center text-xs text-muted-foreground">
            {rows.length === 0
              ? "暂无模考记录 · 从「机考模拟」开始第一场"
              : "当前筛选条件下没有记录"}
          </div>
        ) : (
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-2.5 py-2 font-medium">卷 / 套</th>
                <th className="px-2.5 py-2 font-medium">类型</th>
                <th className="px-2.5 py-2 font-medium">状态</th>
                <th className="px-2.5 py-2 font-medium">分数</th>
                <th className="px-2.5 py-2 font-medium">用时</th>
                <th className="px-2.5 py-2 font-medium">时间</th>
                <th className="px-2.5 py-2 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.key} className="border-b border-border last:border-0">
                  <td className="px-2.5 py-2.5">{r.title}</td>
                  <td className="px-2.5 py-2.5">
                    {r.kind === "set" ? (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                        整套
                      </span>
                    ) : (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        单科 · {SUBJECT_FILTERS.find(([s]) => s === r.subject)?.[1] ?? r.subject}
                      </span>
                    )}
                  </td>
                  <td className="px-2.5 py-2.5">
                    {r.kind === "set" ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] ${
                          r.status === "COMPLETED"
                            ? "bg-success/10 text-success"
                            : r.status === "ABANDONED"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-warning/15 text-warning"
                        }`}
                      >
                        {r.status === "COMPLETED"
                          ? "已完成"
                          : r.status === "ABANDONED"
                            ? "已放弃"
                            : "进行中"}
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">已完成</span>
                    )}
                  </td>
                  <td className="px-2.5 py-2.5 font-semibold text-primary">
                    {r.band != null && r.band > 0 ? r.band.toFixed(1) : "待批改"}
                  </td>
                  <td className="px-2.5 py-2.5">
                    {r.usedSec != null ? fmtDuration(r.usedSec) : "—"}
                  </td>
                  <td className="px-2.5 py-2.5 text-muted-foreground">{fmtTime(r.timeMs)}</td>
                  <td className="px-2.5 py-2.5">
                    <Link href={r.href} className="text-primary hover:underline">
                      {r.kind === "set" ? "场次成绩单 →" : "成绩详情 →"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
