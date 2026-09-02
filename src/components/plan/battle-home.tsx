/**
 * battle-home.tsx — 备考作战主页(P7 §3.3 三栏)
 *
 * 左:考试倒计时 + ⓘ考前须知;中:今日任务清单(勾选判定,服务端算好传入;
 * 打卡日历点选历史日期后动态切换为该日完成情况,回看只读);右:打卡日历 +
 * 今日心得 + AI 昨日总结卡(挂载时自动触发·幂等,失败/重跑走 force)。
 *
 * 注意:本组件 import type 自 checklist.ts(类型擦除,不会把 better-sqlite3
 * 拉进客户端 bundle);判定逻辑全部在服务端 page / API 完成后下发。
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const CARD = "card-float rounded-xl border border-border bg-card p-5";
const BTN =
  "press-bubble rounded-md border border-border bg-card px-3 py-1.5 text-[13px] text-foreground transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50";
const BTN_PRIMARY =
  "press-bubble rounded-md bg-primary px-3.5 py-1.5 text-[13px] text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50";
const HINT = "text-xs text-muted-foreground";

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

/** /api/study-plan-day 响应(历史日任务完成情况) */
interface HistoryDay {
  ok: boolean;
  date: string;
  weekNo: number;
  phase: { name: string; focus: string } | null;
  tasks: TaskCheck[];
  punch: {
    date: string;
    submissions: number;
    words: number;
    level: 0 | 1 | 2;
  };
}

export interface BattleHomeProps {
  /** ACTIVE 计划 id(归档 DELETE 用) */
  planId: number;
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
  planId,
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
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [journal, setJournal] = useState(initialJournal);
  const [journalSaving, setJournalSaving] = useState(false);
  const [aiSummary, setAiSummary] = useState<AiSummary | null>(initialAiSummary);
  const [rerunning, setRerunning] = useState(false);
  const autoTriggered = useRef(false);

  const today = todayStr();

  /* ---------- 历史日回看:日历点选 → 拉取该日完成情况,动态切换中栏 ---------- */
  const [viewDate, setViewDate] = useState(today);
  const [history, setHistory] = useState<HistoryDay | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  // 请求序号防竞态:快速连点只采纳最后一次
  const reqSeq = useRef(0);

  const viewingHistory = viewDate !== today;

