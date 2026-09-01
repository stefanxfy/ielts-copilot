/**
 * /records/[id] — 成绩详情页(P3 + P5)
 *
 * 数据:exam_records(answer_sheet_json 答题卡)+ papers(title/answers_json/questions_json/assets_json)
 * 布局:成绩摘要卡(band/答对/用时/交卷时间) + 按 Part 分组的逐题明细
 * 错题跳转:题目号链接到 /exam/[examId]?jump=<anchor> ,由机考页壳滚动定位
 * 写作卷:AI 四维批改卡(雷达图 + 逐维诊断 + 范文,P5)+ 作文全文
 */
import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { examRecords, papers } from "@/db/schema";
import type {
  AnswerSheetJson,
  AnswersJson,
  ObjectiveSheetEntry,
  WritingSheetEntry,
} from "@/db/schema";
import { getGradingStatus } from "@/lib/grading/service";
import { extractEssayPresence } from "@/lib/writing-sheet";
import WritingGradingCard from "@/components/writing/grading-card";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fmtDuration(sec: number | null): string {
  if (sec == null) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}分${s}秒` : `${m}分钟`;
}

function fmtTime(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("zh-CN", { hour12: false });
}

const SUBJECT_LABEL: Record<string, string> = {
  reading: "阅读",
  listening: "听力",
  writing: "写作",
};

function fmtValue(v: string | string[] | null): string {
  if (v == null || v === "") return "未作答";
  return Array.isArray(v) ? v.join(", ") : v;
}

export default async function RecordDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recordId = Number(id);
  if (!Number.isInteger(recordId)) notFound();

  const db = getDb();
  const row = db
    .select()
    .from(examRecords)
    .where(eq(examRecords.id, recordId))
    .get();
  if (!row) notFound();

  const paper = db
    .select()
    .from(papers)
    .where(eq(papers.examId, row.examId))
    .get();
  if (!paper) notFound();

  const sheet = row.answerSheetJson as AnswerSheetJson;
  const answers = (paper.answersJson ?? {}) as AnswersJson;
  const isWriting = paper.subject === "writing";

  /* 客观卷:按 Part 分组 */
  const entries = Object.values(sheet).filter(
    (e): e is ObjectiveSheetEntry => e.type !== "WRITING_TASK",
  );
  entries.sort((a, b) => a.number - b.number);
  const byPart = new Map<number, ObjectiveSheetEntry[]>();
  for (const e of entries) {
    const list = byPart.get(e.part) ?? [];
    list.push(e);
    byPart.set(e.part, list);
  }
  const wrongCount = entries.filter((e) => !e.correct).length;

  /* 写作卷:取 T1/T2 */
  const writingTasks = Object.values(sheet).filter(
    (e): e is WritingSheetEntry => e.type === "WRITING_TASK",
  );
  writingTasks.sort((a, b) => (a.task === "T1" ? -1 : b.task === "T1" ? 1 : 0));

  const jumpHref = (anchor: string) =>
    `/exam/${row.examId}?jump=${encodeURIComponent(anchor)}&record=${row.id}`;

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← 返回仪表盘
        </Link>
      </div>

      <h2 className="text-xl">{paper.title} · 成绩单</h2>
      <p className="mb-5 text-[13px] text-[#5b6574]">
        {SUBJECT_LABEL[row.subject] ?? row.subject} · 交卷于 {fmtTime(row.submittedAt)}
      </p>

      {/* 成绩摘要 */}
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-[#dfe4ec] bg-white p-5 text-center">
          <div className="text-[30px] font-bold text-[#1a6feb]">
            {row.bandScore ?? "—"}
          </div>
          <div className="mt-1 text-xs text-[#5b6574]">Band 分数</div>
        </div>
        {!isWriting && (
          <>
            <div className="rounded-xl border border-[#dfe4ec] bg-white p-5 text-center">
              <div className="text-[30px] font-bold text-[#1c2330]">
                {row.correctCount ?? "—"}/40
              </div>
              <div className="mt-1 text-xs text-[#5b6574]">答对题数</div>
            </div>
            <div className="rounded-xl border border-[#dfe4ec] bg-white p-5 text-center">
              <div className="text-[30px] font-bold text-[#e05252]">{wrongCount}</div>
              <div className="mt-1 text-xs text-[#5b6574]">错题 / 未答</div>
            </div>
          </>
        )}
        {isWriting && <div className="hidden sm:block" />}
        {isWriting && (
          <div className="rounded-xl border border-[#dfe4ec] bg-white p-5 text-center">
            <div className="text-[30px] font-bold text-[#1c2330]">
              {writingTasks.some((t) => t.value) ? "AI" : "—"}
            </div>
            <div className="mt-1 text-xs text-[#5b6574]">四维批改</div>
          </div>
        )}
        <div className="rounded-xl border border-[#dfe4ec] bg-white p-5 text-center">
          <div className="text-[30px] font-bold text-[#1c2330]">
            {fmtDuration(row.usedSec)}
          </div>
          <div className="mt-1 text-xs text-[#5b6574]">用时</div>
        </div>
      </div>

      {/* 客观卷逐题明细 */}
      {!isWriting && (
        <div className="rounded-xl border border-[#dfe4ec] bg-white">
          <div className="border-b border-[#dfe4ec] px-4 py-3 text-[15px] font-medium">
            逐题明细 · 点击题号跳回真题
          </div>
          {[...byPart.entries()]
            .sort((a, b) => a[0] - b[0])
            .map(([part, list]) => (
              <div key={part}>
                <div className="bg-[#f7f9fc] px-4 py-2 text-xs font-medium text-[#5b6574]">
                  Part {part}
                </div>
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr className="border-b border-[#dfe4ec] text-left text-xs text-[#5b6574]">
                      <th className="px-2.5 py-2 font-medium">题号</th>
                      <th className="px-2.5 py-2 font-medium">结果</th>
                      <th className="px-2.5 py-2 font-medium">你的作答</th>
                      <th className="px-2.5 py-2 font-medium">标准答案</th>
                      <th className="px-2.5 py-2 font-medium">得分</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((e) => {
                      const anchor = `q-${e.number}`;
                      const std = answers[anchor] ?? "—";
                      return (
                        <tr
                          key={anchor}
                          className={`border-b border-[#dfe4ec] last:border-0 ${
                            e.correct ? "" : "bg-[#fdf3f3]"
                          }`}
                        >
                          <td className="px-2.5 py-2">
                            <Link
                              href={jumpHref(anchor)}
                              className="font-medium text-[#1a6feb] hover:underline"
                            >
                              Q{e.number}
                            </Link>
                          </td>
                          <td className="px-2.5 py-2">
                            {e.correct ? (
                              <span className="text-[#18925c]">✓ 正确</span>
                            ) : e.value ? (
                              <span className="text-[#e05252]">✗ 错误</span>
                            ) : (
                              <span className="text-[#8a93a2]">— 未答</span>
                            )}
                          </td>
                          <td className="px-2.5 py-2">{fmtValue(e.value)}</td>
                          <td className="px-2.5 py-2">{std}</td>
                          <td className="px-2.5 py-2">{e.points}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
        </div>
      )}

      {/* 写作卷:AI 四维批改卡(P5)+ 任务全文 */}
      {isWriting && (
        <>
          <WritingGradingCard
            initial={
              getGradingStatus(row.id) ?? {
                recordId: row.id,
                subject: row.subject,
                bandScore: row.bandScore,
                T1: null,
                T2: null,
                sessionId: row.sessionId,
                running: false,
                done: false,
              }
            }
            essays={extractEssayPresence(writingTasks)}
          />

          <div className="mt-6 rounded-xl border border-[#dfe4ec] bg-white">
            <div className="border-b border-[#dfe4ec] px-4 py-3 text-[15px] font-medium">
              作文全文
            </div>
            {writingTasks.map((t) => (
              <div key={t.task} className="border-b border-[#dfe4ec] px-4 py-4 last:border-0">
                <div className="mb-2 text-xs font-medium text-[#5b6574]">
                  Task {t.task === "T1" ? "1" : "2"}
                  {t.value ? ` · ${t.value.length} 字符` : " · 未作答"}
                </div>
                {t.value ? (
                  <pre className="max-h-[360px] overflow-auto rounded-lg bg-[#f7f9fc] p-3 text-[13px] leading-relaxed whitespace-pre-wrap">
                    {t.value}
                  </pre>
                ) : (
                  <div className="text-xs text-[#8a93a2]">未提交内容</div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
