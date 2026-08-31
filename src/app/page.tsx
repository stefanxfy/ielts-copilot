/**
 * /(仪表盘)— P2 改版:卷列表 + 考试记录
 *
 * 服务端组件直读 DB:exam_sets 分组列出单科卷(点卷 → /exam/[examId] iframe 开考),
 * 下方最近考试记录(band/答对/用时)。设置页与 /api/health 等启动链路维持 M1 不动。
 */
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDb } from "@/db";
import { examRecords, examSets, papers } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUBJECT_LABEL: Record<string, string> = {
  reading: "阅读",
  listening: "听力",
  writing: "写作",
};

function fmtDuration(sec: number): string {
  return `${Math.round(sec / 60)} 分钟`;
}

function fmtTime(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("zh-CN", { hour12: false });
}

export default function DashboardPage() {
  const db = getDb();
  const sets = db.select().from(examSets).orderBy(desc(examSets.testPeriod)).all();
  const allPapers = db.select().from(papers).all();
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

  return (
    <main className="mx-auto max-w-3xl p-6 pb-16">
      <div className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="text-xl font-semibold">IELTS Copilot</h1>
          <p className="text-sm text-muted-foreground">本地雅思机考 · 数据全在本机</p>
        </div>
        <Button variant="outline" render={<Link href="/settings" />}>
          设置
        </Button>
      </div>

      {sets.length === 0 && (
        <p className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
          题库为空 —— 在仓库根目录执行 <code>npm run db:import</code> 导入真题。
        </p>
      )}

      <div className="space-y-6">
        {sets.map((set) => (
          <section key={set.examSetId}>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">
              {set.title}
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {allPapers
                .filter((p) => p.examSetId === set.examSetId)
                .map((p) => (
                  <Card key={p.examId}>
                    <CardHeader>
                      <CardTitle className="text-sm">
                        {SUBJECT_LABEL[p.subject] ?? p.subject}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="mb-3 text-xs text-muted-foreground">
                        限时 {fmtDuration(p.durationSec)}
                      </p>
                      <Button
                        size="sm"
                        render={<Link href={`/exam/${p.examId}`} />}
                      >
                        开始考试
                      </Button>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </section>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">最近考试记录</h2>
        {records.length === 0 ? (
          <p className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
            还没有考试记录 —— 选一套卷开始吧。
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">试卷</th>
                  <th className="px-3 py-2 font-medium">Band</th>
                  <th className="px-3 py-2 font-medium">答对</th>
                  <th className="px-3 py-2 font-medium">用时</th>
                  <th className="px-3 py-2 font-medium">交卷时间</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2">{r.paperTitle ?? r.examId}</td>
                    <td className="px-3 py-2 font-medium">{r.bandScore ?? "—"}</td>
                    <td className="px-3 py-2">
                      {r.correctCount != null ? `${r.correctCount}/40` : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {r.usedSec != null ? fmtDuration(r.usedSec) : "—"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {fmtTime(r.submittedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
