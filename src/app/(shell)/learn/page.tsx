"use client";

/**
 * /learn — 背单词复习 session(S3,card-demo 原型高保真移植)
 *
 * 交互定稿(docs/背单词卡片交互设计.md,原型 prototype/vocab/card-demo):
 *   认词卡:图→词→例句→三键评分;认识自动跳词;模糊/不认识展开释义 + 解锁导航;
 *          连续 2 次认识服务端升 spell。
 *   默写卡三型(服务端抽定):视觉(图) / 听觉(大喇叭自动播 1 次) / 语境(例句挖空内联输入);
 *          单行下划线输入仅小写,回车提交;两级提示(1 音标+读音,2 中文释义);
 *          两级用尽变「查看答案」= 放弃记 Again(锁定只能导航);
 *          判对按提示数分 Perfect/Great/Good 音效 + 900ms 自动跳词;
 *          判错全揭示锁输入(距离≤2 记 Hard,>2 记 Again)。
 *   评分折算后 POST /api/vocab-review,stage 状态机与 FSRS 调度在服务端。
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

/* ---------------- 类型(对齐 /api/vocab-review GET) ---------------- */

type SpellCardType = "visual" | "audio" | "ctx";
type ProgressStage = "recognize" | "spell";

interface ExampleItem {
  en: string;
  cn?: string;
  audio?: string;
}
interface WordContent {
  translation?: string[];
  definition?: string[];
  examples?: ExampleItem[];
  root?: string;
  exchange?: string;
  audio?: { word?: string };
  image?: string;
}
interface QueueItem {
  progressId: number;
  wordId: number;
  word: string;
  phoneticUk: string | null;
  stage: ProgressStage;
  spellType?: SpellCardType;
  content: WordContent;
  hasImage: boolean;
  streakNow: number;
  due: number;
}
interface SessionData {
  queue: QueueItem[];
  stats: { total: number; active: number; batch: number; todayReviewed: number };
  prefs: { dailyNewWords: number };
}

/** 默写卡按「卡型:单词」复合键隔离(三型互不污染,原型 spellKey 语义) */
interface SpellCardState {
  hints: number;
  done: boolean;
  result: "good" | "wrong" | null;
  guess: string | null;
  gaveUp: boolean;
  draft: string | null;
}
const freshSpellState: SpellCardState = {
  hints: 0,
  done: false,
  result: null,
  guess: null,
  gaveUp: false,
  draft: null,
};

/* ---------------- 小工具 ---------------- */

function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => [
    i,
    ...Array<number>(n).fill(0),
  ]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
  return dp[m][n];
}

/** 例句挖空:三段式(前/命中/后),命中 word 的规则屈折形式 */
function exampleBlank(word: string, en: string) {
  const re = new RegExp(`${word}\\w*`, "i");
  const m = en.match(re);
  if (!m || m.index === undefined) return null;
  return {
    before: en.slice(0, m.index),
    blank: m[0],
    after: en.slice(m.index + m[0].length),
    answer: m[0],
  };
}

/** 发音:优先本地 mp3(edge-tts),缺文件回退 speechSynthesis */
function speakWord(item: QueueItem): void {
  const p = item.content.audio?.word;
  if (p) {
    const a = new Audio(p);
    a.play().catch(() => speakTts(item.word));
    return;
  }
  speakTts(item.word);
}
function speakSentence(item: QueueItem): void {
  const ex = item.content.examples?.[0];
  if (!ex) return;
  if (ex.audio) {
    const a = new Audio(ex.audio);
    a.play().catch(() => speakTts(ex.en));
    return;
  }
  speakTts(ex.en);
}
function speakTts(text: string): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 0.92;
  window.speechSynthesis.speak(u);
}

/* ---------------- WebAudio 判分音效(原型同款) ---------------- */

let _actx: AudioContext | null = null;
function tone(freq: number, dur: number, delay = 0, type: OscillatorType = "sine", gain = 0.12) {
  try {
    if (typeof window === "undefined") return;
    _actx =
      _actx ??
      new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const t0 = _actx.currentTime + delay;
    const o = _actx.createOscillator();
    const g = _actx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(_actx.destination);
    o.start(t0);
    o.stop(t0 + dur);
  } catch {
    /* 音频不可用则静默 */
  }
}
const sfxPerfect = () => {
  tone(660, 0.12);
  tone(880, 0.14, 0.1);
  tone(1100, 0.22, 0.2);
};
const sfxGreat = () => {
  tone(580, 0.12);
  tone(780, 0.2, 0.1);
};
const sfxGood = () => tone(520, 0.18);
const sfxWrong = () => {
  tone(220, 0.18, 0, "square", 0.07);
  tone(165, 0.26, 0.14, "square", 0.07);
};

