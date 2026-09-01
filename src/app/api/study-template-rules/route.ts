/**
 * /api/study-template-rules — 默认模板规则读写(P7 v2.9)
 *
 * GET:未配置返回默认值;PUT:逐字段校验(比例和合理/数值上下限),非法字段拒绝保存。
 */
import { NextResponse } from "next/server";
import { TASK_TYPES } from "@/db/schema";
import type { TaskType, TemplateRules } from "@/db/schema";
import {
  DEFAULT_TEMPLATE_RULES,
} from "@/lib/prompts/defaults";
import { getSetting, setSetting } from "@/lib/study/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PHASE_KEYS = ["basic", "strengthen", "sprint"] as const;
const RATIO_KEYS = ["long", "mid", "short"] as const;

export async function GET() {
  const raw = getSetting<TemplateRules>("template_rules");
  return NextResponse.json({ rules: raw ?? DEFAULT_TEMPLATE_RULES });
}

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const b = (body ?? {}) as Partial<TemplateRules>;

  // 阶段比例:long 和应为 100;mid/short 均为非负整数且和 ≤ 52
  const ratios = b.phaseRatios;
  if (!ratios || typeof ratios !== "object") {
    return NextResponse.json({ error: "缺少 phaseRatios" }, { status: 400 });
  }
  const nextRules: TemplateRules = structuredClone(DEFAULT_TEMPLATE_RULES);
  for (const key of RATIO_KEYS) {
    const v = ratios[key];
    if (
      !Array.isArray(v) ||
      v.length !== 3 ||
      !v.every((n) => typeof n === "number" && Number.isFinite(n) && n >= 0)
    ) {
      return NextResponse.json({ error: `phaseRatios.${key} 应为 3 个非负数` }, { status: 400 });
    }
    if (key === "long" && Math.round(v[0] + v[1] + v[2]) !== 100) {
      return NextResponse.json({ error: "long 比例之和应为 100" }, { status: 400 });
    }
    if (key !== "long" && (v.some((n) => !Number.isInteger(n)) || v.reduce((a, c) => a + c, 0) < 1 || v.reduce((a, c) => a + c, 0) > 52)) {
      return NextResponse.json({ error: `${key} 周数应为非负整数且合计 1–52` }, { status: 400 });
    }
    nextRules.phaseRatios[key] = [...v] as [number, number, number];
  }

  // 基准任务表:每阶段每类型 0–999
  const base = b.baseWeekly;
  if (!base || typeof base !== "object") {
    return NextResponse.json({ error: "缺少 baseWeekly" }, { status: 400 });
  }
  for (const phase of PHASE_KEYS) {
    const src = base[phase];
    if (!src || typeof src !== "object") {
      return NextResponse.json({ error: `baseWeekly.${phase} 缺失` }, { status: 400 });
    }
    for (const t of TASK_TYPES) {
      const v = src[t as TaskType];
      if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 999) {
        return NextResponse.json(
          { error: `baseWeekly.${phase}.${t} 应为 0–999 的数值` },
          { status: 400 },
        );
      }
      nextRules.baseWeekly[phase][t as TaskType] = v;
    }
  }

  const numFields = [
    ["scaleBaseHours", 1, 12],
    ["wordsCeil", 10, 500],
    ["perSubjectCeil", 1, 21],
    ["blockMinMinutes", 15, 240],
    ["mergeGapMinutes", 0, 120],
  ] as const;
  for (const [key, min, max] of numFields) {
    const v = b[key];
    if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max) {
      return NextResponse.json({ error: `${key} 应为 ${min}–${max}` }, { status: 400 });
    }
    nextRules[key] = v;
  }

  setSetting("template_rules", nextRules as unknown as Record<string, unknown>);
  return NextResponse.json({ ok: true, rules: nextRules });
}
