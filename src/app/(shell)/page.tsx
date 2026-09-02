/**
 * / 仪表盘 —— 成绩分析主页(V2 · P6 重做)
 *
 * 三段式(docs/V2-产品规划.md §3.1):
 *   ① 能力总览 4 卡:当前水平 · 趋势 vs 上次 · 目标差距 · 累计模考
 *   ② 分数曲线(总分/听力/阅读/写作切换 + 目标线) + 四科能力雷达(最近 vs 均值)
 *   ③ 薄弱真题清单(卷×科目,最近 band < 目标−0.5,「再练一次」直达)
 * 保留精简版最近模考列表(场次成绩单入口)。
 * 原「题库 tile」已挪到机考模拟页;目标分已接线 ACTIVE 备考计划(P7)。
 */

import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  examSessions,
  examSets,
  papers,
  studyPlans,
} from "@/db/schema";
import { getDashboardData, SUBJECT_LABEL } from "@/lib/dashboard";
import ScoreCurveChart from "@/components/dashboard/score-curve";
import AbilityRadar from "@/components/dashboard/ability-radar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function DashboardPage() {
  // P7 接线:目标分取 ACTIVE 备考计划;无计划传 null(「目标差距」卡显示「未设定」)
  const activePlan = getDb()
    .select({ targetOverallBand: studyPlans.targetOverallBand })
    .from(studyPlans)
    .where(eq(studyPlans.status, "ACTIVE"))
    .get();
  const data = getDashboardData(activePlan?.targetOverallBand ?? null);
  const { overview, curve, radar, weakItems, effectiveTarget } = data;
  const hasSessions = curve.length > 0;

  // 题库规模(页脚小字提示,替代原「题库 tile」)
  const db = getDb();
  const paperCount = db.select({ n: papers.id }).from(papers).all().length;
  const setCount = db.select({ n: examSets.examSetId }).from(examSets).all().length;

  return (
    <>
      <h2 className="text-xl">仪表盘 · 成绩分析</h2>
      <p className="mb-5 text-[13px] text-muted-foreground">
        基于历史成绩分析 · 总分曲线看完整模考,单科曲线/雷达含单科练习
      </p>

      {/* ① 能力总览 4 卡 */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <OverviewCard
          title="当前水平"
          main={overview.latestOverall != null ? overview.latestOverall.toFixed(1) : "—"}
          sub={
            overview.latestOverall != null
              ? `总分 · ${Object.entries(overview.latestSubjects)
                  .map(([k, v]) => `${SUBJECT_LABEL[k]} ${v?.toFixed(1)}`)
                  .join(" / ")}`
              : "完成一场模考后显示"
          }
          href={overview.latestSessionId ? `/session/${overview.latestSessionId}` : undefined}
          arrow={overview.latestSessionId ? "查看最近成绩单 →" : undefined}
        />
        <OverviewCard
          title="趋势 vs 上次"
          main={
            overview.trend != null
              ? `${overview.trend > 0 ? "+" : ""}${overview.trend.toFixed(1)}`
              : "—"
          }
          trend={overview.trend ?? undefined}
          sub={overview.trend != null ? "较上一场总分变化" : "再考一场解锁趋势"}
        />
        <OverviewCard
          title="目标差距"
          main={
            overview.targetOverall != null && overview.latestOverall != null
              ? `${(overview.latestOverall - overview.targetOverall).toFixed(1)}`
              : overview.latestOverall != null
                ? "未设定"
                : "—"
          }
          sub={
            overview.targetOverall != null
              ? `目标总分 ${overview.targetOverall.toFixed(1)}`
              : overview.latestOverall != null
                ? "开启备考计划后自动对接"
                : "完成一场模考后显示"
          }
          href="/plan"
          arrow="去设定目标 →"
        />
        <OverviewCard
          title="累计模考"
          main={String(overview.totalSessions)}
          sub={`本周 ${overview.weekSessions} 场 · 累计 ${Math.round(overview.totalUsedSec / 3600)} 小时`}
        />
      </div>

      {/* ② 分数曲线 + 能力雷达 */}
      {hasSessions ? (
        <div className="mb-5 grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <ScoreCurveChart
              data={curve}
              targets={{
                overall: overview.targetOverall,
                listening: null,
                reading: null,
                writing: null,
              }}
            />
          </div>
          <div className="rounded-xl border border-border bg-card lg:col-span-2">
            <div className="border-b border-border px-4 py-3 text-[15px] font-medium">
              四科能力雷达
            </div>
            {radar.items.length ? (
              <>
                <AbilityRadar items={radar.items} />
                <div className="px-4 pb-3 text-[11px] text-muted-foreground">
                  最近成绩 vs 历史均值(共 {radar.sampleCount} 条记录,含单科练习) · 口语暂无真题数据
                </div>
              </>
            ) : (
              <div className="px-4 py-16 text-center text-xs text-muted-foreground">
                暂无分科数据
              </div>
            )}
          </div>
        </div>
      ) : (
        <EmptyGuide />
      )}

      {/* ③ 薄弱真题清单 */}
      <div className="mb-5 rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div className="text-[15px] font-medium">薄弱真题 · 巩固清单</div>
          <div className="text-[11px] text-muted-foreground">
            判定:最近 band &lt; 目标 − 0.5(当前目标 {effectiveTarget.toFixed(1)}
            {overview.targetOverall == null ? " · 默认兜底" : ""}),重做达标自动移出
          </div>
        </div>
        {weakItems.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground">
            {hasSessions
              ? "暂无薄弱项 · 各卷最近成绩均达标,继续保持 ✓"
              : "完成模考后,未达标的真题会出现在这里,支持反复练"}
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">真题卷</th>
                <th className="px-4 py-2.5 font-medium">科目</th>
                <th className="px-4 py-2.5 font-medium">最近 band</th>
                <th className="px-4 py-2.5 font-medium">已做</th>
                <th className="px-4 py-2.5 font-medium">距目标</th>
                <th className="px-4 py-2.5 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {weakItems.map((w) => (
                <tr key={`${w.examId}-${w.subject}`} className="border-t border-border">
                  <td className="px-4 py-2.5">{w.paperTitle}</td>
                  <td className="px-4 py-2.5">{SUBJECT_LABEL[w.subject] ?? w.subject}</td>
                  <td className="px-4 py-2.5">
                    <span className="font-semibold text-destructive">
                      {w.latestBand.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{w.attempts} 次</td>
                  <td className="px-4 py-2.5 text-destructive">-{w.gap.toFixed(1)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Link
                      href={`/exam/${w.examId}`}
                      className="rounded-md border border-primary px-2.5 py-1 text-xs text-primary transition-colors hover:bg-primary/10"
                    >
                      再练一次 →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 最近模考(场次成绩单入口) */}
      <RecentSessions />

      <p className="mt-4 text-center text-[11px] text-muted-foreground/60">
        本地题库 {paperCount} 份单科卷 · {setCount} 套真题 · 前往「机考模拟」开始练习
      </p>
    </>
  );
}

/* ---------- 子组件 ---------- */

function OverviewCard({
  title,
  main,
  sub,
  trend,
  href,
  arrow,
}: {
  title: string;
  main: string;
  sub?: string;
  trend?: number;
  href?: string;
  arrow?: string;
}) {
  const body = (
    <>
      <div className="text-xs text-muted-foreground">{title}</div>
      <div
        className={`mt-1 text-[28px] font-bold leading-tight ${
          trend == null
            ? "text-primary"
            : trend > 0
              ? "text-success"
              : trend < 0
                ? "text-destructive"
                : "text-primary"
        }`}
      >
        {main}
        {trend != null && (
          <span className="ml-1.5 align-middle text-sm">
            {trend > 0 ? "↑" : trend < 0 ? "↓" : "→"}
          </span>
        )}
      </div>
      {sub && <div className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{sub}</div>}
      {arrow && (
        <div className="mt-1 text-[11px] text-primary transition-opacity group-hover:opacity-70">
          {arrow}
        </div>
      )}
    </>
  );
  const cls =
    "rounded-xl border border-border bg-card p-4 transition-shadow" +
    (href ? " group cursor-pointer hover:border-primary hover:shadow-lg hover:shadow-primary/10" : "");
  return href ? (
    <Link href={href} className={`block ${cls}`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function EmptyGuide() {
  return (
    <div className="mb-5 rounded-xl border border-dashed border-border bg-muted/50 px-6 py-12 text-center">
      <div className="text-[36px]">📈</div>
      <div className="mt-3 text-[15px] font-medium">先完成一场模考,曲线从这里开始</div>
      <p className="mt-1.5 text-[13px] text-muted-foreground">
        从「机考模拟」选一套真题,完整考完听力 + 阅读 + 写作,分数曲线与能力雷达即刻生成。
      </p>
      <Link
        href="/mock"
        className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-[13px] text-white transition-colors hover:bg-primary/90"
      >
        去机考模拟 →
      </Link>
    </div>
  );
}

/** 精简版最近模考(场次成绩单入口) */
function RecentSessions() {
  const db = getDb();
  const sessions = db
    .select({
      sessionId: examSessions.sessionId,
      status: examSessions.status,
      overallBand: examSessions.overallBand,
      totalUsedSec: examSessions.totalUsedSec,
      startedAt: examSessions.startedAt,
      setTitle: examSets.title,
    })
    .from(examSessions)
    .leftJoin(examSets, eq(examSets.examSetId, examSessions.examSetId))
    .orderBy(desc(examSessions.startedAt))
    .limit(5)
    .all();

  const fmtDuration = (sec: number) => `${Math.round(sec / 60)} 分钟`;
  const fmtTime = (d: Date | null) =>
    d ? new Date(d).toLocaleString("zh-CN", { hour12: false }) : "—";

  return (
    <>
      <h3 className="mb-3 text-[15px]">最近模考</h3>
      <div className="rounded-xl border border-border bg-card px-4 py-2">
        {sessions.length === 0 ? (
          <div className="py-4 text-center text-xs text-muted-foreground">
            暂无模考场次 · 从「机考模拟」选一套真题开始
          </div>
        ) : (
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-2.5 py-2 font-medium">套卷</th>
                <th className="px-2.5 py-2 font-medium">状态</th>
                <th className="px-2.5 py-2 font-medium">总分</th>
                <th className="px-2.5 py-2 font-medium">总用时</th>
                <th className="px-2.5 py-2 font-medium">开始时间</th>
                <th className="px-2.5 py-2 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.sessionId} className="border-b border-border last:border-0">
                  <td className="px-2.5 py-2.5">{s.setTitle ?? s.sessionId}</td>
                  <td className="px-2.5 py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] ${
                        s.status === "COMPLETED"
                          ? "bg-success/10 text-success"
                          : s.status === "ABANDONED"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-warning/15 text-warning"
                      }`}
                    >
                      {s.status === "COMPLETED"
                        ? "已完成"
                        : s.status === "ABANDONED"
                          ? "已放弃"
                          : "进行中"}
                    </span>
                  </td>
                  <td className="px-2.5 py-2.5 font-semibold text-primary">
                    {s.overallBand != null ? s.overallBand.toFixed(1) : "—"}
                  </td>
                  <td className="px-2.5 py-2.5">
                    {s.totalUsedSec != null ? fmtDuration(s.totalUsedSec) : "—"}
                  </td>
                  <td className="px-2.5 py-2.5 text-muted-foreground">{fmtTime(s.startedAt)}</td>
                  <td className="px-2.5 py-2.5">
                    <Link href={`/session/${s.sessionId}`} className="text-primary hover:underline">
                      场次成绩单 →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
