/**
 * /api/vocab-book/[bookId] — 词书级操作
 *
 * DELETE:删除词书(word_books 行 + book_word_relation 级联)。
 *   words 全局共享不删——他书可能仍引用同一词(wordId RESTRICT 也保证不误删);
 *   word_progress 学习进度与词书无关,不受影响。
 *   幂等:bookId 不存在返回 404。
 */
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { wordBooks } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ bookId: string }> },
) {
  const { bookId } = await params;
  const db = getDb();
  const book = db.select().from(wordBooks).where(eq(wordBooks.bookId, bookId)).get();
  if (!book) {
    return NextResponse.json({ error: `词书不存在: ${bookId}` }, { status: 404 });
  }
  db.delete(wordBooks).where(eq(wordBooks.id, book.id)).run();
  return NextResponse.json({ ok: true, deletedBookId: bookId });
}
