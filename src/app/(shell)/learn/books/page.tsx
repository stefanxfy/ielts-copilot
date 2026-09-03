/**
 * /learn/books — 单词库(#62;原「词库中心」,v1.3 更名迁入资料库下拉)
 *
 * 对齐 prototype/vocab/book-list 原型:
 *   - 封面:生图铺底 + 底部白色渐隐(::after 效果用叠加 div),书名与来源徽章
 *     沉在封面下缘(cover-meta),hover 出操作条(开始学习/重新生成封面/管理/删除)
 *   - 卡体:统计行(词/已学/配图) + 渐变进度条 + 「学习进度 pct%」标签 + gen-line
 *     (配图 X/Y · 音频 已就绪/未合成)
 *   - 导入中任务渲染为 generating 卡(spinner + 阶段文案),完成后刷新即消失
 *   - 无封面字段(words 表不存书封面):封面取该书第一张词配图,退化到通用底图;
 *     「重新生成封面」= 换一张该书词配图(随机种子轮换,无独立封面资产)
 *
 * 数据源:
 *   GET    /api/vocab-book          全部词书汇总 + importing[](进行中导入任务)
 *   DELETE /api/vocab-book?bookId=  删词书(关联 cascade 清,词全局保留)
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CreateBookDialog } from "@/components/vocab/create-book-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface BookSummary {
  bookId: string;
  name: string;
  description: string | null;
  source: string;
  wordCount: number;
  learnedCount: number;
  imageCount: number;
  audioCount: number;
  missingImageCount: number;
  /** 封面:该书第一张词配图 web 路径;无配图书为 null(退化通用底图) */
  coverImage: string | null;
  /** 封面轮换池:书内全部词配图(「重新生成封面」顺移) */
  coverPool: string[];
}

interface ImportingTask {
  taskId: string;
  name: string;
  phaseLabel: string;
  total: number;
  done: number;
}

