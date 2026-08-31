/**
 * /api/exam-records — 单科考试记录(P2)
 *
 * POST:接收换皮页 scoring.js 的交卷上报 {examId, usedSec, values},
 *       服务端判分(以 papers.answers_json 为准)→ 组装答题卡 → 写入 exam_records 1 行;
 *       band 由 papers.band_table_json 换算(快照定格)。
 * GET :最近考试记录列表(带卷标题,仪表盘「考试记录」数据源)。
 */
import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { examRecords, papers } from "@/db/schema";
import { judgePaper, rawToBand } from "@/lib/scoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SubmitBody {
  examId?: string;
  usedSec?: number;
  values?: Record<string, string>;
}

export async function POST(request: Request) {
  let body: SubmitBody;
  try {
    body = (await request.json()) as SubmitBody;
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const { examId, usedSec, values } = body;
  if (!examId || !values) {
    return NextResponse.json({ error: "缺少 examId 或 values" }, { status: 400 });
  }

  const db = getDb();
  const paper = db.select().from(papers).where(eq(papers.examId, examId)).get();
  if (!paper) {
    return NextResponse.json({ error: `卷不存在:${examId}` }, { status: 404 });
  }
  if (paper.subject === "writing" || !paper.answersJson) {
    return NextResponse.json({ error: "写作卷无客观判分,不支持上报" }, { status: 400 });
  }

  const { sheet, correctCount } = judgePaper(
    paper.questionsJson,
    paper.answersJson,
    values,
  );
  const band = rawToBand(correctCount, paper.bandTableJson);
  const now = new Date();
  const used = Math.max(0, Math.min(Math.round(usedSec ?? 0), paper.durationSec));

  const result = db
    .insert(examRecords)
    .values({
      examId: paper.examId,
      subject: paper.subject,
      sessionId: null, // 完整套卷模式(P4)开考前创建场次后回填
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

  return NextResponse.json({ ok: true, recordId: result[0].id, correctCount, band });
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
