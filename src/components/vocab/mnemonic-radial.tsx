"use client";

/**
 * 助记辐射层（设计文档 v2.5 四卡制,自 prototype/vocab/card-demo/radial.* 高保真移植）
 *
 * 呈现形态(v2.7 无复刻):无蒙版无暗化、无 hub 复刻卡——1500×1000 无界画布整体
 * scale 适配,四张助记卡 + SVG 连线直接锚定**真实主卡**(辐射中心=主卡中心,连线
 * 从主卡左右边缘出发)。主卡在辐射全程像素级不变样:不缩放、不被覆盖,认词卡/
 * 默写卡各自保持原版式;下层三键/方向键/灯泡/喇叭全程可点,仅助记卡自身可交互。
 *   左上 构词解析(morph) / 左下 派生·词性·近义(derive)
 *   右上 读音解析(syl)   / 右下 真实语境(context)
 * 触发口径(由 /learn page 决定):模糊/不认识/判错/查看答案 自动展开,判对零辐射;
 * 关闭走主卡右上角 💡 开关或 Esc。
 * 本组件只做渲染与关闭,不产生任何评分副作用。
 *
 * 色板铁律:卡面/边框/文字全部走全局语义 token(--card/--border/--foreground/…)，
 * 四卡语义色相为本文件局部变量 --mn-*(见 mnemonic-radial.css 头注映射表)。
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import "./mnemonic-radial.css";

/* ---------------- 数据契约(words.contentJson 助记字段,v2.5) ---------------- */

export interface MnSylPhoneme {
  p: string;
  syl?: number;
  type?: "vowel" | "consonant";
  desc?: string;
}
export interface MnSyl {
  parts: string[];
  ipa?: string[];
  stress: number;
  secondary?: number[];
  phonemes?: MnSylPhoneme[];
  combos?: { letters: string; sound: string; desc?: string }[];
  notes?: string[];
}
export interface MnMorph {
  type: string; // derived | compound | blend
  literal: string;
  pieces: { piece: string; kind: string; meaningZh: string; fromWord?: string }[];
}
export interface MnDerive {
  word: string;
  pos?: string;
  meaningZh: string;
}
export interface MnContext {
  coll: string;
  collZh?: string;
  en: string;
  cn?: string;
  audio?: string;
  /** 血缘(v2.8):example=回填脚本从 examples 命中词组复制;缺省=LLM 生成 */
  src?: "llm" | "example";
}

/** 渲染所需的最小队列项(与 /learn QueueItem 结构兼容) */
export interface MnItem {
  word: string;
  phoneticUk: string | null;
  hasImage: boolean;
  content: {
    translation?: string[];
    definition?: string[];
    examples?: { en: string; cn?: string; audio?: string }[];
    audio?: { word?: string };
    image?: string;
    syl?: MnSyl;
    morph?: MnMorph;
    derives?: MnDerive[];
    contexts?: MnContext[];
  };
}

/** 该词是否有任何助记内容(全缺 → 按钮隐藏/触发静默,契约见实施方案 §4 降级矩阵) */
export function hasMnemonicContent(content: MnItem["content"] | undefined): boolean {
  if (!content) return false;
  return !!(
    content.syl?.parts?.length ||
    content.morph?.pieces?.length ||
    content.derives?.length ||
    content.contexts?.length
  );
}

/* ---------------- 布局常量(与原型 radial.js 一致) ---------------- */

const MN_POS: Record<string, { x: number; y: number }> = {
  morph: { x: 220, y: 280 }, // 构词解析 左上
  syl: { x: 1280, y: 250 }, // 读音解析 右上
  derive: { x: 220, y: 640 }, // 派生/词性/近义 左下
  context: { x: 1280, y: 640 }, // 真实语境 右下
};
const MN_KEY_ORDER = ["syl", "morph", "derive", "context"] as const;
type MnKey = (typeof MN_KEY_ORDER)[number];

