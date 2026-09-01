/**
 * src/lib/study/plan-gen.ts — 备考计划生成(P7 核心,纯逻辑)
 *
 * 两条路径,同一输出形状 PlanPhase[]:
 *   1. LLM 路径:buildPlanMessages 组装消息(system 经 getPrompt 取可配置文本,
 *      user 段代码组装)→ 外部调 chatComplete → validatePhasesOutput 校验
 *   2. 默认模板路径:buildTemplatePhases 规则引擎(规划 §4.4 查表 + 缩放,
 *      v2.9 数值经 getTemplateRules 可配置;纯函数可 node:test 单测)
 *
 * v2.8:availability.slots 为 {start,end} 精确范围;范围→四段按中点归属,
 *      段边界由 wake/bed 推导;「整块」= 范围时长 ≥ blockMinMinutes。
 */
import { TASK_TYPES, TIME_SLOTS } from "@/db/schema";
import type {
  AvailableRange,
  PlanAvailability,
  PlanPhase,
  StudyPreferences,
  TargetScores,
  TaskType,
  TemplateRules,
  TimeSlot,
} from "@/db/schema";
import {
  DEFAULT_TEMPLATE_RULES,
  fillPrompt,
  getPrompt,
  getTemplateRules,
} from "@/lib/prompts/defaults";
import { daysBetween, hhmmToMin } from "@/lib/study/date";

const ROUND_05 = (n: number) => Math.round(n * 2) / 2;
const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);

export const TASK_UNIT: Record<TaskType, PlanPhase["weeklyTasks"][number]["unit"]> = {
  words: "个/天",
  listening: "套/周",
  reading: "套/周",
  writing: "套/周",
  speaking: "次/周",
  set: "套/周",
};

/* ======================================================================
 * ① 时段工具(范围合并 / 段归属 / 整块判定)
 * ====================================================================== */

/** 重叠或相邻间隔 < gapMin 的范围合并;结果按 start 升序(内部全程分钟数,避免字符串比较) */
export function mergeRanges(ranges: AvailableRange[], gapMin: number): AvailableRange[] {
  const valid = ranges
    .map((r) => ({ s: hhmmToMin(r.start), e: hhmmToMin(r.end) }))
    .filter((r): r is { s: number; e: number } => r.s != null && r.e != null && r.e > r.s)
    .sort((a, b) => a.s - b.s);
  const out: { s: number; e: number }[] = [];
  for (const r of valid) {
    const last = out[out.length - 1];
    if (last && r.s - last.e < Math.max(gapMin, 0)) {
      last.e = Math.max(last.e, r.e);
    } else {
      out.push({ s: r.s, e: r.e });
    }
  }
  return out.map((r) => ({ start: minToHHmm(r.s), end: minToHHmm(r.e) }));
}

