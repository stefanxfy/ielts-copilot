/**
 * /exam/[examId] — 机考页壳(P2)
 *
 * 整页 iframe 加载换皮产物(assets_json.entry,零改造,效果 = 原型 100%);
 * 顶部窄条:返回仪表盘 + 卷标题。交卷上报由静态页内 scoring.js 直发 /api/exam-records。
 */
import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { papers } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ExamPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  const paper = getDb().select().from(papers).where(eq(papers.examId, examId)).get();
  if (!paper) notFound();

  return (
    <main className="flex h-screen flex-col">
      <div className="flex items-center gap-3 border-b px-4 py-2">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← 返回
        </Link>
        <h1 className="text-sm font-medium">{paper.title}</h1>
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
