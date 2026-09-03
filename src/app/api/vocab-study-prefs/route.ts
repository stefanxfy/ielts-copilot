/**
 * /api/vocab-study-prefs — 背单词偏好读写(app_settings.vocab_study_prefs)
 *
 * GET:读偏好(未配置返回默认 dailyNewWords=10)
 * PUT:{ dailyNewWords } 整体覆盖;范围 1–100,非法直接拒绝
 * 用途:S3 背单词页「今日进度 N/M」的分母 M;设置页「背单词」卡读写。
 */
import { NextResponse } from "next/server";
import { readVocabStudyPrefs, writeVocabStudyPrefs } from "@/lib/vocab-study-prefs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ prefs: readVocabStudyPrefs() });
}

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const v = (body as { dailyNewWords?: unknown } | null)?.dailyNewWords;
  if (typeof v !== "number" || !Number.isInteger(v) || v < 1 || v > 100) {
    return NextResponse.json({ error: "每日新词量应为 1–100 的整数" }, { status: 400 });
  }
  writeVocabStudyPrefs({ dailyNewWords: v });
  return NextResponse.json({ ok: true, prefs: readVocabStudyPrefs() });
}