function minToHHmm(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function rangeDurationMin(r: AvailableRange): number {
  const s = hhmmToMin(r.start);
  const e = hhmmToMin(r.end);
  return s != null && e != null ? Math.max(e - s, 0) : 0;
}

/** 段边界(分钟):上午 [wake, mEnd) / 中午 [mEnd, 14:00) / 下午 [14:00, 18:00) / 晚上 [18:00, bed] */
export interface SegmentBounds {
  wake: number;
  bed: number;
  morningEnd: number;
}

export function segmentBounds(wakeTime?: string, bedTime?: string): SegmentBounds {
  const wake = hhmmToMin(wakeTime ?? "07:00") ?? 420;
  const bed = hhmmToMin(bedTime ?? "23:00") ?? 1380;
  const span = Math.max(bed - wake, 60);
  return { wake, bed, morningEnd: wake + Math.round(span * 0.25) };
}

/** 范围中点落在哪个段(段边界由 wake/bed 推导,见规划 §4.4 作息约束) */
export function segmentOfRange(r: AvailableRange, bounds: SegmentBounds): TimeSlot {
  const s = hhmmToMin(r.start) ?? bounds.wake;
  const e = hhmmToMin(r.end) ?? bounds.bed;
  const mid = (s + e) / 2;
  if (mid < bounds.morningEnd) return "morning";
  if (mid < 14 * 60) return "noon";
  if (mid < 18 * 60) return "afternoon";
  return "evening";
}

interface Block {
  range: AvailableRange;
  duration: number;
  segment: TimeSlot;
}

/** 已合并范围 → 带时长与段归属的块列表(按时序) */
function toBlocks(ranges: AvailableRange[], bounds: SegmentBounds): Block[] {
  return ranges.map((r) => ({
    range: r,
    duration: rangeDurationMin(r),
    segment: segmentOfRange(r, bounds),
  }));
}

/* ======================================================================
 * ② 时段分配(科目偏好优先,可用时段回退)
 * ====================================================================== */

const FRAGMENT_ORDER: TimeSlot[] = ["noon", "evening", "morning", "afternoon"];

/**
 * 为一个任务分配时段;返回 undefined = 不填(渲染灰色)。
 * 规则(§4.4 ③):偏好 > 回退(words 碎片 / 听读首个整块 / 写作最长整块 / set 上午优先)。
 * 声明了范围但无一条 ≥ 整块阈值 → 整块规则退化为按范围时长降序取最长。
 */
export function assignSlot(
  type: TaskType,
  blocks: Block[],
  prefs?: StudyPreferences,
  rules?: TemplateRules,
): TimeSlot | undefined {
  const r = rules ?? DEFAULT_TEMPLATE_RULES;
  const pref = prefs?.subjectSlots?.[type];
  if (pref && TIME_SLOTS.includes(pref)) return pref;
  if (!blocks.length) return undefined;

  const covered = [...new Set(blocks.map((b) => b.segment))];
  const longest = [...blocks].sort((a, b) => b.duration - a.duration)[0];

  switch (type) {
    case "words": {
      const seg = FRAGMENT_ORDER.find((s) => covered.includes(s));
      return seg ?? covered[0];
    }
    case "listening":
    case "reading": {
      const first = blocks.find((b) => b.duration >= r.blockMinMinutes);
      // 退化:无一条 ≥ 整块阈值 → 按范围时长降序取最长(§4.4 v2.8)
      return (first ?? longest).segment;
    }
    case "writing":
      return longest.segment;
    case "set": {
      const morning = blocks.find((b) => b.segment === "morning");
      if (morning) return "morning";
      const evening = blocks.find((b) => b.segment === "evening");
      return evening ? "evening" : undefined;
    }
    default:
      return undefined;
  }
}

/* ======================================================================
 * ③ 阶段划分(§4.4 ①)
 * ====================================================================== */

/** 返回 [基础期周数, 强化期周数, 冲刺期周数],合计 = weeks */
export function splitPhaseWeeks(
  weeks: number,
  ratios: TemplateRules["phaseRatios"],
): [number, number, number] {
  const W = Math.max(1, Math.floor(weeks));
  if (W <= 1) return [0, 0, W];
  if (W === 2) return [0, 1, 1];
  if (W <= 5) {
    let [b, s, p] = ratios.short;
    // 超出周数:先去掉基础期(并入强化),再从强化/冲刺收敛
    while (b + s + p > W) {
      if (b > 0) b = 0;
      else if (s >= p && s > 1) s -= 1;
      else if (p > 1) p -= 1;
      else break;
    }
    while (b + s + p < W) s += 1;
    return [b, s, p];
  }
  if (W <= 9) {
    const [b, s, p] = ratios.mid;
    const sAdj = Math.max(1, s + (W - (b + s + p)));
    return [b, sAdj, p];
  }
  // ≥10 周:按百分比取整,至少各 1 周
  const b = Math.max(1, Math.round((W * ratios.long[0]) / 100));
  const s = Math.max(1, Math.round((W * ratios.long[1]) / 100));
  const p = Math.max(1, W - b - s);
  return [b, Math.max(1, W - b - p), p];
}

/* ======================================================================
 * ④ 默认模板规则引擎(buildTemplatePhases)
 * ====================================================================== */

export interface TemplateInput {
  weeks: number;
  availability: PlanAvailability;
  prefs?: StudyPreferences;
  /** 目标分与当前差距(可选,预留差距加权;当前版本不影响查表) */
  rules?: TemplateRules;
}

type PhaseKey = "basic" | "strengthen" | "sprint";

const PHASE_META: Record<PhaseKey, { name: string; focus: string }> = {
  basic: { name: "基础期", focus: "词汇打底 + 题型认知" },
  strengthen: { name: "强化期", focus: "分科专项 + 差距攻坚" },
  sprint: { name: "冲刺期", focus: "整套模考 + 错题复盘" },
};

export function buildTemplatePhases(input: TemplateInput): PlanPhase[] {
  const rules = input.rules ?? getTemplateRules();
  const W = Math.max(1, Math.floor(input.weeks));
  const avail = input.availability;
  const prefs = input.prefs;

  const bounds = segmentBounds(prefs?.wakeTime, prefs?.bedTime);
  const merged = mergeRanges(avail.slots ?? [], rules.mergeGapMinutes).slice(
    0,
    6,
  );
  const blocks = toBlocks(merged, bounds);

  const [bW, sW, pW] = splitPhaseWeeks(W, rules.phaseRatios);
  const factor = Math.max(0.5, ROUND_05(avail.dailyHours / rules.scaleBaseHours));

  const buildTasks = (phase: PhaseKey): PlanPhase["weeklyTasks"] => {
    const base = rules.baseWeekly[phase];
    const tasks: PlanPhase["weeklyTasks"] = [];
    for (const type of TASK_TYPES) {
      const baseCount = base[type];
      if (baseCount <= 0) continue;

      let count: number;
      if (type === "words") {
        const declared = avail.dailyWords;
        count =
          declared && declared > 0
            ? clamp(Math.round(declared), 10, rules.wordsCeil)
            : clamp(Math.round(baseCount * factor), 10, rules.wordsCeil);
      } else if (type === "writing") {
        // §4.4 注:每日 <1.5h 时强化期写作降为 1
        count =
          phase === "strengthen" && avail.dailyHours < 1.5
            ? 1
            : clamp(ROUND_05(baseCount * factor), 1, rules.perSubjectCeil);
      } else if (type === "speaking") {
        // 口语论「次」不论「套」,保持整数
        count = clamp(Math.round(baseCount * factor), 1, rules.perSubjectCeil);
      } else {
        count = clamp(ROUND_05(baseCount * factor), 1, rules.perSubjectCeil);
      }

      tasks.push({
        type,
        count,
        unit: TASK_UNIT[type],
        slot: assignSlot(type, blocks, prefs, rules),
      });
    }
    return tasks;
  };

  const phases: PlanPhase[] = [];
  let cursor = 1;
  for (const [key, weeks] of [
    ["basic", bW],
    ["strengthen", sW],
    ["sprint", pW],
  ] as [PhaseKey, number][]) {
    if (weeks <= 0) continue;
    const weeksArr = Array.from({ length: weeks }, (_, i) => cursor + i);
    cursor += weeks;
    phases.push({
      name: PHASE_META[key].name,
      weeks: weeksArr,
      focus: PHASE_META[key].focus,
      weeklyTasks: buildTasks(key),
    });
  }
  return phases;
}

/* ======================================================================
 * ⑤ LLM 输出校验
 * ====================================================================== */

export interface ValidateResult {
  ok: boolean;
  phases?: PlanPhase[];
  reason?: string;
}

/** LLM 输出 schema 校验(type 枚举 / weeks 连续覆盖 1..weeks / slot 枚举 / count>0) */
export function validatePhasesOutput(raw: unknown, weeks: number): ValidateResult {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { ok: false, reason: "输出不是非空数组" };
  }
  const W = Math.max(1, Math.floor(weeks));
  const phases: PlanPhase[] = [];
  const seen = new Set<number>();

  for (const item of raw) {
    if (!item || typeof item !== "object") return { ok: false, reason: "阶段元素不是对象" };
    const p = item as Record<string, unknown>;
    if (typeof p.name !== "string" || !p.name.trim()) {
      return { ok: false, reason: "阶段缺少 name" };
    }
    if (typeof p.focus !== "string" || p.focus.trim().length > 20) {
      return { ok: false, reason: `阶段「${p.name}」focus 缺失或超 20 字` };
    }
    if (
      !Array.isArray(p.weeks) ||
      p.weeks.length === 0 ||
      !p.weeks.every((n) => Number.isInteger(n) && n >= 1 && n <= W)
    ) {
      return { ok: false, reason: `阶段「${p.name}」weeks 非法` };
    }
    for (const w of p.weeks as number[]) {
      if (seen.has(w)) return { ok: false, reason: `第 ${w} 周被重复覆盖` };
      seen.add(w);
    }
    if (!Array.isArray(p.weeklyTasks) || p.weeklyTasks.length === 0) {
      return { ok: false, reason: `阶段「${p.name}」weeklyTasks 为空` };
    }
    const tasks: PlanPhase["weeklyTasks"] = [];
    for (const t of p.weeklyTasks) {
      if (!t || typeof t !== "object") return { ok: false, reason: "任务元素不是对象" };
      const task = t as Record<string, unknown>;
      if (!TASK_TYPES.includes(task.type as TaskType)) {
        return { ok: false, reason: `未知任务 type:${String(task.type)}` };
      }
      if (typeof task.count !== "number" || !Number.isFinite(task.count) || task.count <= 0) {
        return { ok: false, reason: `任务 ${String(task.type)} count 非法` };
      }
      const type = task.type as TaskType;
      if (task.slot != null && !TIME_SLOTS.includes(task.slot as TimeSlot)) {
        return { ok: false, reason: `任务 ${type} slot 非法:${String(task.slot)}` };
      }
      // unit 是纯展示字段、由 type 唯一决定:无论 LLM 写什么(如 writing 写成「次/周」)
      // 一律覆写为规范值,不为它拒整份输出——提示词无法约束死量词,曾致生成稳定失败
      tasks.push({
        type,
        count: task.count,
        unit: TASK_UNIT[type],
        ...(task.slot != null ? { slot: task.slot as TimeSlot } : {}),
      });
    }
    phases.push({
      name: p.name.trim(),
      weeks: [...(p.weeks as number[])].sort((a, b) => a - b),
      focus: p.focus.trim(),
      weeklyTasks: tasks,
    });
  }

  if (seen.size !== W) {
    return { ok: false, reason: `weeks 未连续覆盖 1..${W}(缺 ${W - seen.size} 周)` };
  }
  phases.sort((a, b) => a.weeks[0] - b.weeks[0]);
  return { ok: true, phases };
}

