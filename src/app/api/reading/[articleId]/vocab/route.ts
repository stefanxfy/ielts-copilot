/**
 * /api/reading/[articleId]/vocab — 加生词本(P3)
 *
 * POST { word }:词形校验 → 幂等加词入固定 bookId="vocabulary" 生词本
 *   (words 缺则建 manual 词条,book_word_relation 缺则挂尾序关系)。
 * articleId 仅作路由语义(查词卡时用于溯源),加词动作与文章解耦。
 */
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { readingArticles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isWordLike, normalizeWord } from "@/lib/reading/text";
import { addToVocabularyBook } from "@/lib/reading/vocab";

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
  const raw = (body as { word?: unknown } | null)?.word;
  if (typeof raw !== "string" || !raw.trim()) {
    return NextResponse.json({ error: "word 参数不能为空" }, { status: 400 });
  }
  const word = normalizeWord(raw.trim());
  if (!isWordLike(word)) {
    return NextResponse.json({ error: `非法词条: ${raw}` }, { status: 400 });
  }

  const exists = getDb()
    .select({ articleId: readingArticles.articleId })
    .from(readingArticles)
    .where(eq(readingArticles.articleId, articleId))
    .get();
  if (!exists) {
    return NextResponse.json({ error: `文章不存在: ${articleId}` }, { status: 404 });
  }

  const result = addToVocabularyBook(word);
  return NextResponse.json({ ok: true, ...result, inVocab: true });
}
