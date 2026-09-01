/**
 * /api/study-plans/[id] — 调整 / 归档计划(P7)
 *
 * PATCH:调整计划(改考试日期/目标/节奏任意项)→ 重新 preview 级生成
 *        → **只重排锚点后的周**(已过周与打卡历史不动,规划决议 #4)
 *        → 回写 phases_json + updatedAt。支持 ?source=template 直连;
 *        LLM 失败返回 {failed:true, reason} 由前端弹窗询问。
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
