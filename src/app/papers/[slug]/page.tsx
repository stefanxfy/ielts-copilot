/**
 * /papers/[slug] — 单卷详情页(SSR 直接读 API)
 * 列表页 /papers 仍为客户端 fetch(因为要切 A/G 和 tab 状态);详情页改为 SSR 让首屏
 * 包含完整内容(C 选项要求 prototype paperDetail 风格:返回箭头 + 标题 + 元信息 +
 * 试卷结构 + 评分标准 + 开始考试按钮)。
 */
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { PaperDetail } from "@/stores/papers";

async function fetchPaper(slug: string): Promise<PaperDetail | null> {
  const h = await headers();
  const host = h.get("host") ?? "127.0.0.1:3177";
  const proto = h.get("x-forwarded-proto") ?? "http";
  try {
    const r = await fetch(`${proto}://${host}/api/papers/${encodeURIComponent(slug)}`, {
      cache: "no-store",
    });
    if (!r.ok) return null;
    const data = await r.json();
    return data.paper ?? null;
  } catch {
    return null;
  }
}

export default async function PaperDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const detail = await fetchPaper(slug);
  if (!detail) notFound();

  const minutes = Math.round(detail.durationSec / 60);

  return (
    <main className="mx-auto max-w-2xl p-6 pb-16">
      <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/papers" />} className="mb-3">
        ← 题库
      </Button>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{detail.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {detail.category === "A" ? "A 类 · 学术类" : "G 类 · 培训类"} · {detail.skill} ·{" "}
            {minutes} 分钟
          </p>
        </div>
        <Button render={<Link href={`/papers/${detail.slug}/test`} />}>开始考试</Button>
      </div>

      {/* 试卷结构(对齐 prototype pdSections 4-card grid,简化为列) */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-sm">试卷结构</CardTitle>
          <CardDescription>
            {detail.sections.length} 节 · {detail.questionCount} 题
            {detail.writingTaskCount > 0 ? ` · ${detail.writingTaskCount} 写作任务` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          {detail.sections.map((s) => (
            <div key={s.sectionNo} className="flex items-center justify-between text-sm">
              <span>
                {s.title ?? `Section ${s.sectionNo}`} ·{" "}
                <span className="text-muted-foreground">{s.sectionType}</span>
              </span>
              <span className="text-muted-foreground">{s.questionCount} 题</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 评分标准 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">评分标准</CardTitle>
          <CardDescription>原始分 → band 换算</CardDescription>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="font-normal">最低原始分</th>
                <th className="font-normal">Band</th>
              </tr>
            </thead>
            <tbody>
              {detail.bandTable.map(([min, band], idx) => (
                <tr key={idx} className="border-t">
                  <td className="py-1">≥ {min}</td>
                  <td className="py-1">{band}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </main>
  );
}
