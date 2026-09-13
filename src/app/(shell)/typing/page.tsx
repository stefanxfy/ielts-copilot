/**
 * /typing — 打字练习(P10)
 *
 * docs/打字练习原型.html 1:1 实施:
 *   进入即打(无选择步骤) / 四 HUD 卡 + 连击 pill / 三态逐字渲染(对绿底·错红块·未到灰)
 *   / 退格自由 / 段尾 ↵ 自动衔接无需回车 / IME 提示 / ESC 存档
 *   / 键音 7 方案(偏好 localStorage) / 复盘面板内联展开(当次·累计 + 键盘热力图 + 错词弹卡)
 *
 * 进度持久化(typing_progress,一篇文章一行 upsert):
 *   打字中 2s 防抖 PUT;刷新/切后台/关页 keepalive 兜底 → 重启不丢;
 *   打完整篇 POST /api/typing/sessions 入成绩流水并清进度;重置按钮 = 清档重打。
 * 恢复:载入文章后 GET progress,恢复 pos 与错位标记;用时从续打首键重新计时。
 *
 * 跟打区为性能热点(整篇 5000+ 字符),采用命令式 DOM(innerHTML 装稿 + 逐键改 class),
 * 不进 React 渲染树;HUD 直改 textContent。仅复盘面板/模式切换走 React state。
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WordCard } from "@/components/reading/word-card";
import { normTypingText, wordAt } from "@/lib/typing/text";
import "./typing.css";

/* ---------- 键音(Web Audio 合成,7 方案;首次 keydown 惰性建 AudioContext) ---------- */

