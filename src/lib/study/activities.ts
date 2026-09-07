/**
 * src/lib/study/activities.ts — 备考活动埋点(P7,唯一写入口)
 *
 * 三条入口:
 *   recordSubjectSubmission  单科交卷(exam-records POST 新插入分支)
 *   recordExamSetCompletion  套卷完成(finalizeIfComplete 首次转 COMPLETED)
 *   recordMemorizedWord      背词(P8 预留)
 *
 * 原则:打卡是**旁路统计**,任何失败只 console.warn,绝不阻塞交卷主链路。
 * 统一 upsert:INSERT ... ON CONFLICT(activity_date) DO UPDATE 计数列 + delta。
 */
import { getSqlite } from "@/db";
import { todayStr } from "@/lib/study/date";
import type { Subject } from "@/db/schema";

/** 各科目对应的计数列(与 study_activities 列名一致;speaking 预留,上线加 SUBJECTS 值即可用) */
const SUBJECT_COLUMN: Record<Subject | "speaking", string> = {
  listening: "listening_submission_count",
  reading: "reading_submission_count",
  writing: "writing_submission_count",
  speaking: "speaking_submission_count",
};

function upsertDelta(dateStr: string, deltas: Record<string, number>) {
  try {
    const keys = Object.keys(deltas).filter((k) => deltas[k] !== 0);
    if (!keys.length) return;
    const sqlite = getSqlite();
    const setClause = keys
      .map((k) => `${k} = ${k} + ${deltas[k]}`)
      .join(", ");
    const cols = ["activity_date", ...keys];
    const ph = cols.map(() => "?").join(", ");
    const vals = [dateStr, ...keys.map((k) => deltas[k])];
    sqlite
      .prepare(
        `INSERT INTO study_activities (${cols.join(", ")}) VALUES (${ph})
         ON CONFLICT(activity_date) DO UPDATE SET ${setClause}, updated_at = unixepoch()`,
      )
      .run(...vals);
  } catch (e) {
    console.warn("[activities] 埋点失败(旁路忽略):", e);
  }
}

/** 单科交卷埋点:POST /api/exam-records 成功插入新记录后调用(覆盖重试路径不调,防重复计数) */
export function recordSubjectSubmission(subject: Subject): void {
  const col = SUBJECT_COLUMN[subject];
  if (!col) return;
  upsertDelta(todayStr(), { [col]: 1 });
}

/** 套卷完成埋点:finalizeIfComplete 首次转 COMPLETED 时调用(幂等:重复 finalize 不计数) */
export function recordExamSetCompletion(): void {
  upsertDelta(todayStr(), { exam_set_completion_count: 1 });
}

/** 背词埋点:P8 背词模块每完成一词调用(本期只留函数,页面后接) */
export function recordMemorizedWord(delta = 1): void {
  if (!delta) return;
  upsertDelta(todayStr(), { memorized_word_count: delta });
}