/* ---------------- 图标(裸喇叭/方向键,原型同源 SVG) ---------------- */

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
function ChevronIcon({ dir, size = 20 }: { dir: "left" | "right"; size?: number }) {
  const d = dir === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

/* ================= 主组件 ================= */

export default function LearnPage() {
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<SessionData | null>(null);
  const [idx, setIdx] = useState(0);
  const [recogRevealed, setRecogRevealed] = useState(false);
  const [rated, setRated] = useState<Set<number>>(new Set());
  const [spellStates, setSpellStates] = useState<Record<string, SpellCardState>>({});
  const [todayExtra, setTodayExtra] = useState(0);
  const [imgReady, setImgReady] = useState(false);

  const queue = useMemo(() => data?.queue ?? [], [data]);
  const item: QueueItem | undefined = queue[idx];
  const finished = loaded && !err && !!data && !item;

  const spokenRef = useRef<string | null>(null);
  const autoTimerRef = useRef<number | null>(null);
  const idxRef = useRef(0);
  useEffect(() => {
    idxRef.current = idx;
  }, [idx]);

  /* ---- 拉取复习队列(fetch 回调内 setState,规避 set-state-in-effect) ---- */
  useEffect(() => {
    void (async () => {
      try {
        const resp = await fetch("/api/vocab-review");
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const d = (await resp.json()) as SessionData;
        setData(d);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "加载失败");
      } finally {
        setLoaded(true);
      }
    })();
    return () => {
      if (autoTimerRef.current !== null) window.clearTimeout(autoTimerRef.current);
    };
  }, []);

  /* ---- 导航 ---- */
  const spellKeyOf = useCallback(
    (it: QueueItem) => `${it.spellType ?? "audio"}:${it.wordId}`,
    [],
  );
  const canNext = (() => {
    if (!item) return false;
    if (idx + 1 >= queue.length) return false;
    if (item.stage === "recognize") return rated.has(item.wordId);
    const s = spellStates[spellKeyOf(item)];
    return !!s?.done;
  })();

  const advanceFrom = useCallback(
    (fromIdx: number) => {
      setRecogRevealed(false);
      setImgReady(false);
      setIdx((cur) => (cur === fromIdx ? cur + 1 : cur));
    },
    [],
  );

  const tryNav = useCallback(
    (delta: -1 | 1) => {
      const cur = idxRef.current;
      if (delta === -1) {
        if (cur > 0) advanceFrom(cur - 1 >= 0 ? cur - 1 : 0);
        return;
      }
      // 右进:仅当目标存在且当前词已背过(由 canNext 同口径判定)
      const it = queue[cur];
      if (!it || cur + 1 >= queue.length) return;
      const ok =
        it.stage === "recognize"
          ? rated.has(it.wordId)
          : !!spellStates[`${it.spellType ?? "audio"}:${it.wordId}`]?.done;
      if (ok) advanceFrom(cur + 1);
    },
    [queue, rated, spellStates, advanceFrom],
  );

  /* ---- 全局方向键(输入聚焦时不抢) ---- */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.key === "ArrowLeft") tryNav(-1);
      if (e.key === "ArrowRight") tryNav(1);
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [tryNav]);

  /* ---- 评分写回 ---- */
  const postRating = useCallback(
    async (it: QueueItem, cardStage: ProgressStage, rating: 1 | 2 | 3) => {
      try {
        const resp = await fetch("/api/vocab-review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ progressId: it.progressId, stage: cardStage, rating }),
        });
        if (!resp.ok) return;
        const d = (await resp.json()) as { stage: ProgressStage; streakNow: number };
        setData((prev) =>
          prev
            ? {
                ...prev,
                queue: prev.queue.map((q) =>
                  q.progressId === it.progressId
                    ? { ...q, stage: d.stage, streakNow: d.streakNow }
                    : q,
                ),
              }
            : prev,
        );
        setTodayExtra((n) => n + 1);
      } catch {
        /* 单次写回失败不打断节奏;下次 GET 拉到服务端真实状态 */
      }
    },
    [],
  );

  /* ---- 认词卡评分 ---- */
  const rateRecog = useCallback(
    (it: QueueItem, r: "again" | "hard" | "good") => {
      setRated((prev) => new Set(prev).add(it.wordId));
      void postRating(it, "recognize", r === "good" ? 3 : r === "hard" ? 2 : 1);
      if (r === "good") {
        advanceFrom(idxRef.current); // 认识 → 自动跳下一个
        return;
      }
      setRecogRevealed(true); // 模糊/不认识 → 展开中文释义
    },
    [postRating, advanceFrom],
  );

  /* ---- 默写卡:状态更新 ---- */
  const patchSpell = useCallback((key: string, patch: Partial<SpellCardState>) => {
    setSpellStates((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? freshSpellState), ...patch },
    }));
  }, []);

  /* ---- 默写卡:判分 ---- */
  const gradeSpell = useCallback(
    (it: QueueItem, s: SpellCardState, guessRaw: string) => {
      const guess = guessRaw.trim().toLowerCase();
      if (!guess) return;
      const answers = [it.word.toLowerCase()];
      if (it.spellType === "ctx") {
        const en = it.content.examples?.[0]?.en;
        const b = en ? exampleBlank(it.word, en) : null;
        if (b) answers.push(b.answer.toLowerCase());
      }
      const ok = answers.includes(guess);
      const dist = editDistance(guess, it.word.toLowerCase());
      const key = `${it.spellType ?? "audio"}:${it.wordId}`;
      patchSpell(key, { done: true, result: ok ? "good" : "wrong", guess, draft: null });

      if (ok) {
        // 0 提示 perfect / 1 great / ≥2 good;两级用满答对按方案 B 记 Hard
        (s.hints === 0 ? sfxPerfect : s.hints === 1 ? sfxGreat : sfxGood)();
        void postRating(it, "spell", s.hints >= 2 ? 2 : 3);
        const fromIdx = idxRef.current;
        autoTimerRef.current = window.setTimeout(() => {
          if (idxRef.current !== fromIdx) return; // 期间已手动跳词
          advanceFrom(fromIdx);
        }, 900);
      } else {
        sfxWrong();
        void postRating(it, "spell", dist <= 2 ? 2 : 1);
      }
    },
    [patchSpell, postRating, advanceFrom],
  );

  /* ---- 默写卡:提示 / 查看答案 ---- */
  const hintSpell = useCallback(
    (it: QueueItem, s: SpellCardState) => {
      const key = `${it.spellType ?? "audio"}:${it.wordId}`;
      if (s.hints < 2) {
        const hints = s.hints + 1;
        patchSpell(key, { hints });
        if (it.spellType !== "audio" && hints === 1) speakWord(it);
        return;
      }
      // 查看答案 = 不认识:锁定输入,只能导航
      patchSpell(key, { done: true, gaveUp: true, result: "wrong", guess: null, draft: null });
      sfxWrong();
      void postRating(it, "spell", 1);
    },
    [patchSpell, postRating],
  );

  /* ---- 听觉型自动播 1 次(卡型独立标记) ---- */
  useEffect(() => {
    if (!item || item.stage !== "spell" || item.spellType !== "audio") return;
    const key = `${item.spellType}:${item.wordId}`;
    const s = spellStates[key];
    if (s?.done) return;
    const t = window.setTimeout(() => {
      if (spokenRef.current !== key) {
        spokenRef.current = key;
        speakWord(item);
      }
    }, 350);
    return () => window.clearTimeout(t);
  }, [item, spellStates]);

  /* ---- 渲染分流 ---- */
  if (!loaded) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-[13px] text-muted-foreground">加载中…</p>
      </div>
    );
  }
  if (err) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
        加载失败:{err}
      </div>
    );
  }
  if (!data || data.stats.total === 0) {
    // 形态 A:背词计划零选词 → 中央引导去单词库
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <h2 className="text-xl">还没有制定背词计划</h2>
        <p className="max-w-[320px] text-[13px] leading-relaxed text-muted-foreground">
          请先到单词库制定背词计划:选择一本词书,把想背的词加入计划,回来这里就可以开始背单词。
        </p>
        <Link
          href="/learn/books"
          className="press-bubble rounded-full bg-primary px-5 py-2 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          去单词库 →
        </Link>
      </div>
    );
  }
  if (finished) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <h2 className="text-xl">本轮复习完成 🎉</h2>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          共完成 <span className="font-semibold text-foreground">{queue.length}</span>{" "}
          个词 · 今日已复习 <span className="font-semibold text-foreground">{data.stats.todayReviewed + todayExtra}</span> 次
          <br />
          下一批词到期后会出现这里,由 FSRS 按遗忘曲线调度。
        </p>
        <Link
          href="/learn/books"
          className="press-bubble rounded-full border border-border bg-secondary px-5 py-2 text-[13px] font-medium text-secondary-foreground transition-colors hover:bg-accent"
        >
          去词表看看 →
        </Link>
      </div>
    );
  }
  if (!item) return null;

  return (
    <div className="mx-auto flex max-w-[760px] flex-col items-center gap-3">
      {/* 顶部进度两件套 */}
      <div className="flex w-full max-w-[400px] items-center justify-between text-[12px] text-muted-foreground">
        <span>
          {idx + 1} / {queue.length}
        </span>
        <span>
          今日已复习 {data.stats.todayReviewed + todayExtra} 次 · 连续认识{" "}
          <b className="text-primary">{Math.min(item.streakNow, 2)}/2</b>
        </span>
      </div>

      {item.stage === "recognize" ? (
        <RecogCard
          key={`recog-${item.wordId}`}
          item={item}
          plain={!item.hasImage}
          revealed={recogRevealed}
          imgReady={imgReady}
          onImgReady={() => setImgReady(true)}
          onRate={(r) => rateRecog(item, r)}
          canPrev={idx > 0}
          canNext={canNext}
          onNav={(d) => tryNav(d)}
        />
      ) : (
        <DictationCard
          key={`spell-${item.spellType}-${item.wordId}`}
          item={item}
          state={spellStates[spellKeyOf(item)] ?? freshSpellState}
          imgReady={imgReady}
          onImgReady={() => setImgReady(true)}
          onPatch={(patch) => patchSpell(spellKeyOf(item), patch)}
          onHint={() => hintSpell(item, spellStates[spellKeyOf(item)] ?? freshSpellState)}
          onSubmit={(guess) => gradeSpell(item, spellStates[spellKeyOf(item)] ?? freshSpellState, guess)}
          onNavNext={() => tryNav(1)}
          canPrev={idx > 0}
          canNext={canNext}
          onNav={(d) => tryNav(d)}
        />
      )}
    </div>
  );
}

