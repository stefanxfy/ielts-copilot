/* 词库列表原型 · 演示数据与交互 */

/* ---------- 演示数据（对齐 word_books 真实字段 + 模拟聚合） ---------- */
const BOOKS = [
  {
    bookId: "ielts-core-pilot",
    name: "雅思核心 100 词",
    source: "builtin",
    cover: "img/cover-ielts.png",
    total: 100,
    learned: 0,
    hasAudio: true,
    imgCount: 5,          // 已生图词数（abandon/abundant/accomplish/discard/isolate）
    status: "ready",      // ready | generating
  },
  {
    bookId: "cambridge-ielts-fake",
    name: "剑桥雅思词汇精选",
    source: "custom",
    cover: "img/cover-demo2.png",
    total: 2586,
    learned: 342,
    hasAudio: true,
    imgCount: 1310,
    status: "ready",
  },
  {
    bookId: "importing-demo",
    name: "_GRE 3000（导入中…）",
    source: "custom",
    cover: null,          // 生成中无封面
    total: 3000,
    learned: 0,
    hasAudio: false,
    imgCount: 0,
    status: "generating",
    genDone: 1024,        // 已完成抓取+音频的词数
    genTotal: 3000,
    genPhase: "音频合成",  // 当前阶段文案
  },
];

const $grid = document.getElementById("bookGrid");

/* ---------- 渲染 ---------- */
function render() {
  $grid.innerHTML = BOOKS.map((b, i) => {
    const pct = b.total ? Math.round((b.learned / b.total) * 100) : 0;
    const badge =
      b.status === "generating"
        ? `<span class="source-badge generating">导入中</span>`
        : b.source === "builtin"
          ? `<span class="source-badge builtin">内置</span>`
          : `<span class="source-badge custom">自定义</span>`;

    const genLine =
      b.status === "generating"
        ? `<div class="gen-line"><span class="spinner"></span>${b.genPhase} ${b.genDone}/${b.genTotal}</div>`
        : `<div class="gen-line" style="color:var(--muted-foreground)">配图 ${b.imgCount}/${b.total} · 音频 ${b.hasAudio ? "已就绪" : "未合成"}</div>`;

    return `
    <article class="book-card" data-idx="${i}">
      <div class="cover">
        ${b.cover ? `<img src="${b.cover}" alt="${b.name} 封面">` : `<div style="width:100%;height:100%;background:linear-gradient(135deg,var(--muted),var(--secondary))"></div>`}
        <div class="cover-meta">
          <h3 class="book-name">${b.name}</h3>
          ${badge}
        </div>
      </div>
      <div class="book-body">
        <div class="stat-row">
          <span><b>${b.total}</b> 词</span>
          <span>已学 <b>${b.learned}</b></span>
          <span>配图 <b>${b.imgCount}</b></span>
        </div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
        <div class="progress-label"><span>学习进度</span><span>${pct}%</span></div>
        ${genLine}
      </div>
      <div class="card-actions">
        <button class="mini-btn" data-act="study" data-idx="${i}">开始学习</button>
        <button class="mini-btn" data-act="cover" data-idx="${i}">重新生成封面</button>
        <button class="mini-btn" data-act="manage" data-idx="${i}">管理</button>
        <button class="mini-btn danger" data-act="delete" data-idx="${i}">删除</button>
      </div>
    </article>`;
  }).join("");
}

/* ---------- 卡片点击 / 操作 ---------- */
$grid.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-act]");
  const card = e.target.closest(".book-card");
  if (!card) return;
  const b = BOOKS[+card.dataset.idx];

  if (btn) {
    const act = btn.dataset.act;
    if (act === "study") return;              // 正式版跳 /learn/vocab?book=
    if (act === "cover") { b.cover = b.cover === "img/cover-ielts.png" ? "img/cover-demo2.png" : "img/cover-ielts.png"; render(); return; }
    if (act === "manage") return;             // 正式版跳词库管理页
    if (act === "delete") { BOOKS.splice(+card.dataset.idx, 1); render(); return; }
  }
  // 点卡片本体 = 开始学习（generating 态拦截）
  if (b.status === "generating") {
    btnFlash(card, "导入完成后可学习");
  }
});

function btnFlash(card, text) {
  const old = card.querySelector(".book-name").textContent;
  card.querySelector(".book-name").textContent = text;
  setTimeout(() => { card.querySelector(".book-name").textContent = old; }, 900);
}

