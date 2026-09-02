/**
 * src/app/api/vocab-book/route.ts — 拉指定词书全部词条(P8 演示用)
 *
 * GET /api/vocab-book?bookId=ielts-core-pilot
 *   → { book: {...}, words: [{ word, phoneticUk, contentJson, order }, ...] }
 *
 * 按 order 升序返回。设计为轻量演示接口,生产期 P8 真实学习页会换成分页 +
 * SM-2 调度表 join,这里不预先考虑。
 */
import { NextResponse } from "next/server";
import { eq, asc } from "drizzle-orm";
import { getDb } from "@/db";
import { wordBooks, words, bookWordRelation } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const bookId = url.searchParams.get("bookId");
  if (!bookId) {
    return NextResponse.json({ error: "bookId required" }, { status: 400 });
  }
  const db = getDb();
  const book = db
    .select()
    .from(wordBooks)
    .where(eq(wordBooks.bookId, bookId))
    .get();
  if (!book) {
    return NextResponse.json({ error: "book not found" }, { status: 404 });
  }
  const rows = db
    .select({
      word: words.word,
      phoneticUk: words.phoneticUk,
      phoneticUs: words.phoneticUs,
      contentJson: words.contentJson,
      origin: words.origin,
      order: bookWordRelation.order,
    })
    .from(bookWordRelation)
    .innerJoin(words, eq(words.id, bookWordRelation.wordId))
    .where(eq(bookWordRelation.bookId, book.id))
    .orderBy(asc(bookWordRelation.order))
    .all();
  return NextResponse.json({
    book: {
      id: book.id,
      bookId: book.bookId,
      name: book.name,
      description: book.description,
      source: book.source,
      wordCount: rows.length,
    },
    words: rows,
  });
}
