/**
 * /api/study-plan-day — 指定历史日的任务完成情况(P7 打卡日历联动)
 *
 * GET ?date=YYYY-MM-DD(必须 ≤ 今天):复用 buildTodayChecklist,
 * 把目标日期作为 now 传入即得该日的周号/阶段/任务勾选(weekStart..目标日
 * 逐日累计,与今日口径完全一致);另附当日打卡态(交卷/背词/达标级别)。
 *
 * 只读路由,不写任何表;客户端选中日历历史日期后动态切换中栏内容用。
 */
import { NextResponse } from "next/server";
import { and, eq, gte, lte } from "drizzle-orm";
import { getDb } from "@/db";
import { studyActivities, studyPlans } from "@/db/schema";
import type { PlanPhase } from "@/db/schema";
import {
  buildTodayChecklist,
  punchOfDay,
  type DayActivity,
} from "@/lib/study/checklist";
import { parseLocalDate, mondayOf, todayStr } from "@/lib/study/date";
import { readPunchRules } from "@/lib/study/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const YYYYMMDD = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date") ?? "";
  if (!YYYYMMDD.test(date)) {
    return NextResponse.json({ error: "date 格式应为 YYYY-MM-DD" }, { status: 400 });
  }
  const today = todayStr();
  if (date > today) {
    return NextResponse.json({ error: "不能查看未来日期" }, { status: 400 });
  }

  const plan = getDb()
    .select()
    .from(studyPlans)
    .where(eq(studyPlans.status, "ACTIVE"))
    .get();
  if (!plan) {
    return NextResponse.json({ error: "暂无进行中的备考计划" }, { status: 404 });
  }

  // 该日所在周(周一)至该日的活动行,一次查好 —— 与 page.tsx 今日口径一致
  const weekStart = mondayOf(date);
  const activities = (
    getDb()
      .select()
      .from(studyActivities)
      .where(
        and(gte(studyActivities.activityDate, weekStart), lte(studyActivities.activityDate, date)),
      )
      .all() as DayActivity[]
  ).map((r) => ({
    activityDate: r.activityDate,
    examSetCompletionCount: r.examSetCompletionCount,
    listeningSubmissionCount: r.listeningSubmissionCount,
    readingSubmissionCount: r.readingSubmissionCount,
    writingSubmissionCount: r.writingSubmissionCount,
    speakingSubmissionCount: r.speakingSubmissionCount,
    memorizedWordCount: r.memorizedWordCount,
  }));

  // 目标日作为「now」:weekNo / 本周累计 / 当日背词均按该日计算
  const { weekNo, phase, tasks } = buildTodayChecklist(
    plan.phasesJson as PlanPhase[],
    plan.planStartWeekMonday,
    activities,
    parseLocalDate(date),
  );

  // 计划边界(供 UI 区分「早于计划开始」/「晚于计划结束」两种范围外情形)
  const phases = plan.phasesJson as PlanPhase[];
  const planTotalWeeks = phases.reduce((n, p) => Math.max(n, ...p.weeks), 0);

  const dayRow = activities.find((a) => a.activityDate === date);
  const punch = dayRow
    ? punchOfDay(dayRow, readPunchRules())
    : { date, submissions: 0, words: 0, level: 0 as const };

  return NextResponse.json({
    ok: true,
    date,
    weekNo,
    phase: phase ? { name: phase.name, focus: phase.focus } : null,
    tasks,
    punch,
    planStartWeekMonday: plan.planStartWeekMonday,
    planTotalWeeks,
  });
}
