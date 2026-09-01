/**
 * punch-calendar.tsx — 打卡日历(月视图,纯 React 手写,不引新依赖)
 *
 * 浅绿 = 单达标 · 深绿 = 双达标(阈值来自 punch_rules,由服务端读好传入);
 * 心得日底部橙色小点;考试日描边高亮;未来日不渲染打卡色。
 *
 * 注意:打卡判定在此用本地小函数实现 —— 不 import checklist.ts /
 * settings.ts(它们引用 better-sqlite3,进客户端 bundle 会炸);
 * PunchRules / 判定语义与 checklist.ts punchOfDay 保持一字不差。
 */
"use client";

import { useEffect, useState } from "react";
import type { PunchRules } from "@/db/schema";
import { todayStr } from "@/lib/study/date";

/* ---------- 本地类型与判定(与 checklist.ts punchOfDay 同语义) ---------- */

interface ActivityRow {
  activityDate: string;
  examSetCompletionCount: number;
  listeningSubmissionCount: number;
  readingSubmissionCount: number;
  writingSubmissionCount: number;
  speakingSubmissionCount: number;
  memorizedWordCount: number;
}

function levelOf(a: ActivityRow | undefined, rules: PunchRules): 0 | 1 | 2 {
  if (!a) return 0;
  const submissions =
    a.listeningSubmissionCount +
    a.readingSubmissionCount +
    a.writingSubmissionCount +
    a.speakingSubmissionCount +
    a.examSetCompletionCount;
  const punched =
    (submissions >= rules.submissionMin ? 1 : 0) +
    (a.memorizedWordCount >= rules.wordsMin ? 1 : 0);
  if (punched === 0) return 0;
  return rules.bothForFull ? (punched === 2 ? 2 : 1) : 2;
}

const LEVEL_CLS: Record<0 | 1 | 2, string> = {
  0: "text-[#3c4656]",
  1: "bg-[#c9efdc] text-[#116b45]",
  2: "bg-[#1a9e5c] text-white",
};

const pad = (n: number) => String(n).padStart(2, "0");
const WEEK_HEADS = ["一", "二", "三", "四", "五", "六", "日"];

/* ---------- 组件 ---------- */

export function PunchCalendar({
  rules,
  examDate,
}: {
  rules: PunchRules;
  examDate?: string;
}) {
  const now = new Date();
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() + 1 });
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [journalDates, setJournalDates] = useState<Set<string>>(new Set());

  const monthFrom = `${view.y}-${pad(view.m)}-01`;
  const lastDay = new Date(view.y, view.m, 0).getDate();
  const monthTo = `${view.y}-${pad(view.m)}-${pad(lastDay)}`;

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [aRes, jRes] = await Promise.all([
        fetch(`/api/study-activities?from=${monthFrom}&to=${monthTo}`),
        fetch(`/api/study-journals?from=${monthFrom}&to=${monthTo}`),
      ]);
      if (!alive) return;
      if (aRes.ok) {
        const data = (await aRes.json()) as { activities?: ActivityRow[] };
        setRows(data.activities ?? []);
      }
      if (jRes.ok) {
        const data = (await jRes.json()) as {
          journals?: { journalDate: string }[];
        };
        setJournalDates(new Set((data.journals ?? []).map((j) => j.journalDate)));
      }
    })();
    return () => {
      alive = false;
    };
  }, [monthFrom, monthTo]);

  const byDate = new Map(rows.map((r) => [r.activityDate, r]));
  const today = todayStr();

  const offset = (new Date(view.y, view.m - 1, 1).getDay() + 6) % 7; // 周一首
  const isCurrentMonth = view.y === now.getFullYear() && view.m === now.getMonth() + 1;

  const nav = (delta: number) =>
    setView(({ y, m }) => {
      const nm = m + delta;
      return nm < 1 ? { y: y - 1, m: 12 } : nm > 12 ? { y: y + 1, m: 1 } : { y, m: nm };
    });

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <div className="text-[13px] font-medium">
          {view.y} 年 {view.m} 月
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="上一月"
            className="flex h-6 w-6 items-center justify-center rounded-md text-[#5b6574] transition-colors hover:bg-[#f1f4f9] hover:text-[#1a6feb]"
            onClick={() => nav(-1)}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="下一月"
            disabled={isCurrentMonth}
            className="flex h-6 w-6 items-center justify-center rounded-md text-[#5b6574] transition-colors hover:bg-[#f1f4f9] hover:text-[#1a6feb] disabled:cursor-not-allowed disabled:opacity-30"
            onClick={() => nav(1)}
          >
            ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEK_HEADS.map((h) => (
          <div key={h} className="pb-1 text-[11px] text-[#8a93a2]">
            {h}
          </div>
        ))}
        {Array.from({ length: offset }).map((_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {Array.from({ length: lastDay }).map((_, i) => {
          const day = i + 1;
          const date = `${view.y}-${pad(view.m)}-${pad(day)}`;
          const future = date > today;
          const level = future ? 0 : levelOf(byDate.get(date), rules);
          const hasJournal = journalDates.has(date);
          return (
            <div key={date} className="flex justify-center">
              <div
                className={`relative flex h-7 w-7 items-center justify-center rounded-full text-[12px] ${LEVEL_CLS[level]} ${
                  date === today ? "ring-1 ring-[#1a6feb] ring-offset-1" : ""
                } ${
                  date === examDate ? "outline outline-1 outline-dashed outline-[#f0a03c] outline-offset-2" : ""
                } ${future ? "opacity-40" : ""}`}
                title={
                  level > 0
                    ? `${date}:${level === 2 ? "双达标" : "单达标"}${hasJournal ? " · 有心得" : ""}`
                    : date
                }
              >
                {day}
                {hasJournal && (
                  <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-[#f0a03c]" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#8a93a2]">
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-[#c9efdc]" />
          单达标
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-[#1a9e5c]" />
          双达标
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#f0a03c]" />
          有心得
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full outline outline-1 outline-dashed outline-[#f0a03c]" />
          考试日
        </span>
      </div>
    </div>
  );
}
