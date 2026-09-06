/**
 * word-search.tsx — 背单词页搜词框(P8.5)
 *
 * /learn 页顶部的单词搜索入口,三分支(接口 /api/vocab-lookup,纯查询):
 *   词库无此词        → toast「词库中没有找到 xxx」;
 *   在背词计划内      → 直接弹出该词的卡片预览(认词卡同款版式,揭示态 +
 *                        助记辐射层 💡,可发音,不可评分——评分只属于复习队列);
 *   在词库未入计划    → 确认弹窗「是否加入背词计划」→ 确认后 POST
 *                        /api/vocab-study-plan(幂等)→ 成功即弹出卡片预览。
 *
 * 主题铁律:全部语义 token,无写死色值、无 dark: 变体。
 */
"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MnemonicRadial,
  hasMnemonicContent,
  type MnItem,
  type MnSyl,
  type MnMorph,
  type MnDerive,
  type MnContext,
} from "@/components/vocab/mnemonic-radial";

/* ---------------- 类型(对齐 /api/vocab-lookup) ---------------- */

interface WordFace {
  wordId: number;
  word: string;
  phoneticUk: string | null;
  content: {
    translation?: string[];
    definition?: string[];
    examples?: { en: string; cn?: string; audio?: string }[];
    audio?: { word?: string };
    image?: string;
    /* 助记字段(v2.5,可选,缺即降级) */
    syl?: MnSyl;
    morph?: MnMorph;
    derives?: MnDerive[];
    contexts?: MnContext[];
  };
  hasImage: boolean;
}
interface PlanItem extends WordFace {
  progressId: number;
  stage: "recognize" | "spell";
  progressStatus: "ACTIVE" | "IGNORED";
  due: number;
  reps: number;
  lapses: number;
}
type LookupResult =
  | { status: "none" }
  | { status: "plan"; item: PlanItem }
  | { status: "library"; item: WordFace };

/* ---------------- 发音(与 /learn 同款:本地 mp3 优先,speechSynthesis 兜底) ---------------- */

function speakTts(text: string): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 0.92;
  window.speechSynthesis.speak(u);
}
function speakFace(face: WordFace, kind: "word" | "sentence"): void {
  if (kind === "word") {
    const p = face.content.audio?.word;
    if (p) {
      new Audio(p).play().catch(() => speakTts(face.word));
      return;
    }
    speakTts(face.word);
    return;
  }
  const ex = face.content.examples?.[0];
  if (!ex) return;
  if (ex.audio) {
    new Audio(ex.audio).play().catch(() => speakTts(ex.en));
    return;
  }
  speakTts(ex.en);
}

function SpeakerIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
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

/* ================= 主组件 ================= */

