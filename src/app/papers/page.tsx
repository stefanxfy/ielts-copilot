/**
 * /papers — 题库列表(M2 步骤 4)
 * 仪表盘入口已留位(prototype 原型"题库"按钮);M2-4 激活。
 * 渲染:6 卷卡片,显示 category / skill / duration / questionCount;按 A→G 排序;
 * 点入 /papers/[slug](M3 之前仅详情;M3-4 才有 test 机考页)。
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePapers, type PaperSummary } from "@/stores/papers";

export default function PapersPage() {
  const { list, loading, error, load } = usePapers();

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && list.length === 0) {
    return <p className="p-8 text-sm text-muted-foreground">加载题库中…</p>;
  }

  // 按 A / G 分组
  const grouped: Record<string, PaperSummary[]> = { A: [], G: [] };
  for (const p of list) (grouped[p.category] ?? []).push(p);

  return (
    <main className="mx-auto max-w-4xl p-6 pb-16">
      <h1 className="mb-1 text-xl font-semibold">题库</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        已入库卷:{list.length} 份(A 类 {grouped.A.length} · G 类 {grouped.G.length})
        {error && <span className="text-destructive"> · {error}</span>}
      </p>

      {(["A", "G"] as const).map((cat) => (
        <section key={cat} className="mb-8">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            {cat === "A" ? "A 类 · 学术类" : "G 类 · 培训类"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(grouped[cat] ?? []).map((p) => (
              <Card key={p.slug}>
                <CardHeader>
                  <CardTitle className="text-sm">{p.title}</CardTitle>
                  <CardDescription className="text-xs">
                    {p.skill}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-3 text-xs">
                  <div className="text-muted-foreground">
                    {p.questionCount} 题{p.writingTaskCount > 0 ? ` · ${p.writingTaskCount} 写作任务` : ""}
                  </div>
                  <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/papers/${p.slug}`} />}>
                    详情
                  </Button>
                </CardContent>
              </Card>
            ))}
            {(grouped[cat] ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">暂无</p>
            )}
          </div>
        </section>
      ))}
    </main>
  );
}