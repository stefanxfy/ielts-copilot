/**
 * /learn/reading/libraries/[libraryId] — 阅读库文章管理页
 *
 * 与「阅读学习」列表页(学习视角:继续阅读+筛选)分离,本页是库管理视角:
 *   - 库信息头(名称/描述/统计) + 返回库列表
 *   - 本库文章清单:标题/出处/级别/话题/词数段数/进度 + 行内操作(查看/删除)
 *   - 删除走 DELETE /api/reading/[articleId](进度级联清除),两段式确认防误删
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BookOpenText, Eye, Trash2 } from "lucide-react";

interface LibraryMeta {
  libraryId: string;
  name: string;
  description: string | null;
  source: string;
}

interface ArticleRow {
  articleId: string;
  libraryKey: string;
  title: string;
  source: string;
  sourceRef: { paperTitle?: string } | null;
  level: string;
  wordCount: number;
  topicTags: string[];
  paraCount: number;
  status: "IN_PROGRESS" | "COMPLETED" | null;
  lastParagraph: number | null;
}

export default function LibraryArticlesPage() {
  const { libraryId } = useParams<{ libraryId: string }>();
  const [lib, setLib] = useState<LibraryMeta | null>(null);
  const [rows, setRows] = useState<ArticleRow[] | null>(null);
  /** 两段式删除确认:记录处于「确认中」的文章 id */
  const [confirming, setConfirming] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/reading", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: { libraries: LibraryMeta[]; articles: ArticleRow[] }) => {
        setLib(data.libraries.find((l) => l.libraryId === libraryId) ?? null);
        setRows(data.articles.filter((a) => a.libraryKey === libraryId));
      })
      .catch(() => {
        setLib(null);
        setRows([]);
      });
  }, [libraryId]);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(articleId: string) {
    setDeleting(articleId);
    try {
      const resp = await fetch(`/api/reading/${encodeURIComponent(articleId)}`, { method: "DELETE" });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      setRows((prev) => prev?.filter((a) => a.articleId !== articleId) ?? []);
    } catch {
      // 失败保持行原状,重置确认态
    } finally {
      setDeleting(null);
      setConfirming(null);
    }
  }

  const readCount = (rows ?? []).filter((a) => a.status === "COMPLETED").length;
  const readingCount = (rows ?? []).filter((a) => a.status === "IN_PROGRESS").length;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      {/* 库信息头 */}
      <div className="mb-6">
        <Link
          href="/learn/reading/libraries"
          className="text-[13px] text-muted-foreground hover:text-foreground"
        >
          ← 阅读库
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-xl font-bold">
          <BookOpenText className="size-5 text-primary" />
          {lib ? lib.name : "加载中…"}
        </h1>
        {lib?.description && <p className="mt-1 text-[13px] text-muted-foreground">{lib.description}</p>}
        {rows && (
          <p className="mt-1 text-[12px] text-muted-foreground">
            共 {rows.length} 篇 · 在读 {readingCount} · 读完 {readCount}
          </p>
        )}
      </div>

      {/* 文章管理清单 */}
      {rows === null ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 px-4 py-10 text-center text-[13px] text-muted-foreground">
          这个库还没有文章 ·
          <Link href="/learn/reading/libraries" className="ml-1 text-primary hover:underline">
            去导入
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {rows.map((a, i) => {
            const pct = a.status === "COMPLETED" ? 100 : a.lastParagraph != null ? Math.round(((a.lastParagraph + 1) / a.paraCount) * 100) : 0;
            const busy = deleting === a.articleId;
            return (
              <div
                key={a.articleId}
                className={`flex items-center gap-4 px-4 py-3 transition-colors hover:bg-accent/40 ${
                  i > 0 ? "border-t border-border" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/learn/reading/${a.articleId}`}
                    className="block truncate font-medium hover:text-primary"
                    title={a.title}
                  >
                    {a.title}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] text-muted-foreground">
                    {a.sourceRef?.paperTitle && (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 font-semibold text-primary">
                        {a.sourceRef.paperTitle}
                      </span>
                    )}
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-500">
                      {a.level}
                    </span>
                    {a.topicTags.map((t) => (
                      <span key={t} className="rounded bg-muted px-1.5 py-0.5">
                        {t}
                      </span>
                    ))}
                    <span>
                      {a.wordCount} 词 · {a.paraCount} 段
                    </span>
                    <span>
                      {a.status === "COMPLETED" ? "已读完 ✓" : pct > 0 ? `已读 ${pct}%` : "未开始"}
                    </span>
                  </div>
                </div>

                {/* 行内操作:查看 / 删除(两段确认) */}
                <div className="flex shrink-0 items-center gap-1.5">
                  <Link
                    href={`/learn/reading/${a.articleId}`}
                    className="press-bubble inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[12px] text-muted-foreground transition-all hover:border-primary hover:text-primary"
                    title="打开阅读器"
                  >
                    <Eye className="size-3.5" />
                    查看
                  </Link>
                  {confirming === a.articleId ? (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void remove(a.articleId)}
                        className="press-bubble rounded-full bg-destructive px-3 py-1.5 text-[12px] font-semibold text-destructive-foreground disabled:opacity-60"
                      >
                        {busy ? "删除中…" : "确认删除"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirming(null)}
                        className="rounded-full px-2 py-1.5 text-[12px] text-muted-foreground hover:text-foreground"
                      >
                        取消
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirming(a.articleId)}
                      className="press-bubble inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[12px] text-muted-foreground transition-all hover:border-destructive hover:text-destructive"
                      title="删除文章(进度一并清除)"
                    >
                      <Trash2 className="size-3.5" />
                      删除
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
