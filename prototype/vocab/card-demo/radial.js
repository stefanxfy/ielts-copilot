/* 辐射助记卡原型 · 中心词卡 + 思维导图助记（纯前端模拟，无后端依赖） */

// ---------- 词数据（words 表 contentJson 真实数据 + 助记字段模拟） ----------
const WORDS = {
  abandon: {
    word: "abandon",
    ipa: "/əˈbændən/",
    translation: "v. 抛弃，放弃",
    example: {
      en: "He abandoned his car in the desert.",
      cn: "他在沙漠中抛弃了车子。",
    },
    img: "img/abandon.png",
    affixBreakdown: {
      parts: ["a-", "band", "-on"],
      morphs: [
        { p: "a-",   m: "处于…状态（ad- 的同化变体）" },
        { p: "band", m: "词根：控制、命令（日耳曼 *bannôn，同 ban 禁令）" },
        { p: "-on",  m: "动词后缀" },
      ],
      literal: "处于(被)命令(放弃)的状态 → 抛弃",
      trueWordSplit: { anchor: "band", meaning: "n. 乐队；带子", story: "乐队(band)散场，大家把乐器一扔各自走人——abandon" },
    },
    collocations: [
      { en: "abandon ship", cn: "弃船（逃生口令）" },
      { en: "abandon hope", cn: "放弃希望" },
      { en: "abandon a plan", cn: "放弃计划" },
    ],
    derives: [
      { en: "abandoned", cn: "adj. 被遗弃的" },
      { en: "abandonment", cn: "n. 遗弃；放任" },
      { en: "ban", cn: "n. 禁令（同根）" },
      { en: "abandon oneself to", cn: "沉溺于" },
    ],
    llmInsight: "abandon 的词根 band 源自日耳曼语「控制」，中世纪法语 abandoner 指「使自己不受控制」——所以它既有「彻底放弃」的决绝，也有「放纵（abandon oneself to）」的双面性。记忆抓手：把行李 band（带子）一松手，东西全 abandon 了。",
  },
  abundant: {
    word: "abundant",
    ipa: "/əˈbʌndənt/",
    translation: "adj. 大量的，丰富的",
    example: {
      en: "The fish in this pond are abundant.",
      cn: "池塘里的鱼太丰富了。",
    },
    img: "img/abundant.png",
    affixBreakdown: {
      parts: ["ab-", "und", "-ant"],
      morphs: [
        { p: "ab-",  m: "离开、溢出（away from）" },
        { p: "und",  m: "词根：波浪（unda，同 undulate 起伏）" },
        { p: "-ant", m: "形容词后缀：…的" },
      ],
      literal: "波浪一样涌出来 → 丰富的",
      trueWordSplit: null,
    },
    collocations: [
      { en: "abundant in", cn: "富于…（be abundant in fish）" },
      { en: "abundant resources", cn: "丰富的资源" },
    ],
    derives: [
      { en: "abundance", cn: "n. 大量（an abundance of）" },
      { en: "abundantly", cn: "adv. 丰富地" },
      { en: "redundant", cn: "adj. 冗余的（同根 und）" },
    ],
    llmInsight: "und 是「波浪」：水满到波浪一层层往外涌，就是 abundant。同一个 und 还藏在 redundant（re- 反复 + und 波浪 → 多余得溢出来 → 冗余）里——记一个词根，吃掉一对雅思高频词。",
  },
  discard: {
    word: "discard",
    ipa: "/dɪˈskɑːrd/",
    translation: "v. 丢掉，抛弃（牌）",
    example: {
      en: "I will discard this bottle into the garbage bin.",
      cn: "我要把这个瓶子丢进垃圾桶。",
    },
    img: "img/discard.png",
    affixBreakdown: {
      parts: ["dis-", "card"],
      morphs: [
        { p: "dis-", m: "分开、去掉（away）" },
        { p: "card", m: "n. 卡片、纸牌" },
      ],
      literal: "把手里的牌打出去 → 丢弃",
      trueWordSplit: { anchor: "card", meaning: "n. 卡片；纸牌", story: "打牌时把没用的牌「打出去」——discard 就是把没用的东西像出牌一样丢掉" },
    },
    collocations: [
      { en: "discard old ideas", cn: "摒弃旧观念" },
      { en: "discard a card", cn: "打出一张牌" },
    ],
    derives: [
      { en: "discardable", cn: "adj. 可丢弃的" },
      { en: "discord", cn: "n. 不和（dis- 分开 + cord 心 → 离心）" },
      { en: "dispose of", cn: "处理掉（近义）" },
    ],
    llmInsight: "discard 与 abandon 的语感差异：discard 是「有选择性、干脆地扔掉」（像打牌出牌，扔的多是具体物/旧观念），abandon 是「彻底、带情感地放弃」（弃船、弃养、放弃希望）。写作中 discard old habits 比 abandon 更常见。",
  },
  isolate: {
    word: "isolate",
    ipa: "/ˈaɪsəleɪt/",
    translation: "v. 使隔离，使孤立",
    example: {
      en: "The old man built a huge fence, to isolate himself from his neighbors.",
      cn: "老人筑了一道巨大的篱笆，将自己与邻居隔绝。",
    },
    img: "img/isolate.png",
    affixBreakdown: {
      parts: ["isol", "-ate"],
      morphs: [
        { p: "isol", m: "词根：岛（insula，同 island 半岛 peninsula）" },
        { p: "-ate", m: "动词后缀：使…" },
      ],
      literal: "使成为一座孤岛 → 隔离",
      trueWordSplit: null,
    },
    collocations: [
      { en: "isolate ... from", cn: "把…与…隔离" },
      { en: "feel isolated", cn: "感到孤立（常被动/形容词化）" },
    ],
    derives: [
      { en: "isolation", cn: "n. 隔离（in isolation）" },
      { en: "isolated", cn: "adj. 孤立的；偏远的" },
      { en: "peninsula", cn: "n. 半岛（几乎成岛）" },
      { en: "insulate", cn: "v. 隔热；绝缘（同根）" },
    ],
    llmInsight: "isolate 的灵魂意象是「岛」：insula（岛）→ 使成孤岛。同族词全在画一张地图——peninsula（半岛：paene 几乎 + insula）、insulate（用「岛」把电/热带隔开）。雅思阅读里 in isolation（孤立地）是高频搭配。",
  },
  accomplish: {
    word: "accomplish",
    ipa: "/əˈkʌmplɪʃ/",
    translation: "v. 完成，实现（目标）",
    example: {
      en: "She is so happy to have accomplished her weight-loss goal.",
      cn: "她很高兴完成了自己的减肥目标。",
    },
    img: "img/accomplish.png",
    affixBreakdown: {
      parts: ["ac-", "compl", "-ish"],
      morphs: [
        { p: "ac-",   m: "朝向（ad- 同化变体）" },
        { p: "compl", m: "词根：填满（complēre，同 complete）" },
        { p: "-ish",  m: "动词后缀" },
      ],
      literal: "朝目标把坑填满 → 完成",
      trueWordSplit: null,
    },
    collocations: [
      { en: "accomplish a goal/task", cn: "实现目标/完成任务" },
      { en: "accomplish nothing", cn: "一事无成" },
    ],
    derives: [
      { en: "accomplishment", cn: "n. 成就；造诣" },
      { en: "complete", cn: "v. 完成（同根 compl）" },
      { en: "complement", cn: "n. 补足物（同根）" },
      { en: "achieve", cn: "v. 达成（近义）" },
    ],
    llmInsight: "compl = 填满：complete 是「把空填满」，accomplish 是「朝着(ac-)目标把该填的都填满」——所以它天然搭配 goal / task / mission。三胞胎辨析：complete（填完）、complement（补足）、compliment（赞美，t 结尾多一撇 = 好话填心里）。",
  },
};

