/**
 * /plan — 备考计划(P7)
 *
 * 服务端读 ACTIVE 计划分流:
 *   无 → PlanWizard(五步向导,client)
 *   有 → BattleHome(三栏作战主页,client):倒计时/今日任务/打卡日历+心得+AI 总结
 *
 * 今日任务勾选判定在服务端完成(buildTodayChecklist),打卡规则现读 punch_rules,
 * 今日 daily 心得与昨日 AI 总结一次查好经 props 下发,客户端不直接查库。
 */
import { and, eq, gte, lte } from "drizzle-orm";
import { getDb } from "@/db";
import { studyActivities, studyJournals, studyPlans } from "@/db/schema";
import type { PlanPhase } from "@/db/schema";
import { PlanWizard } from "@/components/plan/wizard";
import { BattleHome } from "@/components/plan/battle-home";
import {
  buildTodayChecklist,
  type DayActivity,
} from "@/lib/study/checklist";
import { readPunchRules } from "@/lib/study/settings";
import { addDays, mondayOf, todayStr } from "@/lib/study/date";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function PlanPage() {
  const db = getDb();
  const today = todayStr();

  const plan = db
    .select()
    .from(studyPlans)
    .where(eq(studyPlans.status, "ACTIVE"))
    .get();

  /* ---------- 无 ACTIVE 计划 → 向导 ---------- */
  if (!plan) {
    return (
      <>
        <h2 className="text-xl">备考计划</h2>
        <p className="mb-5 text-[13px] text-[#5b6574]">
          开启雅思备考作战计划 · 定考试日期 → 定目标 → 定节奏 → AI 生成分阶段方案
        </p>
        <PlanWizard />
      </>
    );
  }

  /* ---------- 有 ACTIVE 计划 → 作战主页 ---------- */
  const phases = plan.phasesJson as PlanPhase[];

  // 今日 + 本周一至今的活动行(勾选判定一次查好)
  const weekStart = mondayOf(today);
  const activities = (
    db
      .select()
      .from(studyActivities)
      .where(and(gte(studyActivities.activityDate, weekStart), lte(studyActivities.activityDate, today)))
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

  const { weekNo, phase, tasks } = buildTodayChecklist(phases, plan.planStartWeekMonday, activities);

  // 今日 daily 心得(已存内容)
  const todayJournal = db
    .select()
    .from(studyJournals)
    .where(and(eq(studyJournals.journalDate, today), eq(studyJournals.period, "daily")))
    .get();

  // 昨日 AI 总结(昨日 journal 行可能不存在,aiSummaryJson 可空)
  const yesterday = addDays(today, -1);
  const yesterdayJournal = db
    .select()
    .from(studyJournals)
    .where(and(eq(studyJournals.journalDate, yesterday), eq(studyJournals.period, "daily")))
    .get();

  return (
    <>
      <h2 className="text-xl">备考计划 · 作战主页</h2>
      <p className="mb-5 text-[13px] text-[#5b6574]">
        第 {weekNo} 周 · 阶段:{phase?.name ?? "超出计划范围"}
      </p>
      <BattleHome
        examDate={plan.examDate}
        weekNo={weekNo}
        phase={phase ? { name: phase.name, focus: phase.focus } : undefined}
        tasks={tasks}
        punchRules={readPunchRules()}
        initialJournal={todayJournal?.content ?? ""}
        initialAiSummary={yesterdayJournal?.aiSummaryJson ?? null}
      />
    </>
  );
}
