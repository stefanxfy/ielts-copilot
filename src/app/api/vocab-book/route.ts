/**
 * src/app/api/vocab-book/route.ts — 词书查询/删除
 *
 * GET /api/vocab-book                全部词书汇总(词库中心列表页用,#62)
 *   → { books: [{ bookId, name, description, source, wordCount,
 *                 learnedCount, imageCount, audioCount }] }
 * GET /api/vocab-book?bookId=xxx     拉指定词书全部词条(P8 演示用)
 *   → { book: {...}, words: [{ word, phoneticUk, contentJson, order }, ...] }
 * DELETE /api/vocab-book?bookId=xxx  删词书(关联经 FK cascade 清;词保留,若有他书引用)
 *
 * 汇总计数口径:
 *   wordCount  = book_word_relation 行数
 *   learnedCount = join word_progress 有进度行的词数(全局一词一行)
 *   imageCount / audioCount = contentJson.image / audio.word 非空的词数
 */
import { NextResponse } from "next/server";
import { eq, asc, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { wordBooks, words, bookWordRelation, wordProgress } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const bookId = url.searchParams.get("bookId");
  const db = getDb();

  // ===== 无 bookId:全部词书汇总(词库中心) =====
  if (!bookId) {
    const books = db.select().from(wordBooks).orderBy(asc(wordBooks.id)).all();
    const summary = books.map((b) => {
      const rows = db
        .select({
          wordId: words.id,
          hasProgress: sql<number>`CASE WHEN ${wordProgress.id} IS NULL THEN 0 ELSE 1 END`,
          contentJson: words.contentJson,
        })
        .from(bookWordRelation)
        .innerJoin(words, eq(words.id, bookWordRelation.wordId))
        .leftJoin(wordProgress, eq(wordProgress.wordId, words.id))
        .where(eq(bookWordRelation.bookId, b.id))
        .all();
      return {
        bookId: b.bookId,
        name: b.name,
        description: b.description,
        source: b.source,
        wordCount: rows.length,
        learnedCount: rows.reduce((n, r) => n + Number(r.hasProgress), 0),
        imageCount: rows.filter((r) => r.contentJson?.image).length,
        audioCount: rows.filter((r) => r.contentJson?.audio?.word).length,
      };
    });
    return NextResponse.json({ books: summary });
  }

  // ===== 有 bookId:单书词条(P8 演示页) =====
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

export async function DELETE(req: Request) {
  const bookId = new URL(req.url).searchParams.get("bookId");
  if (!bookId) {
    return NextResponse.json({ error: "bookId required" }, { status: 400 });
  }
  const db = getDb();
  const book = db.select().from(wordBooks).where(eq(wordBooks.bookId, bookId)).get();
  if (!book) {
    return NextResponse.json({ error: "book not found" }, { status: 404 });
  }
  // bwr FK ON DELETE CASCADE 自动清关联;words 全局共享不删(restrict 挡误删)
  db.delete(wordBooks).where(eq(wordBooks.id, book.id)).run();
  return NextResponse.json({ ok: true });
}
