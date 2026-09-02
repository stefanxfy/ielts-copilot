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
  { id: "recog",  label: "认词卡",   ratio: null },
  { id: "visual", label: "视觉默写", ratio: 40 },
  { id: "audio",  label: "听觉默写", ratio: 30 },
  { id: "ctx",    label: "语境默写", ratio: 30 },
];

// ---------- 模拟状态 ----------
const state = {
  wordId: "abandon",
  typeId: "recog",
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
function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }

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
  else if (t === "visual") renderDictation(w, "visual");
  else if (t === "audio") renderDictation(w, "audio");
  else renderDictation(w, "ctx");
}

function renderChips() {
  $wordChips.innerHTML = Object.keys(WORDS).map(id =>
    `<button class="chip ${id === state.wordId ? "active" : ""}" data-w="${id}">${id}</button>`).join("");
  $typeChips.innerHTML = CARD_TYPES.map(t =>
    `<button class="chip ${t.id === state.typeId ? "active" : ""}" data-t="${t.id}">${t.label}${t.ratio ? ` <span style="opacity:.55">${t.ratio}%</span>` : ""}</button>`).join("");
  $wordChips.querySelectorAll("[data-w]").forEach(b =>
    b.onclick = () => { state.wordId = b.dataset.w; render(); });
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

// ---------- 认词卡 ----------
function renderRecogCard(w) {
  $slot.innerHTML = `
    <div class="flashcard" id="flashcard">
      <div class="flashcard-inner">
        <div class="face face-front">
          <span class="recog-badge">认词卡 · 认识连续 2 次升级默写</span>
          <div class="recog-word">${w.word}</div>
          <div class="recog-phon">
            ${w.ipa}
            <button class="icon-btn" id="pronBtn" title="发音">🔊</button>
          </div>
          <img class="recog-img" src="${w.img}" alt="${w.word} 配图">
          <div class="flip-hint">点击卡片翻面查看释义</div>
        </div>
        <div class="face face-back">
          <span class="recog-badge">认词卡 · 释义面</span>
          <div class="recog-trans">${esc(w.translation)}</div>
          <div class="recog-def">${esc(w.definition)}</div>
          <div class="recog-def" style="margin-top:10px">
            <i>${esc(w.example.en)}</i><br>${esc(w.example.cn)}
          </div>
          <div class="rate-row" style="margin-top:auto">
            <button class="rate-btn rate-again" data-r="again">不认识</button>
            <button class="rate-btn rate-hard" data-r="hard">模糊</button>
            <button class="rate-btn rate-good" data-r="good">认识</button>
          </div>
        </div>
      </div>
    </div>`;

  const card = document.getElementById("flashcard");
  card.addEventListener("click", (e) => {
    if (e.target.closest(".rate-btn") || e.target.closest("#pronBtn")) return;
    card.classList.toggle("flipped");
  });
  document.getElementById("pronBtn").onclick = () => speak(w.word);

  card.querySelectorAll(".rate-btn").forEach(b => {
    b.onclick = () => {
      const r = b.dataset.r;
      const p = state.progress[state.wordId];
      if (r === "good") {
        p.streak += 1;
        if (p.streak >= 2) { p.stage = "spell"; }  // 连续 2 次认识 → 升级默写
      } else {
        p.streak = 0;
        if (p.stage === "spell") p.stage = "recognize";  // 降级回认词
      }
      pushLog("认词", r);
      render();
    };
  });
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
