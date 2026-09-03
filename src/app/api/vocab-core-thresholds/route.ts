/**
 * /api/vocab-core-thresholds — 背单词核心词频率阈值读写(app_settings.vocab_core_thresholds)
 *
 * 判据:collins ≥ collinsMin 或 bncRank ≤ bncMax(生图策略 core 用,docs/背单词词库导入与词库中心设计.md §4)。
 * GET:未配置返回默认值(3/2000);PUT:范围校验(collinsMin 1–5 / bncMax 100–50000)。
 * 阈值改动立即生效——导入管线每次跑 readCoreThresholds() 现读,无缓存。
 */
import { NextResponse } from "next/server";
import { readCoreThresholds } from "@/lib/vocab-import";
import { setSetting } from "@/lib/study/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEY = "vocab_core_thresholds";

export async function GET() {
  return NextResponse.json({ thresholds: readCoreThresholds() });
}

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const { collinsMin, bncMax } = b;

  if (typeof collinsMin !== "number" || !Number.isInteger(collinsMin) || collinsMin < 1 || collinsMin > 5) {
    return NextResponse.json({ error: "柯林斯星级门槛应为 1–5 的整数" }, { status: 400 });
  }
  if (typeof bncMax !== "number" || !Number.isInteger(bncMax) || bncMax < 100 || bncMax > 50000) {
    return NextResponse.json({ error: "BNC 词频上限应为 100–50000 的整数" }, { status: 400 });
  }

  setSetting(KEY, { collinsMin, bncMax });
  return NextResponse.json({ ok: true, thresholds: { collinsMin, bncMax } });
}
