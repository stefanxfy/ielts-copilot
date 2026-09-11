/**
 * /learn/reading — 阅读学习列表页
 *
 * 对齐 2026-09-11 用户截图版式:
 *   - 顶部筛选条:来源(全部/真题/扩展素材) + 级别(全部/L2-L4)两组 chips
 *   - 「继续阅读」区:IN_PROGRESS 大卡,最多 3 篇,按 lastReadAt 降序
 *   - 「全部文章」区:响应式卡片网格(标题/出处章/级别章/话题章/词数段数/进度)
 * 数据源:GET /api/reading
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpenText } from "lucide-react";

interface LibraryItem {
  libraryId: string;
  name: string;
  description: string | null;
  source: string;
  articleCount: number;
}

interface ArticleItem {
  articleId: string;
  libraryKey: string;
  libraryName?: string;
  title: string;
  source: string;
  sourceRef: { paperTitle?: string; examSetId?: string; passageNo?: number } | null;
  level: string;
  wordCount: number;
  topicTags: string[];
  paraCount: number;
  status: "IN_PROGRESS" | "COMPLETED" | null;
  lastParagraph: number | null;
  readSec: number | null;
  lastReadAt: string | null;
}

/** 来源筛选:真题=past_paper,扩展素材=web/manual */
type SourceFilter = "all" | "past_paper" | "extra";
const LEVELS = ["L2", "L3", "L4"];

function chipCls(active: boolean): string {
  return `press-bubble rounded-full border px-3 py-1.5 text-[13px] transition-all ${
    active
      ? "border-primary/30 bg-primary/15 font-semibold text-primary"
      : "border-border bg-card text-muted-foreground hover:bg-accent"
  }`;
}

function pctOf(a: ArticleItem): number {
  if (a.status === "COMPLETED") return 100;
  if (a.lastParagraph == null) return 0;
  return Math.min(100, Math.round(((a.lastParagraph + 1) / a.paraCount) * 100));
}

/** 距上次阅读的相对时间(如「5 分钟前」「2 天前」) */
function fmtWhen(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "刚刚";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  return `${Math.floor(diff / 86_400_000)} 天前`;
}

/** 出处章短文案:paperTitle 原样(level 章另列) */
function sourceLabel(a: ArticleItem): string | null {
  const t = a.sourceRef?.paperTitle;
  return t && t !== a.title ? t : null;
}

