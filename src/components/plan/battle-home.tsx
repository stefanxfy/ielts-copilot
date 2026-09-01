/**
 * battle-home.tsx — 备考作战主页(P7 §3.3 三栏)
 *
 * 左:考试倒计时 + ⓘ考前须知;中:今日任务清单(勾选判定,服务端算好传入);
 * 右:打卡日历 + 今日心得 + AI 昨日总结卡(挂载时自动触发·幂等,失败/重跑走 force)。
 *
 * 注意:本组件 import type 自 checklist.ts(类型擦除,不会把 better-sqlite3
 * 拉进客户端 bundle);判定逻辑全部在服务端 page 完成后经 props 下发。
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { AiSummary, PunchRules } from "@/db/schema";
import type { TaskCheck } from "@/lib/study/checklist";
import { daysBetween, todayStr } from "@/lib/study/date";
import { ExamNoticeDialog } from "@/components/plan/exam-notice";
import { PunchCalendar } from "@/components/plan/punch-calendar";

const CARD = "rounded-xl border border-[#dfe4ec] bg-white p-5";
const BTN =
  "rounded-md border border-[#dfe4ec] bg-white px-3 py-1.5 text-[13px] text-[#1c2330] transition-colors hover:border-[#1a6feb] hover:text-[#1a6feb] disabled:cursor-not-allowed disabled:opacity-50";
const BTN_PRIMARY =
  "rounded-md bg-[#1a6feb] px-3.5 py-1.5 text-[13px] text-white transition-colors hover:bg-[#0d4fa8] disabled:cursor-not-allowed disabled:opacity-50";
const HINT = "text-xs text-[#8a93a2]";

const TASK_LABEL: Record<string, string> = {
  words: "背单词",
  listening: "听力",
  reading: "阅读",
  writing: "写作",
  speaking: "口语",
  set: "完整套卷",
};
const SLOT_LABEL: Record<string, string> = {
  morning: "上午",
  noon: "中午",
  afternoon: "下午",
  evening: "晚上",
};

export interface BattleHomeProps {
  examDate: string;
  weekNo: number;
  phase?: { name: string; focus: string };
  tasks: TaskCheck[];
  punchRules: PunchRules;
  /** 今日 daily 心得(已存内容) */
  initialJournal: string;
  /** 昨日 AI 总结(昨日 journal 行的 ai_summary_json,无则 null) */
  initialAiSummary: AiSummary | null;
}

