/**
 * src/lib/session.ts — 完整套卷场次编排(P4)
 *
 * 一场完整考试 = 1 行 exam_sessions + 3 行 exam_records(听/读/写)。
 * 职责:
 *   1. createSession:开考前建场次(session_id 幂等格式 = examSetId + 本地时间戳)
 *   2. finalizeIfComplete:每科交卷后检查三科是否齐全,齐全则算 overall_band
 *      + total_used_sec 快照并置 COMPLETED(与 band_score 同一定格原则)
 *
 * 总成绩策略(P4 阶段,写作无 AI 批改):
 *   写作卷 band 占位 0 分、correct_count=0,overall_band = 三科 band 平均
 *   四舍五入到 0.5;写作行标注「待 AI 批改(P5)」。
 */
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { examRecords, examSessions, examSets, papers } from "@/db/schema";
import { recordExamSetCompletion } from "@/lib/study/activities";

/** 四舍五入到最近 0.5(雅思 band 步进) */
export function roundToHalf(n: number): number {
  return Math.round(n * 2) / 2;
}

/** 生成场次 id:examSetId + 本地日期时间(可读、幂等、防重复) */
export function makeSessionId(examSetId: string, now = new Date()): string {
  const pad = (x: number) => String(x).padStart(2, "0");
  const ts =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `${examSetId}-${ts}`;
}

/** 建场次:传入 examSetId,返回 session 行;套卷不存在抛错 */
export function createSession(examSetId: string) {
  const db = getDb();
  const set = db.select().from(examSets).where(eq(examSets.examSetId, examSetId)).get();
  if (!set) throw new Error(`套卷不存在:${examSetId}`);
  const sessionId = makeSessionId(examSetId);
  const now = new Date();
  db.insert(examSessions)
    .values({
      sessionId,
      examSetId: set.examSetId,
      status: "IN_PROGRESS",
      startedAt: now,
    })
    .run();
  return db.select().from(examSessions).where(eq(examSessions.sessionId, sessionId)).get()!;
}

/**
 * 每科交卷后调用:检查该场次下三科(听/读/写)是否都有已交卷记录,
 * 齐全则回写 overall_band + total_used_sec 并置 COMPLETED。
 * 返回是否完成(用于交卷接口决定是否带 overall 快照返回)。
 *
 * 完成判定按「科目集合」而非记录条数:同科重复提交(重试/兜底)会产生多条记录,
 * 若按条数比对套卷科目数会误判完成。这里检查已交卷记录覆盖了套卷的全部科目。
 */
/**
 * 判断场次是否已交齐全部科目(按科目集合判定,非记录条数 —— 同科重复提交
 * 会产生多条记录,按条数比对会误判完成)。
 */
export function isSessionComplete(sessionId: string): boolean {
  const db = getDb();
  const session = db
    .select()
    .from(examSessions)
    .where(eq(examSessions.sessionId, sessionId))
    .get();
  if (!session) return false;

  const rows = db
    .select()
    .from(examRecords)
    .where(eq(examRecords.sessionId, sessionId))
    .all();
  // 交卷才算(SUBMITTED/COMPLETED);IN_PROGRESS/ABANDONED 不计
  const submitted = rows.filter((r) => r.status === "SUBMITTED" || r.status === "COMPLETED");
  // 套卷下应有科目集合(写作也算,即使占位 0 分)
  const papersOfSet = db
    .select({ subject: papers.subject })
    .from(papers)
    .where(eq(papers.examSetId, session.examSetId))
    .all();
  const requiredSubjects = new Set(papersOfSet.map((p) => p.subject));
  const submittedSubjects = new Set(submitted.map((r) => r.subject));
  for (const s of requiredSubjects) {
    if (!submittedSubjects.has(s)) return false;
  }
  return true;
}

/**
 * 计算场次总分快照(只算不写)。
 * 同一科目若有多条记录,取最新一条(submittedAt 最大)参与计算,避免重试产生的
 * 旧记录污染总分。写作 band 未批改时按 0 占位参与平均(与 P4 一致)。
 */
