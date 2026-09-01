/**
 * /api/grading/[recordId] — 写作 AI 批改(P5)
 *
 * GET  查批改状态(成绩页轮询用,轻量不触发批改)
 * POST 触发批改(?force=1 忽略已有成功结果强制重跑,成绩页「重新批改」用)
 *
 * 批改耗时通常 10–60 秒,因此 POST 立即返回、后台异步执行,
 * 前端拿 GET 轮询进度(running / done 两个布尔位驱动)。
 */
import { after, NextResponse } from "next/server";
import { getGradingStatus, gradeWritingRecord } from "@/lib/grading/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function resolveId(params: Promise<{ recordId: string }>) {
  const { recordId } = await params;
  const n = Number(recordId);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ recordId: string }> },
) {
  const recordId = await resolveId(params);
  if (recordId == null) {
    return NextResponse.json({ error: "无效的记录 id" }, { status: 400 });
  }
  const status = getGradingStatus(recordId);
  if (!status) {
    return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  }
  return NextResponse.json(status);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ recordId: string }> },
) {
  const recordId = await resolveId(params);
  if (recordId == null) {
    return NextResponse.json({ error: "无效的记录 id" }, { status: 400 });
  }

  const force = new URL(request.url).searchParams.get("force") === "1";
  const current = getGradingStatus(recordId);
  if (!current) {
    return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  }
  if (current.subject !== "writing") {
    return NextResponse.json({ error: "只有写作卷支持 AI 批改" }, { status: 400 });
  }
  if (current.running) {
    return NextResponse.json({ ok: true, started: false, reason: "正在批改中", status: current });
  }

  // 后台异步执行:响应不等批改完成,前端轮询 GET 看进度
  after(() => {
    gradeWritingRecord(recordId, { force }).catch((e) => {
      console.error("[grading] 批改异常:", e);
    });
  });

  return NextResponse.json({ ok: true, started: true, status: current });
}
