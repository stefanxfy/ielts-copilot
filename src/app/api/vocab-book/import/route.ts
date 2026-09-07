/**
 * src/app/api/vocab-book/import — 词库导入异步任务(#61)
 *
 * POST   /api/vocab-book/import  创建导入任务(立即返回 taskId+bookId,管线后台跑)
 *   body: { name?, words[], genStrategy?: "core"|"all"|"none",
 *           imageStyle?, voiceWord?, voiceSent?, bookId?(重导同书复用) }
 * GET    /api/vocab-book/import?id=<taskId>  轮询任务进度(导入弹窗用)
 * DELETE /api/vocab-book/import?id=<taskId>  取消进行中任务(列表「导入中」卡即消失)
 *
 * 任务态挂 globalThis(见 src/lib/vocab-import.ts),进程重启即丢,重导即可。
 */
import { NextResponse } from "next/server";
import { cancelImportTask, getImportTask, startImportTask } from "@/lib/vocab-import";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const started = startImportTask(body);
  if (!started.ok) return NextResponse.json({ error: started.error }, { status: 400 });
  return NextResponse.json(started.value, { status: 202 });
}

export async function GET(request: Request): Promise<NextResponse> {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const task = getImportTask(id);
  if (!task) return NextResponse.json({ error: "task not found" }, { status: 404 });
  return NextResponse.json(task);
}

/** 取消进行中的导入任务:状态置 cancelled,管线在循环边界尽快自行退出 */
export async function DELETE(request: Request): Promise<NextResponse> {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const ok = cancelImportTask(id);
  if (!ok) return NextResponse.json({ error: "task not running or not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
