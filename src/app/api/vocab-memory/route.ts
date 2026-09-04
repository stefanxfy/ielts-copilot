/**
 * /api/vocab-memory — 记忆轨迹 API(今日总览 + 单词遗忘曲线)
 *
 * GET /api/vocab-memory           → 今日记忆总览(统计 + 词列表,各词带评分流水重放)
 * GET /api/vocab-memory?wordId=N  → 单词遗忘曲线(完整历史重放,截尾 50 段)
 *
 * 数据来源:word_review_log 评分流水经 ts-fsrs(FSRS-6.0,与调度同参)精确重放,
 * 重放结果与 word_progress.fsrs_state_json 对齐(achieve 实测 S/D 双吻合)。
 */
import { NextResponse } from "next/server";
import { getTodayMemory, getWordMemory } from "@/lib/vocab-memory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const wordIdRaw = new URL(request.url).searchParams.get("wordId");
  if (wordIdRaw != null) {
    const wordId = Number(wordIdRaw);
    if (!Number.isInteger(wordId) || wordId <= 0) {
      return NextResponse.json({ error: "wordId 应为正整数" }, { status: 400 });
    }
    return NextResponse.json(getWordMemory(wordId));
  }
  return NextResponse.json(getTodayMemory());
}
