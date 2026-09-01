/**
 * /api/study-plans/preview — 计划预览(不落库,P7)
 *
 * POST:
 *   - ?source=template → 直接走默认模板(用户在 LLM 失败弹窗选「用默认模板」后重调)
 *   - 默认走 LLM:组装提示词 → chatComplete(jsonMode+disableThinking+低温)
 *     → schema 校验失败重试 1 次 → 仍败返回 {failed:true, reason},**不自动降级**
 *     (降级与否由前端弹窗问用户,规划 §3.2 v2.5)
 * 返回:{phases, generatedBy} 或 {failed, reason}
 */
import { NextResponse } from "next/server";
import type { PlanPhase, PlanSource } from "@/db/schema";
import { chatComplete } from "@/lib/llm/chat";
import { extractJson } from "@/lib/grading/prompt";
import { getDashboardData } from "@/lib/dashboard";
import {
  buildLevelBlock,
  parseWizardInput,
  totalWeeks,
} from "@/lib/study/plan-input";
import {
  buildPlanMessages,
  buildTemplatePhases,
  validatePhasesOutput,
} from "@/lib/study/plan-gen";
import { readStudyPreferences } from "@/lib/study/settings";
import { daysBetween, mondayOf, todayStr } from "@/lib/study/date";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUBJECT_LABEL: Record<string, string> = {
  listening: "听力",
  reading: "阅读",
  writing: "写作",
  speaking: "口语",
};

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const parsed = parseWizardInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const input = parsed.value;

  const today = todayStr();
  const anchorMonday = mondayOf(today);
  const days = daysBetween(input.examDate, today);
  const weeks = totalWeeks(input.examDate, anchorMonday);

  const prefs = readStudyPreferences();

  /* ---------- 默认模板直连(弹窗确认后的重调路径) ---------- */
  const source = new URL(request.url).searchParams.get("source");
  if (source === "template") {
    const phases = buildTemplatePhases({
      weeks,
      availability: input.availability,
      prefs,
    });
    return NextResponse.json({ phases, generatedBy: "template", weeks, days });
  }

  /* ---------- LLM 路径 ---------- */
  const dash = getDashboardData(null);
  const radarAvg: Record<string, number> = {};
  for (const item of dash.radar.items) radarAvg[item.subject] = item.avg;
  const weakest =
    dash.weakItems[0]?.subject != null
      ? SUBJECT_LABEL[dash.weakItems[0].subject]
      : undefined;

  const levelBlock = buildLevelBlock({
    latestOverall: dash.overview.latestOverall,
    latestSubjects: dash.overview.latestSubjects,
    radarAvg,
    target: input.targetOverallBand,
  });

  const { system, user } = buildPlanMessages({
    examDate: input.examDate,
    days,
    weeks,
    overall: input.targetOverallBand,
    targets: input.targetScores,
    levelBlock,
    availability: input.availability,
    prefs,
    weakestSubject: weakest,
  });

  let lastReason = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await chatComplete(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { jsonMode: true, disableThinking: true, temperature: 0.3, maxTokens: 8192 },
    );
    if (!result.ok) {
      lastReason = result.message;
      continue; // 网络层失败:直接算一次尝试,重试一次
    }
    const parsedJson = extractJson(result.content);
    const phasesRaw =
      parsedJson && typeof parsedJson === "object" && "phases" in (parsedJson as object)
        ? (parsedJson as { phases: unknown }).phases
        : parsedJson;
    const check = validatePhasesOutput(phasesRaw, weeks);
    if (check.ok) {
      return NextResponse.json({
        phases: check.phases as PlanPhase[],
        generatedBy: "llm" as PlanSource,
        weeks,
        days,
      });
    }
    lastReason = check.reason ?? "输出不合法";
  }

  // 重试 1 次仍失败:不静默降级,交给前端弹窗问用户
  return NextResponse.json({ failed: true, reason: lastReason });
}