/* ======================================================================
 * ⑥ LLM 消息组装(system 可配置 / user 段封闭)
 * ====================================================================== */

export interface PlanPromptInput {
  examDate: string;
  days: number;
  weeks: number;
  overall: number;
  targets: TargetScores;
  /** 当前水平描述(有模考:各科 band+薄弱科;无:按目标 −1.0 估计) */
  levelBlock: string;
  availability: PlanAvailability;
  prefs?: StudyPreferences;
  /** 差距最大的科目(可选) */
  weakestSubject?: string;
}

const MODE_LABEL = { fulltime: "全职备考", working: "在职备考" } as const;

function renderSlotsText(availability: PlanAvailability): string {
  const slots = availability.slots ?? [];
  if (!slots.length) return "未声明(由系统不安排时段)";
  return slots.map((s) => `${s.start}–${s.end}`).join("、");
}

function renderPrefsText(prefs?: StudyPreferences): string {
  const wake = prefs?.wakeTime ?? "07:00";
  const bed = prefs?.bedTime ?? "23:00";
  const lines = Object.entries(prefs?.subjectSlots ?? {});
  const segLabel: Record<TimeSlot, string> = {
    morning: "上午",
    noon: "中午",
    afternoon: "下午",
    evening: "晚上",
  };
  const prefText = lines.length
    ? lines.map(([k, v]) => `${k}→${segLabel[v as TimeSlot]}`).join("、")
    : "无";
  return `起床 ${wake} / 睡觉 ${bed};科目偏好时段:${prefText}`;
}