let AC: AudioContext | null = null;
function ac(): AudioContext | null {
  if (!AC) {
    try {
      AC = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  if (AC.state === "suspended") void AC.resume();
  return AC;
}
function envGain(ctx: AudioContext, t0: number, peak: number, dur: number) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(peak, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  return g;
}
function playNoise(ctx: AudioContext, dur: number, freq: number, q: number, peak: number) {
  const t = ctx.currentTime;
  const len = Math.max(1, (dur * ctx.sampleRate) | 0);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = freq;
  f.Q.value = q;
  const g = envGain(ctx, t, peak, dur);
  src.connect(f);
  f.connect(g);
  g.connect(ctx.destination);
  src.start(t);
  src.stop(t + dur);
}
function playTone(ctx: AudioContext, type: OscillatorType, f0: number, f1: number | null, dur: number, peak: number, delay = 0) {
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = envGain(ctx, t, peak, dur);
  o.connect(g);
  g.connect(ctx.destination);
  o.start(t);
  o.stop(t + dur);
}
const SND: Record<string, { ok: () => void; err: () => void }> = {
  mech: {
    ok() { const c = ac(); if (c) playNoise(c, 0.03, 2800 + Math.random() * 800, 1.2, 0.45); },
    err() { const c = ac(); if (c) playTone(c, "square", 150, 90, 0.14, 0.1); },
  },
  thock: {
    ok() { const c = ac(); if (!c) return; playNoise(c, 0.05, 500 + Math.random() * 150, 0.7, 0.7); playTone(c, "sine", 180, 120, 0.04, 0.15); },
    err() { const c = ac(); if (c) playTone(c, "sawtooth", 110, 70, 0.18, 0.1); },
  },
  tick: {
    ok() { const c = ac(); if (c) playTone(c, "sine", 1250, 900, 0.03, 0.2); },
    err() { const c = ac(); if (!c) return; playTone(c, "sine", 330, 300, 0.09, 0.18); playTone(c, "sine", 280, 250, 0.09, 0.18, 0.11); },
  },
  type: {
    ok() { const c = ac(); if (!c) return; playNoise(c, 0.045, 1400, 0.8, 0.55); playTone(c, "sine", 2000, 1500, 0.02, 0.07); },
    err() { const c = ac(); if (c) playTone(c, "triangle", 1560, 1150, 0.35, 0.14); },
  },
  piano: {
    ok() {
      const c = ac(); if (!c) return;
      const scale = [523.25, 587.33, 659.25, 783.99, 880];
      const f = scale[(Math.random() * scale.length) | 0];
      playTone(c, "triangle", f, null, 0.18, 0.16);
      playTone(c, "sine", f * 2, null, 0.12, 0.05);
    },
    err() { const c = ac(); if (!c) return; playTone(c, "triangle", 196, 185, 0.25, 0.15); playTone(c, "triangle", 207, 198, 0.25, 0.12); },
  },
  jelly: {
    ok() { const c = ac(); if (c) playTone(c, "sine", 420, 760, 0.07, 0.2); },
    err() { const c = ac(); if (!c) return; playTone(c, "sine", 180, 120, 0.12, 0.28); playTone(c, "sine", 150, 100, 0.1, 0.2, 0.06); },
  },
  off: { ok() {}, err() {} },
};

/* ---------- 类型 ---------- */

interface ListItem {
  articleId: string;
  title: string;
  level: string;
  wordCount: number;
  sourceRef: { paperTitle?: string } | null;
}
interface DrillData {
  triggerWords: { word: string; count: number }[];
  text: string | null;
}
interface SessionReview {
  wpm: number;
  acc: number;
  err: number;
  dur: number;
  combo: number;
  keyFreq: Record<string, number>;
  words: [string, number][];
  /** live = 跟打中途点「复盘」看的实时数据(非完赛成绩) */
  live?: boolean;
}
interface CumReview {
  n: number;
  avgWpm: number;
  avgAcc: number;
  totalErr: number;
  maxCombo: number;
  keyFreq: Record<string, number>;
  perArticle?: Record<string, { count: number; best: number; last: number }>;
  inProgress?: string[];
}
/** 文章下拉排序/标注用的打字状态 */
interface ArtStatus {
  count: number;
  best: number;
  last: number;
  active: boolean;
}

interface TState {
  mode: "article" | "drill";
  articleId: string | null;
  triggerWords: string[];
  text: string;
  pos: number;
  /** 键入字符的对错表;缺省(未打)不记,只记已判定字符 —— 稀疏存储 */
  marks: { [k: string]: boolean };
  /** 曾经打错键次表 { 应打字符: 次数 }——回退改对也不清零(热力图/TOP 错字口径) */
  typos: { [k: string]: number };
  /** 曾经打错词表 { 单词: 次数 }——复盘错词 chips 口径,同上 */
  typoWords: { [k: string]: number };
  backs: number;
  t0: number | null;
  ms: number;
  combo: number;
  maxCombo: number;
  done: boolean;
  cur: number | undefined;
}

/* ---------- 工具 ---------- */

function esc(ch: string) {
  return ch === "&" ? "&amp;" : ch === "<" ? "&lt;" : ch === ">" ? "&gt;" : ch;
}
function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
const paceWord = (w: number) =>
  w >= 75 ? "盲打自由" : w >= 60 ? "考场节奏" : w >= 45 ? "稳定输出" : w >= 30 ? "进入状态" : "热身中";
/** WPM 口径说明(HUD/review 悬浮提示共用) */
const WPM_TIP =
  "WPM = Words Per Minute,每分钟输入速度。按国际测速口径,正确击键数 ÷ 5 ÷ 分钟(非词典词数)。参考:40 = 普通水平,60+ = 雅思机考从容,75+ = 盲打自由。";
function chName(ch: string) {
  return ch === " " ? "空格" : ch;
}
function heatClass(n: number) {
  return n >= 4 ? "k3" : n >= 2 ? "k2" : n >= 1 ? "k1" : "";
}
function renderKB(freq: Record<string, number>) {
  const rows = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
  return rows
    .map((r, ri) =>
      `<div class="krow r${ri + 1}">${[...r].map((ch) => `<div class="key ${heatClass(freq[ch] ?? 0)}">${ch}</div>`).join("")}</div>`,
    )
    .join("");
}

/* ---------- 页面 ---------- */

export default function TypingPage() {
  /* React state(低频) */
  const [list, setList] = useState<ListItem[]>([]);
  const [curArtId, setCurArtId] = useState<string | null>(null);
  const [mode, setMode] = useState<"article" | "drill">("article");
  const [drill, setDrill] = useState<DrillData | null>(null);
  const [drillEmpty, setDrillEmpty] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewTab, setReviewTab] = useState<"session" | "cum">("session");
  const [reviewSession, setReviewSession] = useState<SessionReview | null>(null);
  const [reviewCum, setReviewCum] = useState<CumReview | null>(null);
  const [hitSet, setHitSet] = useState<Set<string>>(new Set());
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [artStatus, setArtStatus] = useState<Record<string, ArtStatus>>({});

  /* refs(高频/命令式) */
  const tRef = useRef<TState | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tboxRef = useRef<HTMLDivElement>(null);
  const hStateRef = useRef<HTMLSpanElement>(null);
  const hWpmRef = useRef<HTMLSpanElement>(null);
  const hDoneRef = useRef<HTMLSpanElement>(null);
  const hTotalRef = useRef<HTMLSpanElement>(null);
  const hBarRef = useRef<HTMLElement>(null);
  const hAccRef = useRef<HTMLElement>(null);
  const hTimeRef = useRef<HTMLElement>(null);
  const comboNumRef = useRef<HTMLElement>(null);
  const comboPillRef = useRef<HTMLDivElement>(null);
  const imeRef = useRef<HTMLSpanElement>(null);
  const toastRef = useRef<HTMLDivElement>(null);
  const doneTagRef = useRef<HTMLSpanElement>(null);
  const modeTagRef = useRef<HTMLSpanElement>(null);
  const rvRef = useRef<HTMLDivElement>(null);
  const sndRef = useRef("mech");
  const sndSelRef = useRef<HTMLSelectElement>(null);
  const modeRef = useRef<"article" | "drill">("article");
  const artIdRef = useRef<string | null>(null);
  const hitSetRef = useRef<Set<string>>(new Set());

  const toastTimerRef = useRef<number | null>(null);
  const toast = useCallback((msg: string) => {
    const t = toastRef.current;
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => t.classList.remove("show"), 2000);
  }, []);

  /* ---------- 跟打核心(命令式 DOM) ---------- */

  const setCur = useCallback((i: number) => {
    const T = tRef.current;
    const box = tboxRef.current;
    if (!T || !box) return;
    if (T.cur !== undefined) {
      const p = box.querySelector(`#c${T.cur}`);
      if (p) p.className = `ch ${T.marks[T.cur] === undefined ? "pending" : T.marks[T.cur] ? "ok" : "err"}`;
    }
    const s = box.querySelector(`#c${i}`);
    if (!s) {
      T.cur = undefined;
      return;
    }
    s.className = "ch cur";
    T.cur = i;
    s.scrollIntoView({ block: "nearest" });
  }, []);

  const updateHud = useCallback(() => {
    const T = tRef.current;
    if (!T) return;
    let err = 0;
    for (const k in T.marks) if (!T.marks[k]) err++;
    const doneCh = T.pos;
    const cor = doneCh - err;
    const sec = Math.max(1, T.ms / 1000);
    const wpm = doneCh > 8 ? Math.round((cor / 5) / (sec / 60)) : 0;
    const acc = doneCh ? cor / doneCh : 1;
    if (hDoneRef.current) hDoneRef.current.textContent = String(doneCh);
    if (hTotalRef.current) hTotalRef.current.textContent = String(T.text.length);
    if (hBarRef.current) hBarRef.current.style.width = `${T.text.length ? (doneCh / T.text.length) * 100 : 0}%`;
    if (hAccRef.current) hAccRef.current.textContent = `${Math.round(acc * 100)}%`;
    if (hWpmRef.current) hWpmRef.current.textContent = `${wpm} WPM · 实时`;
    if (hStateRef.current) hStateRef.current.textContent = paceWord(wpm);
    if (comboNumRef.current) comboNumRef.current.textContent = String(T.combo);
    if (comboPillRef.current) comboPillRef.current.classList.toggle("hot", T.combo >= 30);
  }, []);

  const renderText = useCallback((paras: string[]) => {
    const T = tRef.current;
    const box = tboxRef.current;
    if (!T || !box) return;
    let idx = 0;
    box.innerHTML = paras
      .map((tx) => {
        let h = '<span class="tpara">';
        for (const ch of tx) {
          h += `<span class="ch pending" id="c${idx}">${ch === " " ? " " : esc(ch)}</span>`;
          idx++;
        }
        return `${h}<span class="enter"> ↵</span></span>`;
      })
      .join("");
    box.classList.remove("focus");
    setCur(0);
    updateHud();
    if (hTimeRef.current) hTimeRef.current.textContent = "00:00";
    if (doneTagRef.current) doneTagRef.current.classList.remove("show");
  }, [setCur, updateHud]);

  const initT = useCallback(
    (opts: {
      mode: "article" | "drill";
      articleId: string | null;
      triggerWords: string[];
      paras: string[];
    }) => {
      const text = opts.paras.join("");
      /* 新一轮开始:清掉上一场复盘,收起面板,避免旧数据残留 */
      setReviewSession(null);
      setReviewOpen(false);
      tRef.current = {
        mode: opts.mode,
        articleId: opts.articleId,
        triggerWords: opts.triggerWords,
        text,
        pos: 0,
        marks: {},
        typos: {},
        typoWords: {},
        backs: 0,
        t0: null,
        ms: 0,
        combo: 0,
        maxCombo: 0,
        done: false,
        cur: undefined,
      };
      renderText(opts.paras);
    },
    [renderText],
  );

  /* ---------- 进度持久化 ---------- */

  const flushProgress = useCallback(() => {
    const T = tRef.current;
    if (!T || T.mode !== "article" || T.done || !T.articleId || T.pos <= 0) return;
    const errorPos = Object.keys(T.marks)
      .filter((k) => !T.marks[k])
      .map(Number);
    void fetch("/api/typing/progress", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      keepalive: true,
      body: JSON.stringify({ articleId: T.articleId, pos: T.pos, errorPos }),
    }).catch(() => undefined);
  }, []);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(flushProgress, 2000);
  }, [flushProgress]);

  const clearProgress = useCallback((articleId: string) => {
    void fetch(`/api/typing/progress?articleId=${encodeURIComponent(articleId)}`, { method: "DELETE" }).catch(
      () => undefined,
    );
  }, []);

  /* ---------- 完成 / 提交 ---------- */

  /** 文章打字状态(下拉排序/标注;完赛后刷新) */
  const loadStatus = useCallback(() => {
    void fetch("/api/typing/stats", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: CumReview) => {
        const map: Record<string, ArtStatus> = {};
        const active = new Set(d.inProgress ?? []);
        for (const [id, p] of Object.entries(d.perArticle ?? {})) {
          map[id] = { ...p, active: active.has(id) };
        }
        for (const id of active) {
          if (!map[id]) map[id] = { count: 0, best: 0, last: 0, active: true };
        }
        setArtStatus(map);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const finish = useCallback(() => {
    const T = tRef.current;
    if (!T || T.done) return;
    T.done = true;
    T.ms = Date.now() - (T.t0 ?? Date.now());
    if (timerRef.current) clearInterval(timerRef.current);
    if (hTimeRef.current) hTimeRef.current.textContent = fmt(T.ms);

    const sec = Math.max(1, T.ms / 1000);
    const errPos = Object.keys(T.marks)
      .filter((k) => !T.marks[k])
      .map(Number);
    const keyFreq = { ...T.typos };
    const words = Object.entries(T.typoWords).sort((a, b) => b[1] - a[1]);
    const body =
      T.mode === "article"
        ? {
            mode: "article" as const,
            articleId: T.articleId,
            durationSec: sec,
            charTotal: T.text.length,
            backspaces: T.backs,
            maxCombo: T.maxCombo,
            errorPos: errPos,
            typos: T.typos,
          }
        : {
            mode: "drill" as const,
            durationSec: sec,
            charTotal: T.text.length,
            backspaces: T.backs,
            maxCombo: T.maxCombo,
            errorChars: errPos.map((pos) => ({ pos, expected: T.text[pos], word: wordAt(T.text, pos) })),
            typos: T.typos,
            drillMeta: { triggerWords: T.triggerWords },
          };

    void fetch("/api/typing/sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = (await r.json()) as { wpm: number; accuracy: number };
        setReviewSession({
          wpm: d.wpm,
          acc: d.accuracy,
          err: errPos.length,
          dur: sec,
          combo: T.maxCombo,
          keyFreq,
          words,
        });
        if (doneTagRef.current) doneTagRef.current.classList.add("show");
        toast(`本篇完成!WPM ${d.wpm} · 准确率 ${Math.round(d.accuracy * 100)}%`);
        loadStatus();
        setTimeout(() => {
          setReviewTab("session");
          setReviewOpen(true);
          setTimeout(() => rvRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 80);
        }, 500);
      })
      .catch(() => toast("成绩提交失败,请重试"));
  }, [loadStatus, toast]);

  const tick = useCallback(() => {
    const T = tRef.current;
    if (!T || T.done || !T.t0) return;
    T.ms = Date.now() - T.t0;
    if (hTimeRef.current) hTimeRef.current.textContent = fmt(T.ms);
  }, []);

  /* ---------- 键盘(挂载一次,全走 refs) ---------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const T = tRef.current;
      const box = tboxRef.current;
      if (!T || T.done || !box) return;
      if (
        document.activeElement !== box &&
        e.key.length === 1 &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        box.focus();
      }
      if (e.key === "Escape") {
        flushProgress();
        toast("进度已存档,可随时回来续打");
        return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        if (T.pos > 0) {
          T.pos--;
          delete T.marks[T.pos];
          const s = box.querySelector(`#c${T.pos}`);
          if (s) s.className = "ch pending";
          setCur(T.pos);
          T.combo = 0;
          updateHud();
        }
        return;
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        if (!T.t0) {
          T.t0 = Date.now();
          timerRef.current = setInterval(tick, 500);
        }
        const ok = e.key === T.text[T.pos];
        SND[sndRef.current][ok ? "ok" : "err"]();
        T.marks[T.pos] = ok;
        if (!ok) {
          // 曾经打错:键与词都累计,回退改对不清零(诊断口径)
          const exp = T.text[T.pos];
          const k = exp === " " ? " " : exp.toLowerCase();
          T.typos[k] = (T.typos[k] ?? 0) + 1;
          const w = wordAt(T.text, T.pos);
          if (w) T.typoWords[w] = (T.typoWords[w] ?? 0) + 1;
        }
        const s = box.querySelector(`#c${T.pos}`);
        if (s) s.className = `ch ${ok ? "ok" : "err"}`;
        if (ok) {
          T.combo++;
          T.maxCombo = Math.max(T.maxCombo, T.combo);
        } else {
          T.combo = 0;
        }
        T.pos++;
        updateHud();
        if (T.pos >= T.text.length) {
          tick();
          finish();
        } else {
          setCur(T.pos);
          scheduleSave();
        }
      }
    };
    const onCompStart = () => imeRef.current?.classList.add("show");
    const onCompEnd = () => imeRef.current?.classList.remove("show");
    document.addEventListener("keydown", onKey);
    document.addEventListener("compositionstart", onCompStart);
    document.addEventListener("compositionend", onCompEnd);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("compositionstart", onCompStart);
      document.removeEventListener("compositionend", onCompEnd);
    };
  }, [finish, flushProgress, scheduleSave, setCur, tick, toast, updateHud]);

  /* 页面隐藏/离开 → 存档兜底 */
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") flushProgress();
    };
    const onHide = () => flushProgress();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", onHide);
      flushProgress();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [flushProgress]);

  /* 键音偏好恢复(select 为非受控,直改 DOM 值,避免 setState-in-effect) */
  useEffect(() => {
    const saved = localStorage.getItem("typing-sound");
    if (saved && saved in SND) {
      sndRef.current = saved;
      if (sndSelRef.current) sndSelRef.current.value = saved;
    }
  }, []);

  /* ---------- 数据装载 ---------- */

  const loadArticle = useCallback(
    async (id: string, opts?: { fresh?: boolean }) => {
      flushProgress();
      modeRef.current = "article";
      artIdRef.current = id;
      setMode("article");
      setCurArtId(id);
      setDrillEmpty(false);
      try {
        const resp = await fetch(`/api/reading/${id}`, { cache: "no-store" });
        if (!resp.ok) {
          toast(resp.status === 404 ? "文章不存在或已删除" : "文章加载失败");
          return;
        }
        const { article: a } = (await resp.json()) as {
          article: { title: string; paragraphs: { idx: number; en: string }[] };
        };
        document.title = `打字练习 · ${a.title}`;
        const paras = a.paragraphs
          .slice()
          .sort((x, y) => x.idx - y.idx)
          .map((p) => normTypingText(p.en));
        initT({ mode: "article", articleId: id, triggerWords: [], paras });

        // 词库命中(错词 chips 样式用)
        fetch(`/api/reading/${id}/word-hits`, { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : null))
          .then((d: { hits: { word: string; inVocab: boolean }[] } | null) => {
            const hits = d?.hits ?? [];
            const set = new Set(hits.filter((h) => h.inVocab).map((h) => h.word));
            hitSetRef.current = set;
            setHitSet(set);
          })
          .catch(() => undefined);

        // 恢复中途进度(fresh=重置场景跳过)
        if (!opts?.fresh) {
          const pr = await fetch(`/api/typing/progress?articleId=${encodeURIComponent(id)}`, {
            cache: "no-store",
          });
          if (pr.ok) {
            const { progress } = (await pr.json()) as { progress: { pos: number; errorPos: number[] } | null };
            const T = tRef.current;
            if (progress && T && progress.pos > 0 && progress.pos < T.text.length) {
              T.pos = progress.pos;
              for (const p of progress.errorPos ?? []) T.marks[p] = false;
              const box = tboxRef.current;
              if (box) {
                for (let i = 0; i < T.pos; i++) {
                  const s = box.querySelector(`#c${i}`);
                  if (s) s.className = `ch ${T.marks[i] === false ? "err" : "ok"}`;
                }
              }
              setCur(T.pos);
              updateHud();
              toast(`已恢复上次进度:已打 ${T.pos} 字符`);
            }
          }
        }
      } catch {
        toast("文章加载失败");
      }
    },
    [flushProgress, initT, setCur, toast, updateHud],
  );

  const startDrill = useCallback(async () => {
    flushProgress();
    modeRef.current = "drill";
    artIdRef.current = null;
    setMode("drill");
    setDrillEmpty(false);
    document.title = "打字练习 · 错词重练";
    try {
      const r = await fetch("/api/typing/drills", { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = (await r.json()) as DrillData;
      setDrill(d);
      if (!d.text) {
        setDrillEmpty(true);
        tRef.current = null;
        return;
      }
      initT({
        mode: "drill",
        articleId: null,
        triggerWords: d.triggerWords.map((w) => w.word),
        paras: [normTypingText(d.text)],
      });
    } catch {
      toast("重练稿生成失败");
    }
  }, [flushProgress, initT, toast]);

  /* 首次进入:支持 ?articleId= 直达(阅读详情入口) */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/reading", { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = (await r.json()) as { articles: ListItem[] };
        if (cancelled) return;
        setList(d.articles);
        const target = new URLSearchParams(window.location.search).get("articleId");
        const first =
          target && d.articles.some((a) => a.articleId === target)
            ? target
            : d.articles[0]?.articleId;
        if (first) void loadArticle(first);
        else setDrillEmpty(true);
      } catch {
        if (!cancelled) toast("文章列表加载失败");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- 交互动作 ---------- */

  /** 实时当次快照(每次打开/定时刷新都重算,不复用旧值) */
  const buildLiveReview = useCallback((): SessionReview | null => {
    const T = tRef.current;
    if (!T || T.pos === 0) return null;
    const sec = Math.max(1, T.ms / 1000);
    const errPos = Object.keys(T.marks)
      .filter((k) => !T.marks[k])
      .map(Number);
    const doneCh = T.pos;
    const cor = doneCh - errPos.length;
    return {
      live: !T.done,
      wpm: doneCh > 8 ? Math.round((cor / 5) / (sec / 60)) : 0,
      acc: doneCh ? cor / doneCh : 1,
      err: errPos.length,
      dur: sec,
      combo: T.maxCombo,
      keyFreq: { ...T.typos },
      words: Object.entries(T.typoWords).sort((a, b) => b[1] - a[1]),
    };
  }, []);

  /** 面板展开期间持续刷新实时数据(1s),打完即停 */
  useEffect(() => {
    if (!reviewOpen || reviewTab !== "session") return;
    const h = setInterval(() => {
      const T = tRef.current;
      if (!T || T.done) return;
      const live = buildLiveReview();
      if (live) setReviewSession(live);
    }, 1000);
    return () => clearInterval(h);
  }, [reviewOpen, reviewTab, buildLiveReview]);

  const switchMode = (m: "article" | "drill") => {
    if (m === mode) return;
    if (m === "article") {
      const id = curArtId ?? list[0]?.articleId;
      if (id) void loadArticle(id);
      else toast("还没有可练的文章,先去阅读库导入");
    } else {
      void startDrill();
    }
  };

  const onSelectArt = (id: string) => {
    if (id && id !== curArtId) void loadArticle(id);
  };

  const changeSnd = (v: string) => {
    sndRef.current = v;
    localStorage.setItem("typing-sound", v);
    if (v !== "off") {
      SND[v].ok();
      setTimeout(() => SND[v].err(), 320);
    }
  };

  const resetTyping = () => {
    const T = tRef.current;
    if (mode === "article" && artIdRef.current) {
      clearProgress(artIdRef.current);
      void loadArticle(artIdRef.current, { fresh: true });
    } else if (mode === "drill") {
      void startDrill();
    } else if (!T) {
      return;
    }
    toast("已重置");
  };

  const showReviewTab = (tab: "session" | "cum") => {
    if (tab === "cum" && !reviewCum) {
      void fetch("/api/typing/stats", { cache: "no-store" })
        .then((r) => r.json())
        .then((d: CumReview) => {
          setReviewCum(d);
          setReviewTab("cum");
        })
        .catch(() => toast("累计数据加载失败"));
      return;
    }
    setReviewTab(tab);
  };

  const openReview = (tab: "session" | "cum") => {
    if (reviewOpen) {
      setReviewOpen(false);
      return;
    }
    if (tab === "session") {
      const T = tRef.current;
      if (T && !T.done) {
        const live = buildLiveReview();
        if (!live) {
          toast("还没有练习记录,先打一篇吧");
          return;
        }
        setReviewSession(live);
        setReviewTab("session");
      } else if (reviewSession && T?.done) {
        // 已完赛:展示入库的最终成绩
        setReviewTab("session");
      } else {
        toast("还没有练习记录,先打一篇吧");
        return;
      }
    } else {
      showReviewTab("cum");
    }
    setReviewOpen(true);
    setTimeout(() => rvRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 80);
  };

  const retype = () => {
    setReviewOpen(false);
    resetTyping();
  };

  /* ---------- 渲染 ---------- */

  const sr = reviewSession;
  const cm = reviewCum;
  const reviewData =
    reviewTab === "session"
      ? sr
        ? {
            cards: [
              [`${sr.wpm}`, `最终 WPM${sr.live ? " · 实时" : ""}`],
              [`${Math.round(sr.acc * 100)}%`, "准确率"],
              [`${sr.err}`, "总错误数"],
              [`${sr.combo}`, "最高连击"],
            ] as [string, string][],
            freq: sr.keyFreq,
            words: sr.words,
            empty: false,
          }
        : null
      : cm
        ? {
            cards: [
              [`${cm.avgWpm}`, "平均 WPM(累计)"],
              [`${Math.round(cm.avgAcc * 100)}%`, "平均准确率"],
              [`${cm.totalErr}`, "累计错误数"],
              [`${cm.maxCombo}`, "最高连击"],
            ] as [string, string][],
            freq: cm.keyFreq,
            words: [] as [string, number][],
            empty: cm.n === 0,
          }
        : null;

  const top8 = reviewData
    ? Object.entries(reviewData.freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
    : [];
  const tot = top8.reduce((s, [, n]) => s + n, 0) || 1;

  /* 文章下拉:练过的(进行中最优先)排前,其余保持原序;选项尾缀打状态 */
  const sortedList = (() => {
    const rank = (id: string) => {
      const s = artStatus[id];
      if (!s) return 0;
      return s.active ? 2 : 1;
    };
    return [...list].sort((x, y) => {
      const rx = rank(x.articleId);
      const ry = rank(y.articleId);
      if (rx !== ry) return ry - rx;
      if (rx > 0) {
        const sx = artStatus[x.articleId];
        const sy = artStatus[y.articleId];
        if (sx.last !== sy.last) return sy.last - sx.last;
      }
      return 0;
    });
  })();
  const optLabel = (a: ListItem) => {
    const s = artStatus[a.articleId];
    const base = `${a.title} · ${a.wordCount} 词 · ${a.level}`;
    if (!s) return base;
    return s.active ? `${base} · ▶ 进行中` : `${base} · 已练${s.count}遍 最佳${s.best}`;
  };

  return (
    <div className="typing-root mx-auto w-full max-w-[960px] px-4 py-6">
      {/* 头部 + 连击 */}
      <div className="phead">
        <h1>打字练习</h1>
        <div className="combo" ref={comboPillRef}>
          连击 ×<b ref={comboNumRef}>0</b>
        </div>
      </div>

      {/* 四 HUD 卡 */}
      <div className="hudrow">
        <div className="hcard">
          <span className="lab">当前节奏</span>
          <b className="state" ref={hStateRef}>
            热身中
          </b>
          <span className="sub">
            <span ref={hWpmRef}>0 WPM · 实时</span>
            <i className="tipico" title={WPM_TIP}>
              i
            </i>
          </span>
        </div>
        <div className="hcard">
          <span className="lab">已完成 / 总字符</span>
          <b>
            <span ref={hDoneRef}>0</span>
            <i>
              {" "}
              / <span ref={hTotalRef}>0</span>
            </i>
          </b>
          <div className="pbar">
            <i ref={hBarRef} />
          </div>
        </div>
        <div className="hcard">
          <span className="lab">准确率</span>
          <b ref={hAccRef}>100%</b>
          <span className="sub">实时 · 已完成部分</span>
        </div>
        <div className="hcard">
          <span className="lab">时间</span>
          <b ref={hTimeRef}>00:00</b>
          <span className="sub" ref={modeTagRef}>
            文章跟打 · 整篇
          </span>
        </div>
      </div>

      {/* 模式 tab + 文章下拉 + 键音 */}
      <div className="tools">
        <div className="tabs2">
          <button type="button" className={`tt ${mode === "article" ? "on" : ""}`} onClick={() => switchMode("article")}>
            文章跟打
          </button>
          <button type="button" className={`tt ${mode === "drill" ? "on" : ""}`} onClick={() => switchMode("drill")}>
            错词重练
          </button>
        </div>
        {mode === "article" ? (
          <select className="artsel" value={curArtId ?? ""} onChange={(e) => onSelectArt(e.target.value)}>
            {sortedList.map((a) => (
              <option key={a.articleId} value={a.articleId}>
                {optLabel(a)}
              </option>
            ))}
          </select>
        ) : (
          <div className="dwords">
            <span className="lab">本期目标词</span>
            {(drill?.triggerWords ?? []).map((w) => (
              <span key={w.word} className="dchip">
                {w.word} ×{w.count}
              </span>
            ))}
          </div>
        )}
        <select
          className="sndsel"
          ref={sndSelRef}
          defaultValue="mech"
          onChange={(e) => changeSnd(e.target.value)}
          title="键音方案"
        >
          <option value="mech">🔊 机械键盘</option>
          <option value="thock">🔊 静电容「碎碎」</option>
          <option value="tick">🔊 轻快滴答</option>
          <option value="type">🔊 打字机</option>
          <option value="piano">🔊 钢琴音阶</option>
          <option value="jelly">🔊 果冻泡泡</option>
          <option value="off">🔇 静音</option>
        </select>
      </div>

      {/* 提示条 */}
      <div className="hintbar">
        <span>
          继续打字,按正确字母前进(<span className="k">Backspace</span> 支持回退)
        </span>
        <span>
          <span className="k">ESC</span> 存档暂停(刷新/关页也不丢)
        </span>
        <span>
          段尾 <b>↵</b> 自动衔接,无需回车
        </span>
        <span className="imewarn" ref={imeRef}>
          检测到中文输入法 · 请切换为英文键盘
        </span>
      </div>

      {/* 跟打区(命令式 DOM;drill 无数据时显示空态) */}
      {drillEmpty ? (
        <div className="tempty">
          {mode === "drill"
            ? "还没有错词积累 —— 先打一篇文章,错词会自动进入重练目标"
            : "暂无可练文章,先去阅读库导入一篇吧"}
        </div>
      ) : (
        <div className="tboxwrap">
          <div
            className="tbox"
            ref={tboxRef}
            tabIndex={0}
            onFocus={(e) => e.currentTarget.classList.add("focus")}
            onBlur={(e) => e.currentTarget.classList.remove("focus")}
          />
        </div>
      )}

      {/* 底栏 */}
      <div className="foot">
        <span className="tip">
          素材 · 阅读库真题文章 |<span className="donetag" ref={doneTagRef}>本篇已完成 ✓</span>
        </span>
        <div className="btns">
          <button type="button" className="btn" onClick={() => openReview("session")}>
            复盘
          </button>
          <button type="button" className="btn main" onClick={resetTyping}>
            重置
          </button>
        </div>
      </div>

      {/* 复盘面板(内联展开) */}
      {reviewOpen && (
        <div className="rvsec" ref={rvRef}>
          <div className="panel">
            <div className="rvhead">
              <h3>错误复盘分析</h3>
              <div className="tabs">
                <button type="button" className={`tab ${reviewTab === "session" ? "on" : ""}`} onClick={() => showReviewTab("session")}>
                  当次
                </button>
                <button type="button" className={`tab ${reviewTab === "cum" ? "on" : ""}`} onClick={() => showReviewTab("cum")}>
                  累计
                </button>
              </div>
            </div>
            {reviewData && (
              <>
                <div className="cards">
                  {reviewData.cards.map(([v, l]) => (
                    <div key={l} className="rcard">
                      <b>{v}</b>
                      <span>
                        {l}
                        {l.includes("WPM") && (
                          <i className="tipico" title={WPM_TIP}>
                            i
                          </i>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="rvgrid">
                  <div className="rbox">
                    <h4>
                      最易出错字符 TOP 8{" "}
                      <span style={{ fontSize: 11, color: "var(--tink3)", fontWeight: 400 }}>
                        按“曾经打错”统计 · 含已改对
                      </span>
                    </h4>
                    <table className="rtable">
                      <thead>
                        <tr>
                          <th>字符</th>
                          <th>打错次数</th>
                          <th>占错误比</th>
                        </tr>
                      </thead>
                      <tbody>
                        {top8.length === 0 ? (
                          <tr>
                            <td colSpan={3} style={{ color: "var(--tink3)" }}>
                              无错误记录,打得漂亮
                            </td>
                          </tr>
                        ) : (
                          top8.map(([ch, n]) => (
                            <tr key={ch}>
                              <td>
                                <span className="lblock">{chName(ch)}</span>
                              </td>
                              <td className="num">{n}</td>
                              <td className="pct">{Math.round((n / tot) * 100)}%</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                    {reviewTab === "session" && (
                      <div style={{ marginTop: 10 }}>
                        <h4 style={{ marginBottom: 2 }}>
                          本篇错词{" "}
                          <span style={{ fontSize: 11, color: "var(--tink3)", fontWeight: 400 }}>
                            (下划线 = 词库命中,点看释义)
                          </span>
                        </h4>
                        <div className="wrow">
                          {reviewData.words.length === 0 ? (
                            <span style={{ fontSize: 12, color: "var(--tink3)" }}>本篇全对,无错词</span>
                          ) : (
                            reviewData.words.slice(0, 6).map(([w, n]) => (
                              <span
                                key={w}
                                className={`wchip ${hitSet.has(w) ? "voc" : ""}`}
                                onClick={() => {
                                  if (hitSet.has(w) && artIdRef.current) setSelectedWord(w);
                                }}
                              >
                                {w}
                                {n > 1 ? ` ×${n}` : ""}
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="rbox">
                    <h4>
                      键盘错误热力图{" "}
                      <span style={{ fontSize: 11, color: "var(--tink3)", fontWeight: 400 }}>
                        按“曾经打错”统计 · 含已改对
                      </span>
                    </h4>
                    <div
                      className="kb"
                      dangerouslySetInnerHTML={{ __html: renderKB(reviewData.freq) }}
                    />
                    <div className="kleg">
                      <span>
                        <i style={{ background: "#fff", border: "1px solid var(--tline)" }} />
                        无错误
                      </span>
                      <span>
                        <i style={{ background: "var(--tred1)" }} />
                        少量
                      </span>
                      <span>
                        <i style={{ background: "var(--tred2)" }} />
                        中等
                      </span>
                      <span>
                        <i style={{ background: "var(--tred3)" }} />
                        高频
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
            <div className="rvbtns">
              <button type="button" className="btn" onClick={() => setReviewOpen(false)}>
                收起
              </button>
              <button type="button" className="btn main" onClick={retype}>
                再打一遍
              </button>
            </div>
          </div>
        </div>
      )}

      {/* toast + 词卡 */}
      <div className="ttoast" ref={toastRef} />
      {selectedWord && curArtId && (
        <WordCard key={selectedWord} word={selectedWord} articleId={curArtId} onClose={() => setSelectedWord(null)} />
      )}
    </div>
  );
}
