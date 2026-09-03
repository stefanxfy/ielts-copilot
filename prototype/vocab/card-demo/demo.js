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
  // 例句挖空：不区分大小写整体匹配，挖空处替换为占位
  const re = new RegExp(word + "\\w*", "i");
  const m = WORDS[word].example.en.match(re);
  if (!m) return null;
  const blanked = WORDS[word].example.en.replace(re, '<span class="blank">______</span>');
  return { html: esc2html(blanked), answer: m[0] };
}
// 例句含标点，直接构造安全 HTML：先转义再插入占位 span
function esc2html(s) { return esc(s); }

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

function recogNext(delta) {
  const ids = Object.keys(WORDS);
  const i = ids.indexOf(state.wordId) + delta;
  if (i < 0 || i >= ids.length) return; // 首个没有上一个,末尾没有下一个
  goWord(ids[i]);
}

/** 下一个箭头放行规则:当前词已背过(点过任一评分键)。背过的词回来时随时可点下一个 */
function nextAllowed() {
  return state.rated.has(state.wordId);
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
      <button class="slide-nav slide-nav-next" id="nextBtn" ${hasNext && nextAllowed() ? "" : "disabled"} title="下一个单词(背过当前词后解锁)" aria-label="下一个单词">
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
function renderDictation(w, type) {
  const labels = {
    visual: "视觉型默写 · 看图拼写（40%）",
    audio:  "听觉型默写 · 听音拼写（30%）",
    ctx:    "语境型默写 · 例句挖空（30%）",
  };
  const hints = {
    visual: "根据配图拼出这个单词",
    audio:  "点击喇叭听读音（可反复听），拼出单词",
    ctx:    "根据例句语境与中文翻译，补全挖空单词",
  };
  let stimulus = "";
  if (type === "visual") {
    stimulus = `<img class="vis-img" src="${w.img}" alt="视觉提示">`;
  } else if (type === "audio") {
    stimulus = `
      <button class="audio-play" id="playBtn" title="播放读音">🔊</button>
      <div class="audio-tip">点按播放 · 可重复</div>`;
  } else {
    const b = exampleBlanked(w.word);
    stimulus = `
      <div class="ctx-sentence">${b.html}</div>
      <div class="ctx-trans">${esc(w.example.cn)}</div>
      <img class="ctx-hint-img" src="${w.img}" alt="语境提示图">
      <div class="audio-tip" style="text-align:left;margin-top:8px">辅助提示：中文翻译 + 弱化配图</div>`;
  }

  $slot.innerHTML = `
    <div class="flashcard">
      <div class="face" style="position:relative;min-height:420px">
        <span class="type-badge">${labels[type]}</span>
        <div class="dictation-title">${hints[type]}</div>
        ${stimulus}
        <div class="input-row">
          <input class="word-input" id="answerInput" type="text"
                 autocomplete="off" autocapitalize="off" spellcheck="false"
                 placeholder="输入拼写后回车" />
          <div class="submit-row">
            <button class="btn btn-ghost" id="revealBtn">显示答案</button>
            <button class="btn btn-primary" id="submitBtn">提交</button>
          </div>
          <div id="verdictSlot"></div>
        </div>
      </div>
    </div>`;

  const input = document.getElementById("answerInput");
  input.focus();

  if (type === "audio") {
    document.getElementById("playBtn").onclick = () => speak(w.word);
  }

  const submit = () => grade(w, type, input.value);
  document.getElementById("submitBtn").onclick = submit;
  input.addEventListener("keydown", e => { if (e.key === "Enter") submit(); });
  document.getElementById("revealBtn").onclick = () => {
    pushLog(typeName(type), "reveal");
    input.value = w.word;
    input.disabled = true;
    showVerdict(w, "reveal", null);
  };
}

function typeName(t) { return { visual: "视觉", audio: "听觉", ctx: "语境" }[t]; }

// ---------- 判分（模拟文档 §10.2/§10.3 规则） ----------
function grade(w, type, input) {
  const answer = w.word;
  const guess = input.value.trim().toLowerCase();
  if (!guess) { input.focus(); return; }

  let rating;
  if (guess === answer) rating = "good";
  else {
    const d = editDistance(guess, answer);
    rating = d <= 2 ? "hard" : "again";   // ≤2 部分错误 Hard；>2 差距很大 Again
  }

  const p = state.progress[state.wordId];
  if (rating === "good") { /* spell 保持，streak 不涉及 */ }
  else if (rating === "hard") { p.stage = "recognize"; }
  else { p.stage = "recognize"; p.streak = 0; }

  pushLog(typeName(type), rating);
  showVerdict(w, rating, guess);
}

function showVerdict(w, rating, guess) {
  const slot = document.getElementById("verdictSlot");
  const input = document.getElementById("answerInput");
  const submitBtn = document.getElementById("submitBtn");
  let cls = "", html = "";

  if (rating === "reveal") {
    cls = "verdict-hard";
    html = `<b>答案：${w.word}</b><br>看过答案的词，评分最多记 Hard——下次还会再来。`;
  } else if (rating === "good") {
    cls = "verdict-ok"; input.classList.add("ok");
    html = `<b>✓ 拼写正确</b><br>Next: FSRS-5 间隔重排（正式实现接 ts-fsrs）。`;
  } else if (rating === "hard") {
    cls = "verdict-hard"; input.classList.add("bad");
    const d = editDistance(guess, w.word);
    html = `<b>△ 接近正确（编辑距离 ${d}）</b><br>你的答案 <span class="diff">${esc(guess)}</span> · 正确 <span class="diff">${w.word}</span><br>记 Hard，降回认词卡。`;
  } else {
    cls = "verdict-again"; input.classList.add("bad");
    const d = editDistance(guess, w.word);
    html = `<b>✗ 差距较大（编辑距离 ${d}）</b><br>你的答案 <span class="diff">${esc(guess)}</span> · 正确 <span class="diff">${w.word}</span><br>记 Again，降为不认识。`;
  }

  slot.innerHTML = `<div class="verdict ${cls}">${html}</div>`;
  submitBtn.textContent = "再来一次";
  submitBtn.onclick = () => render();  // 重抽本词重练
  input.disabled = true;
  renderProgress();
}

// ---------- 随机默写卡（40/30/30） ----------
document.getElementById("randomBtn").onclick = () => {
  const r = Math.random() * 100;
  state.typeId = r < 40 ? "visual" : r < 70 ? "audio" : "ctx";
  render();
};

render();
