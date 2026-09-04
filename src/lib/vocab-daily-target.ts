/**
 * src/lib/vocab-daily-target.ts — 今日背词量目标(P8,单一口径)
 *
 * 「今日该背多少词」的来源优先级:
 *   1. ACTIVE 备考计划当前周 weeklyTasks[type=words].count(个/天,§checklist 同源,
 *      计划页「今日任务」勾选就是这个数);
 *   2. 无计划/本周无 words 任务 → 回退背单词偏好 vocab_study_prefs.dailyNewWords。
 *
 * 供 buildReviewSession 新词限额与完成页庆祝判定共用,不再各读各的。
 */
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { studyPlans } from "@/db/schema";
import type { PlanPhase } from "@/db/schema";
import { currentWeekNo, phaseOfWeek } from "@/lib/study/checklist";
import { todayStr } from "@/lib/study/date";
import { readVocabStudyPrefs } from "@/lib/vocab-study-prefs";

export interface DailyWordTarget {
  /** 今日目标词数 */
  target: number;
  /** 目标来源:plan=备考计划今日任务 / prefs=背单词偏好 */
  source: "plan" | "prefs";
}

/** 读今日背词目标(查询时现算,改计划/调偏好立即生效) */
export function readDailyWordTarget(now = new Date()): DailyWordTarget {
  const db = getDb();
  const plan = db.select().from(studyPlans).where(eq(studyPlans.status, "ACTIVE")).get();
  if (plan) {
    const phases = plan.phasesJson as PlanPhase[];
    const weekNo = currentWeekNo(plan.planStartWeekMonday, now);
    const phase = phaseOfWeek(phases, weekNo);
    const wordsTask = phase?.weeklyTasks.find((t) => t.type === "words");
    if (wordsTask && wordsTask.count > 0) {
      return { target: wordsTask.count, source: "plan" };
    }
  }
  return { target: readVocabStudyPrefs().dailyNewWords, source: "prefs" };
}

/** 今日零点(本地时区)时间戳 */
export function todayStartMs(now = new Date()): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** 今天(本地)YYYY-MM-DD——re-export 免得调用方拼两条 import */
export { todayStr };
