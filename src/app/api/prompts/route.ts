/**
 * /api/prompts — LLM 提示词模板读写(P7 v2.7)
 *
 * GET :三条 prompt_* 键的现状(未存键返回 defaults 原文 + isDefault 标记)
 * PUT :{key, text} 白名单键 + 占位符齐全校验 + ≤8000 字符 → upsert(保存即生效)
 * DELETE ?key= :恢复默认 = 删键
 */
import { NextResponse } from "next/server";
import {
  PROMPT_META,
  getPrompt,
  validatePromptText,
  type PromptKey,
} from "@/lib/prompts/defaults";
import { deleteSetting, getSetting, setSetting } from "@/lib/study/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEYS = Object.keys(PROMPT_META) as PromptKey[];

function isKey(v: unknown): v is PromptKey {
  return typeof v === "string" && KEYS.includes(v as PromptKey);
}

interface StoredPrompt {
  text: string;
  updatedAt?: number;
}

export async function GET() {
  const prompts = KEYS.map((key) => {
    const stored = getSetting<StoredPrompt>(key);
    const isDefault = !stored || typeof stored.text !== "string";
    return {
      key,
      label: PROMPT_META[key].label,
      description: PROMPT_META[key].description,
      placeholders: PROMPT_META[key].placeholders,
      required: PROMPT_META[key].required,
      text: isDefault ? PROMPT_META[key].defaultText : stored.text,
      isDefault,
    };
  });
  return NextResponse.json({ prompts });
}

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  if (!isKey(b.key)) {
    return NextResponse.json({ error: "未知提示词 key" }, { status: 400 });
  }
  if (typeof b.text !== "string") {
    return NextResponse.json({ error: "缺少 text" }, { status: 400 });
  }
  const err = validatePromptText(b.key, b.text);
  if (err) {
    return NextResponse.json({ error: err }, { status: 400 });
  }
  setSetting(b.key, { text: b.text, updatedAt: Date.now() });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const key = new URL(request.url).searchParams.get("key");
  if (!isKey(key)) {
    return NextResponse.json({ error: "未知提示词 key" }, { status: 400 });
  }
  deleteSetting(key);
  return NextResponse.json({ ok: true, text: getPrompt(key) });
}