export function WordSearchBox() {
  const [text, setText] = useState("");
  const [looking, setLooking] = useState(false);
  const [planItem, setPlanItem] = useState<PlanItem | null>(null);
  const [libItem, setLibItem] = useState<WordFace | null>(null);
  /** 确认加入计划的提交态 */
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function lookup(wordRaw: string): Promise<LookupResult | null> {
    try {
      const resp = await fetch(
        `/api/vocab-lookup?word=${encodeURIComponent(wordRaw)}`,
        { cache: "no-store" },
      );
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return (await resp.json()) as LookupResult;
    } catch {
      toast.error("查询失败,请重试");
      return null;
    }
  }

  async function submit() {
    const w = text.trim();
    if (!w) {
      toast.info("请先输入要查的单词");
      return;
    }
    if (looking) return;
    setLooking(true);
    const r = await lookup(w);
    setLooking(false);
    if (!r) return;
    if (r.status === "none") {
      toast.info(`词库中没有找到「${w}」`);
      return;
    }
    if (r.status === "plan") {
      setPlanItem(r.item);
      return;
    }
    setLibItem(r.item);
  }

  /** 确认加入背词计划 → 幂等 POST → 成功后重新查询展示卡片 */
  async function addToPlan() {
    if (!libItem || adding) return;
    setAdding(true);
    try {
      const resp = await fetch("/api/vocab-study-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wordIds: [libItem.wordId] }),
      });
      if (!resp.ok) {
        const d = (await resp.json().catch(() => null)) as { error?: string } | null;
        toast.error(d?.error ?? "加入背词计划失败");
        return;
      }
      toast.success(`「${libItem.word}」已加入背词计划,立即出现在今日背诵队列里`);
      const w = libItem.word;
      setLibItem(null);
      const r = await lookup(w);
      if (r?.status === "plan") setPlanItem(r.item);
    } catch {
      toast.error("网络错误,请重试");
    } finally {
      setAdding(false);
    }
  }

  return (
    <>
      <div className="flex w-full max-w-[400px] items-center gap-2">
        <input
          ref={inputRef}
          className="min-w-0 flex-1 rounded-full border border-border bg-card px-4 py-1.5 text-[13px] outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25"
          placeholder="搜索单词,查词卡 / 加入背词计划…"
          value={text}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-label="搜索单词"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void submit();
            }
          }}
        />
        <button
          type="button"
          disabled={looking}
          className="shrink-0 cursor-pointer rounded-full border border-border bg-secondary px-3.5 py-1.5 text-[12.5px] font-medium text-secondary-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => void submit()}
        >
          {looking ? "查询中…" : "搜索"}
        </button>
      </div>

      {/* 分支一:在背词计划内 → 卡片预览 */}
      {planItem && (
        <WordCardPreviewDialog
          item={planItem}
          onClose={() => setPlanItem(null)}
        />
      )}

      {/* 分支二:在词库未入计划 → 确认加入 */}
      <Dialog
        open={!!libItem}
        onOpenChange={(o) => {
          if (!o) setLibItem(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>加入背词计划?</DialogTitle>
            <DialogDescription>
              「{libItem?.word}」在词库中,但还没有加入背词计划。加入后将立即进入今日的背诵队列。
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className="cursor-pointer rounded-lg border border-border px-4 py-2 text-sm hover:bg-secondary"
              onClick={() => setLibItem(null)}
            >
              取消
            </button>
            <button
              type="button"
              disabled={adding}
              className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void addToPlan()}
            >
              {adding ? "加入中…" : "加入并查看"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ================= 卡片预览弹窗 ================= */

const STAGE_LABEL = { recognize: "认词阶段", spell: "默写阶段" } as const;

function fmtDue(due: number): string {
  const d = new Date(due);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const hm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return sameDay
    ? `今天 ${hm}`
    : `${d.getMonth() + 1} 月 ${d.getDate()} 日 ${hm}`;
}

function WordCardPreviewDialog(props: { item: PlanItem; onClose: () => void }) {
  const { item } = props;
  /** 助记辐射层开关(预览卡同款 💡 手动展开) */
  const [mnOpen, setMnOpen] = useState(false);
  // 组件随 planItem 条件挂载,关闭即卸载,mnOpen 状态随之销毁,无需复位 effect
  const plain = !item.hasImage;
  const translation = item.content.translation?.join("; ") || "(暂无释义)";
  const example = item.content.examples?.[0];
  const mnItem: MnItem = {
    word: item.word,
    phoneticUk: item.phoneticUk,
    hasImage: item.hasImage,
    content: item.content,
  };

  const wordRow = (
    <span className="recog-word-wrap">
      <span className={`recog-word ${plain ? "recog-word-xl" : ""}`}>{item.word}</span>
      <span className="recog-word-side">
        {item.phoneticUk && <span className="recog-phon">{item.phoneticUk}</span>}
        <button
          type="button"
          className="play-bare"
          title="播放单词发音"
          aria-label={`播放单词发音 ${item.word}`}
          onClick={() => speakFace(item, "word")}
        >
          <SpeakerIcon size={15} />
        </button>
      </span>
    </span>
  );

  return (
    <>
      <Dialog open={!!item} onOpenChange={(o) => !o && props.onClose()}>
        <DialogContent className="p-4 sm:max-w-[440px]">
          <DialogHeader className="sr-only">
            <DialogTitle>{item.word} 词卡预览</DialogTitle>
            <DialogDescription>背词计划内的单词卡片预览</DialogDescription>
          </DialogHeader>

          {/* 计划状态条 */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted-foreground">
            <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">
              在背词计划内
            </span>
            {item.progressStatus === "IGNORED" ? (
              <span>已暂停调度</span>
            ) : (
              <>
                <span>{STAGE_LABEL[item.stage]}</span>
                <span>·</span>
                <span>下次复习 {fmtDue(item.due)}</span>
              </>
            )}
          </div>

          {/* 卡片本体(认词卡揭示态同款版式,只读不可评分) */}
          <div className="flashcard mt-3">
            <div className={`face !min-h-0 ${plain ? "recog-face-plain" : ""}`}>
              {hasMnemonicContent(item.content) && (
                <button
                  type="button"
                  className={"mn-toggle" + (mnOpen ? " mn-toggle-on" : "")}
                  title={mnOpen ? "收起助记" : "打开助记"}
                  aria-label={mnOpen ? "收起助记" : "打开助记"}
                  onClick={() => setMnOpen((v) => !v)}
                >
                  💡
                </button>
              )}
              {!plain && item.content.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="recog-img" src={item.content.image} alt={`${item.word} 配图`} />
              )}
              {plain ? (
                <div className="recog-word-row-main">{wordRow}</div>
              ) : (
                <div className="recog-word-row">{wordRow}</div>
              )}
              <div className={plain ? "recog-bottom" : ""}>
                {example && (
                  <div className="recog-example">
                    <div className="recog-example-text">
                      <p className="recog-example-en">
                        <i>{example.en}</i>
                      </p>
                      {example.cn && <p className="recog-example-cn">{example.cn}</p>}
                    </div>
                    <button
                      type="button"
                      className="play-bare"
                      title="朗读例句"
                      aria-label="朗读例句"
                      onClick={() => speakFace(item, "sentence")}
                    >
                      <SpeakerIcon size={14} />
                    </button>
                  </div>
                )}
                <div className="recog-translation">
                  <div className="recog-translation-label">中文释义</div>
                  <div className="recog-translation-text">{translation}</div>
                </div>
              </div>
            </div>
          </div>

          <p className="mt-2 text-center text-[11.5px] text-muted-foreground">
            预览只读;要给这个词评分,请从今日背诵队列中作答。
          </p>
        </DialogContent>
      </Dialog>

      {/* 助记辐射层(z-index 60 > Dialog 50,直接叠在弹窗上) */}
      <MnemonicRadial
        item={mnItem}
        open={mnOpen}
        onClose={() => setMnOpen(false)}
        onSpeakTts={speakTts}
      />
    </>
  );
}
