/**
 * /session/[sessionId] — 完整套卷场次成绩单(P4)
 *
 * 展示一次完整模考(听/读/写三科)的:
 * - 场次状态(进行中/已完成/已放弃)、总分(overall_band)、总用时
 * - 三科成绩明细(听力/阅读/写作,各自 band + 成绩详情链接)
 * - 未交卷的科标注「未完成」
 */
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSessionDetail } from "@/lib/session";
import { getGradingStatus } from "@/lib/grading/service";
import { extractEssayPresence } from "@/lib/writing-sheet";
import WritingGradingCard from "@/components/writing/grading-card";
import type { AnswerSheetJson, WritingSheetEntry } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUBJECT_LABEL: Record<string, string> = {
  listening: "听力",
  reading: "阅读",
  writing: "写作",
  speaking: "口语",
};
const ORDER = ["listening", "reading", "writing"] as const;
const STATUS_TEXT: Record<string, string> = {
  IN_PROGRESS: "进行中",
  COMPLETED: "已完成",
  ABANDONED: "已放弃",
};

function fmtDur(sec: number | null): string {
  if (sec == null) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m} 分 ${s} 秒` : `${s} 秒`;
}

export default async function SessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const detail = getSessionDetail(sessionId);
  if (!detail) notFound();
  const { session, set, records, papers } = detail;

  // 三科顺序展示,附各自 record
  const ordered = ORDER.map((sub) => {
    const paper = papers.find((p) => p.subject === sub);
    const rec = paper ? records.find((r) => r.examId === paper.examId) : null;
    return { subject: sub, paper, record: rec ?? null };
  }).filter((x) => x.paper);

  const submittedCount = ordered.filter((x) => x.record?.status === "SUBMITTED" || x.record?.status === "COMPLETED").length;

  return (
    <div className="mx-auto max-w-[860px] px-5 py-6">
      <div className="mb-5 flex items-center gap-3">
        <Link href="/" className="text-sm text-[#5b6574] hover:text-[#1c2330]">
          ← 返回仪表盘
        </Link>
      </div>

      {/* 场次摘要卡 */}
      <div className="mb-5 rounded-xl border border-[#dfe4ec] bg-white p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-lg font-bold">{set?.title ?? session.examSetId}</h1>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] ${
              session.status === "COMPLETED"
                ? "bg-[#eefaf3] text-[#18925c]"
                : session.status === "ABANDONED"
                  ? "bg-[#fdf1f1] text-[#c0392b]"
                  : "bg-[#fff7e6] text-[#c07d10]"
            }`}
          >
            {STATUS_TEXT[session.status]}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <div className="text-xs text-[#8a93a2]">总分</div>
            <div className="mt-0.5 text-2xl font-bold text-[#1a6feb]">
              {session.overallBand != null ? session.overallBand.toFixed(1) : "—"}
            </div>
          </div>
          <div>
            <div className="text-xs text-[#8a93a2]">已完成科目</div>
            <div className="mt-0.5 text-2xl font-bold">{submittedCount} / {ordered.length}</div>
          </div>
          <div>
            <div className="text-xs text-[#8a93a2]">总用时</div>
            <div className="mt-0.5 text-2xl font-bold">{fmtDur(session.totalUsedSec)}</div>
          </div>
          <div>
            <div className="text-xs text-[#8a93a2]">场次</div>
            <div className="mt-0.5 truncate text-sm font-medium">{session.sessionId}</div>
          </div>
        </div>
      </div>

      {/* 三科成绩明细 */}
      <div className="overflow-hidden rounded-xl border border-[#dfe4ec] bg-white">
        <table className="w-full text-sm">
          <thead className="bg-[#fafbfc] text-left text-xs text-[#8a93a2]">
            <tr>
              <th className="px-4 py-3 font-medium">科目</th>
              <th className="px-4 py-3 font-medium">Band</th>
              <th className="px-4 py-3 font-medium">答对</th>
              <th className="px-4 py-3 font-medium">用时</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {ordered.map(({ subject, paper, record }) => {
              const done = record?.status === "SUBMITTED" || record?.status === "COMPLETED";
              return (
                <tr key={subject} className="border-t border-[#eef0f3]">
                  <td className="px-4 py-3 font-medium">
                    {SUBJECT_LABEL[subject]}
                    <div className="text-xs text-[#8a93a2]">{paper?.title}</div>
                  </td>
                  <td className="px-4 py-3">
                    {done && record?.bandScore != null ? (
                      subject === "writing" ? (
                        /* AI 批改完成后才有真实 band;0 分 = 批改尚未完成,不误导 */
                        <BandCell recordId={record.id} fallback="—" />
                      ) : (
                        <span className="text-base font-bold text-[#1a6feb]">
                          {record.bandScore.toFixed(1)}
                        </span>
                      )
                    ) : (
                      <span className="text-[#8a93a2]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {subject === "writing" ? (
                      <span className="text-xs text-[#8a93a2]">
                        {done ? (record.bandScore ? "已批改" : "待 AI 批改") : "—"}
                      </span>
                    ) : (
                      <span>{done && record?.correctCount != null ? `${record.correctCount} / 40` : "—"}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#5b6574]">
                    {done ? fmtDur(record?.usedSec ?? null) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {done ? (
                      <span className="rounded-full bg-[#eefaf3] px-2 py-0.5 text-[11px] text-[#18925c]">
                        已交卷
                      </span>
                    ) : (
                      <span className="rounded-full border border-[#dfe4ec] px-2 py-0.5 text-[11px] text-[#8a93a2]">
                        未完成
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {done && record ? (
                      <Link
                        href={`/records/${record.id}`}
                        className="text-sm text-[#1a6feb] hover:underline"
                      >
                        成绩详情 →
                      </Link>
                    ) : paper ? (
                      <Link
                        href={`/exam/${paper.examId}?session=${session.sessionId}`}
                        className="text-sm text-[#1a6feb] hover:underline"
                      >
                        继续作答 →
                      </Link>
                    ) : (
                      <span className="text-[#8a93a2]">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 未完成提示 */}
      {session.status === "IN_PROGRESS" && submittedCount < ordered.length && (
        <div className="mt-4 rounded-xl border border-[#fff1d6] bg-[#fffbf2] px-4 py-3 text-sm text-[#8a5a00]">
          本场还有 {ordered.length - submittedCount} 科未完成。总分将在三科交卷后自动汇总。
        </div>
      )}

      {/* 写作 AI 批改(P5):本场已交写作卷时展示,批改完成后总分自动重算 */}
      {session.status === "COMPLETED" &&
        ordered
          .filter((x) => x.subject === "writing" && x.record)
          .map(({ record }) => {
            const sheet = record!.answerSheetJson as AnswerSheetJson | null;
            const tasks = Object.values(sheet ?? {}).filter(
              (e): e is WritingSheetEntry => e?.type === "WRITING_TASK",
            );
            return (
              <div className="mt-6" key={`grading-${record!.id}`}>
                <WritingGradingCard
                  initial={
                    getGradingStatus(record!.id) ?? {
                      recordId: record!.id,
                      subject: "writing" as const,
                      bandScore: record!.bandScore,
                      T1: null,
                      T2: null,
                      sessionId: session.sessionId,
                      running: false,
                      done: false,
                    }
                  }
                  essays={extractEssayPresence(tasks)}
                />
              </div>
            );
          })}
    </div>
  );
}

/** 写作行 Band 单元格:批改完成后显示真实 band,未完成显示占位提示 */
function BandCell({ recordId, fallback }: { recordId: number; fallback: string }) {
  const status = getGradingStatus(recordId);
  if (status?.done && status.bandScore != null && status.bandScore > 0) {
    return (
      <span className="text-base font-bold text-[#1a6feb]">
        {status.bandScore.toFixed(1)}
      </span>
    );
  }
  if (status?.running) {
    return <span className="text-xs text-[#c07d10]">批改中…</span>;
  }
  return <span className="text-xs text-[#8a93a2]">{fallback}</span>;
}
