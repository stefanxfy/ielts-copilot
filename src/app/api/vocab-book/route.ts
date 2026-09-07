/**
 * src/app/api/vocab-book/route.ts — 词书查询/删除
 *
 * GET /api/vocab-book                全部词书汇总(词库中心列表页用,#62)
 *   → { books: [{ bookId, name, description, source, wordCount,
 *                 learnedCount, imageCount, audioCount }] }
 * GET /api/vocab-book?bookId=xxx     拉指定词书全部词条(P8 演示用)
 *   → { book: {...}, words: [{ word, phoneticUk, contentJson, order }, ...] }
 * PUT /api/vocab-book                选定封面落库 { bookId, coverImage }(docs/词书封面一等化设计.md)
 * DELETE /api/vocab-book?bookId=xxx  删词书(关联经 FK cascade 清;词保留,若有他书引用)
 *
 * 汇总计数口径:
 *   wordCount  = book_word_relation 行数
 *   learnedCount = join word_progress 有进度行的词数(全局一词一行)
 *   imageCount / audioCount = hasVocabImage / contentJson.audio.word 的词数
 *     (image 用文件系统级判定:0 字节/已删残留路径不算,同卡型调度口径,#64)
 *   missingImageCount = wordCount - imageCount(词库中心「缺图」提示用,#64)
 */
import { NextResponse } from "next/server";
import { eq, asc, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { wordBooks, words, bookWordRelation, wordProgress } from "@/db/schema";
import { hasVocabImage } from "@/lib/vocab-card-policy";
import { listRunningImportTasks } from "@/lib/vocab-import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const bookId = url.searchParams.get("bookId");
  const db = getDb();

  // ===== 无 bookId:全部词书汇总(词库中心) =====
  if (!bookId) {
    const books = db.select().from(wordBooks).orderBy(asc(wordBooks.id)).all();
    const summary = books.map((b) => buildBookSummary(b, db));
    // 进行中导入任务(原型「导入中」卡片:_GRE 3000(导入中…)),进程重启即丢
    const importing = listRunningImportTasks().map((t) => ({
      taskId: t.id,
      name: t.name,
      phaseLabel: t.phaseLabel,
      total: t.total,
      done: t.done,
    }));
    return NextResponse.json({ books: summary, importing });
  }

  // ===== 有 bookId:单书词条(词表浏览页 S2 用) =====
  // 每词带 id + inPlan(是否已在背诵计划,即 word_progress 有行),供「选词入计划」标注。
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
      id: words.id,
      word: words.word,
      phoneticUk: words.phoneticUk,
      phoneticUs: words.phoneticUs,
      contentJson: words.contentJson,
      origin: words.origin,
      order: bookWordRelation.order,
      inPlan: sql<number>`CASE WHEN ${wordProgress.id} IS NULL THEN 0 ELSE 1 END`,
    })
    .from(bookWordRelation)
    .innerJoin(words, eq(words.id, bookWordRelation.wordId))
    .leftJoin(wordProgress, eq(wordProgress.wordId, words.id))
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
    words: rows.map((r) => ({ ...r, inPlan: Number(r.inPlan) > 0 })),
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

/* ---------- 汇总组装(GET/PUT 共用;封面回落规则见 docs/词书封面一等化设计.md §4) ---------- */

/** 词书汇总单行:封面 = 选定值(且仍在池内)回落池首;hasVocabImage 是文件系统级判定,池即磁盘真值 */
function buildBookSummary(b: typeof wordBooks.$inferSelect, db: ReturnType<typeof getDb>) {
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
  // 封面池:书内有配图的词图 web 路径(词书表 cover_image 为选定值,池内轮换供「重新生成封面」)
  const coverPool = rows
    .filter((r) => hasVocabImage(r.contentJson))
    .map((r) => r.contentJson.image!);
  const coverImage =
    b.coverImage && coverPool.includes(b.coverImage) ? b.coverImage : (coverPool[0] ?? null);
  return {
    bookId: b.bookId,
    name: b.name,
    description: b.description,
    source: b.source,
    wordCount: rows.length,
    learnedCount: rows.reduce((n, r) => n + Number(r.hasProgress), 0),
    imageCount: rows.filter((r) => hasVocabImage(r.contentJson)).length,
    audioCount: rows.filter((r) => r.contentJson?.audio?.word).length,
    missingImageCount: rows.filter((r) => !hasVocabImage(r.contentJson)).length,
    coverImage,
    coverPool,
  };
}

/**
 * PUT /api/vocab-book — 选定封面落库(word_books.cover_image,docs/词书封面一等化设计.md)
 * body: { bookId, coverImage: string | null }
 *   - coverImage 非空时必须是该书 coverPool 内的路径(防任意路径写入)
 *   - null 允许(重置为回落语义),本期 UI 无重置入口,接口先行
 */
export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const b = (body ?? {}) as { bookId?: unknown; coverImage?: unknown };
  if (typeof b.bookId !== "string" || !b.bookId) {
    return NextResponse.json({ error: "bookId required" }, { status: 400 });
  }
  if (b.coverImage !== null && typeof b.coverImage !== "string") {
    return NextResponse.json({ error: "coverImage 须为字符串路径或 null" }, { status: 400 });
  }
  const db = getDb();
  const book = db.select().from(wordBooks).where(eq(wordBooks.bookId, b.bookId)).get();
  if (!book) {
    return NextResponse.json({ error: "book not found" }, { status: 404 });
  }
  // 池内校验:非空路径必须命中该书现存词配图(hasVocabImage 已过滤失效文件)
  if (b.coverImage !== null) {
    const summary = buildBookSummary(book, db);
    if (!summary.coverPool.includes(b.coverImage)) {
      return NextResponse.json({ error: "coverImage 不在该书封面池内" }, { status: 400 });
    }
  }
  db.update(wordBooks)
    .set({ coverImage: b.coverImage, updatedAt: new Date() })
    .where(eq(wordBooks.id, book.id))
    .run();
  const updated = db.select().from(wordBooks).where(eq(wordBooks.id, book.id)).get()!;
  return NextResponse.json({ ok: true, book: buildBookSummary(updated, db) });
}