  async function loadHistoryDay(date: string) {
    const seq = ++reqSeq.current;
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const resp = await fetch(`/api/study-plan-day?date=${date}`);
      const data = (await resp.json()) as Partial<HistoryDay> & { error?: string };
      if (seq !== reqSeq.current) return; // 已有更新的请求,丢弃
      if (!resp.ok) {
        setHistoryError(data.error ?? "加载失败");
        setHistory(null);
        return;
      }
      setHistory(data as HistoryDay);
    } catch {
      if (seq !== reqSeq.current) return;
      setHistoryError("加载失败(服务未响应)");
      setHistory(null);
    } finally {
      if (seq === reqSeq.current) setHistoryLoading(false);
    }
  }

  function selectDate(date: string) {
    setViewDate(date);
    if (date === today) {
      setHistory(null); // 回到今天:直接用服务端算好的今日 props
      return;
    }
    void loadHistoryDay(date);
  }

  function backToToday() {
    selectDate(today);
  }

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

  /** 归档计划:DELETE 后回 /plan,服务端无 ACTIVE → 自然落到全新向导 */
  async function archivePlan() {
    setArchiving(true);
    try {
      const resp = await fetch(`/api/study-plans/${planId}`, { method: "DELETE" });
      const data = (await resp.json()) as { ok?: boolean; error?: string };
      if (!resp.ok || !data.ok) {
        toast.error(data.error ?? "归档失败");
        return;
      }
      toast.success("计划已归档,学习记录保留");
      router.push("/plan");
      router.refresh();
    } catch {
      toast.error("归档请求失败(服务未响应)");
    } finally {
      setArchiving(false);
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
            className="flex h-5 w-5 items-center justify-center rounded-full border border-border font-serif text-[11px] italic leading-none text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            onClick={() => setNoticeOpen(true)}
          >
            i
          </button>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-[44px] font-semibold leading-none text-primary">
            {Math.max(0, daysLeft)}
          </span>
          <span className="text-[13px] text-muted-foreground">天</span>
        </div>
        <p className={`${HINT} mt-2`}>考试日期 {examDate}</p>
        {daysLeft < 0 && (
          <p className="mt-1 text-xs text-warning">考试日已过,可归档再战或调整日期继续</p>
        )}

        <div className="mt-4 rounded-lg bg-muted/60 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-muted-foreground">第 {weekNo} 周</span>
            {phase && <span className="text-[12px] font-medium text-foreground">{phase.name}</span>}
          </div>
          {phase && <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{phase.focus}</p>}
          {!phase && (
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              当前周已超出计划范围,<button type="button" className="text-primary hover:underline" onClick={() => router.push("/plan?adjust=1")}>调整计划</button>可续期
            </p>
          )}
        </div>

        {/* 计划管理入口:调整(只重排未来周)/ 归档(考完再战) */}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            className={`${BTN} flex-1`}
            onClick={() => router.push("/plan?adjust=1")}
          >
            调整计划
          </button>
          <button type="button" className={BTN} onClick={() => setArchiveOpen(true)}>
            归档
          </button>
        </div>
      </div>

      {/* ===== 中栏:今日任务 / 历史日回看(日历点选动态切换) ===== */}
      <div className={CARD}>
        {viewingHistory ? (
          <>
            <div className="flex items-center justify-between">
              <h3 className="text-[15px]">
                回看 · {viewDate.slice(5).replace("-", "/")} 任务
              </h3>
              <button type="button" className={HINT + " hover:text-primary"} onClick={backToToday}>
                回到今天
              </button>
            </div>
            {historyLoading ? (
              <p className="py-8 text-center text-[13px] text-muted-foreground">加载中…</p>
            ) : historyError ? (
              <p className="py-8 text-center text-[13px] text-warning">{historyError}</p>
            ) : history ? (
              <>
                <p className={`${HINT} mt-1 mb-3`}>
                  第 {history.weekNo} 周 · 阶段:{history.phase?.name ?? "超出计划范围"}
                  {history.punch.level > 0
                    ? ` · 打卡${history.punch.level === 2 ? "双达标" : "单达标"}(交卷 ${history.punch.submissions} · 背词 ${history.punch.words})`
                    : " · 当日未打卡"}
                </p>
                <TaskList tasks={history.tasks} emptyHint="该日所在周没有排期任务" />
              </>
            ) : null}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h3 className="text-[15px]">今日任务</h3>
              <button
                type="button"
                className={HINT + " hover:text-primary"}
                onClick={() => router.refresh()}
              >
                刷新
              </button>
            </div>
            <p className={`${HINT} mt-1 mb-3`}>科目任务按本周累计判定;背单词按当日判定</p>
            <TaskList tasks={tasks} emptyHint="当前周没有排期任务" />
          </>
        )}
      </div>

      {/* ===== 右栏:打卡日历 + 心得 + AI 总结 ===== */}
      <div className="grid gap-4">
        <div className={CARD}>
          <h3 className="mb-3 text-[15px]">打卡日历</h3>
          <PunchCalendar
            rules={punchRules}
            examDate={examDate}
            selectedDate={viewDate}
            onSelectDate={selectDate}
          />
        </div>

        <div className={CARD}>
          <h3 className="mb-2.5 text-[15px]">今日心得</h3>
          <textarea
            className="min-h-[72px] w-full resize-y rounded-md border border-border bg-card px-2.5 py-2 text-[13px] outline-none focus:border-primary"
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
              <p className="text-[13px] leading-relaxed text-muted-foreground">{aiSummary.summary}</p>
              {aiSummary.suggestions.length > 0 && (
                <ul className="mt-2.5 grid gap-1.5">
                  {aiSummary.suggestions.map((s, i) => (
                    <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-muted-foreground">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
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

      {/* 归档确认:归档后学习记录保留,页面回到全新向导 */}
      <Dialog open={archiveOpen} onOpenChange={(o) => !o && setArchiveOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>归档当前备考计划?</DialogTitle>
            <DialogDescription>
              归档后本计划不再生效,页面回到全新向导;已保存的学习记录与打卡历史保留。考前归档一般用于推考后重开计划。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button type="button" className={BTN} onClick={() => setArchiveOpen(false)}>
              取消
            </button>
            <button type="button" className={BTN_PRIMARY} disabled={archiving} onClick={archivePlan}>
              {archiving ? "归档中…" : "确认归档"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** 任务清单渲染(今日 / 历史日回看共用) */
function TaskList({ tasks, emptyHint }: { tasks: TaskCheck[]; emptyHint: string }) {
  if (tasks.length === 0) {
    return <p className="py-8 text-center text-[13px] text-muted-foreground">{emptyHint}</p>;
  }
  return (
    <div className="grid gap-2.5">
      {tasks.map((t, i) => (
        <div
          key={i}
          className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 ${
            t.exempt
              ? "border-border bg-muted/40 opacity-70"
              : t.done
                ? "border-success/30 bg-success/10"
                : "border-border bg-card"
          }`}
        >
          <span
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] ${
              t.exempt
                ? "border border-border text-muted-foreground/50"
                : t.done
                  ? "bg-success text-white"
                  : "border border-border text-transparent"
            }`}
          >
            ✓
          </span>
          <div className="flex-1">
            <div className="text-[13px] text-foreground">
              {TASK_LABEL[t.type] ?? t.type} {t.count}
              {t.unit}
              {t.slot ? <span className="ml-1.5 text-muted-foreground">· {SLOT_LABEL[t.slot] ?? t.slot}</span> : null}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              {t.exempt ? "暂无追踪(P8 口语上线后开启)" : `进度 ${t.progress}/${t.count}`}
            </div>
          </div>
          {!t.exempt && (
            <span className={`text-[12px] font-medium ${t.done ? "text-success" : "text-warning"}`}>
              {t.done ? "已完成" : "进行中"}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