export function BattleHome({
  examDate,
  weekNo,
  phase,
  tasks,
  punchRules,
  initialJournal,
  initialAiSummary,
}: BattleHomeProps) {
  const router = useRouter();
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [journal, setJournal] = useState(initialJournal);
  const [journalSaving, setJournalSaving] = useState(false);
  const [aiSummary, setAiSummary] = useState<AiSummary | null>(initialAiSummary);
  const [rerunning, setRerunning] = useState(false);
  const autoTriggered = useRef(false);

  const today = todayStr();
  const daysLeft = daysBetween(examDate, today);

  /** 自动触发昨日总结(幂等:已生成过则服务端 skipped;失败静默不打扰) */
  useEffect(() => {
    if (autoTriggered.current) return;
    autoTriggered.current = true;
    void (async () => {
      try {
        const resp = await fetch("/api/study-summary/yesterday", { method: "POST" });
        if (!resp.ok) return;
        const data = (await resp.json()) as {
          ok?: boolean;
          skipped?: boolean;
          summary?: AiSummary;
        };
        if (data.ok && !data.skipped && data.summary) {
          setAiSummary(data.summary);
          toast.info("昨日学习总结已生成");
        }
      } catch {
        /* 静默:自动路径失败不打扰 */
      }
    })();
  }, []);

  async function rerunSummary() {
    setRerunning(true);
    try {
      const resp = await fetch("/api/study-summary/yesterday?force=1", { method: "POST" });
      const data = (await resp.json()) as {
        ok?: boolean;
        failed?: boolean;
        reason?: string;
        summary?: AiSummary;
      };
      if (data.ok && data.summary) {
        setAiSummary(data.summary);
        toast.success("已重新生成昨日总结");
      } else {
        toast.error(data.reason ?? "重跑失败");
      }
    } catch {
      toast.error("重跑请求失败(服务未响应)");
    } finally {
      setRerunning(false);
    }
  }

  async function saveJournal() {
    setJournalSaving(true);
    try {
      const resp = await fetch("/api/study-journals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ journalDate: today, period: "daily", content: journal }),
      });
      const data = (await resp.json()) as { ok?: boolean; error?: string };
      if (!resp.ok || !data.ok) {
        toast.error(data.error ?? "心得保存失败");
        return;
      }
      toast.success("今日心得已保存");
      router.refresh(); // 打卡日历的心得小点同步
    } catch {
      toast.error("心得保存失败(服务未响应)");
    } finally {
      setJournalSaving(false);
    }
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-3">
      {/* ===== 左栏:倒计时 + 考前须知 ===== */}
      <div className={`${CARD} flex flex-col`}>
        <div className="flex items-start justify-between">
          <h3 className="text-[15px]">考试倒计时</h3>
          <button
            type="button"
            aria-label="考前须知"
            title="考前须知"
            className="flex h-5 w-5 items-center justify-center rounded-full border border-[#dfe4ec] font-serif text-[11px] italic leading-none text-[#8a93a2] transition-colors hover:border-[#1a6feb] hover:text-[#1a6feb]"
            onClick={() => setNoticeOpen(true)}
          >
            i
          </button>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-[44px] font-semibold leading-none text-[#1a6feb]">
            {Math.max(0, daysLeft)}
          </span>
          <span className="text-[13px] text-[#5b6574]">天</span>
        </div>
        <p className={`${HINT} mt-2`}>考试日期 {examDate}</p>
        {daysLeft < 0 && (
          <p className="mt-1 text-xs text-[#a06a12]">考试日已过,考完可归档再战(设置页/调整计划)</p>
        )}

        <div className="mt-4 rounded-lg bg-[#f7f9fc] p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-[#8a93a2]">第 {weekNo} 周</span>
            {phase && <span className="text-[12px] font-medium text-[#1c2330]">{phase.name}</span>}
          </div>
          {phase && <p className="mt-1.5 text-[13px] leading-relaxed text-[#3c4656]">{phase.focus}</p>}
          {!phase && (
            <p className="mt-1.5 text-[13px] text-[#8a93a2]">当前周已超出计划范围,可调整计划续期</p>
          )}
        </div>
      </div>

      {/* ===== 中栏:今日任务 ===== */}
      <div className={CARD}>
        <div className="flex items-center justify-between">
          <h3 className="text-[15px]">今日任务</h3>
          <button
            type="button"
            className={HINT + " hover:text-[#1a6feb]"}
            onClick={() => router.refresh()}
          >
            刷新
          </button>
        </div>
        <p className={`${HINT} mt-1 mb-3`}>科目任务按本周累计判定;背单词按当日判定</p>
        {tasks.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-[#8a93a2]">当前周没有排期任务</p>
        ) : (
          <div className="grid gap-2.5">
            {tasks.map((t, i) => (
              <div
                key={i}
                className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 ${
                  t.exempt
                    ? "border-[#eef0f4] bg-[#fafbfd] opacity-70"
                    : t.done
                      ? "border-[#cde8da] bg-[#f3fbf7]"
                      : "border-[#e7ecf3] bg-white"
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] ${
                    t.exempt
                      ? "border border-[#dfe4ec] text-[#c3cad4]"
                      : t.done
                        ? "bg-[#1a9e5c] text-white"
                        : "border border-[#c3cad4] text-transparent"
                  }`}
                >
                  ✓
                </span>
                <div className="flex-1">
                  <div className="text-[13px] text-[#1c2330]">
                    {TASK_LABEL[t.type] ?? t.type} {t.count}
                    {t.unit}
                    {t.slot ? <span className="ml-1.5 text-[#8a93a2]">· {SLOT_LABEL[t.slot] ?? t.slot}</span> : null}
                  </div>
                  <div className="mt-0.5 text-[11px] text-[#8a93a2]">
                    {t.exempt
                      ? "暂无追踪(P8 口语上线后开启)"
                      : `进度 ${t.progress}/${t.count}`}
                  </div>
                </div>
                {!t.exempt && (
                  <span
                    className={`text-[12px] font-medium ${
                      t.done ? "text-[#18925c]" : "text-[#a06a12]"
                    }`}
                  >
                    {t.done ? "已完成" : "进行中"}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== 右栏:打卡日历 + 心得 + AI 总结 ===== */}
      <div className="grid gap-4">
        <div className={CARD}>
          <h3 className="mb-3 text-[15px]">打卡日历</h3>
          <PunchCalendar rules={punchRules} examDate={examDate} />
        </div>

        <div className={CARD}>
          <h3 className="mb-2.5 text-[15px]">今日心得</h3>
          <textarea
            className="min-h-[72px] w-full resize-y rounded-md border border-[#dfe4ec] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-[#1a6feb]"
            maxLength={5000}
            placeholder="今天练了什么、卡在哪、有什么收获…(选填)"
            value={journal}
            onChange={(e) => setJournal(e.target.value)}
          />
          <div className="mt-2 flex items-center justify-between">
            <span className={HINT}>{journal.length}/5000</span>
            <button type="button" className={BTN} onClick={saveJournal} disabled={journalSaving}>
              {journalSaving ? "保存中…" : "保存心得"}
            </button>
          </div>
        </div>

        <div className={CARD}>
          <div className="flex items-center justify-between">
            <h3 className="text-[15px]">AI 昨日总结</h3>
            <button type="button" className={BTN} onClick={rerunSummary} disabled={rerunning}>
              {rerunning ? "生成中…" : "重跑"}
            </button>
          </div>
          {aiSummary ? (
            <div className="mt-2.5">
              <p className="text-[13px] leading-relaxed text-[#3c4656]">{aiSummary.summary}</p>
              {aiSummary.suggestions.length > 0 && (
                <ul className="mt-2.5 grid gap-1.5">
                  {aiSummary.suggestions.map((s, i) => (
                    <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-[#3c4656]">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1a6feb]" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className={`${HINT} mt-2.5`}>
                基于 {aiSummary.basedOn.submissions} 次交卷 · {aiSummary.basedOn.words} 个词
                {aiSummary.basedOn.journalExcerpt ? " · 含你的心得" : ""} · {aiSummary.model}
              </p>
            </div>
          ) : (
            <p className={`${HINT} mt-2.5`}>
              昨日有学习记录时自动生成;现在也可以点「重跑」试试。
            </p>
          )}
        </div>
      </div>

      <ExamNoticeDialog open={noticeOpen} onClose={() => setNoticeOpen(false)} />
    </div>
  );
}