/* ================= 认词卡 ================= */

function RecogCard(props: {
  item: QueueItem;
  plain: boolean;
  revealed: boolean;
  imgReady: boolean;
  onImgReady: () => void;
  onRate: (r: "again" | "hard" | "good") => void;
  canPrev: boolean;
  canNext: boolean;
  onNav: (d: -1 | 1) => void;
}) {
  const { item, plain, revealed } = props;
  const stageRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLElement | null>(null);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const faceRef = useRef<HTMLDivElement>(null);

  const translation =
    item.content.translation?.join("; ") || "(暂无释义)";
  const example = item.content.examples?.[0];

  /* 方向键钉在单词行几何中心 + 无图版单词自适应(原型 fitPlainWord/alignSlideNav) */
  useLayoutEffect(() => {
    const align = () => {
      const stage = stageRef.current;
      const ref = anchorRef.current;
      if (!stage || !ref) return;
      const wr = ref.getBoundingClientRect();
      const sr = stage.getBoundingClientRect();
      const top = wr.top - sr.top + wr.height / 2 - 22;
      if (prevRef.current) prevRef.current.style.top = `${top}px`;
      if (nextRef.current) nextRef.current.style.top = `${top}px`;
    };
    const fitPlain = () => {
      if (!plain) return;
      const face = faceRef.current;
      const wordEl = wordRef.current;
      const wrapEl = wrapRef.current;
      const bottomEl = bottomRef.current;
      if (!face || !wordEl || !wrapEl || !bottomEl) return;
      const avail = face.clientWidth - 36;
      let size = 52;
      wordEl.style.fontSize = `${size}px`;
      while (size > 40 && wordEl.offsetWidth > avail) {
        size -= 1;
        wordEl.style.fontSize = `${size}px`;
      }
      wrapEl.style.transform = "translateY(0)";
      const wr = wrapEl.getBoundingClientRect();
      const br = bottomEl.getBoundingClientRect();
      const overlap = wr.bottom - br.top + 10;
      if (overlap > 0) wrapEl.style.transform = `translateY(${-overlap}px)`;
      align();
    };
    fitPlain();
    align();
    window.addEventListener("resize", fitPlain);
    window.addEventListener("resize", align);
    return () => {
      window.removeEventListener("resize", fitPlain);
      window.removeEventListener("resize", align);
    };
  }, [plain, revealed, props.imgReady, item.wordId]);

  const wordRow = (
    <span
      className={`recog-word-wrap ${plain ? "" : ""}`}
      ref={wrapRef as React.RefObject<HTMLSpanElement>}
    >
      <span className={`recog-word ${plain ? "recog-word-xl" : ""}`} ref={wordRef}>
        {item.word}
      </span>
      <span className="recog-word-side">
        {item.phoneticUk && <span className="recog-phon">{item.phoneticUk}</span>}
        <button
          type="button"
          className="play-bare"
          title="播放单词发音"
          aria-label={`播放单词发音 ${item.word}`}
          onClick={() => speakWord(item)}
        >
          <SpeakerIcon size={15} />
        </button>
      </span>
    </span>
  );

  return (
    <div className="w-full max-w-[400px]">
      <div className="recog-stage" ref={stageRef}>
        <button
          type="button"
          className="slide-nav slide-nav-prev"
          ref={prevRef}
          disabled={!props.canPrev}
          title="上一个单词"
          aria-label="上一个单词"
          onClick={() => props.onNav(-1)}
        >
          <ChevronIcon dir="left" />
        </button>

        <div className="flashcard">
          <div
            className={`face ${plain ? "recog-face-plain" : ""}`}
            ref={faceRef as React.RefObject<HTMLDivElement>}
          >
            {!plain && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="recog-img"
                src={item.content.image}
                alt={`${item.word} 配图`}
                onLoad={props.onImgReady}
              />
            )}

            {plain ? (
              <>
                <div
                  className="recog-word-row-main"
                  ref={(el) => {
                    anchorRef.current = el;
                  }}
                >
                  {wordRow}
                </div>
                <div className="recog-bottom" ref={bottomRef}>
                  <ExampleBlock item={item} example={example} revealed={revealed} translation={translation} />
                </div>
              </>
            ) : (
              <>
                <div
                  className="recog-word-row"
                  ref={(el) => {
                    anchorRef.current = el;
                  }}
                >
                  {wordRow}
                </div>
                <ExampleBlock item={item} example={example} revealed={revealed} translation={translation} />
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          className="slide-nav slide-nav-next"
          ref={nextRef}
          disabled={!props.canNext}
          title="下一个单词(背过当前词后解锁)"
          aria-label="下一个单词"
          onClick={() => props.onNav(1)}
        >
          <ChevronIcon dir="right" />
        </button>
      </div>

      <div className="rate-row rate-below">
        <button type="button" className="rate-btn rate-again" onClick={() => props.onRate("again")}>
          不认识
        </button>
        <button type="button" className="rate-btn rate-hard" onClick={() => props.onRate("hard")}>
          模糊
        </button>
        <button type="button" className="rate-btn rate-good" onClick={() => props.onRate("good")}>
          认识
        </button>
      </div>
    </div>
  );
}

/** 认词卡下半部:例句(揭示中文) + 释义揭示块 */
function ExampleBlock(props: {
  item: QueueItem;
  example?: ExampleItem;
  revealed: boolean;
  translation: string;
}) {
  const { item, example, revealed, translation } = props;
  return (
    <>
      {example && (
        <div className="recog-example">
          <div className="recog-example-text">
            <p className="recog-example-en">
              <i>{example.en}</i>
            </p>
            {revealed && example.cn && <p className="recog-example-cn">{example.cn}</p>}
          </div>
          <button
            type="button"
            className="play-bare"
            title="朗读例句"
            aria-label="朗读例句"
            onClick={() => speakSentence(item)}
          >
            <SpeakerIcon size={14} />
          </button>
        </div>
      )}
      {revealed && (
        <div className="recog-translation">
          <div className="recog-translation-label">中文释义</div>
          <div className="recog-translation-text">{translation}</div>
        </div>
      )}
    </>
  );
}

/* ================= 默写卡(三型共用骨架) ================= */

function DictationCard(props: {
  item: QueueItem;
  state: SpellCardState;
  imgReady: boolean;
  onImgReady: () => void;
  onPatch: (patch: Partial<SpellCardState>) => void;
  onHint: () => void;
  onSubmit: (guess: string) => void;
  onNavNext: () => void;
  canPrev: boolean;
  canNext: boolean;
  onNav: (d: -1 | 1) => void;
}) {
  const { item, s } = { item: props.item, s: props.state };
  const type: SpellCardType =
    item.spellType === "visual" && !item.hasImage
      ? "audio" // 防御:无图词不该出视觉型(服务端已过滤)
      : item.spellType === "ctx" && !(item.content.examples?.[0]?.en && exampleBlank(item.word, item.content.examples[0].en))
        ? "audio"
        : (item.spellType ?? "audio");

  const s0 = s;
  const inputRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLElement | null>(null);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const en = item.content.examples?.[0]?.en;
  const blank = type === "ctx" && en ? exampleBlank(item.word, en) : null;

  /* 方向键对齐(与认词卡同源逻辑) */
  useLayoutEffect(() => {
    const align = () => {
      const stage = stageRef.current;
      const ref = anchorRef.current;
      if (!stage || !ref) return;
      const wr = ref.getBoundingClientRect();
      const sr = stage.getBoundingClientRect();
      const top = wr.top - sr.top + wr.height / 2 - 22;
      if (prevRef.current) prevRef.current.style.top = `${top}px`;
      if (nextRef.current) nextRef.current.style.top = `${top}px`;
    };
    align();
    window.addEventListener("resize", align);
    return () => window.removeEventListener("resize", align);
  }, [props.imgReady, item.wordId, type, s0.hints, s0.done]);

  const level = s.done ? 2 : s.hints;
  const hint1 = (
    <div className="dict-hint dict-hint-1">
      {item.phoneticUk && <span className="recog-phon">{item.phoneticUk}</span>}
      <button
        type="button"
        className="play-bare"
        title="播放单词发音"
        aria-label="播放单词发音"
        onClick={() => speakWord(item)}
      >
        <SpeakerIcon size={15} />
      </button>
    </div>
  );
  const hint2 = (
    <div className="dict-hint dict-hint-2">
      <span className="dict-hint-label">中文释义</span>
      <span className="dict-hint-text">
        {item.content.translation?.join("; ") || "(暂无释义)"}
      </span>
    </div>
  );
  const answerBlock = (
    <div className="dict-answer">
      <span className="dict-answer-label">正确拼写</span>
      <span className="dict-answer-word">{item.word}</span>
    </div>
  );

  /* 输入行展示值:未提交→草稿;判错→用户拼写;查看答案→正确词(语境型回填屈折形式) */
  const displayAnswer = type === "ctx" && blank ? blank.answer : item.word;
  const inputValue = s.done
    ? s.gaveUp
      ? displayAnswer
      : (s.guess ?? "")
    : (s.draft ?? "");
  const inputClass = s.done
    ? s.gaveUp
      ? "revealed"
      : s.result === "good"
        ? "ok"
        : "bad"
    : "";
  const inputWidth = s.done ? `${inputValue.length + 2}ch` : type === "ctx" && blank ? `${blank.answer.length + 2}ch` : undefined;

  /* ---- 刺激区 ---- */
  let stimulus: React.ReactNode;
  if (type === "visual") {
    stimulus = (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="vis-img"
          src={item.content.image}
          alt="视觉提示"
          onLoad={props.onImgReady}
        />
        {level >= 1 && hint1}
        {level >= 2 && hint2}
        {s.done && s.result === "wrong" && !s.gaveUp && answerBlock}
      </>
    );
  } else if (type === "audio") {
    stimulus =
      level >= 1 || s.done ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="vis-img"
            src={item.content.image}
            alt="听觉提示配图"
            onLoad={props.onImgReady}
          />
          {hint1}
        </>
      ) : (
        <button
          type="button"
          className="audio-play"
          title="播放读音"
          aria-label="播放单词读音"
          onClick={() => speakWord(item)}
        >
          <SpeakerIcon size={34} />
        </button>
      );
  } else {
    // 语境型:图居中在上 → 提示居中 → 例句沉底,键入位即挖空处
    stimulus = (
      <>
        {item.hasImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="vis-img ctx-img"
            src={item.content.image}
            alt="语境提示配图"
            onLoad={props.onImgReady}
          />
        )}
        {level >= 1 && hint1}
        {level >= 2 && hint2}
        {blank && (
          <div className="ctx-sentence">
            {blank.before}
            <span className="ctx-blank">
              <input
                ref={inputRef}
                className={`word-line-input ctx-blank-input ${inputClass}`}
                type="text"
                value={inputValue}
                disabled={s.done}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                aria-label="填入单词"
                style={{ width: inputWidth }}
                onChange={(e) => {
                  const v = e.target.value.toLowerCase().replace(/[^a-z]/g, "");
                  props.onPatch({ draft: v });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (s.done) props.onNavNext();
                    else {
                      const g = inputRef.current?.value ?? s.draft ?? "";
                      props.onSubmit(g);
                    }
                  }
                }}
              />
            </span>
            {blank.after}
          </div>
        )}
        {s.done && s.result === "wrong" && !s.gaveUp && (
          <div className="dict-answer ctx-answer">
            <span className="dict-answer-label">正确拼写</span>
            <span className="dict-answer-word">{item.word}</span>
          </div>
        )}
      </>
    );
  }

  const inputArea =
    type === "ctx" ? null : (
      <div className="dict-input-area">
        <input
          ref={inputRef}
          className={`word-line-input ${inputClass}`}
          type="text"
          value={inputValue}
          disabled={s.done}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-label="输入拼写"
          style={{ width: inputWidth }}
          onChange={(e) => {
            const v = e.target.value.toLowerCase().replace(/[^a-z]/g, "");
            props.onPatch({ draft: v });
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (s.done) props.onNavNext();
              else {
                const g = inputRef.current?.value ?? s.draft ?? "";
                props.onSubmit(g);
              }
            }
          }}
        />
      </div>
    );

  return (
    <div className="w-full max-w-[400px]">
      <div className="recog-stage" ref={stageRef}>
        <button
          type="button"
          className="slide-nav slide-nav-prev"
          ref={prevRef}
          disabled={!props.canPrev}
          title="上一个单词"
          aria-label="上一个单词"
          onClick={() => props.onNav(-1)}
        >
          <ChevronIcon dir="left" />
        </button>

        <div className="flashcard">
          <div className="face dictation-face">
            {stimulus}
            {type !== "ctx" && inputArea}
          </div>
        </div>

        <button
          type="button"
          className="slide-nav slide-nav-next"
          ref={nextRef}
          disabled={!props.canNext}
          title="下一个单词(提交本词后解锁)"
          aria-label="下一个单词"
          onClick={() => props.onNav(1)}
        >
          <ChevronIcon dir="right" />
        </button>
      </div>

      {/* 判分徽标(查看答案态不显示,答案已在输入行) */}
      {s.done && !s.gaveUp &&
        (s.result === "good" ? (
          <div className="dict-verdict dict-verdict-ok">
            ✓ {s.hints === 0 ? "Perfect" : s.hints === 1 ? "Great" : "Good"}
          </div>
        ) : (
          <div className="dict-verdict dict-verdict-bad">✗ 再看一眼，下一个词</div>
        ))}

      <div className="dict-actions">
        <button
          type="button"
          className="vocab-btn vocab-btn-ghost"
          disabled={s.done}
          onClick={props.onHint}
        >
          {s.hints >= 2 ? "查看答案" : "提示"}
        </button>
        <button
          type="button"
          className="vocab-btn vocab-btn-primary"
          disabled={s.gaveUp}
          onClick={() => {
            if (s.done) props.onNavNext();
            else {
              const g = inputRef.current?.value ?? s.draft ?? "";
              props.onSubmit(g);
            }
          }}
        >
          {s.done && !s.gaveUp ? "下一个" : "提交"}
        </button>
      </div>
    </div>
  );
}
