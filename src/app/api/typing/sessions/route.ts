/**
 * /api/typing/sessions — 跟打成绩提交(P10)
 *
 * POST:打完整篇/drill 稿提交一次成绩。
 *   - article 模式:服务端按 articleId 从 paragraphsJson 拼全文(同一 norm 口径)
 *     校验 charTotal,errorPos 逐位回填 expected/word → errorCharsJson;
 *   - drill 模式:稿件是服务端一次性生成物不入库,信任客户端的 charTotal/errorChars;
 *   - wpm/accuracy 一律服务端计算(口径唯一、防篡改);
 *   - 提交成功同时清除该文章 typing_progress(成绩入库,中途进度即作废)。
 */
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { readingArticles, typingProgress, typingSessions } from "@/db/schema";
import type { TypingError } from "@/db/schema";
import { buildArticleText, wordAt } from "@/lib/typing/text";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SessionPayload {
  mode: "article" | "drill";
  articleId?: string;
  durationSec: number;
  charTotal: number;
  backspaces?: number;
  maxCombo?: number;
  /** article 模式:错字位置数组(服务端回填明细) */
  errorPos?: number[];
  /** drill 模式:客户端直接给明细(稿件在客户端手中) */
  errorChars?: TypingError[];
  /** 曾经打错键次表 { 应打小写字符: 次数 },含回退改对的 */
  typos?: Record<string, number>;
  drillMeta?: { triggerWords: string[] };
}

export async function POST(request: Request) {
  const db = getDb();
  let body: SessionPayload;
  try {
    body = (await request.json()) as SessionPayload;
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const { mode, durationSec, charTotal } = body;
  if (mode !== "article" && mode !== "drill") {
    return NextResponse.json({ error: "mode 必须是 article 或 drill" }, { status: 400 });
  }
  if (!Number.isFinite(durationSec) || durationSec <= 0 || durationSec > 86_400) {
    return NextResponse.json({ error: `durationSec 非法: ${durationSec}` }, { status: 400 });
  }
  if (!Number.isInteger(charTotal) || charTotal <= 0) {
    return NextResponse.json({ error: `charTotal 非法: ${charTotal}` }, { status: 400 });
  }

  let errorChars: TypingError[] = [];

  if (mode === "article") {
    const articleId = body.articleId;
    if (!articleId) {
      return NextResponse.json({ error: "article 模式必须提供 articleId" }, { status: 400 });
    }
    const article = db
      .select({ paragraphs: readingArticles.paragraphsJson })
      .from(readingArticles)
      .where(eq(readingArticles.articleId, articleId))
      .get();
    if (!article) {
      return NextResponse.json({ error: `文章不存在: ${articleId}` }, { status: 404 });
    }
    const text = buildArticleText(article.paragraphs);
    if (text.length !== charTotal) {
      return NextResponse.json(
        { error: `charTotal 与文章不符: 期望 ${text.length}, 实际 ${charTotal}` },
        { status: 400 },
      );
    }
    const posSet = new Set(
      (body.errorPos ?? []).filter((p) => Number.isInteger(p) && p >= 0 && p < text.length),
    );
    errorChars = [...posSet].sort((a, b) => a - b).map((pos) => ({
      pos,
      expected: text[pos],
      word: wordAt(text, pos),
    }));
  } else {
    // drill:信任客户端明细(位置/应打字符/所在词都来自其手中的稿件),只做形状清洗
    errorChars = (body.errorChars ?? []).filter(
      (e) => e && Number.isInteger(e.pos) && typeof e.expected === "string",
    );
  }

  const charCorrect = charTotal - errorChars.length;
  const sec = Math.max(1, Math.round(durationSec));
  const wpm = Math.round(((charCorrect / 5) / (sec / 60)) * 10) / 10;
  const accuracy = Math.round((charCorrect / charTotal) * 10_000) / 10_000;

  // 曾经打错键次表:只收单字符键、次数为正整数(热力图/TOP 错字数据源,含已改对)
  const typos: Record<string, number> = {};
  for (const [k, v] of Object.entries(body.typos ?? {})) {
    if (k.length === 1 && Number.isInteger(v) && v > 0) typos[k.toLowerCase()] = v;
  }

  const inserted = db
    .insert(typingSessions)
    .values({
      mode,
      articleId: mode === "article" ? (body.articleId ?? null) : null,
      durationSec: sec,
      charTotal,
      charCorrect,
      backspaces: Math.max(0, Math.round(body.backspaces ?? 0)),
      maxCombo: Math.max(0, Math.round(body.maxCombo ?? 0)),
      wpm,
      accuracy,
      errorCharsJson: errorChars.length ? errorChars : null,
      typosJson: Object.keys(typos).length ? typos : null,
      drillMetaJson: mode === "drill" ? (body.drillMeta ?? null) : null,
    })
    .returning({ id: typingSessions.id })
    .get();

  // 成绩入库 → 该文章中途进度作废
  if (mode === "article" && body.articleId) {
    db.delete(typingProgress).where(eq(typingProgress.articleId, body.articleId)).run();
  }

  return NextResponse.json({ sessionId: inserted.id, wpm, accuracy, charCorrect, charTotal });
}
