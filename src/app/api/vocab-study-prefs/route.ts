/**
 * /api/vocab-study-prefs — 背单词偏好读写(app_settings.vocab_study_prefs)
 *
 * GET:读偏好(未配置返回默认 dailyNewWords=10 / keySfxStyle="tick")
 * PUT:部分更新 { dailyNewWords?, keySfxStyle? };dailyNewWords 范围 1–100,
 *     keySfxStyle 须为 vocab-sfx 五风格之一,非法直接拒绝
 * 用途:S3 背单词页「今日进度 N/M」分母 + 认词卡键入音效;设置页「背单词」卡读写。
 */
import { NextResponse } from "next/server";
import { readVocabStudyPrefs, updateVocabStudyPrefs } from "@/lib/vocab-study-prefs";
import { isKeySfxStyle, type KeySfxStyle } from "@/lib/vocab-sfx";

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
  const b = (body ?? {}) as { dailyNewWords?: unknown; keySfxStyle?: unknown };

  let dailyNewWords: number | undefined;
  if (b.dailyNewWords !== undefined) {
    const v = b.dailyNewWords;
    if (typeof v !== "number" || !Number.isInteger(v) || v < 1 || v > 100) {
      return NextResponse.json({ error: "每日新词量应为 1–100 的整数" }, { status: 400 });
    }
    dailyNewWords = v;
  }

  let keySfxStyle: KeySfxStyle | undefined;
  if (b.keySfxStyle !== undefined) {
    if (!isKeySfxStyle(b.keySfxStyle)) {
      return NextResponse.json({ error: "键入音效风格不合法" }, { status: 400 });
    }
    keySfxStyle = b.keySfxStyle;
  }

  if (dailyNewWords === undefined && keySfxStyle === undefined) {
    return NextResponse.json({ error: "无可更新字段" }, { status: 400 });
  }

  const prefs = updateVocabStudyPrefs({
    ...(dailyNewWords !== undefined ? { dailyNewWords } : {}),
    ...(keySfxStyle !== undefined ? { keySfxStyle } : {}),
  });
  return NextResponse.json({ ok: true, prefs });
}
