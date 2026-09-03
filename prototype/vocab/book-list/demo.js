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

/* ---------- 新建 / 导入弹窗 ---------- */
const $mask = document.getElementById("modalMask");
document.getElementById("newBtn").onclick = openModal;
document.getElementById("importBtn").onclick = openModal;
document.getElementById("cancelBtn").onclick = closeModal;
$mask.addEventListener("click", (e) => { if (e.target === $mask) closeModal(); });
document.getElementById("doneBtn").onclick = closeModal;

function openModal() {
  $mask.classList.add("open");
  document.getElementById("stepForm").style.display = "";
  document.getElementById("stepProgress").style.display = "none";
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
  document.getElementById("progBookName").textContent = name;
  document.getElementById("progGenCount").textContent = coreCount ? `核心词 ${coreCount} 张` : "跳过";

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
      });
      render();
      setTimeout(closeModal, 700);
    }
  }, 650);
}

render();
