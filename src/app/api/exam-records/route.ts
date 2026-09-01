/**
 * /api/exam-records — 单科考试记录(P2)
 *
 * POST:接收换皮页 scoring.js 的交卷上报 {examId, usedSec, values},
 *       服务端判分(以 papers.answers_json 为准)→ 组装答题卡 → 写入 exam_records 1 行;
 *       band 由 papers.band_table_json 换算(快照定格)。
 * GET :最近考试记录列表(带卷标题,仪表盘「考试记录」数据源)。
 */
import { after, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { examRecords, papers } from "@/db/schema";
import type { AnswerSheetJson } from "@/db/schema";
import { judgePaper, rawToBand } from "@/lib/scoring";
import { finalizeIfComplete } from "@/lib/session";
import { gradeWritingRecord } from "@/lib/grading/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SubmitBody {
  examId?: string;
  usedSec?: number;
  values?: Record<string, string>;
  sessionId?: string;
}

/**
 * 写作卷入库后自动触发 AI 批改(P5,用户选定「交卷后自动批改」)。
 *
 * 用 after() 后台执行:交卷响应不等批改(10–60 秒),立刻返回让前端转场,
 * 批改进度由成绩页轮询 GET /api/grading/[recordId] 呈现。
 * 批改完成会回写 exam_records.band_score 并重算场次总分。
 */
function triggerAutoGrading(recordId: number, sheet: AnswerSheetJson) {
  // 两篇都空白就别烧 token 了(正常连考不会走到这,防异常上报产生无意义调用)
  const hasContent = Object.values(sheet).some(
    (e) => typeof (e as { value?: string | null }).value === "string"
      && (e as { value?: string }).value!.trim().length >= 10,
  );
  if (!hasContent) {
    console.log(`[grading] record=${recordId} 两篇作文均空白,跳过自动批改`);
    return;
  }
  after(() => {
    gradeWritingRecord(recordId)
      .then((r) => {
        console.log(
          `[grading] 自动批改结束 record=${recordId} ok=${r.ok} band=${r.band ?? "-"} ${r.error ?? ""}`,
        );
      })
      .catch((e) => console.error("[grading] 自动批改异常:", e));
  });
}

