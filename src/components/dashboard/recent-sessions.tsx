/**
 * recent-sessions.tsx — 仪表盘「最近模考」列表(客户端筛选)
 *
 * 数据由服务端 / 页面合并下发(整套场次 + 单科独立交卷,统一行形状),
 * 本组件只做筛选与渲染:
 *   - 单排 chips:全部 / 整套 / 听力 / 阅读 / 写作(默认全部)
 *   - 整套 + 三科可多选(并集);任一选中即与「全部」互斥,全不选 = 全部
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

/** 筛选 token:set = 整套场次;其余为单科科目值 */
type FilterToken = "set" | Subject;

/** 筛选 chips:全部 + 可多选的 整套/听力/阅读/写作(口语预留未上线,不出选项) */
const FILTER_CHIPS: ReadonlyArray<{ v: FilterToken; label: string }> = [
  { v: "set", label: "整套" },
  { v: "listening", label: "听力" },
  { v: "reading", label: "阅读" },
  { v: "writing", label: "写作" },
];

const fmtDuration = (sec: number) => `${Math.round(sec / 60)} 分钟`;
const fmtTime = (ms: number) =>
  new Date(ms).toLocaleString("zh-CN", { hour12: false });

const CHIP =
  "rounded-full border px-2.5 py-1 text-xs transition-colors";
const CHIP_ON = `${CHIP} border-primary bg-primary/10 text-primary`;
const CHIP_OFF = `${CHIP} border-border text-muted-foreground hover:border-primary hover:text-primary`;

export function RecentSessionsList({ rows }: { rows: RecentExamRow[] }) {
  /** 已选筛选 token;空 = 全部(与全部互斥) */
  const [selected, setSelected] = useState<FilterToken[]>([]);

  const all = selected.length === 0;
  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (all) return true;
        // 整套 token 只匹配整套行;科目 token 只匹配对应单科行 → 多选即并集
        return r.kind === "set"
          ? selected.includes("set")
          : selected.includes(r.subject as FilterToken);
      }),
    [rows, all, selected],
  );

  const toggleToken = (v: FilterToken) =>
    setSelected((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v],
    );

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <h3 className="text-[15px]">最近模考</h3>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className={all ? CHIP_ON : CHIP_OFF}
            onClick={() => setSelected([])}
          >
            全部
          </button>
          {FILTER_CHIPS.map((t) => (
            <button
              key={t.v}
              type="button"
              className={selected.includes(t.v) ? CHIP_ON : CHIP_OFF}
              onClick={() => toggleToken(t.v)}
            >
              {t.label}
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
                        单科 · {FILTER_CHIPS.find((c) => c.v === r.subject)?.label ?? r.subject}
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
