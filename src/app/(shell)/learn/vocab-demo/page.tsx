"use client";

/**
 * /learn/vocab-demo — 背单词 P8 垂直切片演示页
 *
 * 设计目标:
 *  - 左侧 100 词列表(可搜索过滤,显示音标+中文)
 *  - 右侧详情面板(单词释义/英文释义/例句+例句翻译)
 *  - 单词喇叭 / 例句喇叭 → 触发 HTML5 audio 播放 mp3
 *  - 跟 8 套皮肤主题融合(语义 token 自动跟随)
 *  - 键盘可达:列表项 Enter 选中、详情区喇叭按钮聚焦高亮
 *
 * 数据源:GET /api/vocab-book?bookId=ielts-core-pilot
 *
 * 当前范围:纯演示,不接 SM-2 学习状态(等进度表定稿)。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

interface WordRow {
  word: string;
  phoneticUk: string | null;
  phoneticUs: string | null;
  contentJson: {
    translation: string[];
    definition?: string[];
    examples: { en: string; cn?: string; audio?: string }[];
    root?: string;
    exchange?: string;
    audio?: { word?: string };
    tags?: string[];
    bncRank?: number;
    frqRank?: number;
  };
  origin: string;
  order: number;
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

const BOOK_ID = "ielts-core-pilot";

// 单例 <audio> ref,避免每个按钮各起一个 audio 实例
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

export default function VocabDemoPage() {
  const [data, setData] = useState<BookResp | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(0);
  const [nowPlaying, setNowPlaying] = useState<string | null>(null); // 调试用:显示"正在播放..."
  const audioRef = useSingleAudio();

  useEffect(() => {
    let aborted = false;
    fetch(`/api/vocab-book?bookId=${BOOK_ID}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: BookResp) => {
        if (aborted) return;
        setData(d);
        setSelectedOrder(0);
      })
      .catch((e) => !aborted && setErr(String(e.message ?? e)));
    return () => {
      aborted = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return data.words;
    return data.words.filter(
      (w) =>
        w.word.includes(q) ||
        w.contentJson.translation.some((t) => t.toLowerCase().includes(q)),
    );
  }, [data, filter]);

  const selected = data?.words[selectedOrder] ?? null;

  const play = useCallback(
    (src: string, label: string) => {
      if (!audioRef.current) return;
      const a = audioRef.current;
      a.src = src;
      a.currentTime = 0;
      setNowPlaying(label);
      // Chrome 自动播放策略:程序化测试或页面初次加载时 play() 可能被拒
      // (NotAllowedError);真用户点击按钮则允许。静默忽略策略错误即可。
      a.play().catch((e) => {
        if (e?.name === "NotAllowedError") {
          setNowPlaying(null); // 清掉误导性提示
          return;
        }
        setNowPlaying(`播放失败:${e.message ?? e}`);
      });
      a.onended = () => setNowPlaying((p) => (p === label ? null : p));
      a.onerror = () => setNowPlaying(`加载失败:${src}`);
    },
    [audioRef],
  );

  return (
    <div className="space-y-4">
      {/* 顶部:面包屑 + 标题 */}
      <header className="flex items-baseline justify-between">
        <div>
          <div className="text-[12px] text-muted-foreground">
            <Link href="/learn" className="hover:underline">
              学习中心
            </Link>
            <span className="px-1.5">/</span>
            <span>背单词演示</span>
          </div>
          <h2 className="mt-1 text-xl">P8 垂直切片 · {data?.book.name ?? "加载中"}</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {data
              ? `${data.book.wordCount} 词 · 词源:百词斩 join · 发音:edge-tts(en-GB-Ryan) · 演示数据`
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
            <div className="mt-2 text-[11px] text-muted-foreground">
              共 {filtered.length} / {data.words.length}
            </div>
            <ul
              className="mt-2 max-h-[60vh] overflow-y-auto pr-1"
              role="listbox"
              aria-label="词书列表"
            >
              {filtered.map((w) => {
                const realIdx = data.words.indexOf(w);
                const isSel = realIdx === selectedOrder;
                return (
                  <li key={w.word} role="option" aria-selected={isSel}>
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(realIdx)}
                      className={`flex w-full items-baseline gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                        isSel
                          ? "bg-primary/15 text-primary"
                          : "hover:bg-muted"
                      }`}
                    >
                      <span className="font-semibold">{w.word}</span>
                      <span className="truncate text-[12px] text-muted-foreground">
                        {w.contentJson.translation[0] ?? ""}
                      </span>
                    </button>
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
              />
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function WordDetail({
  row,
  nowPlaying,
  onPlay,
}: {
  row: WordRow;
  nowPlaying: string | null;
  onPlay: (src: string, label: string) => void;
}) {
  const cj = row.contentJson;
  return (
    <article className="space-y-5">
      {/* 单词 + 音标 + 喇叭 */}
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
        {cj.audio?.word && (
          <button
            type="button"
            onClick={() => onPlay(cj.audio!.word!, `单词:${row.word}`)}
            aria-label={`播放单词发音 ${row.word}`}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-sm text-secondary-foreground transition-colors hover:bg-accent"
          >
            <SpeakerIcon />
            单词读音
          </button>
        )}
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