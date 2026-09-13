#!/usr/bin/env node
/**
 * record-demo-videos.mjs — 宣传用操作录像(Playwright 录屏)
 *
 * 用法(须先启动 dev server, 127.0.0.1:3177):
 *   NODE_PATH=~/.workbuddy/binaries/node/workspace/node_modules \
 *     node scripts/record-demo-videos.mjs [--only 01-dashboard,03-typing] [--keep-webm]
 *
 * 产出: tmp/recordings/mp4/<scene>.mp4 (1600x1000, webm 中间产物默认清理)
 *
 * 设计:
 *  - 每场景独立 context + recordVideo, context 关闭后落盘改名
 *  - 拟人操作: 假光标(init 脚本注入, 跟随 playwright 鼠标事件)、
 *    平滑滚动、鼠标移动 steps、逐字输入、动作间 300-800ms 随机停顿
 *  - 机考答题在 iframe(换皮产物)内: Frame 定位 + 按题型作答
 *    (radio/checkbox/dropdown/fill-blank), 屏内全答后 #js-btn-next 翻屏
 *  - 录制产生的真实流水(考试记录/打卡/复习日志)由 seed 脚本重跑恢复
 */

import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const require = createRequire(import.meta.url);
const { chromium } = require("/Users/fanyunxu/.workbuddy/binaries/node/workspace/node_modules/playwright-core");
const BetterSqlite3 = require("/Users/fanyunxu/Desktop/myproject/ielts-copilot/node_modules/better-sqlite3");

const BASE = "http://127.0.0.1:3177";
const OUT_DIR = path.resolve("tmp/recordings");
const WEBM_DIR = path.join(OUT_DIR, "webm");
const MP4_DIR = path.join(OUT_DIR, "mp4");
const FFMPEG = "/opt/homebrew/bin/ffmpeg";

const args = process.argv.slice(2);
const onlyArg = args.includes("--only") ? args[args.indexOf("--only") + 1].split(",") : null;
const keepWebm = args.includes("--keep-webm");

for (const d of [OUT_DIR, WEBM_DIR, MP4_DIR]) fs.mkdirSync(d, { recursive: true });

/* ---------- 基础设施 ---------- */

function findChromium() {
  const root = path.join(process.env.HOME, "Library/Caches/ms-playwright");
  for (const dir of fs.readdirSync(root)) {
    if (!dir.startsWith("chromium-")) continue;
    const cand = path.join(root, dir, "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing");
    if (fs.existsSync(cand)) return cand;
  }
  throw new Error("未找到 chromium 可执行文件, 先 agent-browser install");
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jit = (a, b) => a + Math.random() * (b - a);

/** 拟人停顿 */
const pause = (a = 300, b = 800) => sleep(jit(a, b));

/** 假光标 + 点击涟漪(跟随 playwright 合成的 mouse 事件) */
const CURSOR_INIT = `
(() => {
  if (document.getElementById('__fake-cursor')) return;
  const c = document.createElement('div');
  c.id = '__fake-cursor';
  c.style.cssText = 'position:fixed;left:0;top:0;width:22px;height:22px;z-index:2147483647;pointer-events:none;transition:transform 60ms ease-out;filter:drop-shadow(0 1px 2px rgba(0,0,0,.35));';
  c.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M4 2 L4 19 L9.2 14.5 L12.4 21.5 L15.3 20.1 L12.2 13.3 L19 12.8 Z" fill="#e8842c" stroke="#fff" stroke-width="1.2"/></svg>';
  document.documentElement.appendChild(c);
  const move = (e) => { c.style.transform = 'translate(' + (e.clientX - 2) + 'px,' + (e.clientY - 2) + 'px)'; };
  document.addEventListener('mousemove', move, true);
  document.addEventListener('mousedown', () => { c.style.transform += ' scale(.8)'; }, true);
  document.addEventListener('mouseup', () => { c.style.transform = c.style.transform.replace(' scale(.8)',''); }, true);
})();
`;

/** iframe 内也要有假光标(机考页操作发生在 frame 里) */
async function installCursor(page) {
  await page.addInitScript(CURSOR_INIT);
  page.on("frameattached", async (f) => {
    try { await f.evaluate(CURSOR_INIT); } catch { /* frame 尚未就绪, 忽略 */ }
  });
}

/** 平滑滚动: 一屏分多段滚轮, 拟人节奏 */
async function humanScroll(page, dir = 1, steps = 6) {
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, dir * jit(320, 520));
    await pause(280, 620);
  }
}

