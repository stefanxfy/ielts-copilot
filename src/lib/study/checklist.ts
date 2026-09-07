/**
 * src/lib/study/checklist.ts — 今日任务勾选判定 + 打卡判定(P7)
 *
 * 全部查询时计算,不物化(规划 §4.5 / §5.2):
 *   - 勾选:words 按当日 memorized_word_count;科目/套卷按本周累计(周一为周首)
 *   - speaking P8 前豁免:不勾不红,灰色「暂无追踪」(数据列就绪即自动转正常判定)
 *   - 打卡:阈值走 app_settings.punch_rules 配置(现读,历史日即时重算)
 */
import type { PlanAvailability, PlanPhase, PunchRules } from "@/db/schema";
import { TASK_TYPES } from "@/db/schema";
import type { TaskType } from "@/db/schema";
import { addDays, daysBetween, mondayOf, todayStr } from "@/lib/study/date";
import { readPunchRules } from "@/lib/study/settings";

export interface DayActivity {
  activityDate: string;
  examSetCompletionCount: number;
  listeningSubmissionCount: number;
  readingSubmissionCount: number;
  writingSubmissionCount: number;
  speakingSubmissionCount: number;
  memorizedWordCount: number;
}

type ActivityColumn = Record<TaskType, keyof DayActivity | null>;

/** 任务类型 → activities 计数列(words 特殊:按当日) */
const COLUMN: ActivityColumn = {
  words: "memorizedWordCount",
  listening: "listeningSubmissionCount",
  reading: "readingSubmissionCount",
  writing: "writingSubmissionCount",
  speaking: "speakingSubmissionCount",
  set: "examSetCompletionCount",
};

/** 当前周号(锚点周一为第 1 周) */
export function currentWeekNo(anchorMonday: string, now = new Date()): number {
  return Math.floor(daysBetween(todayStr(now), anchorMonday) / 7) + 1;
}

/** 当前周所在阶段;找不到(超出计划范围)返回 undefined */
export function phaseOfWeek(phases: PlanPhase[], weekNo: number): PlanPhase | undefined {
  return phases.find((p) => p.weeks.includes(weekNo));
}

export interface TaskCheck {
  type: TaskType;
  count: number;
  unit: string;
  slot?: string;
  /** 勾选条件值(当日背词数 / 本周累计交卷数) */
  progress: number;
  done: boolean;
  /** P8 前口语豁免:数据恒 0,渲染灰色「暂无追踪」 */
  exempt: boolean;
}

/**
 * 今日任务清单判定。
 * @param phases    计划阶段
 * @param anchor    plan_start_week_monday
 * @param activities 今日 + 本周一至今的活动行(调用方一次查好)
 */
export function buildTodayChecklist(
  phases: PlanPhase[],
  anchor: string,
  activities: DayActivity[],
  now = new Date(),
): { weekNo: number; phase?: PlanPhase; tasks: TaskCheck[] } {
  const weekNo = currentWeekNo(anchor, now);
  const phase = phaseOfWeek(phases, weekNo);
  if (!phase) return { weekNo, tasks: [] };

  const today = todayStr(now);
  const weekStart = mondayOf(today);
  const byDate = new Map(activities.map((a) => [a.activityDate, a]));

  // 本周累计:周一..今天逐日求和
  const weekSum = new Map<TaskType, number>();
  for (let d = weekStart; daysBetween(today, d) >= 0; d = addDays(d, 1)) {
    const a = byDate.get(d);
    if (!a) continue;
    for (const t of TASK_TYPES) {
      const col = COLUMN[t];
      if (t === "words" || !col) continue;
      weekSum.set(t, (weekSum.get(t) ?? 0) + (a[col] as number));
    }
  }

  const todayRow = byDate.get(today);
  const tasks: TaskCheck[] = phase.weeklyTasks.map((t) => {
    // P8 前口语豁免(版本级):speaking_submission_count 尚无写入方,
    // 不参与勾选判定,渲染灰色「暂无追踪」;P8 上线后移除此豁免即自动转正常
    const exempt = t.type === "speaking";
    if (t.type === "words") {
      const progress = todayRow?.memorizedWordCount ?? 0;
      return { type: t.type, count: t.count, unit: t.unit, slot: t.slot, progress, done: progress >= t.count, exempt };
    }
    const progress = weekSum.get(t.type) ?? 0;
    return {
      type: t.type,
      count: t.count,
      unit: t.unit,
      slot: t.slot,
      progress,
      done: !exempt && progress >= t.count,
      exempt,
    };
  });

  return { weekNo, phase, tasks };
}

/* ---------- 打卡判定(配置驱动) ---------- */

export interface DayPunch {
  date: string;
  /** 交卷类动作合计(五科交卷 + 套卷完成) */
  submissions: number;
  words: number;
  /** 0 = 未打卡;1 = 单达标;2 = 双达标 */
  level: 0 | 1 | 2;
}

function daySubmissions(a: DayActivity): number {
  return (
    a.listeningSubmissionCount +
    a.readingSubmissionCount +
    a.writingSubmissionCount +
    a.speakingSubmissionCount +
    a.examSetCompletionCount
  );
}

/** 单日打卡态(规则现读,历史日即时重算) */
export function punchOfDay(a: DayActivity, rules: PunchRules): DayPunch {
  const submissions = daySubmissions(a);
  const words = a.memorizedWordCount;
  const submitted = submissions >= rules.submissionMin ? 1 : 0;
  const worded = words >= rules.wordsMin ? 1 : 0;
  const punched = (submitted + worded) as 0 | 1 | 2;
  const level: 0 | 1 | 2 =
    punched === 0 ? 0 : rules.bothForFull ? ((punched === 2 ? 2 : 1) as 1 | 2) : 2;
  return { date: a.activityDate, submissions, words, level };
}

/** 日期范围内逐日打卡态(无活动日 level=0) */
export function punchRange(
  from: string,
  to: string,
  activities: DayActivity[],
  rules?: PunchRules,
): DayPunch[] {
  const r = rules ?? readPunchRules();
  const byDate = new Map(activities.map((a) => [a.activityDate, a]));
  const out: DayPunch[] = [];
  for (let d = from; daysBetween(to, d) >= 0; d = addDays(d, 1)) {
    const a = byDate.get(d);
    if (a) {
      out.push(punchOfDay(a, r));
    } else {
      out.push({ date: d, submissions: 0, words: 0, level: 0 });
    }
  }
  return out;
}

/** 计划可用性 convenience:readStudyPreferences 的 slots 类型引用 */
export type { PlanAvailability };
