/**
 * src/lib/reading/vocab.ts — 阅读生词本服务端工具
 *
 * 生词本零新表(docs/阅读库数据模型与交互设计.md 定稿):
 *   固定 bookId="vocabulary" 的 custom 词书承载;词条复用 words.contentJson。
 *   词书/词条/关系三层均幂等 upsert —— 重复加同一词只补关系,不重复插行。
 */
import { eq, sql } from "drizzle-orm";
import { getDb, getSqlite } from "@/db";
import { bookWordRelation, wordBooks, words, type WordContent } from "@/db/schema";

/** 生词本固定 bookId(设计文档定稿口径) */
export const VOCAB_BOOK_ID = "vocabulary";

/** 取生词本词书 id,不存在则幂等创建(首次加词时自动出现) */
export function ensureVocabularyBook(): number {
  const db = getDb();
  const found = db
    .select({ id: wordBooks.id })
    .from(wordBooks)
    .where(eq(wordBooks.bookId, VOCAB_BOOK_ID))
    .get();
  if (found) return found.id;

  getSqlite()
    .prepare(
      `INSERT INTO word_books (book_id, name, description, source)
       VALUES (?, ?, ?, 'custom')
       ON CONFLICT(book_id) DO NOTHING`,
    )
    .run(VOCAB_BOOK_ID, "生词本", "阅读学习与查词中加入的生词");
  const created = db
    .select({ id: wordBooks.id })
    .from(wordBooks)
    .where(eq(wordBooks.bookId, VOCAB_BOOK_ID))
    .get();
  if (!created) throw new Error("生词本词书创建失败");
  return created.id;
}

export interface AddVocabResult {
  word: string;
  /** 本次是否新建了 words 行(false = 词库已有,只挂关系) */
  createdWord: boolean;
  /** 本次是否新建了关系行(false = 早已在生词本) */
  createdRelation: boolean;
}

/** 加词入生词本(幂等):words 缺则补(manual 血缘),book_word_relation 缺则补(序号接尾) */
export function addToVocabularyBook(word: string): AddVocabResult {
  const db = getDb();
  const bookId = ensureVocabularyBook();

  const existing = db.select({ id: words.id }).from(words).where(eq(words.word, word)).get();
  let wordId: number;
  let createdWord = false;
  if (existing) {
    wordId = existing.id;
  } else {
    const content: WordContent = { translation: [], examples: [] };
    const res = getSqlite()
      .prepare(
        `INSERT INTO words (word, content_json, origin) VALUES (?, ?, 'manual')
         ON CONFLICT(word) DO NOTHING`,
      )
      .run(word, JSON.stringify(content));
    if (res.changes > 0) {
      createdWord = true;
      wordId = Number(
        db.select({ id: words.id }).from(words).where(eq(words.word, word)).get()!.id,
      );
    } else {
      // 并发兜底:冲突说明另一请求刚插入,重查必得
      wordId = db.select({ id: words.id }).from(words).where(eq(words.word, word)).get()!.id;
    }
  }

  const rel = db
    .select({ order: bookWordRelation.order })
    .from(bookWordRelation)
    .where(sql`${bookWordRelation.bookId} = ${bookId} AND ${bookWordRelation.wordId} = ${wordId}`)
    .get();
  if (rel) return { word, createdWord, createdRelation: false };

  const nextOrder =
    db
      .select({ maxOrder: sql<number | null>`max(${bookWordRelation.order})` })
      .from(bookWordRelation)
      .where(eq(bookWordRelation.bookId, bookId))
      .get()?.maxOrder ?? -1;
  getSqlite()
    .prepare(
      `INSERT INTO book_word_relation (book_id, word_id, "order") VALUES (?, ?, ?)
       ON CONFLICT(book_id, word_id) DO NOTHING`,
    )
    .run(bookId, wordId, nextOrder + 1);
  return { word, createdWord, createdRelation: true };
}

/** 词是否已在生词本(词卡「加入生词本」按钮态用) */
export function isInVocabularyBook(word: string): boolean {
  const db = getDb();
  const row = db
    .select({ id: bookWordRelation.bookId })
    .from(bookWordRelation)
    .innerJoin(words, eq(words.id, bookWordRelation.wordId))
    .innerJoin(wordBooks, eq(wordBooks.id, bookWordRelation.bookId))
    .where(sql`${wordBooks.bookId} = ${VOCAB_BOOK_ID} AND ${words.word} = ${word}`)
    .get();
  return row != null;
}
