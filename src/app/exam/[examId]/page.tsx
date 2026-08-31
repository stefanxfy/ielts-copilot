/**
 * /exam/[examId] — 机考页壳(P2 + P3 跳转增强)
 *
 * 整页 iframe 加载换皮产物(assets_json.entry,零改造,效果 = 原型 100%);
 * 顶部窄条:返回仪表盘 + 卷标题。交卷上报由静态页内 scoring.js 直发 /api/exam-records。
 *
 * P3:?jump=<anchor> 为错题回看模式(成绩页跳入):
 * - ExamJump 向 iframe 发锚点定位指令(卷页滚动到题目并高亮)
 * - ExamGuard 跳转模式不武装(回看不该被离开防护拦)
 */
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { papers } from "@/db/schema";
import { ExamGuard } from "@/components/exam/exam-guard";
import { ExamBackButton } from "@/components/exam/exam-back-button";
import { ExamJump } from "@/components/exam/exam-jump";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ExamPage({
  params,
  searchParams,
}: {
  params: Promise<{ examId: string }>;
  searchParams: Promise<{ jump?: string }>;
}) {
  const { examId } = await params;
  const { jump } = await searchParams;
  const paper = getDb().select().from(papers).where(eq(papers.examId, examId)).get();
  if (!paper) notFound();

  const isReview = Boolean(jump);

  return (
    <main className="flex h-screen flex-col">
      {/* 离开防护:拦截刷新/关闭/后退,iframe 交卷后 postMessage 解除;
          ?jump= 错题回看模式不武装 */}
      {!isReview && <ExamGuard />}
      {isReview && (
        <Suspense fallback={null}>
          <ExamJump />
        </Suspense>
      )}
      <div className="flex items-center gap-3 border-b px-4 py-2">
        <ExamBackButton />
        <h1 className="text-sm font-medium">{paper.title}</h1>
        {isReview && (
          <span className="rounded bg-[#eef4ff] px-2 py-0.5 text-[11px] text-[#1a6feb]">
            错题回看模式
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