const CARD_META: Record<MnKey, { icon: string; title: string; sub: string }> = {
  syl: { icon: "🎧", title: "读音解析", sub: "pronunciation" },
  morph: { icon: "🧩", title: "构词解析", sub: "morphology" },
  derive: { icon: "🌱", title: "派生 / 近义词", sub: "derivatives" },
  context: { icon: "💬", title: "真实语境", sub: "real context" },
};

const KIND_LABEL: Record<string, string> = {
  prefix: "前缀",
  root: "词根",
  suffix: "后缀",
  word: "词",
  "blend-head": "截自前半",
  "blend-tail": "截自后半",
};
const MORPH_TYPE_LABEL: Record<string, string> = {
  derived: "派生词 · 词缀构词",
  compound: "合成词",
  blend: "混成词",
};

/* ---------------- 工具 ---------------- */

function esc(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}
function escRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 词组在例句中高亮:大小写不敏感 + 词形屈折(isolate→isolates) + coll 中 " ... " 通配 + headword 兜底(原型 hiColl 原样移植) */
function hiColl(sentence: string, coll: string, headword: string): string {
  const s = esc(sentence);
  const c = (coll || "").trim();
  if (c) {
    const pat =
      "\\b" +
      c
        .split(/\s*\.\.\.\s*/)
        .map((p) => escRe(esc(p)).replace(/\s+/g, "\\s+"))
        .join("\\w*[^,;.!?]*?\\s+") +
      "\\w*";
    try {
      const out = s.replace(new RegExp(pat, "gi"), (m) => `<mark class="mn-ctx-coll">${m}</mark>`);
      if (out !== s) return out;
    } catch {
      /* 非法 pattern 落兜底 */
    }
  }
  if (headword) {
    const re = new RegExp("\\b" + escRe(esc(headword)) + "\\w*", "gi");
    return s.replace(re, (m) => `<mark class="mn-ctx-coll">${m}</mark>`);
  }
  return s;
}

function wirePath(hx: number, hy: number, tx: number, ty: number, side: string): string {
  if (side === "top") {
    const cy1 = hy + (ty - hy) * 0.45;
    const cy2 = hy + (ty - hy) * 0.55;
    return `M${hx},${hy} C${hx},${cy1} ${tx},${cy2} ${tx},${ty}`;
  }
  const dx = tx - hx;
  const cx1 = hx + dx * 0.45;
  const cx2 = hx + dx * 0.55;
  return `M${hx},${hy} C${cx1},${hy} ${cx2},${ty} ${tx},${ty}`;
}

interface Wire {
  key: MnKey;
  d: string;
  color: string;
  tx: number;
  ty: number;
}

/* ================= 组件 ================= */

