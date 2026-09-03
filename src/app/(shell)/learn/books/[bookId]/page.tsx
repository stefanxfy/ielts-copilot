"use client";

/**
 * /learn/books/[bookId] — 词表浏览(S2,按书下钻)
 *
 * 左侧词列表(搜索 + 未入选过滤 + 已入选徽标) · 右侧详情面板:
 * 配图预览(点击放大 lightbox;无图词走降级占位) + 音标/发音 + 释义/例句/词根/搭配
 * + 多选「加入背诵计划」(POST /api/vocab-study-plan,幂等)。
 *
 * 布局基线来自 /learn/vocab-demo(P8 演示页),正式化为词表浏览;
 * vocab-demo 在 S4 退役。原型保真约束见 docs/学习中心重构-背单词页面编排规划.md §5。
 *
 * 数据源:
 *   GET  /api/vocab-book?bookId=  词条(每词带 id + inPlan)
 *   POST /api/vocab-study-plan    选词入计划(onConflictDoNothing 幂等)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";

interface WordContent {
  translation: string[];
  definition?: string[];
  examples: { en: string; cn?: string; audio?: string }[];
  root?: string;
  exchange?: string;
  audio?: { word?: string };
  image?: string;
  tags?: string[];
  bncRank?: number;
  frqRank?: number;
  collins?: number;
}

interface WordRow {
  id: number;
  word: string;
  phoneticUk: string | null;
  phoneticUs: string | null;
  contentJson: WordContent;
  origin: string;
  order: number;
  inPlan: boolean;
}

interface BookMeta {
  id: number;
  bookId: string;
  name: string;
  description: string | null;
  source: string;
  wordCount: number;
}

interface BookResp {
  book: BookMeta;
  words: WordRow[];
}

// 单例 <audio>,避免每按钮各起一个实例(沿用 vocab-demo 范式)
function useSingleAudio() {
  const ref = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const a = new Audio();
    a.preload = "none";
    ref.current = a;
    return () => {
      a.pause();
      a.src = "";
      ref.current = null;
    };
  }, []);
  return ref;
}

export default function WordBrowsePage() {
  const { bookId } = useParams<{ bookId: string }>();
  const [data, setData] = useState<BookResp | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [onlyUnplanned, setOnlyUnplanned] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(0);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [nowPlaying, setNowPlaying] = useState<string | null>(null);
  const audioRef = useSingleAudio();

  useEffect(() => {
    let aborted = false;
    setData(null);
    setErr(null);
    fetch(`/api/vocab-book?bookId=${encodeURIComponent(bookId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: BookResp) => {
        if (aborted) return;
        setData(d);
        setSelectedOrder(0);
        setChecked(new Set());
      })
      .catch((e) => !aborted && setErr(String(e.message ?? e)));
    return () => {
      aborted = true;
    };
  }, [bookId]);

  // Esc 关闭大图预览
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = filter.trim().toLowerCase();
    return data.words.filter((w) => {
      if (onlyUnplanned && w.inPlan) return false;
      if (!q) return true;
      return (
        w.word.includes(q) ||
        w.contentJson.translation.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [data, filter, onlyUnplanned]);

  const selected = data?.words[selectedOrder] ?? null;

  const play = useCallback(
    (src: string, label: string) => {
      if (!audioRef.current) return;
      const a = audioRef.current;
      a.src = src;
      a.currentTime = 0;
      setNowPlaying(label);
      a.play().catch((e) => {
        if (e?.name === "NotAllowedError") {
          setNowPlaying(null);
          return;
        }
        setNowPlaying(`播放失败:${e.message ?? e}`);
      });
      a.onended = () => setNowPlaying((p) => (p === label ? null : p));
      a.onerror = () => setNowPlaying(`加载失败:${src}`);
    },
    [audioRef],
  );

  function toggleCheck(id: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function addToPlan(ids: number[]) {
    if (ids.length === 0) return;
    setSubmitting(true);
    try {
      const resp = await fetch("/api/vocab-study-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wordIds: ids }),
      });
      if (resp.ok) {
        const r = (await resp.json()) as { inserted: number; skippedAlready: number };
        setData((prev) =>
          prev
            ? {
                ...prev,
                words: prev.words.map((w) =>
                  ids.includes(w.id) ? { ...w, inPlan: true } : w,
                ),
              }
            : prev,
        );
        setChecked(new Set());
        toast.success(
          r.skippedAlready > 0
            ? `已加入计划:新增 ${r.inserted} 词,${r.skippedAlready} 词已在计划中`
            : `已把 ${r.inserted} 词加入背诵计划`,
        );
      } else {
        toast.error("加入计划失败");
      }
    } catch {
      toast.error("网络错误");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* 面包屑 + 标题 */}
      <header className="flex items-baseline justify-between gap-3">
        <div>
          <div className="text-[12px] text-muted-foreground">
            <Link href="/learn/books" className="hover:underline">
              单词库
            </Link>
            <span className="px-1.5">/</span>
            <span>{data?.book.name ?? "…"}</span>
          </div>
          <h2 className="mt-1 text-xl">词表浏览 · {data?.book.name ?? "加载中"}</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {data
              ? `${data.book.wordCount} 词 · 已入选计划 ${data.words.filter((w) => w.inPlan).length} 词 · 勾选词条加入背诵计划`
              : "加载中..."}
          </p>
        </div>
      </header>

      {err && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          加载失败:{err}
        </div>
      )}

      {data && (
        <div className="grid gap-4 lg:grid-cols-[320px,1fr]">
          {/* 左:词列表 */}
          <aside className="rounded-xl border border-border bg-card p-3">
            <input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="搜索单词或中文..."
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
            <label className="mt-2 flex cursor-pointer items-center gap-1.5 text-[12px] text-muted-foreground">
              <input
                type="checkbox"
                checked={onlyUnplanned}
                onChange={(e) => setOnlyUnplanned(e.target.checked)}
                className="accent-primary"
              />
              只看未入选
            </label>
            <div className="mt-1 text-[11px] text-muted-foreground">
              共 {filtered.length} / {data.words.length}
            </div>
            <ul
              className="mt-2 max-h-[62vh] overflow-y-auto pr-1"
              role="listbox"
              aria-label="词表"
            >
              {filtered.map((w) => {
                const realIdx = data.words.indexOf(w);
                const isSel = realIdx === selectedOrder;
                return (
                  <li key={w.id} role="option" aria-selected={isSel}>
                    <div
                      onClick={() => setSelectedOrder(realIdx)}
                      className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                        isSel ? "bg-primary/15" : "hover:bg-muted"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked.has(w.id)}
                        onChange={() => toggleCheck(w.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0 accent-primary"
                        aria-label={`选择 ${w.word}`}
                      />
                      <span className="font-semibold">{w.word}</span>
                      <span className="truncate text-[12px] text-muted-foreground">
                        {w.contentJson.translation[0] ?? ""}
                      </span>
                      {w.inPlan && (
                        <span className="ml-auto shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary">
                          已入选
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </aside>

          {/* 右:详情 */}
          <section className="rounded-xl border border-border bg-card p-6">
            {selected && (
              <WordDetail
                row={selected}
                nowPlaying={nowPlaying}
                onPlay={play}
                onPreview={setLightbox}
                onAddPlan={() => void addToPlan([selected.id])}
                submitting={submitting}
              />
            )}
          </section>
        </div>
      )}

      {/* 底部浮动操作条:已勾选待加入计划 */}
      {checked.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border border-border bg-card px-4 py-2 shadow-lg">
          <span className="text-sm">已选 <b>{checked.size}</b> 词</span>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void addToPlan([...checked])}
            className="cursor-pointer rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "加入中…" : "加入背诵计划"}
          </button>
          <button
            type="button"
            onClick={() => setChecked(new Set())}
            className="cursor-pointer text-sm text-muted-foreground hover:text-foreground"
          >
            清空
          </button>
        </div>
      )}

      {/* 大图预览 lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/70 p-8"
          role="dialog"
          aria-label="配图预览(点击关闭)"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="单词配图预览"
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}

function WordDetail({
  row,
  nowPlaying,
  onPlay,
  onPreview,
  onAddPlan,
  submitting,
}: {
  row: WordRow;
  nowPlaying: string | null;
  onPlay: (src: string, label: string) => void;
  onPreview: (src: string) => void;
  onAddPlan: () => void;
  submitting: boolean;
}) {
  const cj = row.contentJson;
  return (
    <article className="space-y-5">
      {/* 配图预览(点击放大;无图降级占位) */}
      {cj.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cj.image}
          alt={`${row.word} 配图`}
          onClick={() => onPreview(cj.image!)}
          className="max-h-64 w-full cursor-zoom-in rounded-lg border border-border bg-muted/30 object-contain"
        />
      ) : (
        <div className="flex h-28 w-full items-center justify-center rounded-lg border border-dashed border-border text-[12px] text-muted-foreground">
          暂无配图 · 学习时该词走听觉 / 语境卡
        </div>
      )}

      {/* 单词 + 音标 + 喇叭 + 计划状态 */}
      <div className="flex flex-wrap items-baseline gap-3">
        <h3 className="text-3xl font-bold tracking-tight">{row.word}</h3>
        {row.phoneticUk && (
          <span className="font-mono text-[14px] text-muted-foreground">
            UK {row.phoneticUk}
          </span>
        )}
        {row.phoneticUs && (
          <span className="font-mono text-[14px] text-muted-foreground">
            US {row.phoneticUs}
          </span>
        )}
        <span className="ml-auto flex items-center gap-2">
          {row.inPlan ? (
            <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[12px] text-primary">
              已入选计划
            </span>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={onAddPlan}
              className="cursor-pointer rounded-full bg-primary px-2.5 py-1 text-[12px] font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              ＋ 加入计划
            </button>
          )}
          {cj.audio?.word && (
            <button
              type="button"
              onClick={() => onPlay(cj.audio!.word!, `单词:${row.word}`)}
              aria-label={`播放单词发音 ${row.word}`}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-sm text-secondary-foreground transition-colors hover:bg-accent"
            >
              <SpeakerIcon />
              单词读音
            </button>
          )}
        </span>
      </div>

      {/* 中文释义 */}
      <div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
          中文释义
        </div>
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">
          {cj.translation.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </div>

      {/* 英文释义 */}
      {cj.definition && cj.definition.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            英文释义
          </div>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">
            {cj.definition.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 词根 / 短语搭配 */}
      {(cj.root || cj.exchange) && (
        <div className="grid gap-2 sm:grid-cols-2">
          {cj.root && (
            <div className="rounded-md border border-border bg-muted/40 p-3 text-[12px]">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                词根
              </div>
              <div className="mt-0.5">{cj.root}</div>
            </div>
          )}
          {cj.exchange && (
            <div className="rounded-md border border-border bg-muted/40 p-3 text-[12px]">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                短语 / 搭配
              </div>
              <div className="mt-0.5">{cj.exchange}</div>
            </div>
          )}
        </div>
      )}

      {/* 例句 */}
      {cj.examples?.length > 0 && (
        <div className="space-y-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            例句
          </div>
          {cj.examples.map((ex, idx) => (
            <div
              key={idx}
              className="rounded-md border border-border bg-background p-3"
            >
              <div className="flex items-start gap-2">
                <p className="flex-1 text-sm leading-relaxed">{ex.en}</p>
                {ex.audio && (
                  <button
                    type="button"
                    onClick={() => onPlay(ex.audio!, `例句${idx + 1}`)}
                    aria-label={`播放例句 ${idx + 1}`}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-secondary px-2 py-1 text-[12px] text-secondary-foreground transition-colors hover:bg-accent"
                  >
                    <SpeakerIcon />
                    朗读
                  </button>
                )}
              </div>
              {ex.cn && (
                <p className="mt-1.5 text-[13px] text-muted-foreground">{ex.cn}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 标签 + 词频 */}
      {(cj.tags?.length || cj.bncRank) && (
        <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
          {cj.tags?.map((t) => (
            <span
              key={t}
              className="rounded-full border border-border px-2 py-0.5"
            >
              {t}
            </span>
          ))}
          {cj.bncRank != null && (
            <span className="rounded-full border border-border px-2 py-0.5">
              BNC #{cj.bncRank}
            </span>
          )}
        </div>
      )}

      {nowPlaying && (
        <div className="rounded-md bg-primary/10 px-3 py-1.5 text-[12px] text-primary">
          ♪ {nowPlaying}
        </div>
      )}
    </article>
  );
}

function SpeakerIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}
