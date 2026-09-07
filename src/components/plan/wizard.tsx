/**
 * wizard.tsx — 备考计划五步向导(P7 §3.3)
 *
 * ①考前须知弹窗+日历(过去日禁用) ②目标分+英语水平自述(textarea maxLength=200 实时计数)
 * ③备考节奏(四段勾选各带默认范围、时间选择器可改,落库 AvailableRange[])
 * ④个人习惯(读 study_preferences 回填,离开本步即保存)
 * ⑤每日量 → 生成计划(preview) → LLM 失败弹窗(同意 → ?source=template 重调;拒绝 → 停留可重试)
 * → 确认页(阶段卡片+徽标 AI 定制/默认模板) → POST 落库 → router.refresh() 由父页面切作战主页
 */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type {
  AvailableRange,
  PlanAvailability,
  PlanPhase,
  PlanSource,
  PlanTask,
  StudyPreferences,
  TargetScores,
  TimeSlot,
  TaskType,
} from "@/db/schema";
import { TASK_TYPES, TASK_UNIT } from "@/db/schema";
import { todayStr } from "@/lib/study/date";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExamNoticeDialog } from "@/components/plan/exam-notice";

/* ---------- 常量 ---------- */

const CARD = "card-float rounded-xl border border-border bg-card p-5";
const BTN =
  "press-bubble rounded-md border border-border bg-card px-3 py-1.5 text-[13px] text-foreground transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50";
const BTN_PRIMARY =
  "press-bubble rounded-md bg-primary px-3.5 py-1.5 text-[13px] text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50";
const INPUT =
  "h-9 flex-1 rounded-md border border-border bg-card px-2.5 text-[13px] outline-none focus:border-primary";
const HINT = "text-xs text-muted-foreground";

const STEPS = ["考试日期", "目标分数", "备考节奏", "个人习惯", "每日任务量"];

const BAND_OPTIONS = [4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9];
const HOURS_OPTIONS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

const TASK_LABEL: Record<TaskType, string> = {
  words: "背单词",
  listening: "听力",
  reading: "阅读",
  writing: "写作",
  speaking: "口语",
  set: "完整套卷",
};
const SLOT_LABEL: Record<TimeSlot, string> = {
  morning: "上午",
  noon: "中午",
  afternoon: "下午",
  evening: "晚上",
};

/** 四段默认范围(勾选即带出,时间选择器可改) */
const SEGMENTS: { key: TimeSlot; label: string; range: AvailableRange }[] = [
  { key: "morning", label: "上午", range: { start: "07:00", end: "12:00" } },
  { key: "noon", label: "中午", range: { start: "12:00", end: "14:00" } },
  { key: "afternoon", label: "下午", range: { start: "14:00", end: "18:00" } },
  { key: "evening", label: "晚上", range: { start: "18:00", end: "23:00" } },
];

const SUBJECT_SLOT_OPTIONS: { value: string; label: string }[] = [
  ...Object.entries(SLOT_LABEL).map(([value, label]) => ({ value, label })),
  { value: "", label: "不指定" },
];

/** 调整模式回填(现有 ACTIVE 计划的关键输入) */
export interface PlanWizardInitial {
  examDate: string;
  targetOverallBand: number;
  targetScores: TargetScores;
  availability: PlanAvailability;
}

export interface PlanWizardProps {
  /** create=全新建档(POST 整体落库);adjust=调整现有计划(PATCH 只重排未来周) */
  variant?: "create" | "adjust";
  planId?: number;
  /** adjust 模式的回填数据 */
  initial?: PlanWizardInitial;
}

/** slots(合并后范围数组)→ 四段勾选/范围回填:按与段默认窗口是否有重叠判断 */
function prefillSegments(slots: AvailableRange[]): {
  checked: Record<TimeSlot, boolean>;
  ranges: Record<TimeSlot, AvailableRange>;
} {
  const checked = {} as Record<TimeSlot, boolean>;
  const ranges = {} as Record<TimeSlot, AvailableRange>;
  for (const seg of SEGMENTS) {
    const hit = slots.find((s) => s.start < seg.range.end && s.end > seg.range.start);
    checked[seg.key] = Boolean(hit);
    ranges[seg.key] = hit ? { start: hit.start, end: hit.end } : { ...seg.range };
  }
  return { checked, ranges };
}

