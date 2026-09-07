/**
 * /api/vocab-regen — 单词级物料重生成(S2 词表浏览页「重新生成」)
 *
 * POST { word, kind, style?, voice?, sentIdx? }
 *   kind = "image"      → 按风格重生成/首次生成配图(覆盖旧图)
 *   kind = "audio-word" → 按音色重合成单词读音
 *   kind = "audio-sent" → 按音色重合成第 sentIdx 条例句(统一 -8%)
 *
 * 同步 await(单物料 1~15s),前端弹窗内转圈等待,无任务态。
 */
import { NextResponse } from "next/server";
import {
  VocabRegenError,
  regenSentAudio,
  regenWordAudio,
  regenWordImage,
  type RegenKind,
} from "@/lib/vocab-regen";
import { isVocabImageStyleId, type VocabImageStyleId } from "@/lib/vocab-image-styles";
import { isVocabTtsVoiceId } from "@/lib/vocab-tts-voices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RegenBody {
  word?: unknown;
  kind?: unknown;
  style?: unknown;
  voice?: unknown;
  sentIdx?: unknown;
}

export async function POST(request: Request) {
  let body: RegenBody;
  try {
    body = (await request.json()) as RegenBody;
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const word = typeof body.word === "string" ? body.word.trim() : "";
  const kind = body.kind as RegenKind;
  if (!word) return NextResponse.json({ error: "word required" }, { status: 400 });

  try {
    if (kind === "image") {
      const style: VocabImageStyleId = isVocabImageStyleId(body.style) ? body.style : "s1";
      const r = await regenWordImage(word, style);
      return NextResponse.json({ ok: true, kind, webPath: r.webPath, bytes: r.bytes });
    }
    if (kind === "audio-word") {
      if (!isVocabTtsVoiceId(body.voice)) {
        return NextResponse.json({ error: "voice invalid" }, { status: 400 });
      }
      const r = await regenWordAudio(word, body.voice);
      return NextResponse.json({ ok: true, kind, webPath: r.webPath });
    }
    if (kind === "audio-sent") {
      if (!isVocabTtsVoiceId(body.voice)) {
        return NextResponse.json({ error: "voice invalid" }, { status: 400 });
      }
      if (typeof body.sentIdx !== "number" || !Number.isInteger(body.sentIdx) || body.sentIdx < 0) {
        return NextResponse.json({ error: "sentIdx invalid" }, { status: 400 });
      }
      const r = await regenSentAudio(word, body.sentIdx, body.voice);
      return NextResponse.json({ ok: true, kind, webPath: r.webPath });
    }
    return NextResponse.json({ error: "kind must be image | audio-word | audio-sent" }, { status: 400 });
  } catch (e) {
    if (e instanceof VocabRegenError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.warn("[vocab-regen] 重生成失败:", e instanceof Error ? e.message : e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "重生成失败" },
      { status: 500 },
    );
  }
}
