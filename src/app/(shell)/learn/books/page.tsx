/**
 * /learn/books — 词库中心(#62)
 *
 * 词书卡片网格(封面 + 来源徽章 + 词数/已学/配图 + 进度条) + 新建/导入弹窗
 * (CreateBookDialog)+ 删除确认。对齐 prototype/vocab/book-list 原型。
 *
 * 数据源:
 *   GET    /api/vocab-book          全部词书汇总
 *   DELETE /api/vocab-book?bookId=  删词书(关联 cascade 清,词全局保留)
 */
"use client";

import { useCallback, useEffect, useState } from "react";
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
}

const CARD = "card-float flex flex-col overflow-hidden rounded-xl border border-border bg-card";

export default function BookListPage() {
  const [books, setBooks] = useState<BookSummary[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<BookSummary | null>(null);

  const load = useCallback(async () => {
    try {
      const resp = await fetch("/api/vocab-book", { cache: "no-store" });
      if (resp.ok) {
        const data = (await resp.json()) as { books: BookSummary[] };
        setBooks(data.books);
      } else {
        toast.error("词书列表加载失败");
      }
    } catch {
      toast.error("网络错误");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // ?new=1 深链:进页即开新建弹窗(演示/截图用,同原型约定)
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("new")) setCreating(true);
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

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl">词库中心</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">单词书管理 · 一行一词导入,其余自动补全</p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="cursor-pointer rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          ＋ 新建 / 导入词库
        </button>
      </div>

      {books === null ? (
        <div className="py-16 text-center text-sm text-muted-foreground">加载中…</div>
      ) : books.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          还没有词库,点右上角「新建 / 导入词库」开始
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((b) => {
            const pct = b.wordCount > 0 ? Math.round((b.learnedCount / b.wordCount) * 100) : 0;
            return (
              <div key={b.bookId} className={CARD}>
                {/* 封面 + 来源徽章 */}
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={b.source === "builtin" ? "/vocab/covers/cover-builtin.png" : "/vocab/covers/cover-custom.png"}
                    alt=""
                    className="aspect-[2.2/1] w-full object-cover"
                  />
                  <span className="absolute top-2 left-2 rounded-full bg-black/45 px-2 py-0.5 text-[10px] text-white backdrop-blur-sm">
                    {b.source === "builtin" ? "内置" : "自定义"}
                  </span>
                  <span className="absolute right-2 bottom-2 rounded-md bg-black/45 px-1.5 py-0.5 text-[10px] text-white backdrop-blur-sm">
                    {b.name}
                  </span>
                </div>

                {/* 统计 */}
                <div className="flex flex-1 flex-col p-3.5">
                  <div className="flex items-baseline gap-3 text-xs text-muted-foreground">
                    <span>
                      <b className="text-sm text-foreground">{b.wordCount}</b> 词
                    </span>
                    <span>
                      已学 <b className="text-sm text-foreground">{b.learnedCount}</b>
                    </span>
                    <span>
                      配图 <b className="text-sm text-foreground">{b.imageCount}</b>
                    </span>
                    <span className="ml-auto">🔊 {b.audioCount}</span>
                  </div>

                  {/* 进度条 */}
                  <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{pct}% 已开始学习</span>
                    <button
                      type="button"
                      onClick={() => setDeleting(b)}
                      className="cursor-pointer text-muted-foreground hover:text-destructive"
                    >
                      删除
                    </button>
                  </div>

                  {b.description && <p className="mt-1.5 line-clamp-1 text-[11px] text-muted-foreground">{b.description}</p>}
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
