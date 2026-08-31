/**
 * /papers — 机考模拟主页(C 选项重写)
 *
 * 对齐 prototype view-exam:
 *  1) A/G 类切换(顶部 mod-switch,2 按钮)
 *  2) 子 tab:雅思综合 / 听力 / 阅读 / 写作 / 口语(口语 tab V3 占位)
 *  3) 雅思综合 tab:综合流程条 + 题库树(按 category × skill 分组)+ 套题详情面板
 *  4) 单科 tab(听/阅/作):直接显示该类该科的卷卡(简化,与 prototype examPanel-listening 等价)
 *  5) 口语 tab:V3 占位
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePapers, type PaperSummary } from "@/stores/papers";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const SUB_TABS = [
  { id: "combined", label: "雅思综合" },
  { id: "listening", label: "听力" },
  { id: "reading", label: "阅读" },
  { id: "writing", label: "写作" },
  { id: "speaking", label: "口语" },
] as const;
type SubTabId = (typeof SUB_TABS)[number]["id"];

const SKILL_TO_TAB: Record<string, SubTabId> = {
  LISTENING: "listening",
  READING: "reading",
  WRITING: "writing",
};

export default function PapersPage() {
  const { list, loading, error, load } = usePapers();
  const [mod, setMod] = useState<"A" | "G">("A"); // 学术 / 培训
  const [tab, setTab] = useState<SubTabId>("combined");

  useEffect(() => {
    void load();
  }, [load]);

  // 当前 mod 下的卷
  const modPapers = useMemo(() => list.filter((p) => p.category === mod), [list, mod]);

  // 雅思综合:每个 paper 一套,按 skill 列出(目前每套只有一个主科,综合流程条展示)
  // 按题库原文 prototype,综合页其实是按 A/G × 各套题分组。这里简化为按 category × skill
  // 但"综合"页应该聚合所有同一类卷 → 列卡片

  return (
    <main style={{ maxWidth: 1180, margin: "24px auto", padding: "0 20px 90px" }}>
      {/* A/G 切换器 */}
      <div className="mb-4">
        <div className="mb-2 text-[12px] font-medium text-[var(--ink-3)]">考试类型</div>
        <div className="inline-flex rounded-lg border p-0.5" style={{ borderColor: "var(--line)" }}>
          {(["A", "G"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMod(m)}
              className="rounded-md px-4 py-1.5 text-[13px] transition-colors"
              style={{
                background: mod === m ? "var(--brand)" : "transparent",
                color: mod === m ? "#fff" : "var(--ink-2)",
              }}
            >
              {m === "A" ? "A 类 · 学术类" : "G 类 · 培训类"}
            </button>
          ))}
        </div>
      </div>

      {/* 子 tab */}
      <div
        className="mb-5 flex gap-1 border-b"
        style={{ borderColor: "var(--line)" }}
      >
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className="border-b-2 px-4 py-2 text-[13px] transition-colors"
            style={{
              borderColor: tab === t.id ? "var(--brand)" : "transparent",
              color: tab === t.id ? "var(--brand-deep)" : "var(--ink-2)",
              fontWeight: tab === t.id ? 600 : 400,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && list.length === 0 && (
        <p className="text-sm text-muted-foreground">加载题库中…</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* 综合面板 */}
      {tab === "combined" && (
        <CombinedPanel mod={mod} papers={modPapers} />
      )}

      {/* 单科面板 */}
      {(tab === "listening" || tab === "reading" || tab === "writing") && (
        <SingleSkillPanel mod={mod} skill={tab.toUpperCase()} papers={modPapers} />
      )}

      {/* 口语(V3 占位) */}
      {tab === "speaking" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">口语</CardTitle>
            <CardDescription>V3 提供 · Part 1/2/3 录音 + Whisper 转写 + LLM 三维点评</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-[12px] text-[var(--ink-3)]">
              当前可用:{" "}
              <Link href="/papers" className="text-[var(--brand)] hover:underline">
                机考模拟 →
              </Link>
            </p>
          </CardContent>
        </Card>
      )}
    </main>
  );
}

function CombinedPanel({ mod, papers }: { mod: "A" | "G"; papers: PaperSummary[] }) {
  return (
    <div>
      {/* 综合流程条 */}
      <Card className="mb-4">
        <CardContent>
          <div className="mb-2 text-[13px] font-medium">考试顺序</div>
          <div className="flex flex-wrap items-center gap-1 text-[12px]">
            <Step>听力 · 约30分钟</Step>
            <span className="text-[var(--ink-3)]">→</span>
            <Step>阅读 · 60分钟</Step>
            <span className="text-[var(--ink-3)]">→</span>
            <Step>写作 · 60分钟</Step>
            <span className="text-[var(--ink-3)]">→</span>
            <Step>口语 · 11–14分钟</Step>
          </div>
          <p className="mt-2 text-[12px] text-[var(--ink-3)]">
            当前:<b>{mod === "A" ? "A 类 · 学术类" : "G 类 · 培训类"}</b> ·{" "}
            {papers.length} 套已入库
          </p>
        </CardContent>
      </Card>

      {/* 题库列表(每套一个卡,链到 /papers/[slug]) */}
      <h2 className="mb-3 text-[14px] font-medium text-[var(--ink-2)]">题库</h2>
      {papers.length === 0 ? (
        <p className="text-sm text-[var(--ink-3)]">该类型暂无已入库卷</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {papers.map((p) => (
            <CombinedPaperCard key={p.slug} paper={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function Step({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        background: "var(--brand-bg)",
        color: "var(--brand-deep)",
        borderRadius: 6,
        padding: "4px 10px",
        fontSize: 12,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function CombinedPaperCard({ paper }: { paper: PaperSummary }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <span>{paper.title}</span>
        </CardTitle>
        <CardDescription className="text-xs">
          {paper.skill}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-3 text-xs">
        <div className="text-[var(--ink-3)]">
          {paper.questionCount} 题{paper.writingTaskCount > 0 ? ` · ${paper.writingTaskCount} 写作任务` : ""}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" render={<Link href={`/papers/${paper.slug}`} />}>
            详情
          </Button>
          <Button size="sm" render={<Link href={`/papers/${paper.slug}/test`} />}>
            开始考试
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SingleSkillPanel({
  mod,
  skill,
  papers,
}: {
  mod: "A" | "G";
  skill: string;
  papers: PaperSummary[];
}) {
  const filtered = papers.filter((p) => SKILL_TO_TAB[p.skill] === (skill.toLowerCase() as SubTabId));
  return (
    <div>
      <h2 className="mb-3 text-[14px] font-medium text-[var(--ink-2)]">
        {mod === "A" ? "A 类 · " : "G 类 · "}
        {skill === "LISTENING" ? "听力" : skill === "READING" ? "阅读" : "写作"} 套题
      </h2>
      {filtered.length === 0 ? (
        <p className="text-sm text-[var(--ink-3)]">该科暂无卷</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Card key={p.slug}>
              <CardHeader>
                <CardTitle className="text-sm">{p.title}</CardTitle>
                <CardDescription className="text-xs">{p.skill}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-3 text-xs">
                <div className="text-[var(--ink-3)]">
                  {p.questionCount} 题{p.writingTaskCount > 0 ? ` · ${p.writingTaskCount} 写作任务` : ""}
                </div>
                <Button size="sm" variant="outline" render={<Link href={`/papers/${p.slug}`} />}>
                  详情
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}