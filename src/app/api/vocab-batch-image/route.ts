/**
 * /api/vocab-batch-image — 词书批量补图任务(前置工作 A)
 *
 * POST { bookId: "ielts-core-pilot" }  启动批量补图(只补无图核心词,立即返回任务态)
 * GET                                   查询当前任务态(无任务返回 null)
 *
 * 用途:早期导入的词书生图缺口补齐;非核心词故意留无图(无图降级测试样本)。
 */
import { NextResponse } from "next/server";
import { getBatchImageTask, startBatchImageTask } from "@/lib/vocab-batch-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const bookId = (body as { bookId?: unknown } | null)?.bookId;
  if (typeof bookId !== "string" || !bookId.trim()) {
    return NextResponse.json({ error: "bookId required" }, { status: 400 });
  }
  const started = startBatchImageTask(bookId.trim());
  if (!started.ok) return NextResponse.json({ error: started.error }, { status: 400 });
  return NextResponse.json(started.value, { status: 202 });
}

export async function GET() {
  return NextResponse.json({ task: getBatchImageTask() });
}