/* ---------- 配图风格池（对齐 src/lib/vocab-image-styles.ts）---------- */
const IMAGE_STYLES = [
  { id: "s1",  label: "暖色扁平插画", desc: "pastel 绘本 · 词义可读性最好",  img: "img/styles/s1-v1.png",  def: true },
  { id: "s6",  label: "彩铅手绘",     desc: "铅笔颗粒 · 绘本内页感",          img: "img/styles/s6-v2.png" },
  { id: "s8",  label: "暖调胶片摄影", desc: "Kodak 色调 · 胶片颗粒",          img: "img/styles/s8-v2.png" },
  { id: "s10", label: "古风动漫",     desc: "国风动画 · 水墨渐变",            img: "img/styles/s10-v2.png" },
  { id: "s11", label: "巨构史诗",     desc: "巨构对比 · 史诗构图",            img: "img/styles/s11-v2.png" },
];
let selectedStyle = "s1";

function renderStyleGrid() {
  const grid = document.getElementById("styleGrid");
  grid.innerHTML = IMAGE_STYLES.map(
    (s) => `
    <div class="style-card ${s.id === selectedStyle ? "selected" : ""}" data-style="${s.id}">
      <img src="${s.img}" alt="${s.label} 预览（abandon 样图）">
      <div class="style-meta">
        <div class="style-name">${s.label}${s.def ? ' <span class="def-tag">默认</span>' : ""}</div>
        <div class="style-desc">${s.desc}</div>
      </div>
    </div>`,
  ).join("");
}
document.getElementById("styleGrid").addEventListener("click", (e) => {
  const card = e.target.closest(".style-card");
  if (!card) return;
  selectedStyle = card.dataset.style;
  renderStyleGrid();
});

/* ---------- 发音音色池（2026-09-03 试音定稿，对齐 pipeline 默认）---------- */
const VOICES = [
  { id: "en-US-AndrewMultilingualNeural", name: "Andrew", tag: "男·美音·节奏最佳", wordDef: true },
  { id: "en-US-BrianMultilingualNeural",  name: "Brian",  tag: "男·美音" },
  { id: "en-US-AvaMultilingualNeural",    name: "Ava",    tag: "女·美音" },
  { id: "en-US-EmmaMultilingualNeural",   name: "Emma",   tag: "女·美音·韵律最佳", sentDef: true },
  { id: "en-GB-SoniaNeural",              name: "Sonia",  tag: "女·英音" },
  { id: "en-GB-LibbyNeural",              name: "Libby",  tag: "女·英音" },
];
const VOICE_BY_ID = Object.fromEntries(VOICES.map((v) => [v.id, v]));

function fillVoiceSelect(id, defVoiceId) {
  const sel = document.getElementById(id);
  sel.innerHTML = VOICES.map(
    (v) =>
      `<option value="${v.id}" ${v.id === defVoiceId ? "selected" : ""}>${v.name}（${v.tag}${v.id === defVoiceId ? " · 默认" : ""}）</option>`,
  ).join("");
}
fillVoiceSelect("voiceWord", "en-US-AndrewMultilingualNeural");
fillVoiceSelect("voiceSent", "en-US-EmmaMultilingualNeural");

/* 试听：一个 Audio 实例复用，切换时打断上一个 */
let auditionAudio = null;
function playVoice(voiceId) {
  if (auditionAudio) { auditionAudio.pause(); auditionAudio = null; }
  auditionAudio = new Audio(`audio/${VOICE_BY_ID[voiceId].name}.mp3`);
  auditionAudio.play();
}
document.getElementById("playVoiceWord").onclick = () => playVoice(document.getElementById("voiceWord").value);
document.getElementById("playVoiceSent").onclick = () => playVoice(document.getElementById("voiceSent").value);

/* ---------- 新建 / 导入弹窗 ---------- */
const $mask = document.getElementById("modalMask");
document.getElementById("newBtn").onclick = openModal;
document.getElementById("cancelBtn").onclick = closeModal;
$mask.addEventListener("click", (e) => { if (e.target === $mask) closeModal(); });
document.getElementById("doneBtn").onclick = closeModal;

function openModal() {
  $mask.classList.add("open");
  document.getElementById("stepForm").style.display = "";
  document.getElementById("stepProgress").style.display = "none";
  renderStyleGrid();
}

