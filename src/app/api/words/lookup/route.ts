/**
 * /api/words/lookup — 词卡四要素(P3,W:词卡按钮态扩展)
 *
 * GET ?word=xxx:音标(英/美) + 释义 + 构词 + 读音路径,全出自 words.contentJson,
 *   另带按钮态字段:
 *     inVocab — 是否已在生词本(bookId=vocabulary 词书)
 *     wordId  — words 行 id(加入背词计划要用;404 时无)
 *     inPlan  — 是否已在背词计划(word_progress 有行,含 IGNORED 暂停态)
 *   大小写不敏感,精确匹配。
 *
 * 词卡按钮口径(2026-09-12 用户定):词库收录(任何词书)→ 主按钮=加入背词计划;
 *   未收录(404)→ 才走加入生词本(manual 词条)。
 */
import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { wordProgress, words } from "@/db/schema";
import { isWordLike, normalizeWord } from "@/lib/reading/text";
import { isInVocabularyBook } from "@/lib/reading/vocab";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("word") ?? "";
  const word = normalizeWord(raw.trim());
  if (!word) {
    return NextResponse.json({ error: "word 参数不能为空" }, { status: 400 });
  }
  if (!isWordLike(word)) {
    return NextResponse.json({ error: `非法词条: ${raw}` }, { status: 400 });
  }

  const row = getDb()
    .select({
      id: words.id,
      word: words.word,
      phoneticUk: words.phoneticUk,
      phoneticUs: words.phoneticUs,
      content: words.contentJson,
      inPlan: sql<number>`exists(select 1 from ${wordProgress} where ${wordProgress.wordId} = ${words.id})`,
    })
    .from(words)
    .where(sql`lower(${words.word}) = ${word}`)
    .get();

  if (!row) {
    return NextResponse.json({ error: `词库未收录: ${word}` }, { status: 404 });
  }
  return NextResponse.json({
    word: row.word,
    wordId: row.id,
    phoneticUk: row.phoneticUk,
    phoneticUs: row.phoneticUs,
    content: row.content,
    inVocab: isInVocabularyBook(word),
    inPlan: Number(row.inPlan) === 1,
  });
}
