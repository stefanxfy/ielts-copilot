/**
 * /api/vocab-study-plan — 背诵计划(P8 · docs/背单词数据模型设计.md v0.7 §8)
 *
 * POST:选词入计划 —— 用户主动选词时才创建 word_progress(用户拍板:导入词书不预创建)
 *   body: { wordIds: number[] }
 *   幂等:UNIQUE(wordId) + onConflictDoNothing,已在计划中的词静默跳过;
 *   新词初始状态 stage=recognize / status=ACTIVE / due=now / fsrsState=New 卡(S=D=0)。
 *
 * GET:计划全量列表(join words 带词面信息),供选词页标注「已入选」、复习页看队列;
 *   附 total/active/dueNow 三个计数。
 *
 * 不提供「移除出计划」——设计上暂停走 IGNORED(status 可恢复),删行无业务入口。
 */
import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { words, wordProgress, type FsrsState } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 新词初始 FSRS 状态(= ts-fsrs createEmptyCard 的记忆要素快照;state 0=New,S/D 由首评初始化) */
const INITIAL_FSRS_STATE: FsrsState = {
  stability: 0,
  difficulty: 0,
  state: 0,
  step: 0,
  paramVersion: "FSRS-6.0-default",
};

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const rawIds = (body as { wordIds?: unknown } | null)?.wordIds;
  if (!Array.isArray(rawIds) || rawIds.length === 0) {
    return NextResponse.json({ error: "wordIds 应为非空数组" }, { status: 400 });
  }
  if (rawIds.length > 1000) {
    return NextResponse.json({ error: "单次最多加入 1000 个词" }, { status: 400 });
  }
  const wordIds = rawIds.map((v) => (typeof v === "number" ? Math.trunc(v) : NaN));
  if (wordIds.some((v) => !Number.isInteger(v) || v <= 0)) {
    return NextResponse.json({ error: "wordIds 应为正整数数组" }, { status: 400 });
  }
  const uniqueIds = [...new Set(wordIds)];

  const db = getDb();
  const existIds = db.select({ id: words.id }).from(words).all();
  const existSet = new Set(existIds.map((r) => r.id));
  const missing = uniqueIds.filter((id) => !existSet.has(id));
  if (missing.length > 0) {
    return NextResponse.json(
      { error: "存在不存在的 wordId", missing },
      { status: 400 },
    );
  }

  const nowMs = Date.now();
  const inserted = db.transaction((tx) => {
    let n = 0;
    for (const id of uniqueIds) {
      const r = tx
        .insert(wordProgress)
        .values({
          wordId: id,
          due: nowMs,
          fsrsStateJson: { ...INITIAL_FSRS_STATE },
        })
        .onConflictDoNothing({ target: wordProgress.wordId })
        .run();
      n += r.changes;
    }
    return n;
  });

  return NextResponse.json({
    ok: true,
    requested: wordIds.length,
    inserted,
    skippedAlready: uniqueIds.length - inserted,
  });
}

export async function GET() {
  const db = getDb();
  const rows = db
    .select({
      progressId: wordProgress.id,
      wordId: words.id,
      word: words.word,
      phoneticUk: words.phoneticUk,
      contentJson: words.contentJson,
      stage: wordProgress.stage,
      status: wordProgress.status,
      due: wordProgress.due,
      reps: wordProgress.reps,
      lapses: wordProgress.lapses,
      lastReviewAt: wordProgress.lastReviewAt,
    })
    .from(wordProgress)
    .innerJoin(words, eq(words.id, wordProgress.wordId))
    .orderBy(asc(wordProgress.due))
    .all();

  const nowMs = Date.now();
  return NextResponse.json({
    total: rows.length,
    active: rows.filter((r) => r.status === "ACTIVE").length,
    dueNow: rows.filter((r) => r.status === "ACTIVE" && r.due <= nowMs).length,
    items: rows,
  });
}
