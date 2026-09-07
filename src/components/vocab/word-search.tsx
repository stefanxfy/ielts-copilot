/**
 * word-search.tsx — 背单词页搜词框(下拉联想版 v2)
 *
 * 输入即联想(200ms 防抖,接口 /api/vocab-lookup?q=,纯查询):
 *   下拉列出候选词 + 计划状态徽标(已加入背词计划 / 未加入背词计划 / 已暂停);
 *   点选候选:
 *     已加入计划 → onJumpToWord(wordId) —— 父组件 focus 重拉队列,该词置顶为当前卡,
 *                  即「现在就背这个词」;
 *     未加入计划 → 确认弹窗「是否加入背词计划」→ 是:POST /api/vocab-study-plan(幂等)
 *                  + onJumpToWord;否:不动;
 *     已暂停     → toast 引导去词书页恢复。
 *   输入无匹配 → 下拉显示「词库中没有找到」空态。
 *
 * 主题铁律:全部语义 token,无写死色值、无 dark: 变体。
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/* ---------------- 类型(对齐 /api/vocab-lookup) ---------------- */

interface SuggestItem {
  wordId: number;
  word: string;
  phoneticUk: string | null;
  meaning: string | null;
  inPlan: boolean;
  paused: boolean;
}

/* ================= 主组件 ================= */

export function WordSearchBox(props: { onJumpToWord: (wordId: number) => void }) {
  const [text, setText] = useState("");
  const [items, setItems] = useState<SuggestItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  /** 确认弹窗目标(未入计划的候选) */
  const [pending, setPending] = useState<SuggestItem | null>(null);
  const [adding, setAdding] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  /** 联想请求序号:过期响应丢弃 */
  const seqRef = useRef(0);

  function onInputChange(v: string) {
    setText(v);
    const q = v.trim().toLowerCase();
    if (!q) {
      // 事件回调内 setState,规避 set-state-in-effect
      seqRef.current += 1;
      setItems([]);
      setOpen(false);
      setLoading(false);
    } else {
      setLoading(true);
    }
  }

  /* 输入防抖联想(200ms;setState 全部在异步回调内) */
  useEffect(() => {
    const q = text.trim().toLowerCase();
    if (!q) return;
    const seq = ++seqRef.current;
    const t = window.setTimeout(async () => {
      try {
        const resp = await fetch(`/api/vocab-lookup?q=${encodeURIComponent(q)}`, {
          cache: "no-store",
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const d = (await resp.json()) as { items: SuggestItem[] };
        if (seqRef.current !== seq) return; // 过期响应丢弃
        setItems(d.items);
        setOpen(true);
      } catch {
        if (seqRef.current !== seq) return;
        setItems([]);
        setOpen(false);
      } finally {
        if (seqRef.current === seq) setLoading(false);
      }
    }, 200);
    return () => window.clearTimeout(t);
  }, [text]);

  /* 点击外部收起下拉 */
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const pick = useCallback(
    (it: SuggestItem) => {
      setOpen(false);
      if (it.paused) {
        toast.info(`「${it.word}」已暂停调度,请到词书页恢复后再背`);
        return;
      }
      if (it.inPlan) {
        props.onJumpToWord(it.wordId); // 计划内:直接背这个词
        return;
      }
      setPending(it); // 未入计划:弹确认
    },
    [props],
  );

  /** 确认加入 → 幂等 POST → 立即跳到该词卡片 */
  async function addToPlanAndStudy() {
    if (!pending || adding) return;
    setAdding(true);
    try {
      const resp = await fetch("/api/vocab-study-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wordIds: [pending.wordId] }),
      });
      if (!resp.ok) {
        const d = (await resp.json().catch(() => null)) as { error?: string } | null;
        toast.error(d?.error ?? "加入背词计划失败");
        return;
      }
      toast.success(`「${pending.word}」已加入背词计划,开始背诵`);
      const wordId = pending.wordId;
      setPending(null);
      setText("");
      setItems([]);
      props.onJumpToWord(wordId);
    } catch {
      toast.error("网络错误,请重试");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div ref={wrapRef} className="relative w-full max-w-[400px]">
      <input
        className="w-full rounded-full border border-border bg-card px-4 py-1.5 text-[13px] outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25"
        placeholder="输入单词,下拉选择立即背诵…"
        value={text}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-label="搜索单词"
        onChange={(e) => onInputChange(e.target.value)}
        onFocus={() => {
          if (items.length > 0) setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (items[0]) pick(items[0]); // 回车 = 选第一条候选
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />

      {/* 下拉候选 */}
      {open && (
        <ul className="absolute left-0 right-0 top-[calc(100%+4px)] z-40 max-h-[280px] overflow-y-auto rounded-xl border border-border bg-card py-1 shadow-lg">
          {items.length === 0 ? (
            <li className="px-4 py-2.5 text-[12.5px] text-muted-foreground">
              {loading ? "搜索中…" : `词库中没有找到「${text.trim()}」`}
            </li>
          ) : (
            items.map((it) => (
              <li key={it.wordId}>
                <button
                  type="button"
                  className="flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-2 text-left transition-colors hover:bg-accent"
                  onClick={() => pick(it)}
                >
                  <span className="flex min-w-0 items-baseline gap-2">
                    <span className="shrink-0 text-[13.5px] font-medium">{it.word}</span>
                    {it.phoneticUk && (
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {it.phoneticUk}
                      </span>
                    )}
                    {it.meaning && (
                      <span className="truncate text-[11.5px] text-muted-foreground">
                        {it.meaning}
                      </span>
                    )}
                  </span>
                  <span
                    className={
                      "shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-medium " +
                      (it.inPlan
                        ? "bg-secondary text-secondary-foreground"
                        : "border border-border text-muted-foreground")
                    }
                  >
                    {it.inPlan ? "已加入背词计划" : "未加入背词计划"}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}

      {/* 未入计划 → 确认加入弹窗 */}
      <Dialog
        open={!!pending}
        onOpenChange={(o) => {
          if (!o) setPending(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>加入背词计划?</DialogTitle>
            <DialogDescription>
              「{pending?.word}」在词库中,但还没有加入背词计划。加入后立即开始背诵这个词。
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className="cursor-pointer rounded-lg border border-border px-4 py-2 text-sm hover:bg-secondary"
              onClick={() => setPending(null)}
            >
              否
            </button>
            <button
              type="button"
              disabled={adding}
              className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void addToPlanAndStudy()}
            >
              {adding ? "加入中…" : "加入并立即背诵"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
