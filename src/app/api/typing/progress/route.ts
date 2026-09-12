/**
 * /api/typing/progress — 跟打中途进度(P10)
 *
 * GET  ?articleId= :读单篇进度(续打恢复用;无记录返回 null)
 * PUT              :upsert 覆盖(客户端 2s 防抖上报;一篇文章永远只有一行)
 * DELETE ?articleId=:显式放弃(重置本篇时清档)
 *
 * errorPosJson 只存打错字符的位置(稀疏),对/错状态里"对"是默认值不落库。
 */
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { typingProgress } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const articleId = new URL(request.url).searchParams.get("articleId");
  if (!articleId) {
    return NextResponse.json({ error: "缺少 articleId" }, { status: 400 });
  }
  const db = getDb();
  const row = db
    .select({ pos: typingProgress.pos, errorPos: typingProgress.errorPosJson })
    .from(typingProgress)
    .where(eq(typingProgress.articleId, articleId))
    .get();
  return NextResponse.json({ progress: row ?? null });
}

export async function PUT(request: Request) {
  let body: { articleId?: string; pos?: number; errorPos?: number[] };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const { articleId, pos } = body;
  if (!articleId || !Number.isInteger(pos) || (pos as number) < 0) {
    return NextResponse.json({ error: "articleId / pos 非法" }, { status: 400 });
  }
  const errorPos = (body.errorPos ?? []).filter((p) => Number.isInteger(p) && p >= 0);
  const db = getDb();
  db.insert(typingProgress)
    .values({ articleId, pos, errorPosJson: errorPos })
    .onConflictDoUpdate({
      target: typingProgress.articleId,
      set: { pos, errorPosJson: errorPos, updatedAt: new Date() },
    })
    .run();
  return NextResponse.json({ saved: true, pos });
}

export async function DELETE(request: Request) {
  const articleId = new URL(request.url).searchParams.get("articleId");
  if (!articleId) {
    return NextResponse.json({ error: "缺少 articleId" }, { status: 400 });
  }
  getDb().delete(typingProgress).where(eq(typingProgress.articleId, articleId)).run();
  return NextResponse.json({ deleted: articleId });
}
