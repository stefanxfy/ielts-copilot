/**
 * /papers/[slug] — 单卷详情页(M2 步骤 4,M3-4 升级为机考页)
 * M2 仅展示卷元 / sections / bandTable + "开始考试"按钮(M3 上线后指向 /papers/[slug]/test)。
 */
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePapers } from "@/stores/papers";

export default function PaperDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const { detail, detailLoading, error, loadDetail } = usePapers();

  useEffect(() => {
    if (slug) void loadDetail(slug);
  }, [slug, loadDetail]);

  if (detailLoading && !detail) {
    return <p className="p-8 text-sm text-muted-foreground">加载详情中…</p>;
  }
  if (!detail) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p className="text-sm text-muted-foreground">
          未找到该卷。{error && <span className="text-destructive"> · {error}</span>}
        </p>
        <Button variant="outline" className="mt-4" render={<Link href="/papers" />}>
          返回题库
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-6 pb-16">
      <Button variant="ghost" size="sm" render={<Link href="/papers" />} className="mb-3">
        ← 题库
      </Button>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{detail.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {detail.category === "A" ? "A 类 · 学术类" : "G 类 · 培训类"} · {detail.skill} ·{" "}
            {Math.round(detail.durationSec / 60)} 分钟
          </p>
        </div>
        <Button disabled title="M3 完成后开放">开始考试</Button>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-sm">试卷结构</CardTitle>
          <CardDescription>{detail.sections.length} 节 · {detail.questionCount} 题</CardDescription>
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