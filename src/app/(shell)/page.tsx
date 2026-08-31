/**
 * / 仪表盘(复刻原型 view-dashboard)
 * 三块:统计卡(已发布试卷/累计完成考试/最近一次总分)·
 * 题库 tile(真题总数/A类/G类,点击进机考模拟对应题库)· 历史成绩(真实记录)
 * 服务端组件直读 DB。
 */

import Link from "next/link";
import { desc, eq, isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { examRecords, examSets, papers, examSessions } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fmtDuration(sec: number): string {
  return `${Math.round(sec / 60)} 分钟`;
}

function fmtTime(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("zh-CN", { hour12: false });
}

/* 原型同款卡片 */
function StatCard({
  num,
  label,
  href,
  arrow,
}: {
  num: number | string;
  label: string;
  href?: string;
  arrow?: string;
}) {
  const inner = (
    <>
      <div className="text-[26px] font-bold text-[#1a6feb]">{num}</div>
      <div className="mt-1 text-xs text-[#5b6574]">{label}</div>
      {arrow && (
        <div className="mt-1.5 text-xs text-[#8a93a2] transition-colors group-hover:text-[#1a6feb]">
          {arrow}
        </div>
      )}
    </>
  );
  const cls =
    "rounded-xl border border-[#dfe4ec] bg-white p-5 text-center transition-shadow" +
    (href ? " cursor-pointer hover:border-[#1a6feb] hover:shadow-[0_3px_10px_rgba(16,35,63,0.08)]" : "");
  return href ? (
    <Link href={href} className={`group block ${cls}`}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

export default function DashboardPage() {
  const db = getDb();
  const paperCount = db.select({ n: sql<number>`count(*)` }).from(papers).get()?.n ?? 0;
  const aCount =
    db.select({ n: sql<number>`count(*)` }).from(papers).where(eq(papers.category, "A")).get()?.n ?? 0;
  const gCount =
    db.select({ n: sql<number>`count(*)` }).from(papers).where(eq(papers.category, "G")).get()?.n ?? 0;

  const recordCount =
    db.select({ n: sql<number>`count(*)` }).from(examRecords).get()?.n ?? 0;
  const latest = db
    .select({ band: examRecords.bandScore })
    .from(examRecords)
    .where(isNotNull(examRecords.bandScore))
    .orderBy(desc(examRecords.submittedAt))
    .limit(1)
    .get();

  const records = db
    .select({
      id: examRecords.id,
      examId: examRecords.examId,
      paperTitle: papers.title,
      subject: examRecords.subject,
      bandScore: examRecords.bandScore,
      correctCount: examRecords.correctCount,
      usedSec: examRecords.usedSec,
      submittedAt: examRecords.submittedAt,
    })
    .from(examRecords)
    .leftJoin(papers, eq(papers.examId, examRecords.examId))
    .orderBy(desc(examRecords.startedAt))
    .limit(10)
    .all();

  // 完整模考场次列表(P4)
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

  void db.select().from(examSets).all(); // 预热连接(与旧版一致,保留无害)

  return (
    <>
      <h2 className="text-xl">仪表盘</h2>
      <p className="mb-5 text-[13px] text-[#5b6574]">
        本地题库 · 全部数据存于本机 <code>data/</code> 目录
      </p>

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard num={paperCount} label="已发布试卷" />
        <StatCard num={recordCount} label="累计完成考试" />
        <StatCard num={latest?.band ?? "—"} label="最近一次总分" />
      </div>

      <h3 className="mb-3 text-[15px]">题库</h3>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard num={paperCount} label="真题总数" href="/mock" arrow="进入机考模拟 →" />
        <StatCard num={aCount} label="A类真题数" href="/mock?mod=A" arrow="进入机考模拟 →" />
        <StatCard num={gCount} label="G类真题数" href="/mock?mod=G" arrow="进入机考模拟 →" />
      </div>

      <h3 className="mb-3 text-[15px]">完整模考</h3>
      <div className="mb-6 rounded-xl border border-[#dfe4ec] bg-white px-4 py-2">
        {sessions.length === 0 ? (
          <div className="py-4 text-center text-xs text-[#8a93a2]">
            <p>暂无完整模考场次 · 从「机考模拟」选一套真题点「开始全套模考」</p>
          </div>
        ) : (
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[#dfe4ec] text-left text-xs text-[#5b6574]">
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
                <tr key={s.sessionId} className="border-b border-[#dfe4ec] last:border-0">
                  <td className="px-2.5 py-2.5">{s.setTitle ?? s.sessionId}</td>
                  <td className="px-2.5 py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] ${
                        s.status === "COMPLETED"
                          ? "bg-[#eefaf3] text-[#18925c]"
                          : s.status === "ABANDONED"
                            ? "bg-[#fdf1f1] text-[#c0392b]"
                            : "bg-[#fff7e6] text-[#c07d10]"
                      }`}
                    >
                      {s.status === "COMPLETED" ? "已完成" : s.status === "ABANDONED" ? "已放弃" : "进行中"}
                    </span>
                  </td>
                  <td className="px-2.5 py-2.5 font-semibold text-[#1a6feb]">
                    {s.overallBand != null ? s.overallBand.toFixed(1) : "—"}
                  </td>
                  <td className="px-2.5 py-2.5">
                    {s.totalUsedSec != null ? fmtDuration(s.totalUsedSec) : "—"}
                  </td>
                  <td className="px-2.5 py-2.5 text-[#8a93a2]">{fmtTime(s.startedAt)}</td>
                  <td className="px-2.5 py-2.5">
                    <Link
                      href={`/session/${s.sessionId}`}
                      className="text-[#1a6feb] hover:underline"
                    >
                      场次成绩单 →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h3 className="mb-3 text-[15px]">历史成绩</h3>
      <div className="rounded-xl border border-[#dfe4ec] bg-white px-4 py-2">
        {records.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#8a93a2]">
            <p>暂无考试记录 · 从「机考模拟」选一套真题开始</p>
            <p className="mt-1">V3 将在此叠加：错题本 · 弱项雷达 · 分数曲线</p>
          </div>
        ) : (
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[#dfe4ec] text-left text-xs text-[#5b6574]">
                <th className="px-2.5 py-2 font-medium">试卷</th>
                <th className="px-2.5 py-2 font-medium">Band</th>
                <th className="px-2.5 py-2 font-medium">答对</th>
                <th className="px-2.5 py-2 font-medium">用时</th>
                <th className="px-2.5 py-2 font-medium">交卷时间</th>
                <th className="px-2.5 py-2 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="border-b border-[#dfe4ec] last:border-0">
                  <td className="px-2.5 py-2.5">{r.paperTitle ?? r.examId}</td>
                  <td className="px-2.5 py-2.5 font-semibold text-[#1a6feb]">
                    {r.bandScore ?? "—"}
                  </td>
                  <td className="px-2.5 py-2.5">
                    {r.correctCount != null ? `${r.correctCount}/40` : "—"}
                  </td>
                  <td className="px-2.5 py-2.5">
                    {r.usedSec != null ? fmtDuration(r.usedSec) : "—"}
                  </td>
                  <td className="px-2.5 py-2.5 text-[#8a93a2]">{fmtTime(r.submittedAt)}</td>
                  <td className="px-2.5 py-2.5">
                    <Link
                      href={`/records/${r.id}`}
                      className="text-[#1a6feb] hover:underline"
                    >
                      成绩详情 →
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
