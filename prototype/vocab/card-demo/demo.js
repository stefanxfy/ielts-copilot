/* 背单词卡片原型 · 交互逻辑（纯前端模拟，无后端依赖） */

// ---------- 词数据（取自 words 表 contentJson，真实数据） ----------
const WORDS = {
  abandon: {
    word: "abandon",
    ipa: "/əˈbændən/",
    translation: "v. 抛弃，放弃",
    definition: "to stop doing something, especially before it is finished; to stop having something",
    example: {
      en: "He abandoned his car in the desert.",
      cn: "他在沙漠中抛弃了车子。",
    },
    img: "img/abandon.png",
  },
  abundant: {
    word: "abundant",
    ipa: "/əˈbʌndənt/",
    translation: "adj. 大量的",
    definition: "existing in large quantities; more than enough",
    example: {
      en: "The fish in this pond are abundant.",
      cn: "池塘里的鱼太丰富了。",
    },
    img: "img/abundant.png",
  },
  discard: {
    word: "discard",
    ipa: "/dɪˈskɑːrd/",
    translation: "v. 丢掉，抛弃",
    definition: "to get rid of something that you no longer want or need",
    example: {
      en: "I will discard this bottle into the garbage bin.",
      cn: "我要把这个瓶子丢进垃圾桶。",
    },
    img: "img/discard.png",
  },
  isolate: {
    word: "isolate",
    ipa: "/ˈaɪsəleɪt/",
    translation: "v. 使隔离",
    definition: "to separate somebody/something physically or socially from other people or things",
    example: {
      en: "The old man built a huge fence, to isolate himself from his neighbors.",
      cn: "老人筑了一道巨大的篱笆，将自己与邻居隔绝。",
    },
    img: "img/isolate.png",
  },
  accomplish: {
    word: "accomplish",
    ipa: "/əˈkʌmplɪʃ/",
    translation: "v. 完成，做到；实现",
    definition: "to succeed in doing or completing something",
    example: {
      en: "She is so happy to have accomplished her weight-loss goal.",
      cn: "她很高兴完成了自己的减肥目标。",
    },
    img: "img/accomplish.png",
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
  recogRevealed: false, // 认词卡：点了模糊/不认识后展开中文释义
  rated: new Set(), // 背过的词(点过 认识/模糊/不认识 任一键)——右箭头只对背过的词放行
  // word_progress 单轨模拟：stage recognize|spell + 连续认识计数
  progress: Object.fromEntries(Object.keys(WORDS).map(w => [w, { stage: "recognize", streak: 0 }])),
  reviewLog: [], // { word, type, rating, ts }
  spell: {},     // 默写卡按 卡型:单词 状态：{ hints, done, result, guess }
  _spoken: null, // 听觉默写「自动播 1 次」标记（卡型:单词）
};

const $slot = document.getElementById("cardSlot");
const $wordChips = document.getElementById("wordChips");
const $typeChips = document.getElementById("typeChips");
const $progressLine = document.getElementById("progressLine");
const $reviewLog = document.getElementById("reviewLog");

// ---------- 工具 ----------
function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); }

