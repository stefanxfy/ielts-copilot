/**
 * /api/study-plans — 备考计划落库与读取(P7)
 *
 * POST:确认落库(单 ACTIVE 事务:归档旧 ACTIVE → 插入新行)
 * GET :当前 ACTIVE 计划(无则 {plan: null})
 */
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  studyPlans,
  type PlanPhase,
  type PlanSource,
} from "@/db/schema";
import { parseWizardInput, totalWeeks } from "@/lib/study/plan-input";
import { validatePhasesOutput } from "@/lib/study/plan-gen";
import { mondayOf, todayStr } from "@/lib/study/date";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const db = getDb();
  const plan = db
    .select()
    .from(studyPlans)
    .where(eq(studyPlans.status, "ACTIVE"))
    .get();
  return NextResponse.json({ plan: plan ?? null });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;

  const parsed = parseWizardInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  // 落库前再验一遍 phases(确认页到落库之间数据不应被篡改)
  const weeks = totalWeeks(parsed.value.examDate, mondayOf(todayStr()));
  const check = validatePhasesOutput(b.phases, weeks);
  if (!check.ok) {
    return NextResponse.json({ error: `计划数据不合法:${check.reason}` }, { status: 400 });
  }
  const generatedBy = b.generatedBy;
  if (generatedBy !== "llm" && generatedBy !== "template") {
    return NextResponse.json({ error: "generatedBy 应为 llm | template" }, { status: 400 });
  }

  const db = getDb();
  const now = new Date();
  const anchorMonday = mondayOf(todayStr(now));

  const insert = db.transaction((tx) => {
    tx.update(studyPlans)
      .set({ status: "ARCHIVED", updatedAt: now })
      .where(eq(studyPlans.status, "ACTIVE"))
      .run();
    return tx
      .insert(studyPlans)
      .values({
        examDate: parsed.value.examDate,
        targetOverallBand: parsed.value.targetOverallBand,
        targetScoresJson: parsed.value.targetScores,
        availabilityJson: parsed.value.availability,
        phasesJson: check.phases as PlanPhase[],
        generatedBy: generatedBy as PlanSource,
        status: "ACTIVE",
        planStartWeekMonday: anchorMonday,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: studyPlans.id })
      .all();
  });

  return NextResponse.json({ ok: true, id: insert[0].id });
}
