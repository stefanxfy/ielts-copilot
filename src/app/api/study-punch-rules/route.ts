/**
 * /api/study-punch-rules — 打卡规则读写(P7 v2.5)
 *
 * GET:未配置返回默认值;PUT:数值范围校验(submissionMin 1–20 / wordsMin 1–100)。
 */
import { NextResponse } from "next/server";
import type { PunchRules } from "@/db/schema";
import {
  DEFAULT_PUNCH_RULES,
  getSetting,
  setSetting,
} from "@/lib/study/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const raw = getSetting<PunchRules>("punch_rules");
  return NextResponse.json({ rules: raw ?? DEFAULT_PUNCH_RULES });
}

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const submissionMin = b.submissionMin;
  const wordsMin = b.wordsMin;
  const bothForFull = b.bothForFull;

  if (typeof submissionMin !== "number" || !Number.isInteger(submissionMin) || submissionMin < 1 || submissionMin > 20) {
    return NextResponse.json({ error: "交卷达标线应为 1–20 的整数" }, { status: 400 });
  }
  if (typeof wordsMin !== "number" || !Number.isInteger(wordsMin) || wordsMin < 1 || wordsMin > 100) {
    return NextResponse.json({ error: "背词达标线应为 1–100 的整数" }, { status: 400 });
  }
  if (typeof bothForFull !== "boolean") {
    return NextResponse.json({ error: "bothForFull 应为布尔值" }, { status: 400 });
  }

  const rules: PunchRules = { submissionMin, wordsMin, bothForFull };
  setSetting("punch_rules", rules as unknown as Record<string, unknown>);
  return NextResponse.json({ ok: true, rules });
}
