/**
 * /api/writing/sessions — 写作交卷与历史(P11/W2,docs/写作仿真数据模型与交互设计.md)
 *
 * POST { promptId, durationSec, content }:
 *   wordCount/reachedMin 服务端重算(不信任客户端);正文必存 = 将来 LLM 批改的原料。
 *   只标记不拦截:低于最低词数照常入库(机考也不阻止少写)。
 *
 * GET(W2 历史列表):
 *   无参 → 历史流水(jion prompts 取题干摘要,速度=词/分 服务端算,列表不含正文防大响应)
 *          + 汇总 { total, totalWords, avgSpeed }。
 *   ?id=  → 单条全量(含 content + 完整题干),供页面回看正文。
 */
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { writingPrompts, writingSessions } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { countWords } from "@/lib/writing/text";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 速度口径与打字对齐:服务端算,输出速度 = 词数 / 分钟(真词数,不 ÷5) */
const speedOf = (wordCount: number, durationSec: number) =>
  Math.round(wordCount / Math.max(1, durationSec / 60));

export async function GET(req: NextRequest) {
  const idParam = req.nextUrl.searchParams.get("id");
  const db = getDb();

  /* 单条回看:含正文 + 完整题干 */
  if (idParam) {
    const id = Number(idParam);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "非法 id" }, { status: 400 });
    }
    const row = db
      .select({
        id: writingSessions.id,
        promptId: writingSessions.promptId,
        wordCount: writingSessions.wordCount,
        durationSec: writingSessions.durationSec,
        reachedMin: writingSessions.reachedMin,
        content: writingSessions.content,
        ai: writingSessions.aiJson,
        finishedAt: writingSessions.finishedAt,
        promptText: writingPrompts.promptText,
        minWords: writingPrompts.minWords,
        taskNo: writingPrompts.taskNo,
        timeSuggest: writingPrompts.timeSuggest,
        sourceRefJson: writingPrompts.sourceRefJson,
      })
      .from(writingSessions)
      .innerJoin(writingPrompts, eq(writingSessions.promptId, writingPrompts.promptId))
      .where(eq(writingSessions.id, id))
      .get();
    if (!row) return NextResponse.json({ error: `记录不存在: ${id}` }, { status: 404 });
    return NextResponse.json({
      session: {
        ...row,
        speed: speedOf(row.wordCount, row.durationSec),
        finishedAt: row.finishedAt ? new Date(row.finishedAt).getTime() : null,
      },
    });
  }

  /* 历史流水:列表不取 content(大字段),回看走 ?id= 按需拉 */
  const rows = db
    .select({
      id: writingSessions.id,
      promptId: writingSessions.promptId,
      wordCount: writingSessions.wordCount,
      durationSec: writingSessions.durationSec,
      reachedMin: writingSessions.reachedMin,
      finishedAt: writingSessions.finishedAt,
      // 批改完成的综合 band(历史行直接挂标签,不拉整个 ai_json)
      aiBand: sql<number | null>`json_extract(${writingSessions.aiJson}, '$.overall')`,
      promptText: writingPrompts.promptText,
      minWords: writingPrompts.minWords,
      taskNo: writingPrompts.taskNo,
    })
    .from(writingSessions)
    .innerJoin(writingPrompts, eq(writingSessions.promptId, writingPrompts.promptId))
    .orderBy(desc(writingSessions.finishedAt), desc(writingSessions.id))
    .limit(300)
    .all();

  const list = rows.map((r) => ({
    id: r.id,
    promptId: r.promptId,
    wordCount: r.wordCount,
    durationSec: r.durationSec,
    speed: speedOf(r.wordCount, r.durationSec),
    reachedMin: r.reachedMin,
    finishedAt: r.finishedAt ? new Date(r.finishedAt).getTime() : null,
    // json_extract 返回的可能是 number 或字符串数字,统一成 number | null
    aiBand: r.aiBand == null ? null : Number(r.aiBand),
    promptText: r.promptText,
    minWords: r.minWords,
    taskNo: r.taskNo,
  }));

  const totalWords = list.reduce((s, r) => s + r.wordCount, 0);
  const summary = {
    total: list.length,
    totalWords,
    avgSpeed: list.length ? Math.round(list.reduce((s, r) => s + r.speed, 0) / list.length) : 0,
    reachedCount: list.filter((r) => r.reachedMin).length,
  };

  return NextResponse.json({ summary, list });
}

export async function POST(req: NextRequest) {
  let body: { promptId?: string; durationSec?: number; content?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const promptId = body.promptId?.trim();
  const content = body.content ?? "";
  const durationSec = Math.max(1, Math.round(body.durationSec ?? 0));

  if (!promptId) {
    return NextResponse.json({ error: "缺少 promptId" }, { status: 400 });
  }
  const prompt = getDb()
    .select({ minWords: writingPrompts.minWords })
    .from(writingPrompts)
    .where(eq(writingPrompts.promptId, promptId))
    .get();
  if (!prompt) {
    return NextResponse.json({ error: `题目不存在: ${promptId}` }, { status: 404 });
  }
  if (!content.trim()) {
    return NextResponse.json({ error: "正文为空,不交白卷" }, { status: 400 });
  }

  const wordCount = countWords(content);
  const reachedMin = wordCount >= prompt.minWords;

  const inserted = getDb()
    .insert(writingSessions)
    .values({
      promptId,
      wordCount,
      durationSec,
      reachedMin,
      content,
    })
    .returning({ id: writingSessions.id })
    .get();

  return NextResponse.json({
    sessionId: inserted.id,
    wordCount,
    reachedMin,
    minWords: prompt.minWords,
  });
}