export async function POST(request: Request) {
  let body: SubmitBody;
  try {
    body = (await request.json()) as SubmitBody;
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const { examId, usedSec, values, sessionId } = body;
  if (!examId || !values) {
    return NextResponse.json({ error: "缺少 examId 或 values" }, { status: 400 });
  }

  const db = getDb();
  const paper = db.select().from(papers).where(eq(papers.examId, examId)).get();
  if (!paper) {
    return NextResponse.json({ error: `卷不存在:${examId}` }, { status: 404 });
  }

  const now = new Date();
  const used = Math.max(0, Math.min(Math.round(usedSec ?? 0), paper.durationSec));

  // 写作卷:仅连考模式(sessionId 存在)允许上报,占位 0 分;单科模式仍 400
  if (paper.subject === "writing" || !paper.answersJson) {
    if (!sessionId) {
      return NextResponse.json({ error: "写作卷无客观判分,不支持单科上报" }, { status: 400 });
    }
    // 写作答题卡:T1/T2 全文(值来自 values 的 T1/T2 键),不判分
    const sheet: AnswerSheetJson = Object.fromEntries(
      Object.entries(paper.questionsJson)
        .filter(([, q]) => q.type === "WRITING_TASK")
        .map(([k]) => [
          k,
          {
            task: k as "T1" | "T2",
            type: "WRITING_TASK" as const,
            value: values[k] ?? null,
            correct: null,
            points: null,
          },
        ]),
    );
    // 幂等:同场次同卷已有记录则覆盖(防重试产生重复行,污染完成判定)
    const existing = db
      .select({ id: examRecords.id })
      .from(examRecords)
      .where(and(eq(examRecords.sessionId, sessionId), eq(examRecords.examId, paper.examId)))
      .get();
    if (existing) {
      db.update(examRecords)
        .set({
          status: "SUBMITTED",
          startedAt: new Date(now.getTime() - used * 1000),
          submittedAt: now,
          usedSec: used,
          answerSheetJson: sheet,
        })
        .where(eq(examRecords.id, existing.id))
        .run();
      const completed = finalizeIfComplete(sessionId);
      triggerAutoGrading(existing.id, sheet);
      return NextResponse.json({
        ok: true,
        recordId: existing.id,
        correctCount: 0,
        band: 0,
        writingPlaceholder: true,
        sessionCompleted: completed,
      });
    }
    const result = db
      .insert(examRecords)
      .values({
        examId: paper.examId,
        subject: paper.subject,
        sessionId,
        status: "SUBMITTED",
        startedAt: new Date(now.getTime() - used * 1000),
        submittedAt: now,
        usedSec: used,
        correctCount: 0,
        bandScore: 0, // 占位,P5 AI 批改后回写
        answerSheetJson: sheet,
      })
      .returning({ id: examRecords.id })
      .all();
    const completed = finalizeIfComplete(sessionId);
    triggerAutoGrading(result[0].id, sheet);
    return NextResponse.json({
      ok: true,
      recordId: result[0].id,
      correctCount: 0,
      band: 0,
      writingPlaceholder: true,
      sessionCompleted: completed,
    });
  }

  const { sheet, correctCount } = judgePaper(
    paper.questionsJson,
    paper.answersJson,
    values,
  );
  const band = rawToBand(correctCount, paper.bandTableJson);

  // 幂等:连考模式下同场次同卷已有记录则覆盖(防重试产生重复行)
  if (sessionId) {
    const existing = db
      .select({ id: examRecords.id })
      .from(examRecords)
      .where(and(eq(examRecords.sessionId, sessionId), eq(examRecords.examId, paper.examId)))
      .get();
    if (existing) {
      db.update(examRecords)
        .set({
          status: "SUBMITTED",
          startedAt: new Date(now.getTime() - used * 1000),
          submittedAt: now,
          usedSec: used,
          correctCount,
          bandScore: band,
          answerSheetJson: sheet,
        })
        .where(eq(examRecords.id, existing.id))
        .run();
      const completed = finalizeIfComplete(sessionId);
      return NextResponse.json({
        ok: true,
        recordId: existing.id,
        correctCount,
        band,
        sessionCompleted: completed,
      });
    }
  }

  const result = db
    .insert(examRecords)
    .values({
      examId: paper.examId,
      subject: paper.subject,
      sessionId: sessionId ?? null, // 完整套卷模式(P4)由连考编排传入
      status: "SUBMITTED",
      startedAt: new Date(now.getTime() - used * 1000),
      submittedAt: now,
      usedSec: used,
      correctCount,
      bandScore: band,
      answerSheetJson: sheet,
    })
    .returning({ id: examRecords.id })
    .all();

  // 连考模式:交卷后检查场次是否三科齐全,齐全则回写 overall 快照
  const completed = sessionId ? finalizeIfComplete(sessionId) : false;

  return NextResponse.json({
    ok: true,
    recordId: result[0].id,
    correctCount,
    band,
    sessionCompleted: completed,
  });
}

export async function GET() {
  const db = getDb();
  const rows = db
    .select({
      id: examRecords.id,
      examId: examRecords.examId,
      paperTitle: papers.title,
      subject: examRecords.subject,
      status: examRecords.status,
      startedAt: examRecords.startedAt,
      submittedAt: examRecords.submittedAt,
      usedSec: examRecords.usedSec,
      correctCount: examRecords.correctCount,
      bandScore: examRecords.bandScore,
    })
    .from(examRecords)
    .leftJoin(papers, eq(papers.examId, examRecords.examId))
    .orderBy(desc(examRecords.startedAt))
    .limit(50)
    .all();
  return NextResponse.json({ records: rows });
}
