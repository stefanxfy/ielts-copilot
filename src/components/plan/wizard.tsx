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
  StudyPreferences,
  TargetScores,
  TimeSlot,
  TaskType,
} from "@/db/schema";
import { TASK_TYPES } from "@/db/schema";
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

const CARD = "rounded-xl border border-[#dfe4ec] bg-white p-5";
const BTN =
  "rounded-md border border-[#dfe4ec] bg-white px-3 py-1.5 text-[13px] text-[#1c2330] transition-colors hover:border-[#1a6feb] hover:text-[#1a6feb] disabled:cursor-not-allowed disabled:opacity-50";
const BTN_PRIMARY =
  "rounded-md bg-[#1a6feb] px-3.5 py-1.5 text-[13px] text-white transition-colors hover:bg-[#0d4fa8] disabled:cursor-not-allowed disabled:opacity-50";
const INPUT =
  "h-9 flex-1 rounded-md border border-[#dfe4ec] bg-white px-2.5 text-[13px] outline-none focus:border-[#1a6feb]";
const HINT = "text-xs text-[#8a93a2]";

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

interface PreviewResult {
  phases: PlanPhase[];
  generatedBy: PlanSource;
  weeks: number;
  days: number;
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
            className="flex h-6 w-6 items-center justify-center rounded-md text-[#5b6574] transition-colors hover:bg-[#f1f4f9] hover:text-[#1a6feb] disabled:cursor-not-allowed disabled:opacity-30"
            onClick={() => nav(-1)}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="下一月"
            className="flex h-6 w-6 items-center justify-center rounded-md text-[#5b6574] transition-colors hover:bg-[#f1f4f9] hover:text-[#1a6feb]"
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
          const past = date < today;
          const selected = date === value;
          return (
            <div key={date} className="flex justify-center">
              <button
                type="button"
                disabled={past}
                className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] transition-colors ${
                  selected
                    ? "bg-[#1a6feb] text-white"
                    : past
                      ? "cursor-not-allowed text-[#c3cad4]"
                      : "text-[#3c4656] hover:bg-[#eef3fb]"
                } ${date === today && !selected ? "ring-1 ring-[#1a6feb] ring-offset-1" : ""}`}
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

export function PlanWizard() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [noticeOpen, setNoticeOpen] = useState(true); // STEP1 自动弹考前须知

  // STEP1 考试日期
  const [examDate, setExamDate] = useState("");

  // STEP2 目标
  const [overall, setOverall] = useState("6.5");
  const [targets, setTargets] = useState<Record<string, string>>({});
  const [englishLevel, setEnglishLevel] = useState("");

  // STEP3 节奏
  const [mode, setMode] = useState<"fulltime" | "working">("working");
  const [dailyHours, setDailyHours] = useState("2");
  const [segChecked, setSegChecked] = useState<Record<TimeSlot, boolean>>({
    morning: true,
    noon: false,
    afternoon: false,
    evening: true,
  });
  const [segRanges, setSegRanges] = useState<Record<TimeSlot, AvailableRange>>(() =>
    Object.fromEntries(SEGMENTS.map((s) => [s.key, { ...s.range }])) as Record<
      TimeSlot,
      AvailableRange
    >,
  );

  // STEP4 个人习惯(进入时回填)
  const [wakeTime, setWakeTime] = useState("07:00");
  const [bedTime, setBedTime] = useState("23:00");
  const [subjectSlots, setSubjectSlots] = useState<Record<string, string>>({});
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);

  // STEP5 每日量 → preview
  const [dailyWords, setDailyWords] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
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
      const resp = await fetch(
        source ? "/api/study-plans/preview?source=template" : "/api/study-plans/preview",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload()),
        },
      );
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
        setPreview(data as PreviewResult);
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
    setSubmitting(true);
    try {
      const resp = await fetch("/api/study-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...buildPayload(), phases: preview.phases, generatedBy: preview.generatedBy }),
      });
      const data = (await resp.json()) as { ok?: boolean; error?: string };
      if (!resp.ok || !data.ok) {
        toast.error(data.error ?? "计划保存失败");
        return;
      }
      toast.success("备考计划已开启");
      router.refresh(); // 父页面(服务端)重读 ACTIVE 计划 → 切作战主页
    } catch {
      toast.error("计划保存失败(服务未响应)");
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------- 确认页(preview 到手后覆盖向导) ---------- */
  if (preview) {
    return (
      <div className={CARD}>
        <div className="mb-1 flex items-center gap-2.5">
          <h3 className="text-[15px]">确认你的备考计划</h3>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] ${
              preview.generatedBy === "llm"
                ? "bg-[#eef3fb] text-[#1a6feb]"
                : "bg-[#fdf3e3] text-[#a06a12]"
            }`}
          >
            {preview.generatedBy === "llm" ? "AI 定制" : "默认模板"}
          </span>
        </div>
        <p className={`${HINT} mb-4`}>
          共 {preview.weeks} 周 · 距考试 {preview.days} 天 · 确认后立即生效(原计划自动归档)
        </p>

        <div className="grid gap-3">
          {preview.phases.map((p, i) => (
            <div key={i} className="rounded-lg border border-[#e7ecf3] bg-[#fafbfd] p-3.5">
              <div className="flex items-center justify-between">
                <div className="text-[13px] font-medium text-[#1c2330]">
                  {p.name}
                  <span className="ml-2 text-[12px] font-normal text-[#8a93a2]">
                    {formatWeeks(p.weeks)}
                  </span>
                </div>
                <span className="text-[12px] text-[#5b6574]">{p.focus}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {p.weeklyTasks.map((t, j) => (
                  <span
                    key={j}
                    className="rounded-md border border-[#e7ecf3] bg-white px-2 py-1 text-[12px] text-[#3c4656]"
                  >
                    {TASK_LABEL[t.type]} {t.count}
                    {t.unit}
                    {t.slot ? ` · ${SLOT_LABEL[t.slot]}` : ""}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-2.5">
          <button type="button" className={BTN_PRIMARY} onClick={confirmCreate} disabled={submitting}>
            {submitting ? "开启中…" : "确认开启计划"}
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
              {i > 0 && <span className="mx-0.5 h-px w-4 bg-[#dfe4ec]" />}
              <button
                type="button"
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] transition-colors ${
                  active
                    ? "bg-[#1a6feb] text-white"
                    : passed
                      ? "text-[#1a6feb]"
                      : "text-[#8a93a2]"
                }`}
                onClick={() => passed && setStep(no)}
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                    active
                      ? "bg-white/20"
                      : passed
                        ? "bg-[#eef3fb]"
                        : "bg-[#f1f4f9]"
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
              className="ml-1 text-[#1a6feb] hover:underline"
              onClick={() => setNoticeOpen(true)}
            >
              查看考前须知
            </button>
          </p>
          <div className="max-w-[340px]">
            <ExamCalendar value={examDate} onChange={setExamDate} />
          </div>
          {examDate && (
            <p className="mt-2.5 text-[13px] text-[#1c2330]">
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
            <span className="w-[110px] shrink-0 text-[13px] text-[#5b6574]">目标总分</span>
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
                <span className="w-[110px] shrink-0 text-[13px] text-[#5b6574]">{label}目标</span>
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
            <span className="text-[13px] text-[#5b6574]">英语水平自述(选填,帮助 AI 更准地定制)</span>
            <span className={HINT}>{englishLevel.length}/200</span>
          </div>
          <textarea
            className="min-h-[76px] w-full resize-y rounded-md border border-[#dfe4ec] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-[#1a6feb]"
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
            <span className="w-[110px] shrink-0 text-[13px] text-[#5b6574]">当前状态</span>
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
            <span className="w-[110px] shrink-0 text-[13px] text-[#5b6574]">每日可投入</span>
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
          <div className="mb-1.5 text-[13px] text-[#5b6574]">可安排时段(勾选并调整起止时间)</div>
          {SEGMENTS.map((seg) => {
            const checked = segChecked[seg.key];
            const range = segRanges[seg.key];
            return (
              <div key={seg.key} className="mb-2 flex items-center gap-2.5">
                <label className="flex w-[110px] shrink-0 cursor-pointer items-center gap-2 text-[13px] text-[#1c2330]">
                  <input
                    type="checkbox"
                    className="accent-[#1a6feb]"
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
                  <span className="text-[#8a93a2]">–</span>
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
            <span className="w-[110px] shrink-0 text-[13px] text-[#5b6574]">起床时间</span>
            <input
              type="time"
              className={INPUT}
              value={wakeTime}
              onChange={(e) => setWakeTime(e.target.value)}
            />
          </div>
          <div className="mb-3 flex items-center gap-2.5">
            <span className="w-[110px] shrink-0 text-[13px] text-[#5b6574]">睡觉时间</span>
            <input
              type="time"
              className={INPUT}
              value={bedTime}
              onChange={(e) => setBedTime(e.target.value)}
            />
          </div>
          <div className="mb-1.5 text-[13px] text-[#5b6574]">各科偏好时段(选填)</div>
          {TASK_TYPES.map((t) => (
            <div key={t} className="mb-2 flex items-center gap-2.5">
              <span className="w-[110px] shrink-0 text-[13px] text-[#5b6574]">{TASK_LABEL[t]}</span>
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
            <span className="w-[130px] shrink-0 text-[13px] text-[#5b6574]">每日背单词(个)</span>
            <input
              className={INPUT}
              inputMode="numeric"
              placeholder="如 30(1–500,留空自动安排)"
              value={dailyWords}
              onChange={(e) => setDailyWords(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div className="mb-4 rounded-lg bg-[#f7f9fc] px-3 py-2.5 text-[12px] leading-relaxed text-[#5b6574]">
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
