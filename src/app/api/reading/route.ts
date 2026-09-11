/**
 * /api/reading — 阅读库列表(P3)
 *
 * GET 无参数:库列表 + 全部文章(含本人进度快照聚合)。
 *   列表页数据源:「继续学习」区(status=IN_PROGRESS,按 lastReadAt 降序)
 *   + 「文章列表」区(库 chips 过滤 + 文章卡片)。
 * 不回传 paragraphsJson 全文(31 篇 × 数 KB 不必要)—— 段数用 json_array_length 聚合。
 */
import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { readingArticles, readingLibraries, readingProgress } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const db = getDb();
  const libraries = db
    .select({
      id: readingLibraries.id,
      libraryId: readingLibraries.libraryId,
      name: readingLibraries.name,
      description: readingLibraries.description,
      source: readingLibraries.source,
      coverImage: readingLibraries.coverImage,
    })
    .from(readingLibraries)
    .orderBy(readingLibraries.id)
    .all();

  const articles = db
    .select({
      articleId: readingArticles.articleId,
      libraryKey: readingLibraries.libraryId,
      title: readingArticles.title,
      source: readingArticles.source,
      sourceRef: readingArticles.sourceRefJson,
      level: readingArticles.level,
      wordCount: readingArticles.wordCount,
      topicTags: readingArticles.topicTagsJson,
      paraCount: sql<number>`json_array_length(${readingArticles.paragraphsJson})`,
      status: readingProgress.status,
      lastParagraph: readingProgress.lastParagraph,
      readSec: readingProgress.readSec,
      lastReadAt: readingProgress.lastReadAt,
    })
    .from(readingArticles)
    .innerJoin(readingLibraries, eq(readingLibraries.id, readingArticles.libraryId))
    .leftJoin(readingProgress, eq(readingProgress.articleId, readingArticles.articleId))
    .orderBy(readingArticles.articleId)
    .all();

  const articleCount = new Map<string, number>();
  for (const a of articles) {
    articleCount.set(a.libraryKey, (articleCount.get(a.libraryKey) ?? 0) + 1);
  }

  return NextResponse.json({
    libraries: libraries.map((l) => ({ ...l, articleCount: articleCount.get(l.libraryId) ?? 0 })),
    articles,
  });
}