/** 组装 [system, user] 消息;system 经 getPrompt 取可配置文本 */
export function buildPlanMessages(input: PlanPromptInput): {
  system: string;
  user: string;
} {
  const system = fillPrompt(getPrompt("prompt_plan_generate"), {
    weeks: String(input.weeks),
  });

  const t = input.targets;
  const weakest = input.weakestSubject
    ? `;差距最大:${input.weakestSubject}`
    : "";
  const selfStatement = input.availability.englishLevel?.trim()
    ? input.availability.englishLevel.trim()
    : "(未填写)";

  const user = `## 考生信息
- 考试日期 ${input.examDate},距今 ${input.days} 天 ≈ ${input.weeks} 周
- 目标:总分 ${input.overall}(听力 ${t.listening ?? "—"} / 阅读 ${t.reading ?? "—"} / 写作 ${t.writing ?? "—"} / 口语 ${t.speaking ?? "—"})${weakest}
- 当前水平:${input.levelBlock}
- 考生自述(原样引用,可能为空):${selfStatement}
- 备考身份:${MODE_LABEL[input.availability.mode]};每天可投入 ${input.availability.dailyHours} 小时;可用时段:${renderSlotsText(input.availability)}
- 个人习惯:${renderPrefsText(input.prefs)}

请按系统指令输出严格 JSON 的分阶段作战计划。`;

  return { system, user };
}