// ---------- 卡型 ----------
const CARD_TYPES = [
  { id: "recog",      label: "认词卡",      ratio: null },
  { id: "recogPlain", label: "认词卡·无图", ratio: null },
  { id: "visual", label: "视觉默写", ratio: 40 },
  { id: "audio",  label: "听觉默写", ratio: 30 },
  { id: "ctx",    label: "语境默写", ratio: 30 },
];

// ---------- 模拟状态 ----------
const state = {
  wordId: "abandon",
  typeId: "recog",
  recogRevealed: false,
  rated: new Set(),
  progress: Object.fromEntries(Object.keys(WORDS).map(w => [w, { stage: "recognize", streak: 0 }])),
  reviewLog: [],
  spell: {},
  _spoken: null,
};

const $ = id => document.getElementById(id);
const $hubWrap = $("hubCardWrap");
const $hubActions = $("hubActions");
const $stage = $("radialStage");
const $wires = $("wiresSvg");

// ---------- 工具 ----------
function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); }

function speakerSvg(size = 14) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`;
}
function chevronSvg(dir, size = 20) {
  const d = dir === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6";
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
}

function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 0.92;
  window.speechSynthesis.speak(u);
}

function editDistance(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = Math.min(dp[i-1][j] + 1, dp[i][j-1] + 1, dp[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1));
  return dp[m][n];
}

function exampleBlanked(word) {
  const re = new RegExp(word + "\\w*", "i");
  const m = WORDS[word].example.en.match(re);
  if (!m) return null;
  const i = m.index;
  return {
    before: WORDS[word].example.en.slice(0, i),
    blank: m[0],
    after: WORDS[word].example.en.slice(i + m[0].length),
    answer: m[0],
  };
}

// ---------- 音效 ----------
let _actx = null;
function tone(freq, dur, delay = 0, type = "sine", gain = 0.12) {
  try {
    _actx = _actx || new (window.AudioContext || window.webkitAudioContext)();
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
  } catch (e) { /* 静默 */ }
}
const sfxPerfect = () => { tone(660, .12); tone(880, .14, .1); tone(1100, .22, .2); };
const sfxGreat   = () => { tone(580, .12); tone(780, .2, .1); };
const sfxGood    = () => { tone(520, .18); };
const sfxWrong   = () => { tone(220, .18, 0, "square", .07); tone(165, .26, .14, "square", .07); };
// 辐射展开音效：轻快上行琶音
const sfxRadiate = () => { tone(440, .1, 0, "sine", .06); tone(554, .1, .07, "sine", .06); tone(659, .16, .14, "sine", .06); };
const sfxCollapse = () => { tone(520, .09, 0, "sine", .05); tone(392, .12, .06, "sine", .05); };

function playSfxByHints(hints) {
  if (hints === 0) sfxPerfect();
  else if (hints === 1) sfxGreat();
  else sfxGood();
}

// ---------- 渲染入口 ----------
function render() {
  renderChips();
  renderProgress();
  collapseMn(); // 换词/换卡型先收辐射
  const w = WORDS[state.wordId];
  const t = state.typeId;
  if (t === "recog") renderRecogCard(w);
  else if (t === "recogPlain") renderRecogCard(w, { plain: true });
  else if (t === "visual") renderDictation(w, "visual");
  else if (t === "audio") renderDictation(w, "audio");
  else renderDictation(w, "ctx");
}

function goWord(id) {
  state.wordId = id;
  state.recogRevealed = false;
  render();
}

function nextWordId(delta) {
  const ids = Object.keys(WORDS);
  const i = ids.indexOf(state.wordId) + delta;
  if (i < 0 || i >= ids.length) return null;
  return ids[i];
}

function recogNext(delta) {
  const id = nextWordId(delta);
  if (id) goWord(id);
}

// ---------- 辐射助记层 ----------
// 四张助记卡目标位（相对 .radial-stage 1120x680）：左上/右上/左下/右下
const MN_POS = {
  affix:  { x: 165, y: 120 },  // 词根词缀·熟词拆分 左上
  coll:   { x: 955, y: 120 },  // 词组搭配 右上
  derive: { x: 165, y: 560 },  // 派生/近义 左下
  llm:    { x: 955, y: 560 },  // LLM 解读 右下
};
const MN_KEY_ORDER = ["affix", "coll", "derive", "llm"];
// 助记卡尺寸（radial.css 固定宽 300；高度 JS 实测）
const MN_W = 300;

function mnEls() {
  return MN_KEY_ORDER.map(k => $stage.querySelector(`.mn-card[data-mn="${k}"]`));
}

// 判定某词某键是否有内容（缺内容卡不出，符合「缺字段自动收起」契约）
function mnHasContent(w, key) {
  if (!w) return false;
  if (key === "affix") return !!(w.affixBreakdown);
  if (key === "coll") return !!(w.collocations && w.collocations.length);
  if (key === "derive") return !!(w.derives && w.derives.length);
  if (key === "llm") return !!(w.llmInsight);
  return false;
}

function buildMnContent(w, key) {
  if (key === "affix") {
    const a = w.affixBreakdown;
    let html = "";
    html += `<div class="mn-chip-row">${a.parts.map(p => `<span class="mn-chip">${esc(p)}</span>`).join("")}</div>`;
    html += a.morphs.map(m =>
      `<div class="mn-pair"><span class="en">${esc(m.p)}</span><span class="cn">${esc(m.m)}</span></div>`).join("");
    html += `<div class="mn-line"><b>字面：</b>${esc(a.literal)}</div>`;
    if (a.trueWordSplit) {
      const t = a.trueWordSplit;
      html += `<hr class="mn-divider"><div class="mn-block-label">熟词拆分</div>`;
      html += `<div class="mn-pair"><span class="en">${esc(t.anchor)}</span><span class="cn">${esc(t.meaning)}</span></div>`;
      html += `<div class="mn-line">${esc(t.story)}</div>`;
    }
    return html;
  }
  if (key === "coll") {
    return `<div class="mn-block-label">词组搭配</div>` +
      w.collocations.map(c =>
        `<div class="mn-pair"><span class="en">${esc(c.en)}</span><span class="cn">${esc(c.cn)}</span></div>`).join("");
  }
  if (key === "derive") {
    return `<div class="mn-block-label">派生 / 近义</div>` +
      w.derives.map(d =>
        `<div class="mn-pair"><span class="en">${esc(d.en)}</span><span class="cn">${esc(d.cn)}</span></div>`).join("");
  }
  if (key === "llm") {
    return `<div class="mn-block-label">AI 一句话讲透</div>` +
      `<div class="llm-text">${esc(w.llmInsight)}<span class="llm-cursor"></span></div>`;
  }
  return "";
}

function buildMnCard(k, w) {
  const meta = {
    affix:  { icon: "🧩", title: "词根词缀 · 熟词拆分", sub: "morphology" },
    coll:   { icon: "🔗", title: "词组搭配",           sub: "collocations" },
    derive: { icon: "🌱", title: "派生 / 近义词",       sub: "derivatives" },
    llm:    { icon: "✨", title: "LLM 解读",           sub: "ai insight", badge: true },
  }[k];
  return `
    <div class="mn-head">
      <span class="mn-icon">${meta.icon}</span>
      <span class="mn-title">${meta.title}</span>
      ${meta.badge ? `<span class="llm-badge">AI</span>` : ""}
      <span class="mn-sub">${meta.sub}</span>
    </div>
    <div class="mn-body">${buildMnContent(w, k)}</div>`;
}

// 计算 SVG 连线路径：主卡边缘 → 助记卡边缘，贝塞尔曲线
function wirePath(hx, hy, tx, ty, side) {
  // side: 助记卡在主卡的哪一侧（左/右），控制曲线鼓包方向
  const dx = tx - hx, dy = ty - hy;
  const cx1 = hx + dx * 0.45, cy1 = hy;
  const cx2 = hx + dx * 0.55, cy2 = ty;
  return `M${hx},${hy} C${cx1},${cy1} ${cx2},${cy2} ${tx},${ty}`;
}

function drawWires() {
  const stageRect = $stage.getBoundingClientRect();
  const hubRect = $("hubCardWrap").getBoundingClientRect();
  const hx = hubRect.left - stageRect.left + hubRect.width / 2;
  const hy = hubRect.top - stageRect.top + hubRect.height / 2;

  let wires = "", dots = "";
  mnEls().forEach((el, i) => {
    const k = el.dataset.mn;
    const r = el.getBoundingClientRect();
    const tx = r.left - stageRect.left + (r.width / 2) + (k === "affix" || k === "derive" ? -r.width / 2 + 10 : r.width / 2 - 10);
    const ty = r.top - stageRect.top + r.height / 2;
    const color = getComputedStyle(el).getPropertyValue("--c").trim() || "#888";
    const side = (k === "affix" || k === "derive") ? "left" : "right";
    // 主卡边缘起点：从中心向目标方向推进到主卡边缘附近
    const hw = hubRect.width / 2 + 6, hh = hubRect.height / 2 + 6;
    const sx = hx + (tx > hx ? hw : -hw) * 0.72;
    const sy = hy + (ty > hy ? hh : -hh) * 0.55;
    wires += `<path class="wire" d="${wirePath(sx, sy, tx, ty, side)}" stroke="${color}" style="color:${color}"/>`;
    dots += `<circle class="wire-dot" cx="${tx}" cy="${ty}" r="0" fill="${color}"/>`;
  });
  $wires.innerHTML = wires + dots;
  // 触发生长动画（下一帧加 class 确保 transition 生效；rAF 不触发时 setTimeout 兜底）
  const startDraw = () => $wires.classList.add("drawn");
  requestAnimationFrame(() => requestAnimationFrame(startDraw));
  setTimeout(startDraw, 200);
}

// 展开 / 收起辐射层
let _mnOpen = false;
function radiateMn(w) {
  if (_mnOpen) return;
  _mnOpen = true;
  $stage.classList.add("radial-on");
  // 主卡收缩（视觉让位）
  $("hubCardWrap").style.width = "340px";
  $("hubActions").style.maxWidth = "340px";

  const stageRect = $stage.getBoundingClientRect();
  const hubRect = $("hubCardWrap").getBoundingClientRect();
  const hcx = hubRect.left - stageRect.left + hubRect.width / 2;
  const hcy = hubRect.top - stageRect.top + hubRect.height / 2;

  let visible = [];
  mnEls().forEach((el, i) => {
    const k = el.dataset.mn;
    if (!mnHasContent(w, k)) { el.classList.remove("show"); el.innerHTML = ""; return; }
    el.innerHTML = buildMnCard(k, w);
    const pos = MN_POS[k];
    // 初始：中心点缩团
    el.style.left = hcx + "px";
    el.style.top = hcy + "px";
    el.style.transform = "translate(-50%, -50%) scale(.2)";
    el.classList.add("show");
    visible.push({ el, k, pos });
  });

  // 逐张落位（stagger 90ms）
  visible.forEach(({ el, k, pos }, i) => {
    setTimeout(() => {
      el.style.left = pos.x + "px";
      el.style.top = pos.y + "px";
      el.style.transform = "translate(-50%, -50%) scale(1)";
    }, 120 + i * 90);
  });

  sfxRadiate();

  // 连线生长：等卡片基本落位后
  setTimeout(() => drawWires(), 120 + visible.length * 90 + 80);

  // hover 助记卡 → 对应连线加粗
  setTimeout(() => {
    visible.forEach(({ el, k }, i) => {
      const wire = $wires.querySelectorAll(".wire")[i];
      const dot = $wires.querySelectorAll(".wire-dot")[i];
      el.addEventListener("mouseenter", () => { wire && wire.classList.add("hl"); });
      el.addEventListener("mouseleave", () => { wire && wire.classList.remove("hl"); });
    });
  }, 600);
}

function collapseMn() {
  if (!_mnOpen) { $wires.classList.remove("drawn"); $wires.innerHTML = ""; return; }
  _mnOpen = false;
  $stage.classList.remove("radial-on");
  $("hubCardWrap").style.width = "";
  $("hubActions").style.maxWidth = "";
  sfxCollapse();
  $wires.classList.remove("drawn");
  mnEls().forEach(el => {
    el.classList.remove("show");
    el.classList.add("hide");
    el.style.left = "";
    el.style.top = "";
    el.style.transform = "";
    setTimeout(() => { el.classList.remove("hide"); el.innerHTML = ""; }, 320);
  });
  setTimeout(() => { $wires.innerHTML = ""; }, 350);
}

// ---------- chips / 侧栏 ----------
function renderChips() {
  $("wordChips").innerHTML = Object.keys(WORDS).map(id =>
    `<button class="chip ${id === state.wordId ? "active" : ""}" data-w="${id}">${id}</button>`).join("");
  $("typeChips").innerHTML = CARD_TYPES.map(t =>
    `<button class="chip ${t.id === state.typeId ? "active" : ""}" data-t="${t.id}">${t.label}${t.ratio ? ` <span style="opacity:.55">${t.ratio}%</span>` : ""}</button>`).join("");
  $("wordChips").querySelectorAll("[data-w]").forEach(b =>
    b.onclick = () => goWord(b.dataset.w));
  $("typeChips").querySelectorAll("[data-t]").forEach(b =>
    b.onclick = () => { state.typeId = b.dataset.t; render(); });
}

function renderProgress() {
  const p = state.progress[state.wordId];
  $("progressLine").innerHTML =
    `${state.wordId} · stage <b>${p.stage}</b> · 连续认识 <b>${p.streak}/2</b>`;
}

function pushLog(type, rating) {
  state.reviewLog.unshift({ word: state.wordId, type, rating, time: new Date() });
  $("reviewLog").innerHTML = state.reviewLog.slice(0, 20).map(l =>
    `<li><span>${l.word} <span class="dim">· ${l.type}</span></span><span class="lv-${l.rating}">${l.rating}</span></li>`).join("");
}

// ---------- 认词卡 ----------
// v2.1 契约 + 辐射助记：模糊/不认识 → 揭示中文 + 辐射四类助记卡；认识 → 直接下一个
function renderRecogCard(w, opts = {}) {
  const plain = !!opts.plain;
  const revealed = state.recogRevealed;
  const ids = Object.keys(WORDS);
  const idx = ids.indexOf(state.wordId);
  const hasPrev = idx > 0;
  const hasNext = idx < ids.length - 1;

  $hubWrap.innerHTML = `
    <div class="recog-stage">
      <div class="flashcard">
        <div class="face recog-face ${plain ? "recog-face-plain" : ""}">
          ${plain ? "" : `<img class="recog-img" src="${w.img}" alt="${w.word} 配图">`}
          <div class="recog-word-row ${plain ? "recog-word-row-main" : ""}">
            <span class="recog-word-wrap">
              <span class="recog-word ${plain ? "recog-word-xl" : ""}">${w.word}</span>
              <span class="recog-word-side">
                <span class="recog-phon">${w.ipa}</span>
                <button class="play-bare" id="pronBtn" title="播放单词发音">${speakerSvg(15)}</button>
              </span>
            </span>
          </div>
          ${plain ? `<div class="recog-bottom">` : ""}
          <div class="recog-example">
            <div class="recog-example-text">
              <p class="recog-example-en"><i>${esc(w.example.en)}</i></p>
              ${revealed ? `<p class="recog-example-cn">${esc(w.example.cn)}</p>` : ""}
            </div>
            <button class="play-bare" data-speak="${esc(w.example.en)}" title="朗读例句">${speakerSvg(14)}</button>
          </div>
          ${revealed ? `
          <div class="recog-translation">
            <div class="recog-translation-label">中文释义</div>
            <div class="recog-translation-text">${esc(w.translation)}</div>
          </div>` : ""}
          ${plain ? `</div>` : ""}
        </div>
      </div>
    </div>`;

  // 左右导航 + 评分/下一个按钮行（hub-actions 钉在卡下）
  if (!revealed) {
    $hubActions.innerHTML = `
      <button class="rate-btn rate-again" data-r="again">不认识</button>
      <button class="rate-btn rate-hard" data-r="hard">模糊</button>
      <button class="rate-btn rate-good" data-r="good">认识</button>`;
  } else {
    // 揭示态：无二次评分，「下一个」直接走词（v2.1）
    $hubActions.innerHTML = `
      <button class="btn btn-ghost" id="collapseBtn">收起助记</button>
      <button class="btn btn-primary" id="nextWordBtn">下一个 →</button>`;
  }

  $("pronBtn").onclick = () => speak(w.word);
  $hubWrap.querySelectorAll(".play-bare[data-speak]").forEach(b => {
    b.onclick = () => speak(b.dataset.speak);
  });

  function rate(r) {
    const p = state.progress[state.wordId];
    state.rated.add(state.wordId);
    if (r === "good") {
      p.streak += 1;
      if (p.streak >= 2) { p.stage = "spell"; }
      pushLog("认词", r);
      sfxGood();
      if (hasNext) { goWord(ids[idx + 1]); return; }
      render();
      return;
    }
    // 模糊 / 不认识 → 揭示 + 辐射助记
    p.streak = 0;
    if (p.stage === "spell") p.stage = "recognize";
    pushLog("认词", r);
    state.recogRevealed = true;
    render();
    // 渲染完揭示态主卡后展开辐射层
    setTimeout(() => radiateMn(w), 60);
  }

  $hubActions.querySelectorAll(".rate-btn").forEach(b => { b.onclick = () => rate(b.dataset.r); });
  const nw = $("nextWordBtn");
  if (nw) nw.onclick = () => { const id = nextWordId(1); if (id) goWord(id); };
  const cb = $("collapseBtn");
  if (cb) cb.onclick = () => { collapseMn(); render(); };
}

// ---------- 默写卡 ----------
function spellKey(wordId) { return `${state.typeId}:${wordId}`; }

function spellState(wordId) {
  const key = spellKey(wordId);
  if (!state.spell[key]) {
    state.spell[key] = { hints: 0, done: false, result: null, guess: null };
  }
  return state.spell[key];
}

function spellNextAllowed() {
  const s = state.spell[spellKey(state.wordId)];
  return !!(s && s.done);
}
function spellNav(delta) {
  const id = nextWordId(delta);
  if (id) goWord(id);
}

function renderDictation(w, type) {
  const s = spellState(state.wordId);
  const navAllowed = spellNextAllowed();

  // ---- 提示区 ----
  const level = s.done ? 2 : s.hints;
  let hintHtml = "";
  if ((level >= 1 || s.done) && type !== "audio") {
    hintHtml += `
      <div class="dict-hint dict-hint-1">
        <span class="recog-phon">${w.ipa}</span>
        <button class="play-bare" id="hintPronBtn" title="播放单词发音">${speakerSvg(15)}</button>
      </div>`;
  }
  if (level >= 2 || s.done) {
    hintHtml += `
      <div class="dict-hint dict-hint-2">
        <span class="dict-hint-label">中文释义</span>
        <span class="dict-hint-text">${esc(w.translation)}</span>
      </div>`;
  }
  if (s.done && s.result === "wrong" && !s.gaveUp && type !== "ctx") {
    hintHtml += `
      <div class="dict-answer">
        <span class="dict-answer-label">正确拼写</span>
        <span class="dict-answer-word">${w.word}</span>
      </div>`;
  }

  const inputAttrs = `id="answerInput" type="text" autocomplete="off" autocapitalize="off" spellcheck="false"${s.done ? " disabled" : ""}`;
  let stimulus = "";
  if (type === "visual") {
    stimulus = `<img class="vis-img" src="${w.img}" alt="视觉提示">`;
  } else if (type === "audio") {
    stimulus = (s.hints >= 1 || s.done) ? `
      <img class="vis-img" src="${w.img}" alt="听觉提示配图">
      <div class="dict-hint dict-hint-1">
        <span class="recog-phon">${w.ipa}</span>
        <button class="play-bare" id="hintPronBtn" title="播放单词发音">${speakerSvg(15)}</button>
      </div>` : `
      <button class="audio-play" id="playBtn" title="播放读音">${speakerSvg(34)}</button>`;
  } else {
    const b = exampleBlanked(w.word);
    const ctxAnswer = (s.done && s.result === "wrong" && !s.gaveUp) ? `
      <div class="dict-answer ctx-answer">
        <span class="dict-answer-label">正确拼写</span>
        <span class="dict-answer-word">${w.word}</span>
      </div>` : "";
    stimulus = `
      <img class="vis-img ctx-img" src="${w.img}" alt="语境提示配图" style="max-height:170px">
      ${hintHtml}
      <div class="ctx-sentence">${esc(b.before)}<span class="ctx-blank"><input class="word-line-input ctx-blank-input" ${inputAttrs} style="width:${b.answer.length + 2}ch" /></span>${esc(b.after)}</div>
      ${ctxAnswer}
      <div id="verdictSlot"></div>`;
  }

  $hubWrap.innerHTML = `
    <div class="recog-stage">
      <div class="flashcard">
        <div class="face dictation-face">
          ${stimulus}
          ${type === "ctx" ? "" : hintHtml}
          ${type === "ctx" ? "" : `
          <div class="dict-input-area">
            <input class="word-line-input" ${inputAttrs} />
            <div id="verdictSlot"></div>
          </div>`}
        </div>
      </div>
    </div>`;

  if (!s.done) {
    $hubActions.innerHTML = `
      <button class="btn btn-ghost" id="hintBtn">${s.hints >= 2 ? "查看答案" : "提示"}</button>
      <button class="btn btn-primary" id="submitBtn">提交</button>`;
  } else {
    // 判分后：判对自动跳词（同 v2.1 判对 ≡ 认识）；判错/查看答案 → 辐射助记 + 下一个
    $hubActions.innerHTML = s.gaveUp || s.result === "wrong" ? `
      <button class="btn btn-ghost" id="collapseBtn">收起助记</button>
      <button class="btn btn-primary" id="nextWordBtn">下一个 →</button>` : `
      <button class="btn btn-primary" id="nextWordBtn">下一个 →</button>`;
  }

  const input = $("answerInput");
  if (input) {
    input.addEventListener("input", () => {
      input.value = input.value.toLowerCase().replace(/[^a-z]/g, "");
      s.draft = input.value;
    });
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") { e.preventDefault(); submit(); }
    });
    if (s.done) {
      input.value = s.gaveUp ? (type === "ctx" ? exampleBlanked(w.word).answer : w.word) : (s.guess || "");
      input.style.width = (input.value.length + 2) + "ch";
      input.classList.add(s.gaveUp ? "revealed" : (s.result === "good" ? "ok" : "bad"));
    } else {
      if (s.draft) input.value = s.draft;
      input.focus();
    }
  }

  const submitBtn = $("submitBtn");
  function submit() {
    const guess = input.value.trim();
    if (!guess) { input.focus(); return; }
    grade(w, type, guess);
  }
  if (submitBtn) submitBtn.onclick = submit;

  const hintBtn = $("hintBtn");
  if (hintBtn && !s.done) hintBtn.onclick = () => {
    if (s.hints < 2) {
      s.hints += 1;
      if (type !== "audio" && s.hints === 1) speak(w.word);
      pushLog(typeName(type), `hint${s.hints}`);
      render();
    } else {
      // 查看答案 = 不认识：揭示 + 辐射
      s.done = true;
      s.gaveUp = true;
      s.result = "wrong";
      s.guess = null;
      s.draft = null;
      sfxWrong();
      pushLog(typeName(type), "reveal");
      const p = state.progress[state.wordId];
      p.stage = "recognize";
      p.streak = 0;
      renderDictation(w, type);
      setTimeout(() => radiateMn(w), 60);
    }
  };

  const hp = $("hintPronBtn");
  if (hp) hp.onclick = () => speak(w.word);
  const pb = $("playBtn");
  if (pb) pb.onclick = () => speak(w.word);

  const nw = $("nextWordBtn");
  if (nw) nw.onclick = () => spellNav(1);
  const cb = $("collapseBtn");
  if (cb) cb.onclick = () => { collapseMn(); renderDictation(w, type); };

  // 键盘全局方向键
  if (!window._spellKeyBound) {
    window._spellKeyBound = true;
    document.addEventListener("keydown", e => {
      const ae = document.activeElement;
      if (ae && ae.tagName === "INPUT") return;
      if (!["visual", "audio", "ctx"].includes(state.typeId)) return;
      if (e.key === "ArrowRight") spellNav(1);
    });
  }

  // 判分徽标
  const verdictSlot = $("verdictSlot");
  if (s.done && !s.gaveUp && verdictSlot) {
    let badge = "";
    if (s.result === "good") {
      const label = s.hints === 0 ? "Perfect" : s.hints === 1 ? "Great" : "Good";
      badge = `<div class="dict-verdict dict-verdict-ok">✓ ${label}</div>`;
    } else {
      badge = `<div class="dict-verdict dict-verdict-bad">✗ 看看四张助记卡，然后下一个</div>`;
    }
    verdictSlot.innerHTML = badge;
  }

  // 听觉型自动播 1 次
  if (type === "audio" && !s.done && state._spoken !== spellKey(state.wordId)) {
    state._spoken = spellKey(state.wordId);
    setTimeout(() => speak(w.word), 350);
  }
}

function typeName(t) { return { visual: "视觉", audio: "听觉", ctx: "语境" }[t]; }

function grade(w, type, guessRaw) {
  const s = spellState(state.wordId);
  const guess = guessRaw.trim().toLowerCase();
  if (!guess) return;

  const answers = [w.word.toLowerCase()];
  if (type === "ctx") answers.push(exampleBlanked(w.word).answer.toLowerCase());
  const ok = answers.includes(guess);
  const d = editDistance(guess, w.word.toLowerCase());
  s.done = true;
  s.result = ok ? "good" : "wrong";
  s.guess = guess;
  s.draft = null;

  const p = state.progress[state.wordId];
  if (ok) {
    playSfxByHints(s.hints);
    if (s.hints >= 2) p.stage = "recognize";
    pushLog(typeName(type), s.hints === 0 ? "perfect" : s.hints === 1 ? "great" : "good");
  } else {
    sfxWrong();
    p.stage = "recognize";
    p.streak = 0;
    pushLog(typeName(type), d <= 2 ? "hard" : "again");
  }

  renderDictation(w, type);

  if (ok) {
    // 判对 ≡ 认识：零辐射，自动下一个
    const fromWord = state.wordId;
    setTimeout(() => {
      if (state.wordId !== fromWord) return;
      const id = nextWordId(1);
      if (id) goWord(id);
      else renderDictation(w, type);
    }, 900);
  } else {
    // 判错 → 辐射助记
    setTimeout(() => radiateMn(w), 120);
  }
}

// ---------- 随机默写卡 ----------
$("randomBtn").onclick = () => {
  const r = Math.random() * 100;
  state.typeId = r < 40 ? "visual" : r < 70 ? "audio" : "ctx";
  render();
};

// ---------- 舞台自适应缩放（1120x680 等比适配 wrap 宽度） ----------
function fitStage() {
  const wrap = $stage.parentElement;
  const scale = Math.min(1, wrap.clientWidth / 1120);
  $stage.style.transform = `scale(${scale})`;
  wrap.style.height = 680 * scale + "px";
}
window.addEventListener("resize", fitStage);

fitStage();
render();