export default function ReadingListPage() {
  const [libraries, setLibraries] = useState<LibraryItem[] | null>(null);
  const [articles, setArticles] = useState<ArticleItem[] | null>(null);
  const [srcFilter, setSrcFilter] = useState<SourceFilter>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  /** 阅读库管理页点卡片跳转时带 ?library=<id> → 隐式限定该库(可点章清除) */
  const [libFilter, setLibFilter] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch("/api/reading", { cache: "no-store" });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = (await resp.json()) as { libraries: LibraryItem[]; articles: ArticleItem[] };
        setLibraries(data.libraries);
        setArticles(data.articles);
        const fromUrl = new URLSearchParams(window.location.search).get("library");
        if (fromUrl) setLibFilter(fromUrl);
      } catch {
        setLibraries([]);
        setArticles([]);
      }
    })();
  }, []);

  const listed = useMemo(() => {
    return (articles ?? []).filter((a) => {
      if (libFilter && a.libraryKey !== libFilter) return false;
      if (srcFilter === "past_paper" && a.source !== "past_paper") return false;
      if (srcFilter === "extra" && a.source === "past_paper") return false;
      if (levelFilter !== "all" && a.level !== levelFilter) return false;
      return true;
    });
  }, [articles, libFilter, srcFilter, levelFilter]);

  /** 继续阅读:进行中,最近优先,最多 3 篇(不受筛选影响,始终全局最近 3 篇) */
  const continueReading = useMemo(
    () =>
      (articles ?? [])
        .filter((a) => a.status === "IN_PROGRESS")
        .sort((a, b) => (b.lastReadAt ?? "").localeCompare(a.lastReadAt ?? ""))
        .slice(0, 3),
    [articles],
  );

  const loading = articles === null;
  const libName = libFilter ? (libraries ?? []).find((l) => l.libraryId === libFilter)?.name ?? libFilter : null;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <header className="mb-5 flex items-end gap-3">
        <div className="flex-1">
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <BookOpenText className="size-5 text-primary" />
            阅读学习
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            真题文章逐段精读 · 段末看译文 · 点词查释义加生词本
          </p>
        </div>
        <Link
          href="/learn/reading/libraries"
          className="press-bubble shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] text-muted-foreground transition-all hover:border-primary hover:text-primary"
        >
          阅读库
        </Link>
      </header>

      {/* 筛选条:来源 + 级别 */}
      <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-border bg-card px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-muted-foreground">来源</span>
          {(
            [
              ["all", "全部"],
              ["past_paper", "真题"],
              ["extra", "扩展素材"],
            ] as const
          ).map(([v, label]) => (
            <button key={v} type="button" onClick={() => setSrcFilter(v)} className={chipCls(srcFilter === v)}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-muted-foreground">级别</span>
          <button type="button" onClick={() => setLevelFilter("all")} className={chipCls(levelFilter === "all")}>
            全部
          </button>
          {LEVELS.map((lv) => (
            <button key={lv} type="button" onClick={() => setLevelFilter(lv)} className={chipCls(levelFilter === lv)}>
              {lv}
            </button>
          ))}
        </div>
      </div>

      {/* 继续阅读:最多 3 篇 */}
      <section className="mb-8">
        {loading ? (
          <div className="h-24 animate-pulse rounded-xl bg-muted" />
        ) : (
          continueReading.length > 0 && (
            <div className="grid gap-3">
              {continueReading.map((a) => {
                const src = sourceLabel(a);
                return (
                  <Link
                    key={a.articleId}
                    href={`/learn/reading/${a.articleId}`}
                    className="block rounded-xl border-2 border-primary/50 bg-card p-4 transition-all hover:border-primary hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="truncate font-semibold">
                        继续阅读 · {a.title}
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        {src && (
                          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                            {src}
                          </span>
                        )}
                        <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-500">
                          {a.level}
                        </span>
                        {a.topicTags.map((t) => (
                          <span key={t} className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                            {t}
                          </span>
                        ))}
                      </span>
                    </div>
                    <div className="mt-1.5 text-[13px] text-muted-foreground">
                      读到第 {(a.lastParagraph ?? 0) + 1} / {a.paraCount} 段
                      {a.lastReadAt ? ` · 上次阅读:${fmtWhen(a.lastReadAt)}` : ""}
                    </div>
                    <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${pctOf(a)}%` }}
                      />
                    </div>
                    <div className="mt-2 text-[13px] font-medium text-primary">续读 →</div>
                  </Link>
                );
              })}
            </div>
          )
        )}
      </section>

      {/* 全部文章 */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-[15px] font-semibold">全部文章</h2>
          {libName && (
            <button
              type="button"
              onClick={() => setLibFilter(null)}
              className="press-bubble inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[12px] font-medium text-primary transition-all hover:bg-primary/20"
              title="清除库限定"
            >
              库:{libName} ✕
            </button>
          )}
          {!loading && <span className="text-[12px] text-muted-foreground">{listed.length} 篇</span>}
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : listed.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 px-4 py-10 text-center text-[13px] text-muted-foreground">
            没有符合筛选条件的文章
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listed.map((a) => {
              const src = sourceLabel(a);
              const pct = pctOf(a);
              return (
                <Link
                  key={a.articleId}
                  href={`/learn/reading/${a.articleId}`}
                  className="flex flex-col rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm"
                >
                  <span className="line-clamp-2 font-semibold leading-snug">{a.title}</span>
                  <span className="mt-2 flex flex-wrap items-center gap-1.5">
                    {src && (
                      <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                        {src}
                      </span>
                    )}
                    <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-500">
                      {a.level}
                    </span>
                    {a.topicTags.map((t) => (
                      <span key={t} className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        {t}
                      </span>
                    ))}
                  </span>
                  <span className="mt-2 text-[12px] text-muted-foreground">
                    {a.wordCount} 词 · {a.paraCount} 段
                  </span>
                  <span className="mt-auto block pt-3">
                    {pct > 0 && (
                      <span className="mb-1.5 block h-1.5 overflow-hidden rounded-full bg-muted">
                        <span
                          className="block h-full rounded-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </span>
                    )}
                    <span className="block text-[12px] text-muted-foreground">
                      {a.status === "COMPLETED" ? (
                        <span className="font-medium text-primary">已读完 ✓</span>
                      ) : pct > 0 ? (
                        `已读 ${pct}%`
                      ) : (
                        "未开始"
                      )}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
