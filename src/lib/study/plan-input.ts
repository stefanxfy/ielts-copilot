/**
 * src/lib/study/plan-input.ts — 向导入参校验与归一化(preview / POST / PATCH 共用)
 *
 * 后端是最后一道防线:englishLevel ≤200 中文字符、slots 范围合法与合并、
 * 目标分 0–9 的 0.5 步进等,前端虽有限制但服务端一律再验。
 */
import type {
  AvailableRange,
  PlanAvailability,
  TargetScores,
} from "@/db/schema";
import { hhmmToMin, todayStr, daysBetween } from "@/lib/study/date";
import { mergeRanges } from "@/lib/study/plan-gen";
import { readStudyPreferences } from "@/lib/study/settings";

export interface WizardInput {
  examDate: string;
  targetOverallBand: number;
  targetScores: TargetScores;
  availability: PlanAvailability;
}

const YYYYMMDD = /^\d{4}-\d{2}-\d{2}$/;
const BAND_STEP = (n: number) => Math.abs(n * 2 - Math.round(n * 2)) < 1e-9;

/** 校验并归一化向导入参;失败返回错误文案 */
export function parseWizardInput(body: unknown): { ok: true; value: WizardInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "请求体不是对象" };
  const b = body as Record<string, unknown>;

  // 考试日期:格式 + 晚于今天
  const examDate = typeof b.examDate === "string" ? b.examDate : "";
  if (!YYYYMMDD.test(examDate)) return { ok: false, error: "考试日期格式应为 YYYY-MM-DD" };
  if (daysBetween(examDate, todayStr()) <= 0) {
    return { ok: false, error: "考试日期必须晚于今天" };
  }

  // 目标总分:0–9,0.5 步进
  const targetOverallBand = b.targetOverallBand;
  if (
    typeof targetOverallBand !== "number" ||
    !Number.isFinite(targetOverallBand) ||
    targetOverallBand < 0 ||
    targetOverallBand > 9 ||
    !BAND_STEP(targetOverallBand)
  ) {
    return { ok: false, error: "目标总分应为 0–9 的 0.5 步进值" };
  }

  // 四科目标(可选;0.5 步进校验)
  const ts = (b.targetScores ?? {}) as Record<string, unknown>;
  const targetScores: TargetScores = {};
  for (const k of ["listening", "reading", "writing", "speaking"] as const) {
    const v = ts[k];
    if (v == null) continue;
    if (typeof v !== "number" || v < 0 || v > 9 || !BAND_STEP(v)) {
      return { ok: false, error: `目标分 ${k} 应为 0–9 的 0.5 步进值` };
    }
    targetScores[k] = v;
  }

  // availability
  const a = (b.availability ?? {}) as Record<string, unknown>;
  const mode = a.mode;
  if (mode !== "fulltime" && mode !== "working") {
    return { ok: false, error: "mode 应为 fulltime | working" };
  }
  const dailyHours = a.dailyHours;
  if (
    typeof dailyHours !== "number" ||
    !Number.isFinite(dailyHours) ||
    dailyHours < 0.5 ||
    dailyHours > 10 ||
    !BAND_STEP(dailyHours)
  ) {
    return { ok: false, error: "每日可投入小时数应为 0.5–10 的 0.5 步进值" };
  }

  // slots:范围合法 + 合并 + ≤6 条(v2.8)
  const rawSlots = Array.isArray(a.slots) ? a.slots : [];
  const slots: AvailableRange[] = [];
  for (const s of rawSlots) {
    const r = (s ?? {}) as Record<string, unknown>;
    const start = typeof r.start === "string" ? r.start : "";
    const end = typeof r.end === "string" ? r.end : "";
    const sm = hhmmToMin(start);
    const em = hhmmToMin(end);
    if (sm == null || em == null || em <= sm) {
      return { ok: false, error: `可用时段范围非法:${start}–${end}` };
    }
    slots.push({ start, end });
  }
  const merged = mergeRanges(slots, 30);
  if (merged.length > 6) return { ok: false, error: "可用时段合并后最多 6 条" };

  // dailyWords(可选)与 englishLevel(可选,≤200 中文字符)
  let dailyWords: number | undefined;
  if (a.dailyWords != null) {
    if (typeof a.dailyWords !== "number" || !Number.isInteger(a.dailyWords) || a.dailyWords < 1 || a.dailyWords > 500) {
      return { ok: false, error: "每日背词数应为 1–500 的整数" };
    }
    dailyWords = a.dailyWords;
  }
  let englishLevel: string | undefined;
  if (a.englishLevel != null && String(a.englishLevel).trim() !== "") {
    const text = String(a.englishLevel).trim();
    if (text.length > 200) {
      return { ok: false, error: "英语水平自述不能超过 200 字" };
    }
    englishLevel = text;
  }

  const availability: PlanAvailability = {
    mode,
    dailyHours,
    slots: merged,
    ...(dailyWords != null ? { dailyWords } : {}),
    ...(englishLevel ? { englishLevel } : {}),
  };

  return { ok: true, value: { examDate, targetOverallBand, targetScores, availability } };
}

/** 备考总周数:考试日所在周(锚点周一为第 1 周) */
export function totalWeeks(examDate: string, anchorMonday: string): number {
  const days = daysBetween(examDate, anchorMonday) + 1; // 含考试日当天
  return Math.max(1, Math.ceil(days / 7));
}

/** 当前水平描述块(注入 LLM;数据来自 dashboard 聚合) */
export function buildLevelBlock(d: {
  latestOverall: number | null;
  latestSubjects: Record<string, number | null | undefined>;
  radarAvg: Record<string, number>;
  target: number;
}): string {
  if (d.latestOverall == null) {
    return "无模考记录,按目标 −1.0 估计起步水平";
  }
  const label: Record<string, string> = { listening: "听", reading: "读", writing: "写" };
  const parts = Object.entries(d.latestSubjects)
    .filter(([, v]) => v != null)
    .map(([k, v]) => `${label[k] ?? k}${v!.toFixed(1)}`);
  const avgParts = Object.entries(d.radarAvg)
    .map(([k, v]) => `${label[k] ?? k}均值${v.toFixed(1)}`);
  return `最近一场完整模考总分 ${d.latestOverall.toFixed(1)}(${parts.join("/")});${avgParts.join("、")}`;
}
