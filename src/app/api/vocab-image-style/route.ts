/**
 * /api/vocab-image-style — 背单词配图风格读写(app_settings.vocab_image_style)
 *
 * GET:读当前风格(未配置返回默认 s1)
 * PUT:整体覆盖;非法 id 拒绝
 */
import { NextResponse } from "next/server";
import {
  DEFAULT_VOCAB_IMAGE_STYLE,
  isVocabImageStyleId,
  type VocabImageStyleId,
} from "@/lib/vocab-image-styles";
import { getSetting, setSetting } from "@/lib/study/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEY = "vocab_image_style";

export async function GET() {
  const raw = getSetting<{ style: VocabImageStyleId }>(KEY);
  const style = raw && isVocabImageStyleId(raw.style) ? raw.style : DEFAULT_VOCAB_IMAGE_STYLE;
  return NextResponse.json({ style });
}

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const style = (body as { style?: unknown } | null)?.style;
  if (!isVocabImageStyleId(style)) {
    return NextResponse.json({ error: "未知配图风格 id" }, { status: 400 });
  }
  setSetting(KEY, { style });
  return NextResponse.json({ ok: true, style });
}
