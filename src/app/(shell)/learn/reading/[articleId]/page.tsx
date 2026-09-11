/**
 * /learn/reading/[articleId] — 阅读器(P4)
 *
 * 交互口径以 docs/阅读学习原型.html 为准:
 *   - 段落卡:段序号 + 纯文本正文 + 段末「译」按钮(zh=null 段禁用态),点击段内对照展开
 *   - 词库命中:word-hits 命中词波浪线(已在生词本 → 主色实线),点词弹 WordCard
 *   - 进度:IntersectionObserver 定位当前段,离开/切后台/每 30s 节流合并 POST progress;
 *     续读时自动滚动到 lastParagraph;读到末段自动置 COMPLETED(打卡走服务端旁路)
 *   - 本期 audio 恒 null,播放控件整体不渲染(显隐规范)
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReadingParagraph, ReadingSourceRef } from "@/db/schema";
import { normalizeWord, WORD_TOKEN_RE } from "@/lib/reading/text";
import { WordCard } from "@/components/reading/word-card";

interface ArticleDetail {
  articleId: string;
  libraryName: string;
  title: string;
  source: string;
  sourceRef: ReadingSourceRef | null;
  level: string;
  wordCount: number;
  topicTags: string[];
  paragraphs: ReadingParagraph[];
  status: "IN_PROGRESS" | "COMPLETED" | null;
  lastParagraph: number | null;
  readSec: number | null;
}

/** 文本 → 片段数组(plain=普通文本,word=命中词 token) */
type Segment = { kind: "plain"; text: string } | { kind: "word"; text: string };

function segmentize(en: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of en.matchAll(WORD_TOKEN_RE)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ kind: "plain", text: en.slice(last, i) });
    out.push({ kind: "word", text: m[0] });
    last = i + m[0].length;
  }
  if (last < en.length) out.push({ kind: "plain", text: en.slice(last) });
  return out;
}