export function MnemonicRadial(props: {
  item: MnItem;
  open: boolean;
  onClose: () => void;
  /** speechSynthesis 兜底发音(/learn 同款 speakTts) */
  onSpeakTts: (text: string) => void;
}) {
  const { item, open, onClose, onSpeakTts } = props;
  const content = item.content;

  const stageRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scaleRef = useRef(1);
  const [scale, setScale] = useState(1);
  const [wires, setWires] = useState<Wire[]>([]);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [phOpen, setPhOpen] = useState(false);

  /* ---- 画布 scale 适配:min(vw, vh) 留边距,1500×1000 等比 ---- */
  useLayoutEffect(() => {
    const fit = () => {
      const s = Math.min(1, window.innerWidth / 1560, window.innerHeight / 1040);
      scaleRef.current = s;
      setScale(s);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  /* ---- 内容变化时重置音素细讲抽屉 ---- */
  useEffect(() => {
    setPhOpen(false);
  }, [item.word]);

  /* ---- 辐射 / 收拢动画(原型 radiateMn/collapseMn 移植) ---- */
  const drawWires = useCallback(
    (scaleCur: number) => {
      const stage = stageRef.current;
      if (!stage) return;
      const stageRect = stage.getBoundingClientRect();
      const toLayout = (r: DOMRect) => ({
        cx: (r.left - stageRect.left + r.width / 2) / scaleCur,
        cy: (r.top - stageRect.top + r.height / 2) / scaleCur,
        w: r.width / scaleCur,
        h: r.height / scaleCur,
      });
      // 辐射中心 = 真实主卡(页面中不在辐射层内的 .flashcard);无复刻卡,主卡像素级不动
      const realCard = [...document.querySelectorAll(".flashcard")].find(
        (el) => !el.closest(".mn-overlay"),
      );
      if (!realCard) return;
      const hubL = toLayout(realCard.getBoundingClientRect());
      const hx = hubL.cx;
      const hy = hubL.cy;
      const next: Wire[] = [];
      for (const k of MN_KEY_ORDER) {
        const el = cardRefs.current[k];
        if (!el || !el.classList.contains("show")) continue;
        const r = toLayout(el.getBoundingClientRect());
        const color =
          getComputedStyle(el).getPropertyValue("--c").trim() || "var(--muted-foreground)";
        const leftSide = k === "morph" || k === "derive";
        const tx = leftSide ? r.cx + r.w / 2 - 10 : r.cx - r.w / 2 + 10;
        const ty = r.cy;
        const sx = hx + (leftSide ? -hubL.w / 2 : hubL.w / 2);
        next.push({
          key: k,
          d: wirePath(sx, hy, tx, ty, leftSide ? "left" : "right"),
          color,
          tx,
          ty,
        });
      }
      setWires(next);
    },
    [],
  );

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const timers: number[] = [];

    if (!open) {
      stage.classList.remove("radial-on");
      let anyShown = false;
      for (const k of MN_KEY_ORDER) {
        const el = cardRefs.current[k];
        if (!el || !el.classList.contains("show")) continue;
        anyShown = true;
        el.classList.remove("show");
        el.classList.add("hide");
        timers.push(
          window.setTimeout(() => {
            el.classList.remove("hide");
            el.style.left = "";
            el.style.top = "";
            el.style.transform = "";
            el.style.opacity = "";
          }, 320),
        );
      }
      if (anyShown) timers.push(window.setTimeout(() => setWires([]), 350));
      else setWires([]);
      return () => timers.forEach((t) => window.clearTimeout(t));
    }

    /* 展开 */
    stage.classList.add("radial-on");
    const scaleCur = scaleRef.current || 1;
    const stageRect = stage.getBoundingClientRect();
    // 辐射中心 = 真实主卡(画布外唯一 .flashcard);无主卡兜底画布中心
    const realCard = [...document.querySelectorAll(".flashcard")].find(
      (el) => !el.closest(".mn-overlay"),
    );
    let hcx = 750;
    let hcy = 500;
    if (realCard) {
      const rr = realCard.getBoundingClientRect();
      hcx = (rr.left + rr.width / 2 - stageRect.left) / scaleCur;
      hcy = (rr.top + rr.height / 2 - stageRect.top) / scaleCur;
    }

    const visible: { k: MnKey; el: HTMLDivElement; pos: { x: number; y: number } }[] = [];
    for (const k of MN_KEY_ORDER) {
      const el = cardRefs.current[k];
      if (!el) continue;
      if (!hasMnKey(content, k)) {
        el.classList.remove("show");
        continue;
      }
      // 初始:缩团于主卡中心,强制透明(防起飞前闪现)
      el.style.left = `${hcx}px`;
      el.style.top = `${hcy}px`;
      el.style.transform = "translate(-50%, -50%) scale(.2)";
      el.style.opacity = "0";
      el.classList.add("show");
      visible.push({ k, el, pos: MN_POS[k] });
    }

    visible.forEach(({ el, pos }, i) => {
      timers.push(
        window.setTimeout(() => {
          el.style.left = `${pos.x}px`;
          el.style.top = `${pos.y}px`;
          el.style.transform = "translate(-50%, -50%) scale(1)";
          el.style.opacity = "";
        }, 120 + i * 90),
      );
    });

    timers.push(
      window.setTimeout(() => drawWires(scaleCur), 120 + visible.length * 90 + 80),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item.word, drawWires]);

  /* ---- Esc 关闭(层已非阻塞不圈禁焦点;方向键归 /learn 全局监听,此处不碰) ---- */
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", h, true);
    return () => document.removeEventListener("keydown", h, true);
  }, [open, onClose]);

  const playContext = (c: MnContext) => {
    if (c.audio) {
      const a = new Audio(c.audio);
      a.play().catch(() => onSpeakTts(c.en));
      return;
    }
    onSpeakTts(c.en);
  };

  return (
    <div className={`mn-overlay${open ? " mn-on" : ""}`} aria-hidden={!open}>
      <div
        className="mn-scaler"
        style={{ width: 1500 * scale, height: 1000 * scale }}
      >
        <div
          className="mn-stage"
          ref={stageRef}
          style={{ transform: `scale(${scale})` }}
        >
          <svg
            className={`mn-wires${wires.length ? " drawn" : ""}`}
            viewBox="0 0 1500 1000"
            aria-hidden="true"
          >
            {wires.map((w, i) => (
              <path
                key={`w-${i}`}
                className={`mn-wire${hoverKey && wires[i] && MN_KEY_ORDER[hasIdx(hoverKey)] !== undefined && wireIndex(wires, hoverKey) === i ? " hl" : ""}`}
                d={w.d}
                stroke={w.color}
                style={{ color: w.color }}
                pathLength={1}
              />
            ))}
            {wires.map((w, i) => (
              <circle key={`d-${i}`} className="mn-wire-dot" cx={w.tx} cy={w.ty} r={3.5} fill={w.color} />
            ))}
          </svg>

          {/* 四张助记卡(缺数据的卡不渲染内容/不出线) */}
          {MN_KEY_ORDER.map((k) => (
            <div
              key={k}
              data-mn={k}
              className={`mn-card mn-${k}${hasMnKey(content, k) ? "" : " mn-empty"}`}
              ref={(el) => {
                cardRefs.current[k] = el;
              }}
              onMouseEnter={() => setHoverKey(k)}
              onMouseLeave={() => setHoverKey(null)}
            >
              <div className="mn-head">
                <span className="mn-icon">{CARD_META[k].icon}</span>
                <span className="mn-title">{CARD_META[k].title}</span>
                <span className="mn-sub">{CARD_META[k].sub}</span>
              </div>
              <div className="mn-body">{renderMnBody(k, content, { phOpen, setPhOpen, playContext, phoneticUk: item.phoneticUk })}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- 内容判定 ---------------- */

function hasMnKey(content: MnItem["content"], key: MnKey): boolean {
  if (key === "syl") return !!content.syl?.parts?.length;
  if (key === "morph") return !!content.morph?.pieces?.length;
  if (key === "derive") return !!content.derives?.length;
  if (key === "context") return !!content.contexts?.length;
  return false;
}

/* ---------------- 四卡内容渲染 ---------------- */

type BodyCtx = {
  phOpen: boolean;
  setPhOpen: (v: boolean) => void;
  playContext: (c: MnContext) => void;
  phoneticUk: string | null;
};

function renderMnBody(key: MnKey, content: MnItem["content"], ctx: BodyCtx): React.ReactNode {
  if (key === "syl" && content.syl) return <SylBody syl={content.syl} ctx={ctx} />;
  if (key === "morph" && content.morph) return <MorphBody morph={content.morph} />;
  if (key === "derive" && content.derives) return <DeriveBody derives={content.derives} />;
  if (key === "context" && content.contexts)
    return <ContextBody contexts={content.contexts} word={contentWordHint(content)} onPlay={ctx.playContext} />;
  return null;
}

/** headword 兜底高亮用(真实语境卡) */
function contentWordHint(content: MnItem["content"]): string {
  // word 不在 content 里,由调用方经闭包传入 —— 此处从 contexts 无从取,改由 props 链
  return (content as MnItem["content"] & { __word?: string }).__word ?? "";
}

/* ---- 读音解析卡(syl) ---- */

function SylBody({ syl, ctx }: { syl: MnSyl; ctx: BodyCtx }) {
  const ipa = syl.ipa ?? [];
  const phs = syl.phonemes ?? [];
  // 音素按音节分组:优先 phonemes[].syl;否则按 ipa 贪心拼接推断(旧数据只有 {p})
  let groups: MnSylPhoneme[][];
  if (phs.some((p) => Number.isInteger(p.syl))) {
    groups = [];
    phs.forEach((p) => {
      const gi = Number.isInteger(p.syl) ? (p.syl as number) : 0;
      (groups[gi] = groups[gi] || []).push(p);
    });
  } else {
    groups = [[]];
    let acc = "";
    let gi = 0;
    for (const p of phs) {
      groups[gi].push(p);
      acc += p.p;
      if (gi < ipa.length - 1 && acc === ipa[gi]) {
        groups.push([]);
        gi++;
        acc = "";
      }
    }
  }
  const typed = phs.some((p) => p.type === "vowel" || p.type === "consonant");
  const chipCls = (p: MnSylPhoneme) =>
    p.type === "vowel" ? "ph-v" : p.type === "consonant" ? "ph-c" : "ph-n";

  return (
    <>
      <div className="mn-syl-word-line">
        {ctx.phoneticUk && <span className="recog-phon">{ctx.phoneticUk}</span>}
      </div>
      <div className="mn-syl-chip-row">
        {syl.parts.map((p, i) => (
          <div key={i} className={`mn-syl-unit${i === syl.stress ? " stress" : ""}`} style={{ transitionDelay: `${i * 90}ms` }}>
            <span className="mn-syl-unit-idx">{i + 1}</span>
            <span className={`mn-syl-block in${i === syl.stress ? " stress" : ""}`}>{p}</span>
            {ipa[i] ? <span className="mn-syl-unit-ipa">{ipa[i]}</span> : null}
            {i === syl.stress ? (
              <span className="mn-syl-unit-mark">◉ 重音</span>
            ) : (
              <span className="mn-syl-unit-mark mn-syl-unit-mark-dim">次弱</span>
            )}
          </div>
        ))}
      </div>
      <div className="mn-line">
        <b>拼读：</b>
        {syl.parts.join(" · ")} —— 按音节拼读,重音落在第 {syl.stress + 1} 个音节
      </div>
      {phs.length > 0 && (
        <>
          <div className="mn-ph-strip">
            {groups
              .filter((g) => g.length)
              .map((g, gi) => (
                <span key={gi} className="mn-ph-group">
                  {g.map((p, pi) => (
                    <span
                      key={pi}
                      className={`mn-ph-chip ${chipCls(p)}${p.desc ? "" : " ph-thin"}`}
                      title={p.desc || undefined}
                    >
                      {p.p}
                    </span>
                  ))}
                </span>
              ))}
            {typed && (
              <span className="mn-ph-legend">
                <i className="lg-v" />
                元音
                <i className="lg-c" />
                辅音
              </span>
            )}
          </div>
          {phs.some((p) => p.desc) && (
            <>
              <button
                type="button"
                className={`mn-ph-toggle${ctx.phOpen ? " open" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  ctx.setPhOpen(!ctx.phOpen);
                }}
              >
                音素细讲
                <span className="mn-ph-caret">{ctx.phOpen ? "▼" : "▶"}</span>
              </button>
              {ctx.phOpen && (
                <div className="mn-ph-detail">
                  {phs
                    .filter((p) => p.desc)
                    .map((p, i) => (
                      <div key={i} className="mn-ph-row">
                        <span className={`mn-ph-sym ${chipCls(p)}`}>{p.p}</span>
                        <span className="mn-ph-syl-ref">第{(Number.isInteger(p.syl) ? (p.syl as number) : 0) + 1}节</span>
                        <span className="mn-ph-desc">{p.desc}</span>
                      </div>
                    ))}
                  {syl.combos && syl.combos.length > 0 && (
                    <>
                      <div className="mn-block-label">字母组合 → 读音</div>
                      {syl.combos.map((c, i) => (
                        <div key={i} className="mn-ph-combo">
                          <b>{c.letters}</b> → {c.sound}
                          <span className="mn-ph-combo-desc">{c.desc}</span>
                        </div>
                      ))}
                    </>
                  )}
                  {syl.notes && syl.notes.length > 0 && (
                    <>
                      <div className="mn-block-label">发音要点</div>
                      {syl.notes.map((n, i) => (
                        <div key={i} className="mn-ph-note">
                          {n}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}

/* ---- 构词解析卡(morph · 三型) ---- */

function MorphBody({ morph }: { morph: MnMorph }) {
  const typeLabel = MORPH_TYPE_LABEL[morph.type] ?? "词形拆解";
  return (
    <>
      <div className="mn-chip-row">
        <span className="mn-chip mn-morph-type">{typeLabel}</span>
      </div>
      {(morph.type === "compound" || morph.type === "blend") && (
        <>
          <div className="mn-morph-strip">
            {morph.pieces.map((p, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                {i > 0 && <span className="mn-morph-plus">+</span>}
                <span className="mn-morph-piece">
                  {p.piece}
                  <small>{p.meaningZh}</small>
                </span>
              </span>
            ))}
          </div>
          {morph.type === "blend" && morph.pieces.some((p) => p.fromWord) && (
            <div className="mn-morph-from">
              截自{" "}
              {morph.pieces
                .filter((p) => p.fromWord)
                .map((p, i) => (
                  <span key={i}>
                    <b>{p.fromWord}</b> → {p.piece}
                    {i < morph.pieces.filter((q) => q.fromWord).length - 1 ? "，" : ""}
                  </span>
                ))}
            </div>
          )}
        </>
      )}
      {morph.type !== "compound" && morph.type !== "blend" && (
        <>
          {morph.pieces.map((p, i) => (
            <div key={i} className="mn-pair">
              <span className="en">{p.piece}</span>
              <span className="mn-kind">{KIND_LABEL[p.kind] ?? p.kind}</span>
              <span className="cn">{p.meaningZh}</span>
            </div>
          ))}
        </>
      )}
      <div className="mn-line">
        <b>字面：</b>
        {morph.literal}
      </div>
    </>
  );
}

/* ---- 派生·词性·近义卡(derive) ---- */

function DeriveBody({ derives }: { derives: MnDerive[] }) {
  return (
    <>
      <div className="mn-block-label">派生 / 近义</div>
      {derives.map((d, i) => (
        <div key={i} className="mn-pair">
          <span className="en">{d.word}</span>
          {d.pos && <span className="mn-kind">{d.pos}</span>}
          <span className="cn">{d.meaningZh}</span>
        </div>
      ))}
    </>
  );
}

/* ---- 真实语境卡(context) ---- */

function ContextBody({
  contexts,
  word,
  onPlay,
}: {
  contexts: MnContext[];
  word: string;
  onPlay: (c: MnContext) => void;
}) {
  return (
    <>
      {contexts.map((c, i) => (
        <div key={i} className="mn-ctx-item">
          <div className="mn-ctx-en">
            <span dangerouslySetInnerHTML={{ __html: hiColl(c.en, c.coll, word) }} />
            <button
              type="button"
              className="mn-ctx-play"
              title="播放例句"
              aria-label="播放例句"
              onClick={(e) => {
                e.stopPropagation();
                onPlay(c);
              }}
            >
              <SpeakerIcon size={13} />
            </button>
          </div>
          {c.cn && <div className="mn-ctx-cn">{c.cn}</div>}
        </div>
      ))}
    </>
  );
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

/** wire 索引辅助(hoverKey → wires 下标) */
function wireIndex(wires: Wire[], key: string): number {
  const order: string[] = ["syl", "morph", "derive", "context"];
  const ki = order.indexOf(key);
  // wires 数组顺序即 MN_KEY_ORDER 过滤后的顺序;hoverKey 一定在其中
  let n = 0;
  for (const k of order) {
    if (k === key) return n;
    n++;
  }
  return -1;
}
function hasIdx(_k: string): number {
  return -1;
}
