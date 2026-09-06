/**
 * /api/vocab-review — 背单词复习 session(S3)
 *
 * GET :构建今日出题队列(到期复习 + 限额新词,spell 词服务端抽定卡型),纯查询无副作用
 *      ?extra=N(0~100,默认 0):完成页「继续背新词」临时放宽新词限额 N 个(一次 +10,
 *      客户端保证单次循环只加一次;服务端只做范围钳制)
 *      ?focus=wordId:搜词「立即背这个词」——该词强制入队并置顶(计划内 ACTIVE,未到期也算)
 * POST:评分写回 —— body { progressId, stage, rating }
 *   rating 折算口径(客户端负责折算,服务端只认 FSRS 1~3):
 *     认词卡:认识=Good(3) 模糊=Hard(2) 不认识=Again(1)
 *     默写卡:0~1 提示答对=Good;两级提示用满答对=Hard(方案 B 上限);
 *            判错编辑距离≤2=Hard、>2=Again;查看答案=Again
 *   服务端 stage 状态机(docs/背单词数据模型设计.md §8.4):recognize 连续 2 次
 *   Good 升 spell;spell 非 Good 降 recognize。同事务写 word_progress + word_review_log,
 *   并旁路写备考活动埋点(当日该词首条流水计 1 词)。
 */
import { NextResponse } from "next/server";
import {
  buildReviewSession,
  gradeReview,
  ReviewError,
} from "@/lib/vocab-review";
import { PROGRESS_STAGES, type ProgressStage } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const rawExtra = sp.get("extra");
  const extraNum = rawExtra == null ? 0 : Number(rawExtra);
  const extra =
    Number.isFinite(extraNum) && extraNum > 0 ? Math.min(100, Math.trunc(extraNum)) : 0;
  // focus=wordId:搜词「立即背这个词」——该词强制入队并置顶(未到期也算)
  const rawFocus = sp.get("focus");
  const focusNum = rawFocus == null ? NaN : Number(rawFocus);
  const focusWordId =
    Number.isInteger(focusNum) && focusNum > 0 ? Math.trunc(focusNum) : undefined;
  const session = buildReviewSession(undefined, extra, focusWordId);
  return NextResponse.json(session);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const { progressId, stage, rating } = (body ?? {}) as {
    progressId?: unknown;
    stage?: unknown;
    rating?: unknown;
  };
  if (typeof progressId !== "number" || !Number.isInteger(progressId) || progressId <= 0) {
    return NextResponse.json({ error: "progressId 应为正整数" }, { status: 400 });
  }
  if (
    typeof stage !== "string" ||
    !(PROGRESS_STAGES as readonly string[]).includes(stage)
  ) {
    return NextResponse.json(
      { error: `stage 应为 ${PROGRESS_STAGES.join("/")}` },
      { status: 400 },
    );
  }
  if (
    typeof rating !== "number" ||
    !Number.isInteger(rating) ||
    (rating as number) < 1 ||
    (rating as number) > 3
  ) {
    return NextResponse.json({ error: "rating 应为 1~3 的整数" }, { status: 400 });
  }

  try {
    const result = gradeReview(
      progressId,
      stage as ProgressStage,
      rating as 1 | 2 | 3,
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof ReviewError) {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "评分写回失败" },
      { status: 500 },
    );
  }
}