function closeModal() { $mask.classList.remove("open"); }

/* 上传方式切换 */
document.querySelectorAll(".upload-tab").forEach((tab) => {
  tab.onclick = () => {
    document.querySelectorAll(".upload-tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    const isPaste = tab.dataset.tab === "paste";
    document.getElementById("pasteField").style.display = isPaste ? "" : "none";
    document.getElementById("fileField").style.display = isPaste ? "none" : "";
  };
});

/* 拖拽上传 */
const $drop = document.getElementById("dropZone");
const $file = document.getElementById("fileInput");
$drop.onclick = () => $file.click();
$drop.ondragover = (e) => { e.preventDefault(); $drop.classList.add("dragover"); };
$drop.ondragleave = () => $drop.classList.remove("dragover");
$drop.ondrop = (e) => { e.preventDefault(); $drop.classList.remove("dragover"); if (e.dataTransfer.files[0]) readFile(e.dataTransfer.files[0]); };
$file.onchange = () => { if ($file.files[0]) readFile($file.files[0]); };

function readFile(f) {
  if (!f.name.endsWith(".txt")) { $drop.innerHTML = `<b style="color:var(--destructive)">仅支持 .txt 文件</b>`; return; }
  const reader = new FileReader();
  reader.onload = () => {
    document.querySelector('[data-tab="paste"]').click();
    document.getElementById("wordText").value = reader.result;
    if (!document.getElementById("bookName").value)
      document.getElementById("bookName").value = f.name.replace(/\.txt$/, "");
  };
  reader.readAsText(f);
}

/* 开始导入 → 进度态（纯前端模拟） */
document.getElementById("startImportBtn").onclick = () => {
  const text = document.getElementById("wordText").value;
  const words = text.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  if (!words.length) { document.getElementById("wordText").focus(); return; }

  const name = document.getElementById("bookName").value.trim() || "未命名词库";
  const core = document.getElementById("genCore").checked;
  const coreCount = core ? Math.round(words.length * 0.72) : (document.getElementById("genAll").checked ? words.length : 0);
  const wv = VOICE_BY_ID[document.getElementById("voiceWord").value];
  const sv = VOICE_BY_ID[document.getElementById("voiceSent").value];
  const style = IMAGE_STYLES.find((s) => s.id === selectedStyle);
  document.getElementById("progBookName").textContent = name;
  document.getElementById("progGenCount").textContent = coreCount ? `核心词 ${coreCount} 张` : "跳过";
  document.getElementById("step3Text").textContent = `合成发音音频（单词 ${wv.name} / 例句 ${sv.name}，-8%）`;
  document.getElementById("step4Text").textContent = `核心词批量生图（${style.label}）`;
  console.log("[demo] 导入参数:", { name, style: selectedStyle, voiceWord: wv.id, voiceSent: sv.id });

  document.getElementById("stepForm").style.display = "none";
  document.getElementById("stepProgress").style.display = "";

  // 模拟进度流转
  simulateSteps(words.length, coreCount, name);
};

function simulateSteps(n, coreCount, name) {
  const steps = ["step1", "step2", "step3", "step4"];
  let i = 0;
  const $num = document.getElementById("progNum");
  const tick = setInterval(() => {
    if (i < steps.length) {
      steps.forEach((s, j) => {
        const el = document.getElementById(s);
        el.className = "step-item " + (j < i ? "done" : j === i ? "doing" : "");
        el.querySelector(".dot").textContent = j < i ? "✓" : j + 1;
      });
      $num.textContent = `${Math.min(Math.round(((i + 1) / steps.length) * n), n)} / ${n}`;
      i++;
    } else {
      clearInterval(tick);
      // 完成：新卡片入列（演示态直接落 ready）
      BOOKS.unshift({
        bookId: "demo-" + Date.now(),
        name,
        source: "custom",
        cover: "img/cover-demo2.png",
        total: n,
        learned: 0,
        hasAudio: true,
        imgCount: coreCount,
        status: "ready",
        style: selectedStyle,
      });
      render();
      setTimeout(closeModal, 700);
    }
  }, 650);
}

render();

/* URL 带 ?open=1 自动打开弹窗（截图/演示用） */
if (new URLSearchParams(location.search).get("open") === "1") openModal();
