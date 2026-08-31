/**
 * /exam/[examId] — 机考页壳(P2 + P3 回看 + P4 连考增强)
 *
 * 整页 iframe 加载换皮产物(assets_json.entry,零改造,效果 = 原型 100%);
 * 顶部窄条:返回仪表盘 + 卷标题。交卷上报由静态页内 scoring.js 直发 /api/exam-records。
 *
 * P3 回看模式:?jump=<anchor>&record=<id> 从成绩页跳入:
 * - 壳层先向 /api/exam-records/<id> 取答题卡,再发给 iframe 回填并 inline 批改
 * - 卷面直接呈现考生作答 + ✓/✗ 标注 + 标准答案,与交卷时刻一致
 * - ExamGuard 不武装(回看不该被离开防护拦)
 *
 * P4 连考模式:?session=<sessionId>&next=<nextExamId|done> 从连考引导页跳入:
 * - ExamSessionLink 注入 sessionId 给 iframe(scoring.js 交卷时归入场次)
 * - 交卷后自动推进到 next 卷;next=done 时跳场次成绩单 /session/[sessionId]
 * - 连考单科同样挂离开防护(单科未交卷离开 = 放弃该科)
 */
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { papers } from "@/db/schema";
import { ExamGuard } from "@/components/exam/exam-guard";
import { ExamBackButton } from "@/components/exam/exam-back-button";
import { ExamJump } from "@/components/exam/exam-jump";
import { ExamSessionLink } from "@/components/exam/exam-session-link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 连考科目顺序 */
const SESSION_ORDER = ["listening", "reading", "writing"] as const;

export default async function ExamPage({
  params,
  searchParams,
}: {
  params: Promise<{ examId: string }>;
  searchParams: Promise<{
    jump?: string;
    record?: string;
    session?: string;
    next?: string;
  }>;
}) {
  const { examId } = await params;
  const { jump, record, session, next } = await searchParams;
  const db = getDb();
  const paper = db.select().from(papers).where(eq(papers.examId, examId)).get();
  if (!paper) notFound();

  const isReview = Boolean(jump || record);
  const reviewRecordId = record ? Number(record) : null;

  // 连考模式:session 存在时,服务端算好下一科卷 id(next 参数覆盖)
  let nextExamId: string | null = null;
  if (session && next !== "done") {
    const siblings = db
      .select({ examId: papers.examId, subject: papers.subject })
      .from(papers)
      .where(eq(papers.examSetId, paper.examSetId))
      .all();
    const curIdx = SESSION_ORDER.indexOf(paper.subject as (typeof SESSION_ORDER)[number]);
    const nextSubject = SESSION_ORDER[curIdx + 1];
    nextExamId = nextSubject
      ? (siblings.find((s) => s.subject === nextSubject)?.examId ?? null)
      : null;
  }
  const isSessionMode = Boolean(session);

  return (
    <main className="flex h-screen flex-col">
      {/* 离开防护:拦截刷新/关闭/后退,iframe 交卷后 postMessage 解除;
          回看模式不武装;连考单科照常武装 */}
      {!isReview && <ExamGuard />}
      {isReview && (
        <Suspense fallback={null}>
          <ExamJump recordId={reviewRecordId} anchor={jump ?? null} />
        </Suspense>
      )}
      {/* 连考编排:注入 sessionId/examId + 交卷推进(确认弹窗 + 丝滑转场) */}
      {isSessionMode && (
        <ExamSessionLink
          sessionId={session!}
          examId={examId}
          nextExamId={nextExamId}
          subject={paper.subject}
        />
      )}
      <div className="flex items-center gap-3 border-b px-4 py-2">
        <ExamBackButton />
        <h1 className="text-sm font-medium">{paper.title}</h1>
        {isReview && (
          <span className="rounded bg-[#eef4ff] px-2 py-0.5 text-[11px] text-[#1a6feb]">
            错题回看模式
          </span>
        )}
        {isSessionMode && (
          <span className="rounded bg-[#eefaf3] px-2 py-0.5 text-[11px] text-[#18925c]">
            全套模考 · {paper.subject === "listening" ? "第 1 科" : paper.subject === "reading" ? "第 2 科" : "第 3 科"} / 3
          </span>
        )}
      </div>
      <iframe
        src={paper.assetsJson.entry}
        title={paper.title}
        // 允许 iframe 内音频自动播放(听力真考模式:autoplay muted 起,play 后解静音;
        // 无此声明浏览器默认拒绝 iframe 内自动播放)
        allow="autoplay"
        className="min-h-0 w-full flex-1 border-0"
      />
    </main>
  );
}