interface PreviewResult {
  phases: PlanPhase[];
  generatedBy: PlanSource;
  weeks: number;
  days: number;
  /** adjust 模式:服务端当前周号;周全部 ≥ 此值的阶段可编辑,含已过周的阶段锁定 */
  currentWeek?: number;
}

const pad = (n: number) => String(n).padStart(2, "0");
const WEEK_HEADS = ["一", "二", "三", "四", "五", "六", "日"];

/** 周数列表 → "第 1–3 周" / "第 1、3 周" */
function formatWeeks(weeks: number[]): string {
  const sorted = [...weeks].sort((a, b) => a - b);
  const runs: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i <= sorted.length; i++) {
    const cur = sorted[i];
    if (cur === prev + 1) {
      prev = cur;
      continue;
    }
    runs.push(start === prev ? `第 ${start} 周` : `第 ${start}–${prev} 周`);
    start = cur;
    prev = cur;
  }
  return runs.join("、");
}

/* ---------- 日历(向导 STEP1;过去日禁用) ---------- */

function ExamCalendar({
  value,
  onChange,
}: {
  value: string;
  onChange: (d: string) => void;
}) {
  const now = new Date();
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() + 1 });
  const today = todayStr();

  const nav = (delta: number) =>
    setView(({ y, m }) => {
      const nm = m + delta;
      return nm < 1 ? { y: y - 1, m: 12 } : nm > 12 ? { y: y + 1, m: 1 } : { y, m: nm };
    });

  // 过去月份的上一月按钮禁用(不早于当前月)
  const beforeCurrentMonth =
    view.y < now.getFullYear() ||
    (view.y === now.getFullYear() && view.m <= now.getMonth() + 1);

  const offset = (new Date(view.y, view.m - 1, 1).getDay() + 6) % 7;
  const lastDay = new Date(view.y, view.m, 0).getDate();

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
            disabled={beforeCurrentMonth}
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
            onClick={() => nav(-1)}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="下一月"
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
            onClick={() => nav(1)}
          >
            ›
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEK_HEADS.map((h) => (
          <div key={h} className="pb-1 text-[11px] text-muted-foreground">
            {h}
          </div>
        ))}
        {Array.from({ length: offset }).map((_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {Array.from({ length: lastDay }).map((_, i) => {
          const day = i + 1;
          const date = `${view.y}-${pad(view.m)}-${pad(day)}`;
          const past = date < today;
          const selected = date === value;
          return (
            <div key={date} className="flex justify-center">
              <button
                type="button"
                disabled={past}
                className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] transition-colors ${
                  selected
                    ? "bg-primary text-primary-foreground"
                    : past
                      ? "cursor-not-allowed text-muted-foreground/50"
                      : "text-muted-foreground hover:bg-primary/10"
                } ${date === today && !selected ? "ring-1 ring-primary ring-offset-1" : ""}`}
                onClick={() => onChange(date)}
              >
                {day}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- 主组件 ---------- */

export function PlanWizard({ variant = "create", planId, initial }: PlanWizardProps) {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [noticeOpen, setNoticeOpen] = useState(true); // STEP1 自动弹考前须知

  // STEP1 考试日期
  const [examDate, setExamDate] = useState(initial?.examDate ?? "");

  // STEP2 目标
  const [overall, setOverall] = useState(
    initial ? String(initial.targetOverallBand) : "6.5",
  );
  const [targets, setTargets] = useState<Record<string, string>>(() => {
    if (!initial) return {};
    const out: Record<string, string> = {};
    for (const k of ["listening", "reading", "writing", "speaking"] as const) {
      if (initial.targetScores[k] != null) out[k] = String(initial.targetScores[k]);
    }
    return out;
  });
  const [englishLevel, setEnglishLevel] = useState(initial?.availability.englishLevel ?? "");

  // STEP3 节奏
  const prefill = initial ? prefillSegments(initial.availability.slots ?? []) : null;
  const [mode, setMode] = useState<"fulltime" | "working">(initial?.availability.mode ?? "working");
  const [dailyHours, setDailyHours] = useState(String(initial?.availability.dailyHours ?? 2));
  const [dailyWords, setDailyWords] = useState(
    initial?.availability.dailyWords != null ? String(initial.availability.dailyWords) : "",
  );
  const [segChecked, setSegChecked] = useState<Record<TimeSlot, boolean>>(
    () =>
      prefill?.checked ?? {
        morning: true,
        noon: false,
        afternoon: false,
        evening: true,
      },
  );
  const [segRanges, setSegRanges] = useState<Record<TimeSlot, AvailableRange>>(
    () =>
      prefill?.ranges ??
      (Object.fromEntries(SEGMENTS.map((s) => [s.key, { ...s.range }])) as Record<
        TimeSlot,
        AvailableRange
      >),
  );

  // STEP4 个人习惯(进入时回填)
  const [wakeTime, setWakeTime] = useState("07:00");
  const [bedTime, setBedTime] = useState("23:00");
  const [subjectSlots, setSubjectSlots] = useState<Record<string, string>>({});
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);

  // STEP5 每日量 → preview(dailyWords 在 STEP3 上方已初始化:调整模式回填)
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  // 确认页可编辑副本:preview 到手时深拷贝初始化,编辑只动它,确认时直传
  const [draftPhases, setDraftPhases] = useState<PlanPhase[]>([]);
  // count 输入中间态(键 "阶段-行"):保留 "2." 等未完成输入,失焦后回落为数值渲染
  const [countDrafts, setCountDrafts] = useState<Record<string, string>>({});
  const [failReason, setFailReason] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 进入 STEP4 时回填 study_preferences
  useEffect(() => {
    if (prefsLoaded || step !== 4) return;
    void (async () => {
      try {
        const resp = await fetch("/api/study-preferences");
        if (resp.ok) {
          const data = (await resp.json()) as { preferences: StudyPreferences };
          setWakeTime(data.preferences.wakeTime ?? "07:00");
          setBedTime(data.preferences.bedTime ?? "23:00");
          setSubjectSlots(
            Object.fromEntries(
              Object.entries(data.preferences.subjectSlots ?? {}).map(([k, v]) => [k, v]),
            ),
          );
        }
      } finally {
        setPrefsLoaded(true);
      }
    })();
  }, [step, prefsLoaded]);

  /** 当前勾选段合并后的 slots(顺序按四段固定顺序,服务端会再合并) */
  const buildSlots = (): AvailableRange[] =>
    SEGMENTS.filter((s) => segChecked[s.key]).map((s) => segRanges[s.key]);

  const buildPayload = () => {
    const targetScores: TargetScores = {};
    for (const k of ["listening", "reading", "writing", "speaking"] as const) {
      const v = targets[k];
      if (v) targetScores[k] = Number(v);
    }
    const availability: PlanAvailability = {
      mode,
      dailyHours: Number(dailyHours),
      slots: buildSlots(),
      ...(dailyWords ? { dailyWords: Number(dailyWords) } : {}),
      ...(englishLevel.trim() ? { englishLevel: englishLevel.trim() } : {}),
    };
    return {
      examDate,
      targetOverallBand: Number(overall),
      targetScores,
      availability,
    };
  };

  async function generate(source?: "template") {
    setPreviewing(true);
    try {
      // 调整模式:PATCH ?preview=1 干跑——服务端生成未来周并与已过周合并后回预览,
      // 确认时把同一份 phases 直传,避免确认瞬间 LLM 重新生成出另一份计划
      const isAdjust = variant === "adjust" && planId != null;
      const url = isAdjust
        ? `/api/study-plans/${planId}?preview=1${source ? "&source=template" : ""}`
        : source
          ? "/api/study-plans/preview?source=template"
          : "/api/study-plans/preview";
      const resp = await fetch(url, {
        method: isAdjust ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const data = (await resp.json()) as Partial<PreviewResult> & {
        failed?: boolean;
        reason?: string;
        error?: string;
      };
      if (!resp.ok) {
        toast.error(data.error ?? "生成请求失败");
        return;
      }
      if (data.failed) {
        setFailReason(data.reason ?? "AI 服务暂不可用");
        return;
      }
      if (data.phases && data.generatedBy) {
        const result = data as PreviewResult;
        setPreview(result);
        setDraftPhases(structuredClone(result.phases));
        setCountDrafts({});
      }
    } catch {
      toast.error("生成请求失败(服务未响应)");
    } finally {
      setPreviewing(false);
    }
  }

  /** 离开 STEP4 前保存个人习惯 */
  async function savePrefs(): Promise<boolean> {
    setPrefsSaving(true);
    try {
      const subjectSlotsOut: Record<string, string> = {};
      for (const [k, v] of Object.entries(subjectSlots)) {
        if (v && TASK_TYPES.includes(k as TaskType)) subjectSlotsOut[k] = v;
      }
      const resp = await fetch("/api/study-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wakeTime,
          bedTime,
          subjectSlots: subjectSlotsOut,
        }),
      });
      if (!resp.ok) {
        const data = (await resp.json()) as { error?: string };
        toast.error(data.error ?? "个人习惯保存失败");
        return false;
      }
      return true;
    } catch {
      toast.error("个人习惯保存失败(服务未响应)");
      return false;
    } finally {
      setPrefsSaving(false);
    }
  }

  async function next() {
    if (step === 1 && !examDate) {
      toast.error("请先选择考试日期");
      return;
    }
    if (step === 4) {
      const ok = await savePrefs();
      if (!ok) return;
    }
    setStep((s) => Math.min(5, s + 1));
  }

  async function confirmCreate() {
    if (!preview) return;
    // 客户端先拦一道明显不合法的编辑;unit 由 type 查表无需校验,服务端会再覆写
    for (const p of draftPhases) {
      if (p.weeklyTasks.length === 0) {
        toast.error(`阶段「${p.name}」没有任务`);
        return;
      }
      for (const t of p.weeklyTasks) {
        if (!Number.isFinite(t.count) || t.count <= 0) {
          toast.error(`阶段「${p.name}」的「${TASK_LABEL[t.type]}」任务量需大于 0`);
          return;
        }
      }
    }
    setSubmitting(true);
    try {
      const isAdjust = variant === "adjust" && planId != null;
      const resp = await fetch(isAdjust ? `/api/study-plans/${planId}` : "/api/study-plans", {
        method: isAdjust ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...buildPayload(),
          // 两种模式都直传确认页 phases(含人工编辑):创建走整体落库,调整保证「所见即所得」
          phases: draftPhases,
          generatedBy: preview.generatedBy,
        }),
      });
      const data = (await resp.json()) as { ok?: boolean; error?: string };
      if (!resp.ok || !data.ok) {
        toast.error(data.error ?? (isAdjust ? "计划调整失败" : "计划保存失败"));
        return;
      }
      toast.success(isAdjust ? "计划已调整,今日任务按新方案执行" : "备考计划已开启");
      if (isAdjust) {
        // 当前 URL 是 /plan?adjust=1,仅 refresh 会再次命中「有计划+adjust=1」的调整分支留在向导;
        // 去掉参数导航(页面 force-dynamic,导航即取最新服务端渲染)→ 落到作战主页
        router.replace("/plan");
      } else {
        router.refresh(); // 父页面(服务端)重读 ACTIVE 计划 → 切作战主页
      }
    } catch {
      toast.error(variant === "adjust" ? "计划调整失败(服务未响应)" : "计划保存失败(服务未响应)");
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------- 确认页任务行编辑(只动 draftPhases;unit 由 type 查表,不单独存) ---------- */

  const setTask = (pi: number, ti: number, patch: Partial<PlanTask>) =>
    setDraftPhases((phases) =>
      phases.map((p, i) =>
        i !== pi
          ? p
          : { ...p, weeklyTasks: p.weeklyTasks.map((t, j) => (j !== ti ? t : { ...t, ...patch })) },
      ),
    );

  /** 换 type:同阶段内不允许重复 type(打卡判定按 type 汇总,重复行语义含糊) */
  const onTaskTypeChange = (pi: number, ti: number, type: TaskType) => {
    const phase = draftPhases[pi];
    if (phase?.weeklyTasks.some((t, j) => j !== ti && t.type === type)) {
      toast.error("该阶段已有此任务类型");
      return;
    }
    setTask(pi, ti, { type });
  };

  const removeTask = (pi: number, ti: number) =>
    setDraftPhases((phases) =>
      phases.map((p, i) =>
        i !== pi ? p : { ...p, weeklyTasks: p.weeklyTasks.filter((_, j) => j !== ti) },
      ),
    );

  /** 加一行:自动选一个本阶段未用过的 type;六种用满后按钮已禁用 */
  const addTask = (pi: number) =>
    setDraftPhases((phases) =>
      phases.map((p, i) => {
        if (i !== pi) return p;
        const used = new Set(p.weeklyTasks.map((t) => t.type));
        const type = TASK_TYPES.find((t) => !used.has(t)) ?? "listening";
        return { ...p, weeklyTasks: [...p.weeklyTasks, { type, count: 1, unit: TASK_UNIT[type] }] };
      }),
    );

  // 确认页(preview 到手后覆盖向导)。渲染 draftPhases(可编辑副本),编辑才真正可见;
  // preview 仅保留 weeks/days/generatedBy 等元信息
  if (preview) {
    const isAdjust = variant === "adjust";
    return (
      <div className={CARD}>
        <div className="mb-1 flex items-center gap-2.5">
          <h3 className="text-[15px]">{isAdjust ? "确认调整后的计划" : "确认你的备考计划"}</h3>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] ${
              preview.generatedBy === "llm"
                ? "bg-primary/10 text-primary"
                : "bg-warning/15 text-warning"
            }`}
          >
            {preview.generatedBy === "llm" ? "AI 定制" : "默认模板"}
          </span>
        </div>
        <p className={`${HINT} mb-4`}>
          {isAdjust
            ? `共 ${preview.weeks} 周 · 距考试 ${preview.days} 天 · 已过周与打卡历史保持不变,仅重排未来周;确认后立即生效`
            : `共 ${preview.weeks} 周 · 距考试 ${preview.days} 天 · 任务行可直接调整;确认后立即生效(原计划自动归档)`}
        </p>

        <div className="grid gap-3">
          {draftPhases.map((p, i) => {
            // adjust:含已过周的阶段锁定(已过周与打卡历史绑定,人工改动会撕裂历史一致性)
            const locked =
              isAdjust && preview.currentWeek != null && p.weeks.some((w) => w < preview.currentWeek!);
            return (
              <div key={i} className="rounded-lg border border-border bg-muted/40 p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 text-[13px] font-medium text-foreground">
                    {p.name}
                    <span className="ml-2 text-[12px] font-normal text-muted-foreground">
                      {formatWeeks(p.weeks)}
                    </span>
                    {locked && (
                      <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-normal text-muted-foreground">
                        已过周 · 不可改
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 text-[12px] text-muted-foreground">{p.focus}</span>
                </div>
                <div className="mt-2 grid gap-1.5">
                  {p.weeklyTasks.length === 0 && (
                    <p className={`${HINT} py-1`}>本阶段暂无任务,点下方「加任务」添加</p>
                  )}
                  {p.weeklyTasks.map((t, j) => (
                    <div key={j} className="flex flex-wrap items-center gap-1.5">
                      {locked ? (
                        <span className="rounded-md border border-border bg-muted px-2 py-1 text-[12px] text-muted-foreground">
                          {TASK_LABEL[t.type]} {t.count}
                          {t.unit}
                          {t.slot ? ` · ${SLOT_LABEL[t.slot]}` : ""}
                        </span>
                      ) : (
                        <>
                          <select
                            aria-label="任务类型"
                            className="h-7 rounded-md border border-border bg-card px-1.5 text-[12px] text-foreground outline-none focus:border-primary"
                            value={t.type}
                            onChange={(e) => onTaskTypeChange(i, j, e.target.value as TaskType)}
                          >
                            {TASK_TYPES.map((tp) => (
                              <option key={tp} value={tp}>
                                {TASK_LABEL[tp]}
                              </option>
                            ))}
                          </select>
                          <input
                            aria-label="任务量"
                            className="h-7 w-16 rounded-md border border-border bg-card px-1.5 text-center text-[12px] text-foreground outline-none focus:border-primary"
                            inputMode="decimal"
                            value={countDrafts[`${i}-${j}`] ?? String(t.count)}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/[^\d.]/g, "");
                              setCountDrafts((m) => ({ ...m, [`${i}-${j}`]: raw }));
                              const n = Number(raw);
                              // 合法数值才写 draft(含小数);未完成态("2."/"")不污染数据
                              if (raw && Number.isFinite(n) && n > 0) setTask(i, j, { count: n });
                            }}
                            onBlur={() => {
                              const raw = countDrafts[`${i}-${j}`];
                              if (raw === undefined) return;
                              const n = Number(raw);
                              if (!raw || !Number.isFinite(n) || n <= 0) {
                                // 无效输入回落为当前值,并同步显示
                                setTask(i, j, { count: t.count > 0 ? t.count : 1 });
                              }
                              setCountDrafts((m) => {
                                const { [`${i}-${j}`]: _, ...rest } = m;
                                return rest;
                              });
                            }}
                          />
                          <span className="text-[12px] text-muted-foreground">{t.unit}</span>
                          <select
                            aria-label="建议时段"
                            className="h-7 rounded-md border border-border bg-card px-1.5 text-[12px] text-foreground outline-none focus:border-primary"
                            value={t.slot ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setTask(i, j, v ? { slot: v as TimeSlot } : { slot: undefined });
                            }}
                          >
                            {SUBJECT_SLOT_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label === "不指定" ? "不指定时段" : o.label}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            aria-label={`删除${TASK_LABEL[t.type]}任务`}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-[14px] text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => removeTask(i, j)}
                          >
                            ×
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                  {!locked && (
                    <button
                      type="button"
                      className="mt-0.5 w-fit rounded-md border border-dashed border-border px-2 py-1 text-[12px] text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={p.weeklyTasks.length >= TASK_TYPES.length}
                      onClick={() => addTask(i)}
                    >
                      + 加任务
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex gap-2.5">
          <button type="button" className={BTN_PRIMARY} onClick={confirmCreate} disabled={submitting}>
            {submitting ? (isAdjust ? "调整中…" : "开启中…") : isAdjust ? "确认调整" : "确认开启计划"}
          </button>
          <button
            type="button"
            className={BTN}
            onClick={() => {
              setPreview(null);
              setStep(5);
            }}
            disabled={submitting}
          >
            重新生成
          </button>
          {isAdjust && (
            <button
              type="button"
              className={BTN}
              disabled={submitting}
              onClick={() => router.replace("/plan")}
            >
              放弃修改
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ---------- 五步向导 ---------- */
  return (
    <div className={CARD}>
      {/* 步骤条 */}
      <div className="mb-4 flex items-center gap-1.5">
        {STEPS.map((label, i) => {
          const no = i + 1;
          const active = no === step;
          const passed = no < step;
          return (
            <div key={label} className="flex items-center gap-1.5">
              {i > 0 && <span className="mx-0.5 h-px w-4 bg-border" />}
              <button
                type="button"
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : passed
                      ? "text-primary"
                      : "text-muted-foreground"
                }`}
                onClick={() => passed && setStep(no)}
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                    active
                      ? "bg-white/20"
                      : passed
                        ? "bg-primary/10"
                        : "bg-secondary"
                  }`}
                >
                  {no}
                </span>
                {label}
              </button>
            </div>
          );
        })}
      </div>

      {/* STEP1 考试日期 */}
      {step === 1 && (
        <div>
          <h3 className="mb-1 text-[15px]">你的考试日期</h3>
          <p className={`${HINT} mb-3`}>
            机考每日可考,选一个目标日;过去日期不可选。
            <button
              type="button"
              className="ml-1 text-primary hover:underline"
              onClick={() => setNoticeOpen(true)}
            >
              查看考前须知
            </button>
          </p>
          <div className="max-w-[340px]">
            <ExamCalendar value={examDate} onChange={setExamDate} />
          </div>
          {examDate && (
            <p className="mt-2.5 text-[13px] text-foreground">
              已选:<span className="font-medium">{examDate}</span>
            </p>
          )}
        </div>
      )}

      {/* STEP2 目标分数 */}
      {step === 2 && (
        <div>
          <h3 className="mb-3 text-[15px]">目标分数</h3>
          <div className="mb-3 flex items-center gap-2.5">
            <span className="w-[110px] shrink-0 text-[13px] text-muted-foreground">目标总分</span>
            <select
              className={INPUT}
              value={overall}
              onChange={(e) => setOverall(e.target.value)}
            >
              {BAND_OPTIONS.map((b) => (
                <option key={b} value={b}>
                  {b.toFixed(1)}
                </option>
              ))}
            </select>
          </div>
          {(["listening", "reading", "writing", "speaking"] as const).map((k) => {
            const label = { listening: "听力", reading: "阅读", writing: "写作", speaking: "口语" }[k];
            return (
              <div key={k} className="mb-3 flex items-center gap-2.5">
                <span className="w-[110px] shrink-0 text-[13px] text-muted-foreground">{label}目标</span>
                <select
                  className={INPUT}
                  value={targets[k] ?? ""}
                  onChange={(e) =>
                    setTargets((t) => ({ ...t, [k]: e.target.value }))
                  }
                >
                  <option value="">不填(按总分 −0.5 兜底)</option>
                  {BAND_OPTIONS.map((b) => (
                    <option key={b} value={b}>
                      {b.toFixed(1)}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[13px] text-muted-foreground">英语水平自述(选填,帮助 AI 更准地定制)</span>
            <span className={HINT}>{englishLevel.length}/200</span>
          </div>
          <textarea
            className="min-h-[76px] w-full resize-y rounded-md border border-border bg-card px-2.5 py-2 text-[13px] outline-none focus:border-primary"
            maxLength={200}
            value={englishLevel}
            placeholder="例:在职备考,每天晚上学习;四级 520 分,阅读还行,写作没系统练过,口语开口少。"
            onChange={(e) => setEnglishLevel(e.target.value)}
          />
        </div>
      )}

      {/* STEP3 备考节奏 */}
      {step === 3 && (
        <div>
          <h3 className="mb-3 text-[15px]">备考节奏</h3>
          <div className="mb-3 flex items-center gap-2.5">
            <span className="w-[110px] shrink-0 text-[13px] text-muted-foreground">当前状态</span>
            <select
              className={INPUT}
              value={mode}
              onChange={(e) => setMode(e.target.value === "fulltime" ? "fulltime" : "working")}
            >
              <option value="working">在职 / 在校</option>
              <option value="fulltime">全职备考</option>
            </select>
          </div>
          <div className="mb-3 flex items-center gap-2.5">
            <span className="w-[110px] shrink-0 text-[13px] text-muted-foreground">每日可投入</span>
            <select
              className={INPUT}
              value={dailyHours}
              onChange={(e) => setDailyHours(e.target.value)}
            >
              {HOURS_OPTIONS.map((h) => (
                <option key={h} value={h}>
                  {h} 小时
                </option>
              ))}
            </select>
          </div>
          <div className="mb-1.5 text-[13px] text-muted-foreground">可安排时段(勾选并调整起止时间)</div>
          {SEGMENTS.map((seg) => {
            const checked = segChecked[seg.key];
            const range = segRanges[seg.key];
            return (
              <div key={seg.key} className="mb-2 flex items-center gap-2.5">
                <label className="flex w-[110px] shrink-0 cursor-pointer items-center gap-2 text-[13px] text-foreground">
                  <input
                    type="checkbox"
                    className="accent-primary"
                    checked={checked}
                    onChange={(e) =>
                      setSegChecked((s) => ({ ...s, [seg.key]: e.target.checked }))
                    }
                  />
                  {seg.label}
                </label>
                <div className={`flex flex-1 items-center gap-2 ${checked ? "" : "opacity-40"}`}>
                  <input
                    type="time"
                    className={INPUT}
                    value={range.start}
                    disabled={!checked}
                    onChange={(e) =>
                      setSegRanges((r) => ({
                        ...r,
                        [seg.key]: { ...r[seg.key], start: e.target.value },
                      }))
                    }
                  />
                  <span className="text-muted-foreground">–</span>
                  <input
                    type="time"
                    className={INPUT}
                    value={range.end}
                    disabled={!checked}
                    onChange={(e) =>
                      setSegRanges((r) => ({
                        ...r,
                        [seg.key]: { ...r[seg.key], end: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>
            );
          })}
          <p className={HINT}>相邻时段不足 30 分钟会自动合并;至少保留一个时段。</p>
        </div>
      )}

      {/* STEP4 个人习惯 */}
      {step === 4 && (
        <div>
          <h3 className="mb-1 text-[15px]">个人习惯</h3>
          <p className={`${HINT} mb-3`}>
            作息用于划分上午/中午/下午/晚上;各科偏好时段会优先安排对应任务。点「下一步」时保存,设置页可随时改。
          </p>
          <div className="mb-3 flex items-center gap-2.5">
            <span className="w-[110px] shrink-0 text-[13px] text-muted-foreground">起床时间</span>
            <input
              type="time"
              className={INPUT}
              value={wakeTime}
              onChange={(e) => setWakeTime(e.target.value)}
            />
          </div>
          <div className="mb-3 flex items-center gap-2.5">
            <span className="w-[110px] shrink-0 text-[13px] text-muted-foreground">睡觉时间</span>
            <input
              type="time"
              className={INPUT}
              value={bedTime}
              onChange={(e) => setBedTime(e.target.value)}
            />
          </div>
          <div className="mb-1.5 text-[13px] text-muted-foreground">各科偏好时段(选填)</div>
          {TASK_TYPES.map((t) => (
            <div key={t} className="mb-2 flex items-center gap-2.5">
              <span className="w-[110px] shrink-0 text-[13px] text-muted-foreground">{TASK_LABEL[t]}</span>
              <select
                className={INPUT}
                value={subjectSlots[t] ?? ""}
                onChange={(e) =>
                  setSubjectSlots((s) => ({ ...s, [t]: e.target.value }))
                }
              >
                {SUBJECT_SLOT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
          {prefsSaving && <p className={HINT}>保存中…</p>}
        </div>
      )}

      {/* STEP5 每日任务量 */}
      {step === 5 && (
        <div>
          <h3 className="mb-1 text-[15px]">每日任务量</h3>
          <p className={`${HINT} mb-3`}>
            申报每日背词数(选填);不填由 AI / 默认模板按你的可用时段安排。
          </p>
          <div className="mb-3 flex items-center gap-2.5">
            <span className="w-[130px] shrink-0 text-[13px] text-muted-foreground">每日背单词(个)</span>
            <input
              className={INPUT}
              inputMode="numeric"
              placeholder="如 30(1–500,留空自动安排)"
              value={dailyWords}
              onChange={(e) => setDailyWords(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div className="mb-4 rounded-lg bg-muted/60 px-3 py-2.5 text-[12px] leading-relaxed text-muted-foreground">
            点「生成计划」后,AI 将结合你的考试日期、目标分、历史成绩与可用时段生成
            分阶段方案;生成后可先过目再确认开启。
          </div>
          <button
            type="button"
            className={BTN_PRIMARY}
            disabled={previewing}
            onClick={() => void generate()}
          >
            {previewing ? "生成中…" : "生成计划"}
          </button>
        </div>
      )}

      {/* 底部导航 */}
      {step > 1 && (
        <div className="mt-4 flex gap-2.5">
          <button type="button" className={BTN} onClick={() => setStep((s) => s - 1)}>
            上一步
          </button>
          {step < 5 && (
            <button type="button" className={BTN_PRIMARY} onClick={() => void next()}>
              下一步
            </button>
          )}
        </div>
      )}
      {step === 1 && examDate && (
        <div className="mt-4">
          <button type="button" className={BTN_PRIMARY} onClick={() => void next()}>
            下一步
          </button>
        </div>
      )}

      <ExamNoticeDialog open={noticeOpen} onClose={() => setNoticeOpen(false)} />

      {/* LLM 生成失败弹窗:同意 → 默认模板重调;拒绝 → 停留可重试 */}
      <Dialog open={failReason !== null} onOpenChange={(o) => !o && setFailReason(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AI 暂不可用</DialogTitle>
            <DialogDescription>
              {failReason}。是否使用内置默认模板生成一份通用计划?确认页会如实标注「默认模板」徽标。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button type="button" className={BTN} onClick={() => setFailReason(null)}>
              继续重试
            </button>
            <button
              type="button"
              className={BTN_PRIMARY}
              disabled={previewing}
              onClick={() => {
                setFailReason(null);
                void generate("template");
              }}
            >
              {previewing ? "生成中…" : "用默认模板生成"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
