/**
 * /api/reading/[articleId]/word-hits — 词库命中(P3)
 *
 * GET:全文 tokenize → 命中 words 表的词元集,inVocab 标记是否已在生词本。
 *   前端据此渲染波浪线(命中词库)/主色下划线(已在生词本)。
 * 结果按 articleId+文章 updatedAt 做进程内缓存:正文不变则不重复扫词表。
 */
import { NextResponse } from "next/server";
import { eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { bookWordRelation, readingArticles, wordBooks, words } from "@/db/schema";
import { normalizeWord, tokenize } from "@/lib/reading/text";
import { VOCAB_BOOK_ID } from "@/lib/reading/vocab";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 进程内缓存:key=articleId,value={sig, hits};sig=updatedAt ISO 串 */
const hitCache = new Map<string, { sig: string; hits: { word: string; inVocab: boolean }[] }>();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ articleId: string }> },
) {
  const { articleId } = await params;
  const db = getDb();

  const article = db
    .select({
      paragraphs: readingArticles.paragraphsJson,
      // 原值直读避免 drizzle timestamp 解析出 Invalid Date(导入脚本写入的秒级时间)
      sig: sql<string>`${readingArticles.updatedAt}`,
    })
    .from(readingArticles)
    .where(eq(readingArticles.articleId, articleId))
    .get();
  if (!article) {
    return NextResponse.json({ error: `文章不存在: ${articleId}` }, { status: 404 });
  }

  const sig = String(article.sig);
  const cached = hitCache.get(articleId);
  if (cached && cached.sig === sig) {
    return NextResponse.json({ hits: cached.hits, cached: true });
  }

  // 1. 全文分词 → 小写去重
  const uniq = new Set<string>();
  for (const p of article.paragraphs) {
    for (const t of tokenize(p.en)) uniq.add(normalizeWord(t));
  }
  const tokens = [...uniq];

  // 2. 分块查词库命中(SQLite 变量数上限兜底)
  const hitWords: { id: number; word: string }[] = [];
  const CHUNK = 500;
  for (let i = 0; i < tokens.length; i += CHUNK) {
    const rows = db
      .select({ id: words.id, word: words.word })
      .from(words)
      .where(inArray(words.word, tokens.slice(i, i + CHUNK)))
      .all();
    hitWords.push(...rows);
  }

  // 3. 其中已在生词本的子集
  const vocabSet = new Set<number>();
  if (hitWords.length) {
    for (let i = 0; i < hitWords.length; i += CHUNK) {
      const rows = db
        .select({ wordId: bookWordRelation.wordId })
        .from(bookWordRelation)
        .innerJoin(wordBooks, eq(wordBooks.id, bookWordRelation.bookId))
        .where(
          sql`${wordBooks.bookId} = ${VOCAB_BOOK_ID} AND ${inArray(bookWordRelation.wordId, hitWords.slice(i, i + CHUNK).map((w) => w.id))}`,
        )
        .all();
      for (const r of rows) vocabSet.add(r.wordId);
    }
  }

  const hits = hitWords.map((w) => ({ word: w.word, inVocab: vocabSet.has(w.id) }));
  hitCache.set(articleId, { sig, hits });
  return NextResponse.json({ hits, cached: false });
}
