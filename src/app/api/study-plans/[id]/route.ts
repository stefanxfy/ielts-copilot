/**
 * /api/study-plans/[id] — 调整 / 归档计划(P7)
 *
 * PATCH:调整计划(改考试日期/目标/节奏任意项)→ 重新 preview 级生成
 *        → **只重排锚点后的周**(已过周与打卡历史不动,规划决议 #4)。
 *        两种用法:
 *          - ?preview=1     干跑:生成+合并但不落库,回 {phases, generatedBy, weeks, days}
 *          - 无参数(确认)  body 必须带 preview 阶段返回的 phases+generatedBy,
 *                           服务端校验后原样落库(所见即所得,避免确认瞬间重新生成)。
 *        均支持 ?source=template 直连;LLM 失败返回 {failed:true, reason} 由前端弹窗询问。
 * DELETE:归档(考完再战;活动与日记保留关联)。
 */
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { studyPlans, type PlanPhase } from "@/db/schema";
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const planId = Number(id);
  if (!Number.isInteger(planId)) {
    return NextResponse.json({ error: "无效的计划 id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  /* 确认直传:把 preview=1 时服务端合并好的 phases 原样落库(所见即所得) */
  const previewApply = new URL(request.url).searchParams.get("preview");
  if (previewApply !== "1") {
    const b = body as Record<string, unknown>;
    const phases = b?.phases;
    const generatedBy = b?.generatedBy;
    if (!Array.isArray(phases) || phases.length === 0 || typeof generatedBy !== "string") {
      return NextResponse.json(
        { error: "缺少确认数据(phases/generatedBy),请先走 ?preview=1 预览" },
        { status: 400 },
      );
    }
    const db = getDb();
    const plan = db.select().from(studyPlans).where(eq(studyPlans.id, planId)).get();
    if (!plan || plan.status !== "ACTIVE") {
      return NextResponse.json({ error: "ACTIVE 计划不存在" }, { status: 404 });
    }
    const input = parseWizardInput(body);
    if (!input.ok) {
      return NextResponse.json({ error: input.error }, { status: 400 });
    }
    const newTotalWeeks = totalWeeks(input.value.examDate, plan.planStartWeekMonday);
    const check = validatePhasesOutput(phases, newTotalWeeks);
    if (!check.ok) {
      return NextResponse.json({ error: `计划数据不合法:${check.reason}` }, { status: 400 });
    }
    db.update(studyPlans)
      .set({
        examDate: input.value.examDate,
        targetOverallBand: input.value.targetOverallBand,
        targetScoresJson: input.value.targetScores,
        availabilityJson: input.value.availability,
        phasesJson: check.phases as PlanPhase[],
        generatedBy: generatedBy === "template" ? "template" : "llm",
        updatedAt: new Date(),
      })
      .where(eq(studyPlans.id, planId))
      .run();
    const updated = db.select().from(studyPlans).where(eq(studyPlans.id, planId)).get();
    return NextResponse.json({ ok: true, plan: updated });
  }

  /* ---- 以下为 ?preview=1 干跑:生成+合并,不落库 ---- */
  const parsed = parseWizardInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const input = parsed.value;

  const db = getDb();
  const plan = db.select().from(studyPlans).where(eq(studyPlans.id, planId)).get();
  if (!plan || plan.status !== "ACTIVE") {
    return NextResponse.json({ error: "ACTIVE 计划不存在" }, { status: 404 });
  }

  const today = todayStr();
  const anchorMonday = plan.planStartWeekMonday;
  const currentWeekNo = Math.floor(daysBetween(today, anchorMonday) / 7) + 1;
  const newTotalWeeks = totalWeeks(input.examDate, anchorMonday);
  const remainingWeeks = Math.max(1, newTotalWeeks - (currentWeekNo - 1));

  const prefs = readStudyPreferences();

  /* ---------- 生成未来周(默认模板直连 / LLM) ---------- */
  let futurePhases: PlanPhase[];
  const source = new URL(request.url).searchParams.get("source");
  if (source === "template") {
    futurePhases = buildTemplatePhases({
      weeks: remainingWeeks,
      availability: input.availability,
      prefs,
    });
  } else {
    const dash = getDashboardData(null);
    const radarAvg: Record<string, number> = {};
    for (const item of dash.radar.items) radarAvg[item.subject] = item.avg;
    const weakest =
      dash.weakItems[0]?.subject != null
        ? SUBJECT_LABEL[dash.weakItems[0].subject]
        : undefined;

    const { system, user } = buildPlanMessages({
      examDate: input.examDate,
      days: daysBetween(input.examDate, today),
      weeks: remainingWeeks,
      overall: input.targetOverallBand,
      targets: input.targetScores,
      levelBlock: buildLevelBlock({
        latestOverall: dash.overview.latestOverall,
        latestSubjects: dash.overview.latestSubjects,
        radarAvg,
        target: input.targetOverallBand,
      }),
      availability: input.availability,
      prefs,
      weakestSubject: weakest,
    });

    let failedReason = "";
    let generated: PlanPhase[] | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await chatComplete(
        [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        { jsonMode: true, disableThinking: true, temperature: 0.3, maxTokens: 8192 },
      );
      if (!result.ok) {
        failedReason = result.message;
        continue;
      }
      const parsedJson = extractJson(result.content);
      const phasesRaw =
        parsedJson && typeof parsedJson === "object" && "phases" in (parsedJson as object)
          ? (parsedJson as { phases: unknown }).phases
          : parsedJson;
      const check = validatePhasesOutput(phasesRaw, remainingWeeks);
      if (check.ok) {
        generated = check.phases as PlanPhase[];
        break;
      }
      failedReason = check.reason ?? "输出不合法";
    }
    if (!generated) {
      return NextResponse.json({ failed: true, reason: failedReason });
    }
    futurePhases = generated;
  }

  /* ---------- 只重排锚点后的周:保留已过周,未来周整体平移 ---------- */
  const pastPhases: PlanPhase[] = (plan.phasesJson as PlanPhase[])
    .map((p) => ({ ...p, weeks: p.weeks.filter((w) => w < currentWeekNo) }))
    .filter((p) => p.weeks.length > 0);
  const shifted: PlanPhase[] = futurePhases.map((p) => ({
    ...p,
    weeks: p.weeks.map((w) => w + currentWeekNo - 1),
  }));
  const merged = [...pastPhases, ...shifted];

  const finalCheck = validatePhasesOutput(merged, newTotalWeeks);
  if (!finalCheck.ok) {
    return NextResponse.json(
      { error: `合并后的计划不合法:${finalCheck.reason}` },
      { status: 500 },
    );
  }

  /* ?preview=1:干跑不落库,回预览(weeks/days 供确认页展示) */
  if (previewApply === "1") {
    return NextResponse.json({
      phases: finalCheck.phases as PlanPhase[],
      generatedBy: source === "template" ? ("template" as const) : ("llm" as const),
      weeks: newTotalWeeks,
      days: daysBetween(input.examDate, today),
    });
  }

  db.update(studyPlans)
    .set({
      examDate: input.examDate,
      targetOverallBand: input.targetOverallBand,
      targetScoresJson: input.targetScores,
      availabilityJson: input.availability,
      phasesJson: finalCheck.phases as PlanPhase[],
      updatedAt: new Date(),
    })
    .where(eq(studyPlans.id, planId))
    .run();

  const updated = db.select().from(studyPlans).where(eq(studyPlans.id, planId)).get();
  return NextResponse.json({ ok: true, plan: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const planId = Number(id);
  if (!Number.isInteger(planId)) {
    return NextResponse.json({ error: "无效的计划 id" }, { status: 400 });
  }
  const db = getDb();
  const plan = db.select().from(studyPlans).where(eq(studyPlans.id, planId)).get();
  if (!plan || plan.status !== "ACTIVE") {
    return NextResponse.json({ error: "ACTIVE 计划不存在" }, { status: 404 });
  }
  db.update(studyPlans)
    .set({ status: "ARCHIVED", updatedAt: new Date() })
    .where(eq(studyPlans.id, planId))
    .run();
  return NextResponse.json({ ok: true });
}
