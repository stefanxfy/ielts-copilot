/**
 * /api/reading/libraries — 阅读库管理(本期仅新建,库清单走 /api/reading)
 * POST { name, description? } → 新建 custom 库,返回新库(id 幂等防重名)
 */
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { readingLibraries } from "@/db/schema";

export async function POST(request: Request) {
  let body: { name?: string; description?: string };
  try {
    body = (await request.json()) as { name?: string; description?: string };
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "请填写库名称" }, { status: 400 });

  const db = getDb();
  const dup = db
    .select({ id: readingLibraries.id })
    .from(readingLibraries)
    .where(eq(readingLibraries.name, name))
    .get();
  if (dup) return NextResponse.json({ error: `已存在同名库「${name}」`, libraryId: dup.id }, { status: 409 });

  const libId = `custom-${Date.now()}`;
  const now = new Date();
  db.insert(readingLibraries)
    .values({
      libraryId: libId,
      name,
      description: body.description?.trim() || null,
      source: "custom",
      createdAt: now,
      updatedAt: now,
    })
    .run();
  const created = db
    .select({ id: readingLibraries.id, libraryId: readingLibraries.libraryId, name: readingLibraries.name })
    .from(readingLibraries)
    .where(eq(readingLibraries.libraryId, libId))
    .get();
  return NextResponse.json({ library: created });
}
