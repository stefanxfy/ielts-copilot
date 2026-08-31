/**
 * /api/exam-sessions — 完整套卷场次(P4)
 *
 * POST:建场次 {examSetId} → 返回 {sessionId, ...session, papers(三科卷序)}
 * GET :场次列表(仪表盘「完整模考」数据源)
 */
import { NextResponse } from "next/server";
import { createSession, listSessions } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { examSetId?: string };
  try {
    body = (await request.json()) as { examSetId?: string };
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }
  if (!body.examSetId) {
    return NextResponse.json({ error: "缺少 examSetId" }, { status: 400 });
  }
  try {
    const session = createSession(body.examSetId);
    return NextResponse.json({ ok: true, session });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "建场次失败" },
      { status: 404 },
    );
  }
}

export async function GET() {
  const sessions = listSessions();
  return NextResponse.json({ sessions });
}
