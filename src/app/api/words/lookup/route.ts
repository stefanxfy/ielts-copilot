/**
 * /api/words/lookup — 词卡四要素(P3)
 *
 * GET ?word=xxx:音标(英/美) + 释义 + 构词 + 读音路径,全出自 words.contentJson,
 *   另带 inVocab(是否已在生词本)供按钮态。大小写不敏感,精确匹配。
 */
import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { words } from "@/db/schema";
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
      word: words.word,
      phoneticUk: words.phoneticUk,
      phoneticUs: words.phoneticUs,
      content: words.contentJson,
    })
    .from(words)
    .where(sql`lower(${words.word}) = ${word}`)
    .get();

  if (!row) {
    return NextResponse.json({ error: `词库未收录: ${word}` }, { status: 404 });
  }
  return NextResponse.json({
    word: row.word,
    phoneticUk: row.phoneticUk,
    phoneticUs: row.phoneticUs,
    content: row.content,
    inVocab: isInVocabularyBook(word),
  });
}