export function computeSessionOverall(
  sessionId: string,
): { overall: number; totalUsed: number } | null {
  const db = getDb();
  const rows = db
    .select()
    .from(examRecords)
    .where(eq(examRecords.sessionId, sessionId))
    .all();
  const submitted = rows.filter((r) => r.status === "SUBMITTED" || r.status === "COMPLETED");
  if (!submitted.length) return null;

  const latestBySubject = new Map<string, (typeof submitted)[number]>();
  for (const r of submitted) {
    const prev = latestBySubject.get(r.subject);
    if (!prev || (r.submittedAt?.getTime() ?? 0) > (prev.submittedAt?.getTime() ?? 0)) {
      latestBySubject.set(r.subject, r);
    }
  }
  const latest = [...latestBySubject.values()];
  // 写作 band 未批改(P5 未完成/失败)时为 null 或 0,按 0 参与平均
  const bands = latest.map((r) => r.bandScore ?? 0);
  const overall = roundToHalf(bands.reduce((a, b) => a + b, 0) / Math.max(bands.length, 1));
  const totalUsed = latest.reduce((a, r) => a + (r.usedSec ?? 0), 0);
  return { overall, totalUsed };
}

export function finalizeIfComplete(sessionId: string): boolean {
  const db = getDb();
  if (!isSessionComplete(sessionId)) return false;

  // 幂等埋点:只有首次 IN_PROGRESS → COMPLETED 转换才计套卷完成,
  // 重复 finalize(同科重试再触发)不重复计数
  const current = db
    .select({ status: examSessions.status })
    .from(examSessions)
    .where(eq(examSessions.sessionId, sessionId))
    .get();

  const snap = computeSessionOverall(sessionId);
  if (!snap) return false;

  db.update(examSessions)
    .set({
      status: "COMPLETED",
      overallBand: snap.overall,
      totalUsedSec: snap.totalUsed,
      finishedAt: new Date(),
    })
    .where(eq(examSessions.sessionId, sessionId))
    .run();

  if (current && current.status !== "COMPLETED") {
    recordExamSetCompletion(); // P7 活动埋点(旁路,失败不阻塞)
  }
  return true;
}

/**
 * P5:写作 AI 批改完成后重算场次总分。
 *
 * 为什么需要:P4 结算时写作是 0 分占位,总分已被写入 exam_sessions.overall_band。
 * 批改出真实 band 后若只回写 exam_records.band_score,场次总分会永远停在旧值。
 * 这里保持 COMPLETED 状态不变,只刷新 overall_band / total_used_sec。
 */
export function refreshSessionOverall(sessionId: string): boolean {
  const db = getDb();
  const snap = computeSessionOverall(sessionId);
  if (!snap) return false;
  db.update(examSessions)
    .set({ overallBand: snap.overall, totalUsedSec: snap.totalUsed })
    .where(eq(examSessions.sessionId, sessionId))
    .run();
  return true;
}

/** 场次详情:场次 + 套卷 + 三科记录(供成绩单页) */
export function getSessionDetail(sessionId: string) {
  const db = getDb();
  const session = db
    .select()
    .from(examSessions)
    .where(eq(examSessions.sessionId, sessionId))
    .get();
  if (!session) return null;
  const set = db.select().from(examSets).where(eq(examSets.examSetId, session.examSetId)).get();
  const records = db
    .select()
    .from(examRecords)
    .where(eq(examRecords.sessionId, sessionId))
    .orderBy(desc(examRecords.startedAt))
    .all();
  const papersOfSet = db
    .select()
    .from(papers)
    .where(eq(papers.examSetId, session.examSetId))
    .all();
  return { session, set, records, papers: papersOfSet };
}

/** 场次列表(仪表盘/成绩单入口用) */
export function listSessions(limit = 50) {
  const db = getDb();
  return db
    .select({
      sessionId: examSessions.sessionId,
      examSetId: examSessions.examSetId,
      status: examSessions.status,
      startedAt: examSessions.startedAt,
      finishedAt: examSessions.finishedAt,
      totalUsedSec: examSessions.totalUsedSec,
      overallBand: examSessions.overallBand,
      setTitle: examSets.title,
      category: examSets.category,
    })
    .from(examSessions)
    .leftJoin(examSets, eq(examSets.examSetId, examSessions.examSetId))
    .orderBy(desc(examSessions.startedAt))
    .limit(limit)
    .all();
}
