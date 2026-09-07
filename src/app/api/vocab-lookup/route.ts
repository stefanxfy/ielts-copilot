/**
 * /api/vocab-lookup — 背单词页搜词下拉联想(P8.5 v2)
 *
 * GET ?q=xxx(前后空白忽略,大小写不敏感)——纯查询无副作用:
 *   返回候选列表(最多 8 条):精确匹配最前 → 前缀匹配 → 包含匹配,同组按字母序;
 *   每条带 inPlan(在背词计划内)/ paused(IGNORED 暂停态)徽标字段,
 *   前端据此决定「直接背」/「弹确认加入计划」。
 *
 * 「立即背这个词」的写入链路:入计划走 POST /api/vocab-study-plan(幂等),
 * 出队列走 GET /api/vocab-review?focus=wordId —— 本接口只做联想查询,职责单一。
 */
import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { words, wordProgress } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIMIT = 8;

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("q") ?? "";
  // 通配符直接剥掉,只按字面匹配单词
  const q = raw.trim().toLowerCase().replace(/[%_]/g, "");
  if (!q) {
    return NextResponse.json({ error: "q 参数不能为空" }, { status: 400 });
  }

  const db = getDb();
  // words.word 小写归一存储,lower() 比较对历史脏数据兜底;精确→前缀→包含 三级排序
  const rows = db
    .select({
      wordId: words.id,
      word: words.word,
      phoneticUk: words.phoneticUk,
      contentJson: words.contentJson,
      progressId: wordProgress.id,
      progressStatus: wordProgress.status,
    })
    .from(words)
    .leftJoin(wordProgress, eq(wordProgress.wordId, words.id))
    .where(sql`lower(${words.word}) LIKE ${`%${q}%`}`)
    .orderBy(
      sql`CASE
            WHEN lower(${words.word}) = ${q} THEN 0
            WHEN lower(${words.word}) LIKE ${`${q}%`} THEN 1
            ELSE 2
          END, ${words.word}`,
    )
    .limit(LIMIT)
    .all();

  return NextResponse.json({
    items: rows.map((r) => ({
      wordId: r.wordId,
      word: r.word,
      phoneticUk: r.phoneticUk,
      meaning:
        (r.contentJson.translation ?? []).join("; ").slice(0, 40) || null,
      inPlan: r.progressId != null,
      paused: r.progressStatus === "IGNORED",
    })),
  });
}
