"use client";

/**
 * /learn — 背单词(复习 session 即首页,学习中心 8 卡页已退役)
 * docs/学习中心重构-背单词页面编排规划.md v1.3 §2.2 三形态状态机:
 *   A. 背词计划零选词 → 中央引导「请先到单词库制定背词计划」+「去单词库 →」
 *   B/C. 有选词 → S1 暂放「复习功能即将上线」极简占位(S3 按 card-demo 原型高保真移植:
 *        认词卡 + 默写三型 + vocab-card-policy 选卡型 + FSRS 回写 + 右上角进度两件套)
 * 数据源:GET /api/vocab-study-plan(total=0 即零选词,纯查询无副作用)
 */

import { useEffect, useState } from "react";
import Link from "next/link";

type PlanSummary = { total: number; active: number; dueNow: number };

export default function LearnPage() {
  const [loaded, setLoaded] = useState(false);
  const [plan, setPlan] = useState<PlanSummary | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const resp = await fetch("/api/vocab-study-plan");
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = (await resp.json()) as PlanSummary;
        setPlan(data);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "加载失败");
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  if (!loaded) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-[13px] text-muted-foreground">加载中…</p>
      </div>
    );
  }

  if (err) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
        加载失败:{err}
      </div>
    );
  }

  // 形态 A:背词计划零选词 → 中央引导去单词库
  if (!plan || plan.total === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <h2 className="text-xl">还没有制定背词计划</h2>
        <p className="max-w-[320px] text-[13px] leading-relaxed text-muted-foreground">
          请先到单词库制定背词计划:选择一本词书,把想背的词加入计划,回来这里就可以开始背单词。
        </p>
        <Link
          href="/learn/books"
          className="press-bubble rounded-full bg-primary px-5 py-2 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          去单词库 →
        </Link>
      </div>
    );
  }

  // 形态 B/C:有选词 → S1 极简占位(S3 复习 session 落地后替换)
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <h2 className="text-xl">复习功能即将上线</h2>
      <p className="max-w-[360px] text-[13px] leading-relaxed text-muted-foreground">
        你的背词计划已有 <span className="font-semibold text-foreground">{plan.total}</span>{" "}
        个词(在学 {plan.active}
        {plan.dueNow > 0 && `,今日到期 ${plan.dueNow}`})。
        正式复习(认词卡 + 默写)在下一步开放,届时打开本页即可直接开背。
      </p>
      <Link
        href="/learn/books"
        className="press-bubble rounded-full border border-border bg-secondary px-5 py-2 text-[13px] font-medium text-secondary-foreground transition-colors hover:bg-accent"
      >
        继续去单词库选词 →
      </Link>
    </div>
  );
}
