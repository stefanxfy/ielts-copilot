/**
 * /api/writing/review — 写作仿真 AI 批改(W4)
 *
 * GET  ?sessionId= 查批改状态(轮询用,轻量不触发批改)
 * POST { sessionId, force? } 触发批改
 *
 * 批改耗时通常 10–60 秒,POST 立即返回、after() 后台异步执行,
 * 前端拿 GET 轮询(running 位驱动)——与 /api/grading/[recordId] 同款交互。
 */
import { after, NextRequest, NextResponse } from "next/server";
import { gradeWritingSession, getWritingReviewStatus } from "@/lib/grading/writing-sim";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sessionId = Number(req.nextUrl.searchParams.get("sessionId"));
  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return NextResponse.json({ error: "缺少或非法 sessionId" }, { status: 400 });
  }
  const status = getWritingReviewStatus(sessionId);
  if (!status) {
    return NextResponse.json({ error: `记录不存在: ${sessionId}` }, { status: 404 });
  }
  return NextResponse.json(status);
}

export async function POST(req: NextRequest) {
  let body: { sessionId?: number; force?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const sessionId = Number(body.sessionId);
  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return NextResponse.json({ error: "缺少或非法 sessionId" }, { status: 400 });
  }
  const current = getWritingReviewStatus(sessionId);
  if (!current) {
    return NextResponse.json({ error: `记录不存在: ${sessionId}` }, { status: 404 });
  }
  if (current.running) {
    return NextResponse.json({ ok: true, started: false, reason: "正在批改中" });
  }

  // 后台异步执行:响应不等批改完成,前端轮询 GET 看进度
  const force = body.force === true;
  after(() => {
    gradeWritingSession(sessionId, { force }).catch((e) => {
      console.error("[writing-review] 批改异常:", e);
    });
  });

  return NextResponse.json({ ok: true, started: true });
}
