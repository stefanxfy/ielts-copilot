/**
 * /api/reading/[articleId]/progress — 阅读进度上报(P3)
 *
 * POST { lastParagraph?, readSecDelta?, status? }(三者至少一个;均为增量口径):
 *   - last_paragraph 取 MAX(旧值, 新值):只前进不回退,续读定位稳定;
 *   - read_sec 累加(节流合并由前端负责:离开/切段/每 30s 批量上报);
 *   - status 首次转 COMPLETED 时记一次阅读打卡(study_activities 旁路埋点)。
 * upsert + lastReadAt=now;幂等可重放。
 */
import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { getDb, getSqlite } from "@/db";
import { readingArticles, readingProgress, READING_STATUSES, type ReadingStatus } from "@/db/schema";
import { recordSubjectSubmission } from "@/lib/study/activities";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ articleId: string }> },
) {
  const { articleId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体应为 JSON" }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;

  const hasAny =
    b.lastParagraph !== undefined || b.readSecDelta !== undefined || b.status !== undefined;
  if (!hasAny) {
    return NextResponse.json({ error: "lastParagraph / readSecDelta / status 至少传一个" }, { status: 400 });
  }
  if (b.lastParagraph !== undefined && (typeof b.lastParagraph !== "number" || !Number.isInteger(b.lastParagraph) || b.lastParagraph < 0)) {
    return NextResponse.json({ error: "lastParagraph 应为非负整数" }, { status: 400 });
  }
  if (b.readSecDelta !== undefined && (typeof b.readSecDelta !== "number" || !Number.isFinite(b.readSecDelta) || b.readSecDelta < 0)) {
    return NextResponse.json({ error: "readSecDelta 应为非负数" }, { status: 400 });
  }
  if (b.status !== undefined && !(READING_STATUSES as readonly string[]).includes(String(b.status))) {
    return NextResponse.json({ error: `status 应为 ${READING_STATUSES.join(" | ")}` }, { status: 400 });
  }

  const db = getDb();
  const article = db
    .select({ paraCount: sql<number>`json_array_length(${readingArticles.paragraphsJson})` })
    .from(readingArticles)
    .where(eq(readingArticles.articleId, articleId))
    .get();
  if (!article) {
    return NextResponse.json({ error: `文章不存在: ${articleId}` }, { status: 404 });
  }
  const lastParagraph = Math.min((b.lastParagraph as number | undefined) ?? 0, article.paraCount - 1);
  const readSecDelta = Math.round((b.readSecDelta as number | undefined) ?? 0);
  const status = b.status as ReadingStatus | undefined;

  const prev = db
    .select({ status: readingProgress.status })
    .from(readingProgress)
    .where(eq(readingProgress.articleId, articleId))
    .get();

  getSqlite()
    .prepare(
      `INSERT INTO reading_progress (article_id, status, last_paragraph, read_sec, last_read_at, updated_at)
       VALUES (?, COALESCE(?, 'IN_PROGRESS'), ?, ?, unixepoch(), unixepoch())
       ON CONFLICT(article_id) DO UPDATE SET
         status = COALESCE(?, status),
         last_paragraph = MAX(last_paragraph, excluded.last_paragraph),
         read_sec = read_sec + excluded.read_sec,
         last_read_at = unixepoch(),
         updated_at = unixepoch()`,
    )
    .run(articleId, status ?? null, lastParagraph, readSecDelta, status ?? null);

  // 打卡(旁路,recordSubjectSubmission 内部已吞错):首次读完计一次
  if (status === "COMPLETED" && prev?.status !== "COMPLETED") {
    recordSubjectSubmission("reading");
  }

  const row = db
    .select()
    .from(readingProgress)
    .where(eq(readingProgress.articleId, articleId))
    .get();
  return NextResponse.json({ progress: row });
}
