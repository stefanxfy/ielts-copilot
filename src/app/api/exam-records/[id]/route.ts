/**
 * /api/exam-records/[id] — 单条考试记录(P3 回看)
 *
 * GET:返回该记录的答题卡(answer_sheet_json),回看模式壳层取用后
 *     发给 iframe 回填批改。带卷标题做展示兜底。
 */
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { examRecords, papers } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const recordId = Number(id);
  if (!Number.isInteger(recordId)) {
    return NextResponse.json({ error: "无效的记录 id" }, { status: 400 });
  }

  const db = getDb();
  const row = db
    .select()
    .from(examRecords)
    .where(eq(examRecords.id, recordId))
    .get();
  if (!row) {
    return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  }

  const paper = db
    .select({ title: papers.title })
    .from(papers)
    .where(eq(papers.examId, row.examId))
    .get();

  return NextResponse.json({
    id: row.id,
    examId: row.examId,
    subject: row.subject,
    paperTitle: paper?.title ?? row.examId,
    bandScore: row.bandScore,
    correctCount: row.correctCount,
    submittedAt: row.submittedAt,
    sheet: row.answerSheetJson,
  });
}
