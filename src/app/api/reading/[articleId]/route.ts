/**
 * /api/reading/[articleId] — 单篇全文(P3)
 *
 * GET:paragraphsJson 全文 + 本人进度 + 出处快照 —— 阅读器页数据源。
 */
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { readingArticles, readingLibraries, readingProgress } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ articleId: string }> },
) {
  const { articleId } = await params;
  const db = getDb();

  const article = db
    .select({
      articleId: readingArticles.articleId,
      libraryKey: readingLibraries.libraryId,
      libraryName: readingLibraries.name,
      title: readingArticles.title,
      source: readingArticles.source,
      sourceRef: readingArticles.sourceRefJson,
      level: readingArticles.level,
      wordCount: readingArticles.wordCount,
      topicTags: readingArticles.topicTagsJson,
      paragraphs: readingArticles.paragraphsJson,
      status: readingProgress.status,
      lastParagraph: readingProgress.lastParagraph,
      readSec: readingProgress.readSec,
    })
    .from(readingArticles)
    .innerJoin(readingLibraries, eq(readingLibraries.id, readingArticles.libraryId))
    .leftJoin(readingProgress, eq(readingProgress.articleId, readingArticles.articleId))
    .where(eq(readingArticles.articleId, articleId))
    .get();

  if (!article) {
    return NextResponse.json({ error: `文章不存在: ${articleId}` }, { status: 404 });
  }
  return NextResponse.json({ article });
}

/**
 * DELETE:删除文章。reading_progress 对 articleId 有 ON DELETE CASCADE,
 * 进度随文章一起清掉;生词本是全局 word_books 体系,与文章无关,不受影响。
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ articleId: string }> },
) {
  const { articleId } = await params;
  const db = getDb();
  const deleted = db
    .delete(readingArticles)
    .where(eq(readingArticles.articleId, articleId))
    .run();
  if (deleted.changes === 0) {
    return NextResponse.json({ error: `文章不存在: ${articleId}` }, { status: 404 });
  }
  return NextResponse.json({ deleted: articleId });
}