/** 拟人点击: hover → 停顿 → click */
async function humanClick(page, locator, opts = {}) {
  await locator.hover({ timeout: opts.timeout ?? 8000 });
  await pause(240, 520);
  await locator.click(opts);
}

/** 拟人逐字输入(键盘节奏 + 偶尔思考停顿) */
async function humanType(page, text, { min = 45, max = 120, pauseEvery = 26 } = {}) {
  for (let i = 0; i < text.length; i++) {
    await page.keyboard.type(text[i], { delay: 0 });
    await sleep(jit(min, max));
    if (i > 0 && i % pauseEvery === 0) await sleep(jit(350, 900));
  }
}

/** 新建录制 context */
async function newRecording(browser, name) {
  const ctx = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 2,
    recordVideo: { dir: WEBM_DIR, size: { width: 1600, height: 1000 } },
  });
  ctx.setDefaultTimeout(15000);
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.accept().catch(() => {}));
  await installCursor(page);
  return { ctx, page, name };
}

/** 收尾: 关 context → webm 改名 */
async function finishRecording({ ctx, page, name }) {
  const video = page.video();
  await page.close();
  await ctx.close();
  const src = await video.path();
  const dest = path.join(WEBM_DIR, `${name}.webm`);
  if (src !== dest) fs.renameSync(src, dest);
  console.log(`  ✓ ${name}.webm 已落盘`);
  return dest;
}

/* ---------- 机考 iframe 通用作答 ---------- */

/** 找机考卷面 frame(静态换皮产物, url 含 /exams/) */
function examFrame(page) {
  return page.frames().find((f) => f.url().includes("/exams/"));
}