export default function ReadingArticlePage() {
  const params = useParams<{ articleId: string }>();
  const articleId = params.articleId;

  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [missing, setMissing] = useState(false);
  const [hitMap, setHitMap] = useState<Map<string, boolean> | null>(null);
  const [zhOpen, setZhOpen] = useState<Set<number>>(new Set());
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [done, setDone] = useState(false); // 服务端已确认 COMPLETED

  const currentParaRef = useRef(0);
  const readSecRef = useRef(0);
  const completedRef = useRef(false);
  const paraRefs = useRef<(HTMLElement | null)[]>([]);

  /* ===== 进度上报(节流合并:30s / 切后台 / 离开页面) ===== */
  const flush = useCallback(
    async (extra?: { status?: "IN_PROGRESS" | "COMPLETED" }) => {
      const delta = readSecRef.current;
      readSecRef.current = 0;
      try {
        await fetch(`/api/reading/${articleId}/progress`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          keepalive: true,
          body: JSON.stringify({ lastParagraph: currentParaRef.current, readSecDelta: delta, ...extra }),
        });
        if (extra?.status === "COMPLETED") setDone(true);
      } catch {
        /* 离开页面的上报失败静默 */
      }
    },
    [articleId],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch(`/api/reading/${articleId}`, { cache: "no-store" });
        if (resp.status === 404) {
          if (!cancelled) setMissing(true);
          return;
        }
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const { article: a } = (await resp.json()) as { article: ArticleDetail };
        if (cancelled) return;
        setArticle(a);
        document.title = `${a.title} · 阅读学习`;

        // 词库命中(与正文渲染并行)
        fetch(`/api/reading/${articleId}/word-hits`, { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : null))
          .then((d: { hits: { word: string; inVocab: boolean }[] } | null) => {
            if (d) setHitMap(new Map(d.hits.map((h) => [h.word, h.inVocab])));
          })
          .catch(() => undefined);

        // 续读定位:有进度且不在首段 → 渲染后滚过去
        if (a.lastParagraph && a.lastParagraph > 0) {
          setTimeout(() => {
            paraRefs.current[a.lastParagraph!]?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 120);
        }
      } catch {
        if (!cancelled) setMissing(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [articleId]);

  /* 当前段定位:滚动停止后取视口上缘最近的段(滚动防抖 120ms) */
  useEffect(() => {
    if (!article) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onScroll = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        let best = 0;
        for (let i = 0; i < paraRefs.current.length; i++) {
          const el = paraRefs.current[i];
          if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.4) best = i;
        }
        currentParaRef.current = best;
      }, 120);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (timer) clearTimeout(timer);
    };
  }, [article]);

  /* 阅读计时 + 周期上报 + 页面隐藏/离开兜底 */
  useEffect(() => {
    if (!article) return;
    const tick = setInterval(() => {
      if (document.visibilityState === "visible") readSecRef.current += 1;
    }, 1000);
    const periodic = setInterval(() => {
      if (readSecRef.current >= 30) void flush();
    }, 30_000);
    const onHidden = () => {
      if (document.visibilityState === "hidden" && readSecRef.current > 0) void flush();
    };
    const onPageHide = () => {
      if (readSecRef.current <= 0) return;
      navigator.sendBeacon?.(
        `/api/reading/${articleId}/progress`,
        new Blob(
          [JSON.stringify({ lastParagraph: currentParaRef.current, readSecDelta: readSecRef.current })],
          { type: "application/json" },
        ),
      );
      readSecRef.current = 0;
    };
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      clearInterval(tick);
      clearInterval(periodic);
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", onPageHide);
      void flush(); // 卸载(返回列表)兜底上报
    };
  }, [article, articleId, flush]);

  const toggleZh = (idx: number) => {
    setZhOpen((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  /** 到达末段 → 自动置 COMPLETED(服务端首次转换时打卡) */
  const markCompletedIfLast = (idx: number) => {
    if (!article || completedRef.current) return;
    if (idx >= article.paragraphs.length - 1) {
      completedRef.current = true;
      void flush({ status: "COMPLETED" });
    }
  };

  if (missing) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 text-center">
        <p className="text-muted-foreground">文章不存在或已删除</p>
        <Link href="/learn/reading" className="mt-4 inline-block text-[13px] text-primary hover:underline">
          ← 返回阅读列表
        </Link>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-3 px-4 py-6">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  const { title, sourceRef, level, wordCount, topicTags, paragraphs } = article;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      {/* 顶部:返回 + 出处元信息 */}
      <div className="mb-5">
        <Link href="/learn/reading" className="text-[13px] text-muted-foreground hover:text-foreground">
          ← 阅读学习
        </Link>
        <h1 className="mt-2 text-xl font-bold leading-snug">{title}</h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
          {sourceRef?.paperTitle && <span>{sourceRef.paperTitle}</span>}
          <span className="rounded bg-primary/10 px-1.5 py-0.5 font-semibold text-primary">{level}</span>
          <span>{wordCount} 词</span>
          <span>{paragraphs.length} 段</span>
          {done && <span className="text-primary">· 已读完</span>}
          {topicTags.map((t) => (
            <span key={t} className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* 连续文本流:无段落框,段间留白;「▶ 译」内联在段尾标点后(参考用户截图) */}
      <div className="pb-16">
        {paragraphs.map((p, i) => {
          const zhVisible = zhOpen.has(p.idx);
          return (
            <article
              key={p.idx}
              ref={(el) => {
                paraRefs.current[i] = el;
              }}
              data-idx={p.idx}
              className="mb-6"
            >
              <p className="text-justify text-[15.5px] leading-8 text-foreground/95">
                {segmentize(p.en).map((seg, k) =>
                  seg.kind === "plain" ? (
                    <span key={k}>{seg.text}</span>
                  ) : (
                    <span
                      key={k}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        const w = normalizeWord(seg.text);
                        if (hitMap?.has(w)) {
                          setSelectedWord(w);
                          markCompletedIfLast(i);
                        }
                      }}
                      className={`underline-offset-4 transition-colors ${
                        !hitMap?.has(normalizeWord(seg.text))
                          ? "cursor-text" // 非词库词:不划线不可点
                          : hitMap.get(normalizeWord(seg.text))
                            ? "cursor-pointer font-semibold text-primary underline decoration-primary/70 decoration-2" // 已收生词本:强调色实线
                            : "cursor-pointer underline decoration-wavy decoration-muted-foreground/60 hover:text-primary" // 词库命中:波浪线
                      }`}
                    >
                      {seg.text}
                    </span>
                  ),
                )}
                {/* 段尾「译」:紧跟末尾标点,内联样式 */}
                <button
                  type="button"
                  disabled={!p.zh}
                  onClick={() => toggleZh(p.idx)}
                  className={`press-bubble ml-1.5 inline-block cursor-pointer align-baseline transition-all ${
                    p.zh ? "opacity-70 hover:opacity-100" : "cursor-not-allowed opacity-30"
                  }`}
                  title={p.zh ? undefined : "译文未生成"}
                >
                  <span
                    className={`inline-block rounded-[4px] border px-1 py-px text-[11px] leading-none ${
                      zhVisible
                        ? "border-primary/40 bg-primary/15 font-semibold text-primary"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    译
                  </span>
                </button>
              </p>
              {zhVisible && p.zh && (
                <p className="mt-2 border-l-2 border-primary/30 pl-3 text-[14.5px] leading-7 text-foreground/75">
                  {p.zh}
                </p>
              )}
            </article>
          );
        })}
      </div>

      {selectedWord && (
        <WordCard key={selectedWord} word={selectedWord} articleId={articleId} onClose={() => setSelectedWord(null)} />
      )}
    </div>
  );
}
