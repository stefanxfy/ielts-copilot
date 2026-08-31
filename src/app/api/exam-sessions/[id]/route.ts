/**
 * /api/exam-sessions/[id] — 单场次详情(P4 成绩单)
 *
 * GET:场次 + 套卷 + 三科记录(含各科 band/记录 id),供 /session/[id] 成绩单页。
 */
import { NextResponse } from "next/server";
import { getSessionDetail } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const detail = getSessionDetail(id);
  if (!detail) {
    return NextResponse.json({ error: "场次不存在" }, { status: 404 });
  }
  const { session, set, records, papers } = detail;
  return NextResponse.json({
    session: {
      sessionId: session.sessionId,
      examSetId: session.examSetId,
      status: session.status,
      startedAt: session.startedAt,
      finishedAt: session.finishedAt,
      totalUsedSec: session.totalUsedSec,
      overallBand: session.overallBand,
    },
    set: { examSetId: set?.examSetId, title: set?.title, category: set?.category },
    // 三科卷序(听力→阅读→写作),带对应 record(若有)
    papers: papers.map((p) => {
      const rec = records.find((r) => r.examId === p.examId);
      return {
        examId: p.examId,
        subject: p.subject,
        title: p.title,
        record: rec
          ? {
              id: rec.id,
              status: rec.status,
              bandScore: rec.bandScore,
              correctCount: rec.correctCount,
              usedSec: rec.usedSec,
              submittedAt: rec.submittedAt,
            }
          : null,
      };
    }),
  });
}