async function waitExamFrame(page, { sound = false } = {}) {
  for (let i = 0; i < 40; i++) {
    const f = examFrame(page);
    if (f) {
      const url = f.url();
      if (i % 6 === 0) console.error(`    [frame] ${url}`);
      if (sound ? url.includes("test-sound") : /(listening|reading|writing)\.html([?#]|$)/.test(url)) return f;
    }
    await sleep(500);
  }
  throw new Error("机考 iframe 未就绪");
}

/**
 * 屏内所有可见未答题作答(按题型), 全部拟人节奏。
 * 返回本题屏作答数。
 */
async function answerVisible(frame) {
  const data = await frame.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const out = { radioGroups: [], checks: [], selects: [], texts: [] };
    const groups = {};
    for (const r of document.querySelectorAll("input.radio-iot")) {
      if (!vis(r)) continue;
      (groups[r.name] = groups[r.name] || []).push(r.id);
    }
    for (const ids of Object.values(groups)) {
      if (!ids.some((id) => document.getElementById(id)?.checked)) out.radioGroups.push(ids);
    }
    for (const c of document.querySelectorAll("input.checkbox-iot")) {
      if (vis(c) && !c.checked) out.checks.push(c.id);
    }
    for (const s of document.querySelectorAll("select.iot-dropdown")) {
      if (vis(s) && !s.value) out.selects.push(s.id);
    }
    for (const t of document.querySelectorAll("input.iot-question__fill-blank")) {
      if (vis(t) && !t.value) out.texts.push(t.id);
    }
    return out;
  });

  const FILL_WORDS = ["increase", "1882", "behaviour", "training", "water", "climate", "photos", "health", "species", "energy", "1974", "movement", "tools", "landscape", "sources"];
  let done = 0;

  for (const ids of data.radioGroups) {
    const label = frame.locator(`label.iot-radio:has(input#${ids[0]})`).first();
    const target = (await label.count()) ? label : frame.locator(`#${ids[0]}`);
    try { await target.click({ timeout: 4000 }); done++; } catch { /* 跳过 */ }
    await pause(260, 620);
  }
  for (const id of data.checks) {
    try { await frame.locator(`#${id}`).check({ timeout: 4000 }); done++; } catch { /* 跳过 */ }
    await pause(240, 560);
  }
  for (const id of data.selects) {
    try {
      await frame.locator(`#${id}`).selectOption({ index: 1 });
      done++;
    } catch { /* 跳过 */ }
    await pause(240, 560);
  }
  for (const [i, id] of data.texts.entries()) {
    try {
      const loc = frame.locator(`#${id}`);
      await loc.click({ timeout: 4000 });
      await humanType(page_of_frame(frame), FILL_WORDS[i % FILL_WORDS.length], { min: 60, max: 150 });
      done++;
    } catch { /* 跳过 */ }
    await pause(240, 560);
  }
  return done;
}

// frame 上做逐字输入要走 page.keyboard(frame 无 keyboard)
function page_of_frame(frame) { return frame.page(); }

/** 翻到下一屏(#js-btn-next), 返回是否翻成功 */
async function gotoNextScreen(frame) {
  const disabled = await frame.locator("#js-btn-next.-disabled").count();
  if (disabled > 0) return false;
  const next = frame.locator("#js-btn-next");
  if (!(await next.count())) return false;
  await humanClick(frame.page(), next, { timeout: 5000 }).catch(() => false);
  await sleep(900);
  return true;
}

/** 点交卷 → 等确认弹窗 → 点确认 */
async function submitExam(frame) {
  const submit = frame.locator(".realtest-header__bt-submit");
  await humanClick(frame.page(), submit, { timeout: 8000 });
  await sleep(1400);
  const modalBtn = frame.locator(
    ".modal.in .modal-submit-test__btn, .modal.in .modal-time-up__btn.-main-color, .modal.show .modal-submit-test__btn, .modal.show .modal-time-up__btn.-main-color",
  ).first();
  try {
    await modalBtn.click({ timeout: 6000 });
  } catch {
    // 兜底: 可见弹窗里找正向文案按钮
    for (const t of ["OK, got it", "Submit", "Yes", "Confirm", "确认"]) {
      const b = frame.locator(`.modal button:visible:has-text("${t}")`).first();
      if (await b.count()) { await b.click().catch(() => {}); break; }
    }
  }
}

/* ---------- 写作素材 ---------- */

const ESSAY_T1 = `The bar chart compares the amount of money spent on five categories of goods in two European countries in 2010. Overall, households in both countries spent the largest share on housing and transport, while spending on clothing remained the smallest. France consistently outspent the UK in most categories, and the gap was widest in the housing sector. By contrast, expenditure on entertainment was broadly similar between the two nations, differing by only a small margin.`;

const ESSAY_T2 = `Some people believe that technology has made our lives more complex, and therefore the solution is to lead a simpler life without technology. To what extent do you agree or disagree? In my view, rejecting technology altogether is neither realistic nor necessary. Admittedly, modern devices can overwhelm us with constant notifications and endless choices, which creates stress rather than convenience. However, the root of the problem lies in how we use these tools, not in the tools themselves. Technology has also delivered undeniable benefits: medical advances save lives, online education reaches remote communities, and automation removes dangerous repetitive work. Rather than abandoning technology, we should cultivate healthier digital habits, such as scheduling screen-free time and using applications deliberately. In conclusion, simplicity is a matter of discipline, not of discarding the machines that increasingly sustain modern society.`;

const ESSAY_SIM = `Dear Sir or Madam, I am writing to inquire about the part-time accommodation service advertised in last weekend's local newspaper. My family and I recently moved to the area, and we are looking for a furnished two-bedroom flat within walking distance of the city centre. Could you please let me know the monthly rent, the length of the tenancy agreement, and whether utilities are included? I would also appreciate any photographs of the property. I look forward to hearing from you. Yours faithfully, Daniel Chen`;

/* ---------- 场景定义 ---------- */

/** 01 仪表盘总览 */
async function sceneDashboard(browser) {
  const rec = await newRecording(browser, "01-dashboard");
  const { page } = rec;
  await page.goto(BASE + "/", { waitUntil: "networkidle" }).catch(() => {});
  await sleep(2200);
  await humanScroll(page, 1, 5);
  await sleep(800);
  await humanScroll(page, -1, 3);

  // 最近模考筛选: 整套 → 听力 → 回全部
  for (const label of ["整套", "听力", "全部"]) {
    const chip = page.locator(`button:has-text("${label}")`).last();
    if (await chip.count()) {
      await humanClick(page, chip).catch(() => {});
      await sleep(900);
    }
  }
  // 打开一条成绩单再返回
  const link = page.locator('a[href^="/records/"], a[href^="/session/"]').first();
  if (await link.count()) {
    await humanClick(page, link).catch(() => {});
    await sleep(2200);
    await humanScroll(page, 1, 4);
    await page.goBack({ waitUntil: "commit", timeout: 20000 }).catch(() => {});
    await sleep(1800);
  }
  return finishRecording(rec);
}

/** 02 备考计划 */
async function scenePlan(browser) {
  const rec = await newRecording(browser, "02-plan");
  const { page } = rec;
  await page.goto(BASE + "/plan", { waitUntil: "networkidle" }).catch(() => {});
  await sleep(2200);
  await humanScroll(page, 1, 4);
  await humanScroll(page, -1, 2);

  // 展开四科目标
  const expand = page.locator('button:has-text("四科目标")').first();
  if (await expand.count()) {
    await humanClick(page, expand);
    await sleep(1400);
    await humanClick(page, expand).catch(() => {});
    await sleep(800);
  }
  // 悬停今日任务行
  const tasks = page.locator("text=/打字练习|阅读|写作|听力/");
  const n = Math.min(await tasks.count(), 4);
  for (let i = 0; i < n; i++) {
    await tasks.nth(i).hover().catch(() => {});
    await pause(320, 650);
  }
  // 打卡日历翻周
  for (const arrow of ["‹", "›"]) {
    const btn = page.locator(`button:has-text("${arrow}")`).first();
    if (await btn.count()) {
      await humanClick(page, btn).catch(() => {});
      await sleep(900);
    }
  }
  return finishRecording(rec);
}

/** 03 打字练习(实打一段 + ESC 暂停) */
async function sceneTyping(browser) {
  const rec = await newRecording(browser, "03-typing");
  const { page } = rec;
  await page.goto(BASE + "/typing", { waitUntil: "networkidle" }).catch(() => {});
  await sleep(2200);

  // 进入一篇文章(优先「继续练习」)
  const cont = page.locator('button:has-text("继续"), a:has-text("继续")').first();
  const start = page.locator('button:has-text("开始"), a:has-text("开始")').first();
  const target = (await cont.count()) ? cont : start;
  await humanScroll(page, 1, 3);
  if (await target.count()) {
    await humanClick(page, target).catch(() => {});
    await sleep(2000);
  }

  // 从 DOM 取 pending+cur 文本实打 140 字符
  const text = await page.evaluate(() => {
    const tb = document.querySelector(".tbox");
    if (!tb) return "";
    return [...tb.querySelectorAll(".pending, .cur")].map((e) => e.textContent).join("").replace(/\n/g, "");
  });
  if (text) {
    // 点击页面中央确保焦点落在跟打区
    await page.mouse.click(800, 520);
    await sleep(700);
    const seg = text.slice(0, 140);
    await humanType(page, seg, { min: 55, max: 130, pauseEvery: 22 });
    await sleep(600);
    await page.keyboard.press("Escape"); // 暂停, 出 toast
    await sleep(1800);
  }
  return finishRecording(rec);
}

/** 04 场次成绩单(A类 9 月整套 6.5) */
async function sceneScorecard(browser) {
  const db = new BetterSqlite3("data/app.db", { readonly: true });
  const s = db.prepare("SELECT session_id FROM exam_sessions WHERE exam_set_id LIKE 'a-2025%' LIMIT 1").get();
  db.close();
  const rec = await newRecording(browser, "04-scorecard");
  const { page } = rec;
  await page.goto(`${BASE}/session/${s.session_id}`, { waitUntil: "networkidle" }).catch(() => {});
  await sleep(2400);
  await humanScroll(page, 1, 7);
  await sleep(700);
  await humanScroll(page, -1, 4);
  return finishRecording(rec);
}

/** 05 阅读学习(打开一篇文章滚动阅读) */
async function sceneReadingStudy(browser) {
  const rec = await newRecording(browser, "05-reading-study");
  const { page } = rec;
  await page.goto(BASE + "/learn/reading", { waitUntil: "networkidle" }).catch(() => {});
  await sleep(2000);
  await humanScroll(page, 1, 3);
  const link = page.locator('a[href^="/learn/reading/"]').first();
  if (await link.count()) {
    await humanClick(page, link).catch(() => {});
    await sleep(2400);
    await humanScroll(page, 1, 10);   // 读完 → 触发完成态
    await sleep(1200);
    await humanScroll(page, -1, 2);
    await page.goBack({ waitUntil: "commit", timeout: 20000 }).catch(() => {});
    await sleep(1600);
  }
  return finishRecording(rec);
}

/** 06 背单词(复习卡片翻面 + 评分) */
async function sceneVocab(browser) {
  const rec = await newRecording(browser, "06-vocab");
  const { page } = rec;
  await page.goto(BASE + "/learn", { waitUntil: "networkidle" }).catch(() => {});
  await sleep(2200);
  await humanScroll(page, 1, 3);
  await humanScroll(page, -1, 2);

  // 复习循环: 翻面/显示答案 → 评分, 最多 8 轮
  const SHOW = ["翻面", "显示答案", "看答案", "显示释义"];
  const RATE = ["认识", "模糊", "不认识"];
  for (let i = 0; i < 8; i++) {
    let acted = false;
    for (const t of SHOW) {
      const b = page.locator(`button:has-text("${t}")`).first();
      if (await b.count()) {
        await humanClick(page, b).catch(() => {});
        acted = true;
        await sleep(1300);
        break;
      }
    }
    const rate = RATE[i % RATE.length];
    const rb = page.locator(`button:has-text("${rate}")`).first();
    if (await rb.count()) {
      await humanClick(page, rb).catch(() => {});
      acted = true;
      await sleep(1500);
    }
    if (!acted) break;
  }
  return finishRecording(rec);
}

/** 07 机考 · 听力(单科: 试音 → 答题 → 交卷) */
async function sceneExamListening(browser) {
  const rec = await newRecording(browser, "07-exam-listening");
  const { page } = rec;
  await page.goto(BASE + "/mock", { waitUntil: "networkidle" }).catch(() => {});
  await sleep(2000);
  await humanClick(page, page.locator('button:text-is("听力")').first());
  await sleep(1100);
  await humanScroll(page, 1, 3);
  await humanClick(page, page.locator('a:has-text("开始机考")').first());
  await sleep(1800);

  // 试音页: Play sound → Continue
  const f1 = await waitExamFrame(page, { sound: true });
  const play = f1.locator('button:has-text("Play sound"), .ts-btn:has-text("Play")').first();
  if (await play.count()) {
    await humanClick(page, play).catch(() => {});
    await sleep(2500);
  }
  const cont = f1.locator('.ts-btn:has-text("Continue"), button:has-text("Continue")').first();
  if (await cont.count()) {
    await humanClick(page, cont).catch(() => {});
    await sleep(2500);
  }
  // 须知页(Instructions) → 正式答题: 带重试, 直到 iframe 落到正式卷面
  for (let i = 0; i < 8; i++) {
    const fi = examFrame(page);
    const url = fi?.url() ?? "";
    if (/(listening|reading|writing)\.html([?#]|$)/.test(url)) break;
    if (url.includes("instructions")) {
      const st = fi.locator('button:has-text("Start test")').first();
      if (await st.count()) await st.click({ timeout: 6000 }).catch(() => {});
    }
    await sleep(2200);
  }

  const f2 = await waitExamFrame(page);
  await sleep(1500);
  for (let i = 0; i < 16; i++) {
    await answerVisible(f2);
    if (!(await gotoNextScreen(f2))) break;
  }
  await sleep(1200);
  await submitExam(f2);
  await sleep(4000);
  await page.goBack({ waitUntil: "commit", timeout: 20000 }).catch(() => {});
  await sleep(1800);
  return finishRecording(rec);
}

/** 08 机考 · 阅读(单科: 分屏答题 → 交卷) */
async function sceneExamReading(browser) {
  const rec = await newRecording(browser, "08-exam-reading");
  const { page } = rec;
  await page.goto(BASE + "/mock", { waitUntil: "networkidle" }).catch(() => {});
  await sleep(2000);
  await humanClick(page, page.locator('button:text-is("阅读")').first());
  await sleep(1100);
  await humanScroll(page, 1, 3);
  await humanClick(page, page.locator('a:has-text("开始机考")').first());
  await sleep(2200);

  const f = await waitExamFrame(page);
  await sleep(1800);
  for (let i = 0; i < 20; i++) {
    await answerVisible(f);
    if (!(await gotoNextScreen(f))) break;
  }
  await sleep(1200);
  await submitExam(f);
  await sleep(4500);
  await page.goBack({ waitUntil: "commit", timeout: 20000 }).catch(() => {});
  await sleep(1800);
  return finishRecording(rec);
}

/** 09 机考 · 写作(单科: 双 Task 录入 → 交卷 → AI 批改) */
async function sceneExamWriting(browser) {
  const rec = await newRecording(browser, "09-exam-writing");
  const { page } = rec;
  await page.goto(BASE + "/mock", { waitUntil: "networkidle" }).catch(() => {});
  await sleep(2000);
  await humanClick(page, page.locator('button:text-is("写作")').first());
  await sleep(1100);
  await humanScroll(page, 1, 3);
  await humanClick(page, page.locator('a:has-text("开始机考")').first());
  await sleep(2200);

  const f = await waitExamFrame(page);
  await sleep(1500);
  // Task 1: 左题板录入
  const b1 = f.locator("#input1");
  await b1.scrollIntoViewIfNeeded().catch(() => {});
  await humanClick(page, b1).catch(() => {});
  await humanType(page, ESSAY_T1, { min: 16, max: 42, pauseEvery: 60 });
  await sleep(900);
  // Task 2: #js-btn-next 切换题板(#input2 初始 display:none)
  await humanClick(page, f.locator("#js-btn-next"), { timeout: 6000 }).catch(() => {});
  await sleep(1600);
  const b2 = f.locator("#input2");
  await b2.scrollIntoViewIfNeeded().catch(() => {});
  await humanClick(page, b2).catch(() => {});
  await humanType(page, ESSAY_T2, { min: 16, max: 42, pauseEvery: 60 });
  await sleep(900);
  // 交卷后 iframe 会跳转结果页(frame detach), 全程容错
  try {
    await submitExam(f);
  } catch { /* detach 属预期 */ }
  // 等 AI 批改(10–60s): 轮询 frame 是否出现批改结果
  for (let i = 0; i < 16; i++) {
    await sleep(5000);
    const cur = examFrame(page);
    if (!cur) continue;
    const done = await cur.evaluate(() => {
      const t = document.body?.innerText ?? "";
      return /总评分|批改完成|Overall|Band/i.test(t) && !/批改中|Grading/i.test(t);
    }).catch(() => false);
    if (done) break;
  }
  await sleep(1500);
  try { await humanScroll(page, 1, 4); } catch { /* 忽略 */ }
  await page.goBack().catch(() => {});
  await sleep(1800);
  return finishRecording(rec);
}

/** 10 写作仿真页(/writing: 抽题 → 录入 → 交卷 → 反馈) */
async function sceneWritingSim(browser) {
  const rec = await newRecording(browser, "10-writing-sim");
  const { page } = rec;
  await page.goto(BASE + "/writing", { waitUntil: "networkidle" }).catch(() => {});
  await sleep(2200);
  await humanScroll(page, 1, 3);
  await humanScroll(page, -1, 1);

  // 随机抽题(randomPick) — 取第一个可见主按钮
  const pick = page.locator('button.btn.main:has-text("随机"), button:has-text("换")').first();
  if (await pick.count()) {
    await humanClick(page, pick).catch(() => {});
    await sleep(1500);
  }
  const editor = page.locator("textarea.editor, textarea").first();
  if (await editor.count()) {
    await humanClick(page, editor).catch(() => {});
    await humanType(page, ESSAY_SIM, { min: 18, max: 46, pauseEvery: 55 });
    await sleep(900);
    const submit = page.locator('button.btn.main:has-text("交卷")').first();
    if (await submit.count()) {
      await humanClick(page, submit).catch(() => {});
      await sleep(6000); // 练习统计出现
      // 手动触发 AI 批改并等待出分
      const ai = page.locator('button:has-text("AI 批改")').first();
      if (await ai.count()) {
        await humanClick(page, ai).catch(() => {});
        for (let i = 0; i < 18; i++) {
          await sleep(5000);
          const done = await page.evaluate(() => {
            const t = document.body.innerText ?? "";
            return /(任务响应|连贯衔接|词汇丰富|语法|总评|范文)/.test(t);
          }).catch(() => false);
          if (done) break;
        }
        await sleep(1500);
        await humanScroll(page, 1, 6); // 滚动展示四维诊断与范文
      } else {
        await humanScroll(page, 1, 4);
      }
    }
  }
  return finishRecording(rec);
}

/* ---------- 主流程 ---------- */

const SCENES = {
  "01-dashboard": sceneDashboard,
  "02-plan": scenePlan,
  "03-typing": sceneTyping,
  "04-scorecard": sceneScorecard,
  "05-reading-study": sceneReadingStudy,
  "06-vocab": sceneVocab,
  "07-exam-listening": sceneExamListening,
  "08-exam-reading": sceneExamReading,
  "09-exam-writing": sceneExamWriting,
  "10-writing-sim": sceneWritingSim,
};

async function main() {
  const res = await fetch(BASE + "/api/typing/stats").catch(() => null);
  if (!res?.ok) {
    console.error("dev server (127.0.0.1:3177) 未就绪, 先 npm run dev");
    process.exit(1);
  }
  const names = onlyArg?.filter((n) => SCENES[n]) ?? Object.keys(SCENES);
  const browser = await chromium.launch({
    executablePath: findChromium(),
    headless: true,
    args: ["--autoplay-policy=no-user-gesture-required", "--mute-audio"],
  });
  const produced = [];
  try {
    for (const name of names) {
      console.log(`▶ 录制 ${name} …`);
      try {
        produced.push(await SCENES[name](browser));
      } catch (e) {
        console.error(`  ✗ ${name} 失败: ${e.message}`);
      }
    }
  } finally {
    await browser.close();
  }
  // webm → mp4
  console.log("▶ 转码 mp4 …");
  for (const webm of produced) {
    const base = path.basename(webm, ".webm");
    const mp4 = path.join(MP4_DIR, `${base}.mp4`);
    try {
      execFileSync(FFMPEG, ["-y", "-i", webm, "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4], { stdio: "pipe" });
      const mb = (fs.statSync(mp4).size / 1024 / 1024).toFixed(1);
      if (!keepWebm) fs.unlinkSync(webm);
      console.log(`  ✓ ${base}.mp4 (${mb} MB)`);
    } catch (e) {
      console.error(`  ✗ ${base} 转码失败: ${e.message}`);
    }
  }
  console.log(`完成: ${MP4_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