export default function BookListPage() {
  const [books, setBooks] = useState<BookSummary[] | null>(null);
  const [importing, setImporting] = useState<ImportingTask[]>([]);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<BookSummary | null>(null);
  /** 「重新生成封面」轮换游标:bookId → 已换次数 */
  const [coverShift, setCoverShift] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    try {
      const resp = await fetch("/api/vocab-book", { cache: "no-store" });
      if (resp.ok) {
        const data = (await resp.json()) as { books: BookSummary[]; importing?: ImportingTask[] };
        setBooks(data.books);
        setImporting(data.importing ?? []);
      } else {
        toast.error("词书列表加载失败");
      }
    } catch {
      toast.error("网络错误");
    }
  }, []);

  // 首次加载(fetch 回调里 setState,不直接进 effect 体)
  useEffect(() => {
    let aborted = false;
    fetch("/api/vocab-book", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: { books: BookSummary[]; importing?: ImportingTask[] }) => {
        if (aborted) return;
        setBooks(d.books);
        setImporting(d.importing ?? []);
      })
      .catch(() => toast.error("词书列表加载失败"));
    return () => {
      aborted = true;
    };
  }, []);

  // 有进行中导入任务时轮询,完成即刷(卡片从「导入中」变为正式卡片)
  const importingCount = importing.length;
  useEffect(() => {
    if (importingCount === 0) return;
    const t = setInterval(() => void load(), 2500);
    return () => clearInterval(t);
  }, [importingCount, load]);

  // ?new=1 深链:进页即开新建弹窗(演示/截图用,同原型约定;回调内 setState 过 lint)
  useEffect(() => {
    const t = setTimeout(() => {
      if (new URLSearchParams(window.location.search).has("new")) setCreating(true);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  async function remove() {
    if (!deleting) return;
    try {
      const resp = await fetch(`/api/vocab-book?bookId=${encodeURIComponent(deleting.bookId)}`, { method: "DELETE" });
      if (resp.ok) {
        toast.success(`已删除「${deleting.name}」`);
        setDeleting(null);
        void load();
      } else {
        toast.error("删除失败");
      }
    } catch {
      toast.error("网络错误");
    }
  }

  // 封面:池内按轮换游标顺移;空池退化 null(渐变底图)
  function coverOf(b: BookSummary): string | null {
    const shift = coverShift[b.bookId] ?? 0;
    if (b.coverPool.length === 0) return null;
    return b.coverPool[shift % b.coverPool.length];
  }

  return (
    <>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-[22px] font-bold">我的词库</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            内置 / 自定义词库统一管理 · 点击卡片进入学习 · 卡片 hover 出操作
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="cursor-pointer rounded-[10px] bg-primary px-4.5 py-2.5 text-sm text-primary-foreground transition-all hover:brightness-106"
        >
          ＋ 新建 / 导入词库
        </button>
      </div>

      {books === null ? (
        <div className="py-16 text-center text-sm text-muted-foreground">加载中…</div>
      ) : books.length === 0 && importing.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          还没有词库,点右上角「新建 / 导入词库」开始
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4.5">
          {/* 导入中任务卡(同原型 generating 态) */}
          {importing.map((t) => (
            <div key={t.taskId} className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
              <div className="h-[130px] bg-gradient-to-br from-muted to-secondary" />
              <div className="flex flex-col gap-2.5 px-3.5 pb-3.5 pt-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-bold">{t.name}(导入中…)</h3>
                  <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-[3px] text-[11px] font-semibold text-primary">
                    导入中
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-primary">
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                  {t.phaseLabel} {t.done}/{t.total}
                </div>
              </div>
            </div>
          ))}

          {books.map((b) => {
            const pct = b.wordCount > 0 ? Math.round((b.learnedCount / b.wordCount) * 100) : 0;
            const audioReady = b.audioCount >= b.wordCount && b.wordCount > 0;
            const cover = coverOf(b);
            return (
              <div key={b.bookId} className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:border-ring hover:shadow-[0_8px_24px_rgba(0,0,0,0.10)]">
                {/* 封面:图 + 底部渐隐 + 沉底信息(书名 + 来源徽章) */}
                <Link href={`/learn/books/${b.bookId}`} className="relative block h-[130px] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {cover ? (
                    <img src={cover} alt={`${b.name} 封面`} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-muted to-secondary" />
                  )}
                  <div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(180deg, transparent 30%, rgba(255,255,255,0.92) 96%)" }}
                  />
                  <div className="absolute inset-x-3.5 bottom-2 z-1 flex items-end justify-between gap-2">
                    <h3 className="m-0 text-base font-bold">{b.name}</h3>
                    {b.source === "builtin" ? (
                      <span className="shrink-0 rounded-full border border-primary/30 bg-secondary px-2.5 py-[3px] text-[11px] font-semibold text-secondary-foreground">内置</span>
                    ) : (
                      <span className="shrink-0 rounded-full border border-border bg-muted px-2.5 py-[3px] text-[11px] font-semibold text-muted-foreground">自定义</span>
                    )}
                  </div>
                </Link>

                {/* 卡体:统计行 + 进度条 + gen-line */}
                <div className="flex flex-1 flex-col gap-2.5 px-3.5 pb-3.5 pt-3">
                  <div className="flex gap-3.5 text-[12.5px] text-muted-foreground">
                    <span>
                      <b className="font-bold text-foreground">{b.wordCount}</b> 词
                    </span>
                    <span>
                      已学 <b className="font-bold text-foreground">{b.learnedCount}</b>
                    </span>
                    <span>
                      配图 <b className="font-bold text-foreground">{b.imageCount}</b>
                    </span>
                  </div>

                  <div className="h-[7px] w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--warning), var(--primary))" }}
                    />
                  </div>
                  <div className="flex justify-between text-[11.5px] text-muted-foreground">
                    <span>学习进度</span>
                    <span>{pct}%</span>
                  </div>

                  {/* gen-line:对齐原型「配图 X/Y · 音频 已就绪/未合成」 */}
                  <div className={`flex items-center gap-1.5 text-xs ${audioReady ? "text-muted-foreground" : "text-warning"}`}>
                    配图 {b.imageCount}/{b.wordCount} · 音频 {audioReady ? "已就绪" : "未合成"}
                  </div>
                  {b.description && <p className="m-0 line-clamp-1 text-[11px] text-muted-foreground">{b.description}</p>}
                </div>

                {/* hover 操作条(原型:开始学习/重新生成封面/管理/删除) */}
                <div className="flex gap-1.5 px-3.5 pb-3 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  <Link
                    href="/learn"
                    className="cursor-pointer rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground transition-all hover:border-ring hover:bg-secondary hover:text-secondary-foreground"
                  >
                    开始学习
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      if (b.coverPool.length === 0) {
                        toast.info("该书暂无词配图,导入时选「核心词生图」后即有封面");
                        return;
                      }
                      setCoverShift((m) => ({ ...m, [b.bookId]: (m[b.bookId] ?? 0) + 1 }));
                      toast.success("已切换封面图");
                    }}
                    className="cursor-pointer rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground transition-all hover:border-ring hover:bg-secondary hover:text-secondary-foreground"
                  >
                    重新生成封面
                  </button>
                  <Link
                    href={`/learn/books/${b.bookId}`}
                    className="cursor-pointer rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground transition-all hover:border-ring hover:bg-secondary hover:text-secondary-foreground"
                  >
                    管理
                  </Link>
                  <button
                    type="button"
                    onClick={() => setDeleting(b)}
                    className="cursor-pointer rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground transition-all hover:border-destructive hover:bg-destructive/5 hover:text-destructive"
                  >
                    删除
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateBookDialog open={creating} onOpenChange={setCreating} onImported={() => void load()} />

      {/* 删除确认 */}
      <Dialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除词库「{deleting?.name}」?</DialogTitle>
            <DialogDescription>
              只删除词书与关联({deleting?.wordCount} 词),词条内容全局保留;学习进度不受影响。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setDeleting(null)}
              className="cursor-pointer rounded-lg border border-border px-4 py-2 text-sm hover:bg-secondary"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => void remove()}
              className="cursor-pointer rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white hover:bg-destructive/90"
            >
              确认删除
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
