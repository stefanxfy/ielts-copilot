/**
 * src/components/reading/word-card.tsx — 点词弹卡(P4)
 *
 * 词卡四要素(全出自 words.contentJson):音标(英/美) / 释义 / 构词 / 🔊读音;
 * 底部「加入生词本」→ POST /api/reading/[articleId]/vocab(幂等),成功后转已加态。
 * 词库未收录(404)时降级:仅显示词条 + 仍可加入生词本(建 manual 词条)。
 * 播放:优先 contentJson.audio.word 存量 mp3,缺文件回退 speechSynthesis。
 */
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

/** 小喇叭图标(本地内置,避免依赖 vocab 私有组件) */
function SpeakerIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M11 5 6 9H2v6h4l5 4V5Z" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

interface LookupResult {
  word: string;
  phoneticUk: string | null;
  phoneticUs: string | null;
  content: {
    translation?: string[];
    definition?: string[];
    root?: string;
    exchange?: string;
    examples?: { en: string; cn?: string }[];
    audio?: { word?: string };
  } | null;
  inVocab: boolean;
}

function speak(word: string, audioPath?: string) {
  if (audioPath) {
    const a = new Audio(audioPath);
    a.play().catch(() => speakTts(word));
    return;
  }
  speakTts(word);
}

function speakTts(word: string) {
  try {
    const u = new SpeechSynthesisUtterance(word);
    u.lang = "en-GB";
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch {
    /* 无 TTS 环境静默 */
  }
}

export function WordCard({
  word,
  articleId,
  onClose,
}: {
  word: string;
  articleId: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<LookupResult | null>(null);
  const [missing, setMissing] = useState(false);
  const [inVocab, setInVocab] = useState(false);
  const [adding, setAdding] = useState(false);

  // 父组件以 key=word 重挂载本组件;promise 链式取数(setState 在回调内,过 react-hooks lint)
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/words/lookup?word=${encodeURIComponent(word)}`, { cache: "no-store" })
      .then(async (r) => {
        if (r.status === 404) return { notFound: true as const };
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return { notFound: false as const, data: (await r.json()) as LookupResult };
      })
      .then((res) => {
        if (cancelled) return;
        if (res.notFound) setMissing(true);
        else {
          setData(res.data);
          setInVocab(res.data.inVocab);
        }
      })
      .catch(() => {
        if (!cancelled) setMissing(true);
      });
    return () => {
      cancelled = true;
    };
  }, [word]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const add = async () => {
    setAdding(true);
    try {
      const resp = await fetch(`/api/reading/${articleId}/vocab`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ word }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      setInVocab(true);
      toast.success(`「${word}」已加入生词本`);
    } catch {
      toast.error("加入生词本失败,请重试");
    } finally {
      setAdding(false);
    }
  };

  const translation = data?.content?.translation?.filter(Boolean) ?? [];
  const audioPath = data?.content?.audio?.word;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4">
      <div
        role="dialog"
        aria-label={`词条 ${word}`}
        className="w-full max-w-md rounded-2xl border border-border bg-popover p-4 text-popover-foreground shadow-xl"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold">{word}</span>
            {data?.phoneticUk && <span className="text-[13px] text-muted-foreground">UK {data.phoneticUk}</span>}
            {data?.phoneticUs && <span className="text-[13px] text-muted-foreground">US {data.phoneticUs}</span>}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="播放读音"
              onClick={() => speak(word, audioPath)}
              className="press-bubble rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <SpeakerIcon className="size-4" />
            </button>
            <button
              type="button"
              aria-label="关闭词卡"
              onClick={onClose}
              className="press-bubble rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="size-4">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {missing ? (
          <p className="mt-3 text-[13px] text-muted-foreground">词库未收录该词</p>
        ) : !data ? (
          <div className="mt-3 h-12 animate-pulse rounded-lg bg-muted" />
        ) : (
          <div className="mt-3 space-y-2 text-[13px] leading-relaxed">
            {translation.length > 0 && (
              <p className="text-foreground">{translation.join("; ")}</p>
            )}
            {data.content?.definition && data.content.definition.length > 0 && (
              <p className="text-muted-foreground">{data.content.definition.join("; ")}</p>
            )}
            {data.content?.root && (
              <p>
                <span className="font-medium">构词:</span>
                <span className="text-muted-foreground">{data.content.root}</span>
              </p>
            )}
            {data.content?.exchange && (
              <p>
                <span className="font-medium">词形:</span>
                <span className="text-muted-foreground">{data.content.exchange}</span>
              </p>
            )}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          {inVocab ? (
            <span className="rounded-full bg-primary/10 px-3 py-1.5 text-[13px] font-medium text-primary">
              已在生词本
            </span>
          ) : (
            <button
              type="button"
              disabled={adding}
              onClick={add}
              className="press-bubble rounded-full bg-primary px-4 py-1.5 text-[13px] font-medium text-primary-foreground transition-opacity disabled:opacity-60"
            >
              {adding ? "加入中…" : "加入生词本"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
