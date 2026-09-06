/**
 * /api/vocab-lookup — 背单词页搜词(P8.5)
 *
 * GET ?word=xxx(前后空白忽略,大小写不敏感)——纯查询无副作用:
 *   status "none"    词库中没有这个词;
 *   status "plan"    词在背词计划内(word_progress 存在即算,IGNORED 暂停态也返回,
 *                    前端据此提示「已暂停」);
 *   status "library" 在词库但未入计划(前端弹「是否加入背词计划」确认框)。
 *
 * 入计划走既有 POST /api/vocab-study-plan(幂等,onConflictDoNothing),
 * 本接口不做写入——查询与写变更一刀切,与 vocab-study-plan 的职责边界一致。
 */
import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { words, wordProgress } from "@/db/schema";
import { hasVocabImage } from "@/lib/vocab-card-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("word") ?? "";
  const q = raw.trim().toLowerCase();
  if (!q) {
    return NextResponse.json({ error: "word 参数不能为空" }, { status: 400 });
  }

  const db = getDb();
  // words.word 小写归一存储,lower 比较对历史脏数据兜底
  const wordRow = db
    .select()
    .from(words)
    .where(sql`lower(${words.word}) = ${q}`)
    .get();
  if (!wordRow) {
    return NextResponse.json({ status: "none" });
  }

  const progress = db
    .select()
    .from(wordProgress)
    .where(eq(wordProgress.wordId, wordRow.id))
    .get();

  const content = wordRow.contentJson;
  const face = {
    wordId: wordRow.id,
    word: wordRow.word,
    phoneticUk: wordRow.phoneticUk,
    content,
    hasImage: hasVocabImage(content),
  };

  if (progress) {
    return NextResponse.json({
      status: "plan",
      item: {
        ...face,
        progressId: progress.id,
        stage: progress.stage,
        progressStatus: progress.status,
        due: progress.due,
        reps: progress.reps,
        lapses: progress.lapses,
      },
    });
  }
  return NextResponse.json({ status: "library", item: face });
}
