/**
 * /api/vocab-image — 单词级配图生成/重生成(Task 59)
 *
 * POST { word: string, style?: VocabImageStyleId }
 *   → style 省略时用 app_settings.vocab_image_style(设置页选择的全局风格)
 *   → 生图落盘 public/images/words/<word>.png + 回写该词 contentJson.image
 *   → 只影响该词;已有旧图被覆盖
 *
 * 错误语义:
 *   400 词缺失/非法 style · 404 词不存在 · 502 生图上游失败 · 500 服务端异常
 */
import { NextResponse } from "next/server";
import { isVocabImageStyleId } from "@/lib/vocab-image-styles";
import {
  VocabImageError,
  readVocabImageStyle,
  regenerateVocabImage,
} from "@/lib/vocab-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** 生图实测 5~15s,留足余量;Next 默认无超时但显式声明更稳 */
export const maxDuration = 90;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const { word, style } = (body ?? {}) as { word?: unknown; style?: unknown };
  if (typeof word !== "string" || !word.trim()) {
    return NextResponse.json({ error: "word required" }, { status: 400 });
  }
  if (style !== undefined && !isVocabImageStyleId(style)) {
    return NextResponse.json({ error: "未知配图风格 id" }, { status: 400 });
  }

  const effectiveStyle = style !== undefined ? style : readVocabImageStyle();
  try {
    const result = await regenerateVocabImage(word.trim(), effectiveStyle);
    return NextResponse.json({ ok: true, word: word.trim(), style: effectiveStyle, ...result });
  } catch (e) {
    if (e instanceof VocabImageError) {
      // 词不存在是客户端错;其余(上游 API/网络/超时)按网关失败回报
      const isNotFound = e.message.startsWith("词不存在");
      return NextResponse.json(
        { error: e.message },
        { status: isNotFound ? 404 : 502 },
      );
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