// 喇叭图标（对齐 /learn/vocab-demo 页的 SpeakerIcon）
function speakerSvg(size = 14) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`;
}

// 左右箭头（幻灯片播放钮风格）
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
  // 经典 Levenshtein，用于模拟 ≤2 → Hard / >2 → Again
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = Math.min(dp[i-1][j] + 1, dp[i][j-1] + 1, dp[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1));
  return dp[m][n];
}

function exampleBlanked(word) {
  // 例句挖空：返回 前段/命中词/后段 三段（各段独立 esc 后拼接，避免先插标签再转义的坑）
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

// ---------- 渲染入口 ----------
function render() {
  renderChips();
  renderProgress();
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
  state.recogRevealed = false; // 换词后回到未揭示状态
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

// ---------- 默写卡通用：导航放行规则（与认词卡一致） ----------
// 当前词提交过（无论对错）→ 视为背过；背过后 左/右 箭头均可用
function spellNextAllowed() {
  const s = state.spell[spellKey(state.wordId)];
  return !!(s && s.done);
}
function spellNav(delta) {
  const id = nextWordId(delta);
  if (id) goWord(id);
}
// ---------- 音效（WebAudio 合成，无外部资源） ----------
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
  } catch (e) { /* 音频不可用则静默 */ }
}
const sfxPerfect = () => { tone(660, .12); tone(880, .14, .1); tone(1100, .22, .2); };  // 上行三连音
const sfxGreat   = () => { tone(580, .12); tone(780, .2, .1); };                        // 上行双音
const sfxGood    = () => { tone(520, .18); };                                           // 单音
const sfxWrong   = () => { tone(220, .18, 0, "square", .07); tone(165, .26, .14, "square", .07); }; // 低频下行

function playSfxByHints(hints) {
  if (hints === 0) sfxPerfect();
  else if (hints === 1) sfxGreat();
  else sfxGood();
}

function renderChips() {
  $wordChips.innerHTML = Object.keys(WORDS).map(id =>
    `<button class="chip ${id === state.wordId ? "active" : ""}" data-w="${id}">${id}</button>`).join("");
  $typeChips.innerHTML = CARD_TYPES.map(t =>
    `<button class="chip ${t.id === state.typeId ? "active" : ""}" data-t="${t.id}">${t.label}${t.ratio ? ` <span style="opacity:.55">${t.ratio}%</span>` : ""}</button>`).join("");
  $wordChips.querySelectorAll("[data-w]").forEach(b =>
    b.onclick = () => goWord(b.dataset.w));
  $typeChips.querySelectorAll("[data-t]").forEach(b =>
    b.onclick = () => { state.typeId = b.dataset.t; render(); });
}

function renderProgress() {
  const p = state.progress[state.wordId];
  $progressLine.innerHTML =
    `${state.wordId} · stage <b>${p.stage}</b> · 连续认识 <b>${p.streak}/2</b>`;
}

function pushLog(type, rating) {
  state.reviewLog.unshift({ word: state.wordId, type, rating, time: new Date() });
  $reviewLog.innerHTML = state.reviewLog.slice(0, 20).map(l =>
    `<li><span>${l.word} <span class="dim">· ${l.type}</span></span><span class="lv-${l.rating}">${l.rating}</span></li>`).join("");
}

// ---------- 认词卡（新布局：图在上 → 单词+音标+发音 → 例句+朗读 → 三键评分） ----------
// 点击「模糊/不认识」→ 例句下方展开中文释义，出现 上一个/下一个 导航
// 点击「认识」→ 直接跳下一个词
function renderRecogCard(w, opts = {}) {
  const plain = !!opts.plain; // 无图版：不渲染配图，单词升级为主视觉
  const revealed = state.recogRevealed;
  const ids = Object.keys(WORDS);
  const idx = ids.indexOf(state.wordId);
  const hasPrev = idx > 0;
  const hasNext = idx < ids.length - 1;

  $slot.innerHTML = `
    <div class="recog-stage">
      <button class="slide-nav slide-nav-prev" id="prevBtn" ${hasPrev ? "" : "disabled"} title="上一个单词" aria-label="上一个单词">
        ${chevronSvg("left")}
      </button>
      <div class="flashcard">
        <div class="face recog-face ${plain ? "recog-face-plain" : ""}">
          ${plain ? "" : `<img class="recog-img" src="${w.img}" alt="${w.word} 配图">`}

          <div class="recog-word-row ${plain ? "recog-word-row-main" : ""}">
            <span class="recog-word-wrap">
              <span class="recog-word ${plain ? "recog-word-xl" : ""}">${w.word}</span>
              <span class="recog-word-side">
                <span class="recog-phon">${w.ipa}</span>
                <button class="play-bare" id="pronBtn" title="播放单词发音" aria-label="播放单词发音 ${w.word}">
                  ${speakerSvg(15)}
                </button>
              </span>
            </span>
          </div>

          ${plain ? `<div class="recog-bottom">` : ""}
          <div class="recog-example">
            <div class="recog-example-text">
              <p class="recog-example-en"><i>${esc(w.example.en)}</i></p>
              ${revealed ? `<p class="recog-example-cn">${esc(w.example.cn)}</p>` : ""}
            </div>
            <button class="play-bare" data-speak="${esc(w.example.en)}" title="朗读例句" aria-label="朗读例句">
              ${speakerSvg(14)}
            </button>
          </div>

          ${revealed ? `
          <div class="recog-translation">
            <div class="recog-translation-label">中文释义</div>
            <div class="recog-translation-text">${esc(w.translation)}</div>
          </div>` : ""}
          ${plain ? `</div>` : ""}
        </div>
      </div>
      <button class="slide-nav slide-nav-next" id="nextBtn" ${hasNext && state.rated.has(state.wordId) ? "" : "disabled"} title="下一个单词(背过当前词后解锁)" aria-label="下一个单词">
        ${chevronSvg("right")}
      </button>
      <div class="rate-row rate-below">
        <button class="rate-btn rate-again" data-r="again">不认识</button>
        <button class="rate-btn rate-hard" data-r="hard">模糊</button>
        <button class="rate-btn rate-good" data-r="good">认识</button>
      </div>
    </div>`;

  document.getElementById("pronBtn").onclick = () => speak(w.word);
  $slot.querySelectorAll(".play-bare[data-speak]").forEach(b => {
    b.onclick = () => speak(b.dataset.speak);
  });

  function rate(r) {
    const p = state.progress[state.wordId];
    state.rated.add(state.wordId); // 点过任一评分键 → 该词背过,右箭头解锁
    if (r === "good") {
      p.streak += 1;
      if (p.streak >= 2) { p.stage = "spell"; }  // 连续 2 次认识 → 升级默写
      pushLog("认词", r);
      if (hasNext) { goWord(ids[idx + 1]); return; }  // 认识 → 自动跳下一个
      render(); // 已是最后一个：留在原地(正式实现接 session 结算)
      return;
    }
    // 模糊 / 不认识 → 展开中文释义
    p.streak = 0;
    if (p.stage === "spell") p.stage = "recognize";  // 降级回认词
    pushLog("认词", r);
    state.recogRevealed = true;
    render();
  }

  $slot.querySelectorAll(".rate-btn").forEach(b => { b.onclick = () => rate(b.dataset.r); });
  const prev = document.getElementById("prevBtn");
  const next = document.getElementById("nextBtn");
  if (prev) prev.onclick = () => recogNext(-1);
  if (next) next.onclick = () => recogNext(1);

  // 方向键垂直位置：实测单词行中心精确对齐（替代百分比估算）。
  // 必须在图片加载后重校——加载前 img 高度为 0，单词行位置会失真。
  const alignSlideNav = () => {
    // 无图版单词组会被揭示态上移，箭头要跟单词组的实际位置走
    const ref = plain
      ? $slot.querySelector(".recog-word-wrap")
      : $slot.querySelector(".recog-word-row");
    const stage = $slot.querySelector(".recog-stage");
    if (!ref || !stage) return;
    const wr = ref.getBoundingClientRect();
    const sr = stage.getBoundingClientRect();
    const top = wr.top - sr.top + wr.height / 2 - 22; // 22 = 方向键半高(44/2)
    document.getElementById("prevBtn").style.top = top + "px";
    document.getElementById("nextBtn").style.top = top + "px";
  };
  alignSlideNav();
  const recogImg = $slot.querySelector(".recog-img");
  if (recogImg && !recogImg.complete) recogImg.addEventListener("load", alignSlideNav, { once: true });
  window.addEventListener("resize", alignSlideNav);

  // 无图版单词自适应：基准 52px，音标+喇叭在词正下方（不悬挂），
  // 约束简化为「词宽 ≤ 卡内宽 - 余量」，超了逐级收缩字号（最小 40px）
  if (plain) {
    const face = $slot.querySelector(".recog-face");
    const wordEl = $slot.querySelector(".recog-word");
    const wrapEl = $slot.querySelector(".recog-word-wrap");
    const bottomEl = $slot.querySelector(".recog-bottom");
    const fitPlainWord = () => {
      const avail = face.clientWidth - 36;
      let size = 52;
      wordEl.style.fontSize = size + "px";
      while (size > 40 && wordEl.offsetWidth > avail) {
        size -= 1;
        wordEl.style.fontSize = size + "px";
      }
      // 揭示态下底部例句+释义会变高：实测与单词组的重叠量，把单词组整体上移让位；
      // 初始态（不重叠）回零，单词保持卡片几何中心
      wrapEl.style.transform = "translateY(0)";
      const wr = wrapEl.getBoundingClientRect();
      const br = bottomEl.getBoundingClientRect();
      const overlap = wr.bottom - br.top + 10; // 10px 呼吸间距，全量上移
      if (overlap > 0) wrapEl.style.transform = `translateY(${-overlap}px)`;
      alignSlideNav();
    };
    fitPlainWord();
    window.addEventListener("resize", fitPlainWord);
  }
}

// ---------- 默写卡（三型共用骨架） ----------
// 交互定稿：
// · 卡面无说明文字；听觉型自动播 1 次读音，喇叭可反复点
// · 输入为无边框字母格（参考截图样式），回车提交判分
// · 「提示」两级：一 / 音标（视觉、语境型附自动读音 1 次 + 裸喇叭）；二 / 中文释义
// · 判对：音效（0 提示 perfect / 1 提示 great / 2 提示 good）→ 自动下一个词
// · 判错：音效 + 卡面全揭示（词+音标+释义），锁定输入；提交钮变「下一个」
// · 左右方向键与认词卡一致；提交过本词（对错均可）后放行
function spellKey(wordId) { return `${state.typeId}:${wordId}`; } // 三卡型提示/判分状态互相独立

function spellState(wordId) {
  const key = spellKey(wordId);
  if (!state.spell[key]) {
    state.spell[key] = { hints: 0, done: false, result: null, guess: null };
  }
  return state.spell[key];
}

function renderDictation(w, type) {
  const s = spellState(state.wordId);
  const ids = Object.keys(WORDS);
  const idx = ids.indexOf(state.wordId);
  const hasPrev = idx > 0;
  const hasNext = idx < ids.length - 1;
  const navAllowed = spellNextAllowed();

  // ---- 提示区（分级揭示；done 后全展示） ----
  // 先构建 hintHtml：语境型要把它嵌进「图与例句之间」，其余型在刺激区之后输出
  const level = s.done ? 2 : s.hints;
  let hintHtml = "";
  if ((level >= 1 || s.done) && type !== "audio") {
    hintHtml += `
      <div class="dict-hint dict-hint-1">
        <span class="recog-phon">${w.ipa}</span>
        <button class="play-bare" id="hintPronBtn" title="播放单词发音" aria-label="播放单词发音">${speakerSvg(15)}</button>
      </div>`;
  }
  if (level >= 2 || s.done) {
    hintHtml += `
      <div class="dict-hint dict-hint-2">
        <span class="dict-hint-label">中文释义</span>
        <span class="dict-hint-text">${esc(w.translation)}</span>
      </div>`;
  }
  // 判错对照块：语境型答案已显示在例句挖空处（内联输入行），不再重复展示
  if (s.done && s.result === "wrong" && !s.gaveUp && type !== "ctx") {
    hintHtml += `
      <div class="dict-answer">
        <span class="dict-answer-label">正确拼写</span>
        <span class="dict-answer-word">${w.word}</span>
      </div>`;
  }

  // ---- 刺激区 ----
  // 语境型布局与其他默写卡对齐：图居中在上 → 两级提示居中 → 例句沉到卡片偏下；
  // 键入位直接嵌在例句挖空处（内联下划线输入框，宽度按答案字数 ch 自适应），不再单独一行
  const inputAttrs = `id="answerInput" type="text" autocomplete="off" autocapitalize="off" spellcheck="false"${s.done ? " disabled" : ""}`;
  let stimulus = "";
  if (type === "visual") {
    stimulus = `<img class="vis-img" src="${w.img}" alt="视觉提示">`;
  } else if (type === "audio") {
    // 听觉型：一级提示后整个卡片重渲染为「大图居中 + 图下音标/播放钮」，与视觉卡一级提示同款布局
    stimulus = (s.hints >= 1 || s.done) ? `
      <img class="vis-img" src="${w.img}" alt="听觉提示配图">
      <div class="dict-hint dict-hint-1">
        <span class="recog-phon">${w.ipa}</span>
        <button class="play-bare" id="hintPronBtn" title="播放单词发音" aria-label="播放单词发音">${speakerSvg(15)}</button>
      </div>` : `
      <button class="audio-play" id="playBtn" title="播放读音" aria-label="播放单词读音">${speakerSvg(34)}</button>`;
  } else {
    const b = exampleBlanked(w.word);
    // 判错对照块：语境型单独排在例句之下（gaveUp 时答案已在挖空处，不重复）
    const ctxAnswer = (s.done && s.result === "wrong" && !s.gaveUp) ? `
      <div class="dict-answer ctx-answer">
        <span class="dict-answer-label">正确拼写</span>
        <span class="dict-answer-word">${w.word}</span>
      </div>` : "";
    stimulus = `
      <img class="vis-img ctx-img" src="${w.img}" alt="语境提示配图">
      ${hintHtml}
      <div class="ctx-sentence">${esc(b.before)}<span class="ctx-blank"><input class="word-line-input ctx-blank-input" ${inputAttrs} style="width:${b.answer.length + 2}ch" /></span>${esc(b.after)}</div>
      ${ctxAnswer}
      <div id="verdictSlot"></div>`;
  }

  $slot.innerHTML = `
    <div class="recog-stage">
      <button class="slide-nav slide-nav-prev" id="prevBtn" ${hasPrev ? "" : "disabled"} title="上一个单词" aria-label="上一个单词">
        ${chevronSvg("left")}
      </button>
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
      <button class="slide-nav slide-nav-next" id="nextBtn" ${hasNext && navAllowed ? "" : "disabled"} title="下一个单词(提交本词后解锁)" aria-label="下一个单词">
        ${chevronSvg("right")}
      </button>
    </div>
    <div class="dict-actions">
      <button class="btn btn-ghost" id="hintBtn" ${s.done ? "disabled" : ""}>${s.hints >= 2 ? "查看答案" : "提示"}</button>
      <button class="btn btn-primary" id="submitBtn" ${s.gaveUp ? "disabled" : ""}>${s.done && !s.gaveUp ? "下一个" : "提交"}</button>
    </div>`;

  // ---- 单行下划线输入（无格子、无字母数提示、不换行：超长横向滚动） ----
  const input = document.getElementById("answerInput");
  input.addEventListener("input", () => {
    // 仅小写字母；不限制长度也不换行，超宽由输入框自身横向滚动
    input.value = input.value.toLowerCase().replace(/[^a-z]/g, "");
    s.draft = input.value; // 未提交草稿：重渲染（点提示）后恢复
  });
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit(); // done 后回车 = 进下一个词
    }
  });
  if (s.done) {
    // 判分后回放：判错显示用户拼写并标红；查看答案显示正确单词（灰色锁定，不可修改）
    // 语境型答案嵌在例句挖空处：gaveUp 显示句中屈折形式（如 abandoned），宽度随内容自适应
    input.value = s.gaveUp ? (type === "ctx" ? exampleBlanked(w.word).answer : w.word) : (s.guess || "");
    input.style.width = (input.value.length + 2) + "ch";
    input.classList.add(s.gaveUp ? "revealed" : (s.result === "good" ? "ok" : "bad"));
  } else {
    if (s.draft) input.value = s.draft; // 点提示等重渲染后恢复未提交草稿
    input.focus();
  }

  // ---- 提交 / 下一个 ----
  const submitBtn = document.getElementById("submitBtn");
  function submit() {
    if (s.done) { spellNav(1); return; }
    const guess = input.value.trim();
    if (!guess) { input.focus(); return; }
    grade(w, type, guess);
  }
  submitBtn.onclick = submit;

  // ---- 提示按钮：两级提示用尽后变「查看答案」----
  // 点「提示」循环 +1（一级/二级）；点「查看答案」= 放弃：答案填入输入行锁定、
  // 提交钮禁用，只能方向键 上一个/下一个，记不认识（again）
  const hintBtn = document.getElementById("hintBtn");
  if (hintBtn && !s.done) hintBtn.onclick = () => {
    if (s.hints < 2) {
      s.hints += 1;
      if (type !== "audio" && s.hints === 1) speak(w.word); // 一级提示附读音（听觉型本身就在听）
      pushLog(typeName(type), `hint${s.hints}`);
      render();
    } else {
      // 查看答案 = 不认识
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
    }
  };
  // ---- 提示区发音 ----
  const hp = document.getElementById("hintPronBtn");
  if (hp) hp.onclick = () => speak(w.word);
  const pb = document.getElementById("playBtn");
  if (pb) pb.onclick = () => speak(w.word);

  // ---- 方向键 ----
  const prev = document.getElementById("prevBtn");
  const next = document.getElementById("nextBtn");
  if (prev) prev.onclick = () => spellNav(-1);
  if (next) next.onclick = () => spellNav(1);

  // ---- 键盘全局方向键（输入聚焦时方向键留给光标移动；提交完成后输入已失焦） ----
  if (!window._spellKeyBound) {
    window._spellKeyBound = true;
    document.addEventListener("keydown", e => {
      const ae = document.activeElement;
      if (ae && ae.tagName === "INPUT") return; // 正在打字，不抢方向键
      const wid = state.wordId;
      const wObj = WORDS[wid];
      if (!wObj || !["visual", "audio", "ctx"].includes(state.typeId)) return;
      if (e.key === "ArrowLeft" && !document.getElementById("prevBtn")?.disabled) spellNav(-1);
      if (e.key === "ArrowRight" && !document.getElementById("nextBtn")?.disabled) spellNav(1);
    });
  }

  // ---- 判分结果徽标（查看答案态不显示徽标，答案已在输入行） ----
  const verdictSlot = document.getElementById("verdictSlot");
  if (s.done && !s.gaveUp && verdictSlot) {
    let badge = "";
    if (s.result === "good") {
      const label = s.hints === 0 ? "Perfect" : s.hints === 1 ? "Great" : "Good";
      badge = `<div class="dict-verdict dict-verdict-ok">✓ ${label}</div>`;
    } else {
      badge = `<div class="dict-verdict dict-verdict-bad">✗ 再看一眼，下一个词</div>`;
    }
    verdictSlot.innerHTML = badge;
  }

  // ---- 听觉型：自动播 1 次（按卡型独立标记） ----
  if (type === "audio" && !s.done && state._spoken !== spellKey(state.wordId)) {
    state._spoken = spellKey(state.wordId);
    setTimeout(() => speak(w.word), 350);
  }
}

function typeName(t) { return { visual: "视觉", audio: "听觉", ctx: "语境" }[t]; }

// ---------- 默写判分 ----------
function grade(w, type, guessRaw) {
  const s = spellState(state.wordId);
  const guess = guessRaw.trim().toLowerCase();
  if (!guess) return;

  // 语境型答案嵌在句中：句中屈折形式（如 abandoned）与原形（abandon）均判对
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
    // 0 提示 perfect / 1 great / ≥2 good
    playSfxByHints(s.hints);
    if (s.hints >= 2) p.stage = "recognize";
    pushLog(typeName(type), s.hints === 0 ? "perfect" : s.hints === 1 ? "great" : "good");
  } else {
    sfxWrong();
    p.stage = "recognize";
    p.streak = 0;
    pushLog(typeName(type), d <= 2 ? "hard" : "again");
  }

  renderDictation(w, type); // 原地重渲染：揭示全部 + 锁输入 + 提交钮变「下一个」

  // 判对：自动跳下一个词（留 900ms 让音效与揭示态被看见）；期间用户手动跳过则取消定时
  if (ok) {
    const fromWord = state.wordId;
    setTimeout(() => {
      if (state.wordId !== fromWord) return; // 用户已手动离开
      const id = nextWordId(1);
      if (id) goWord(id);
      else renderDictation(w, type); // 已是最后一个：留在揭示态
    }, 900);
  }
}

// ---------- 随机默写卡（40/30/30） ----------
document.getElementById("randomBtn").onclick = () => {
  const r = Math.random() * 100;
  state.typeId = r < 40 ? "visual" : r < 70 ? "audio" : "ctx";
  render();
};

render();
