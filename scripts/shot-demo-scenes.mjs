#!/usr/bin/env node
/**
 * shot-demo-scenes.mjs — 宣传用详细截图(与 record-demo-videos.mjs 同十场景)
 *
 * 用法(须先启动 dev server, 127.0.0.1:3177):
 *   NODE_PATH=~/.workbuddy/binaries/node/workspace/node_modules \
 *     node scripts/shot-demo-scenes.mjs [--only 01-dashboard,07-exam-listening]
 *
 * 产出: tmp/screenshots/<scene>/<序号>-<描述>.png (1600x1000 @2x, 无假光标)
 *
 * 注意: 07/08/09/10 会真实交卷产生流水, 跑完后用两个 seed 脚本恢复演示数据。
 */

import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("/Users/fanyunxu/.workbuddy/binaries/node/workspace/node_modules/playwright-core");
const BetterSqlite3 = require("/Users/fanyunxu/Desktop/myproject/ielts-copilot/node_modules/better-sqlite3");

const BASE = "http://127.0.0.1:3177";
const ROOT = path.resolve("tmp/screenshots");

const args = process.argv.slice(2);
const onlyArg = args.includes("--only") ? args[args.indexOf("--only") + 1].split(",") : null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jit = (a, b) => a + Math.random() * (b - a);
const pause = (a = 300, b = 700) => sleep(jit(a, b));

/* ---------- 截图上下文 ---------- */

let sceneDir = null;
let seq = 0;

async function shot(page, name, { fullPage = false } = {}) {
  seq += 1;
  const file = path.join(sceneDir, `${String(seq).padStart(2, "0")}-${name}.png`);
  await page.screenshot({ path: file, fullPage });
  const kb = (fs.statSync(file).size / 1024).toFixed(0);
  console.log(`    📸 ${path.basename(sceneDir)}/${path.basename(file)} (${kb} KB)`);
  return file;
}

function beginScene(name) {
  sceneDir = path.join(ROOT, name);
  fs.rmSync(sceneDir, { recursive: true, force: true });
  fs.mkdirSync(sceneDir, { recursive: true });
  seq = 0;
  console.log(`▶ ${name}`);
}

/** 新建截图 context(干净无光标) */
async function newContext(browser) {
  const ctx = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 2,
  });
  ctx.setDefaultTimeout(15000);
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.accept().catch(() => {}));
  return { ctx, page };
}

/** 平滑滚动(截图前把目标内容滚进视口) */
async function humanScroll(page, dir = 1, steps = 1) {
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, dir * jit(420, 620));
    await pause(220, 420);
  }
}

async function humanType(page, text, { min = 30, max = 70 } = {}) {
  for (let i = 0; i < text.length; i++) {
    await page.keyboard.type(text[i], { delay: 0 });
    await sleep(jit(min, max));
  }
}

/* ---------- 机考 iframe 通用 ---------- */

function examFrame(page) {
  return page.frames().find((f) => f.url().includes("/exams/"));
}

async function waitExamFrame(page, { sound = false } = {}) {
  for (let i = 0; i < 40; i++) {
    const f = examFrame(page);
    if (f) {
      const url = f.url();
      if (sound ? url.includes("test-sound") : /(listening|reading|writing)\.html([?#]|$)/.test(url)) return f;
    }
    await sleep(500);
  }
  throw new Error("机考 iframe 未就绪");
}

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
  for (const ids of data.radioGroups) {
    const label = frame.locator(`label.iot-radio:has(input#${ids[0]})`).first();
    const target = (await label.count()) ? label : frame.locator(`#${ids[0]}`);
    try { await target.click({ timeout: 4000 }); } catch { /* 跳过 */ }
    await pause(200, 420);
  }
  for (const id of data.checks) {
    try { await frame.locator(`#${id}`).check({ timeout: 4000 }); } catch { /* 跳过 */ }
    await pause(180, 380);
  }
  for (const id of data.selects) {
    try { await frame.locator(`#${id}`).selectOption({ index: 1 }); } catch { /* 跳过 */ }
    await pause(180, 380);
  }
  for (const [i, id] of data.texts.entries()) {
    try {
      const loc = frame.locator(`#${id}`);
      await loc.click({ timeout: 4000 });
      await humanType(frame.page(), FILL_WORDS[i % FILL_WORDS.length], { min: 40, max: 90 });
    } catch { /* 跳过 */ }
    await pause(180, 380);
  }
}

async function gotoNextScreen(frame) {
  const disabled = await frame.locator("#js-btn-next.-disabled").count();
  if (disabled > 0) return false;
  const next = frame.locator("#js-btn-next");
  if (!(await next.count())) return false;
  await next.click({ timeout: 5000 }).catch(() => false);
  await sleep(900);
  return true;
}

async function submitExam(frame) {
  const submit = frame.locator(".realtest-header__bt-submit");
  await submit.click({ timeout: 8000 });
  await sleep(1400);
  const modalBtn = frame.locator(
    ".modal.in .modal-submit-test__btn, .modal.in .modal-time-up__btn.-main-color, .modal.show .modal-submit-test__btn, .modal.show .modal-time-up__btn.-main-color",
  ).first();
  try {
    await modalBtn.click({ timeout: 6000 });
  } catch {
    for (const t of ["OK, got it", "Submit", "Yes", "Confirm", "确认"]) {
      const b = frame.locator(`.modal button:visible:has-text("${t}")`).first();
      if (await b.count()) { await b.click().catch(() => {}); break; }
    }
  }
}

/** 点交卷确认弹窗内的正向按钮(交卷按钮已被弹窗遮住, 不能再点) */
async function confirmSubmitModal(frame) {
  const modalBtn = frame.locator(
    ".modal.in .modal-submit-test__btn, .modal.in .modal-time-up__btn.-main-color, .modal.show .modal-submit-test__btn, .modal.show .modal-time-up__btn.-main-color",
  ).first();
  try {
    await modalBtn.click({ timeout: 6000 });
  } catch {
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

/* ---------- 十场景 ---------- */

/** 01 仪表盘总览 */
async function sceneDashboard(browser) {
  beginScene("01-dashboard");
  const { ctx, page } = await newContext(browser);
  await page.goto(BASE + "/", { waitUntil: "networkidle" }).catch(() => {});
  await sleep(2200);
  await shot(page, "dashboard-overview");
  await humanScroll(page, 1, 3);
  await shot(page, "dashboard-scrolled");

  for (const label of ["整套", "听力", "全部"]) {
    const chip = page.locator(`button:has-text("${label}")`).last();
    if (await chip.count()) {
      await chip.click().catch(() => {});
      await sleep(900);
      await shot(page, `filter-${label === "全部" ? "all" : label === "整套" ? "set" : "listening"}`);
    }
  }
  const link = page.locator('a[href^="/records/"], a[href^="/session/"]').first();
  if (await link.count()) {
    await link.click().catch(() => {});
    await sleep(2200);
    await shot(page, "scorecard-detail-top");
    await humanScroll(page, 1, 4);
    await shot(page, "scorecard-detail-lower");
    await page.goBack({ waitUntil: "commit", timeout: 20000 }).catch(() => {});
    await sleep(1600);
  }
  await ctx.close();
}

/** 02 备考计划 */
async function scenePlan(browser) {
  beginScene("02-plan");
  const { ctx, page } = await newContext(browser);
  await page.goto(BASE + "/plan", { waitUntil: "networkidle" }).catch(() => {});
  await sleep(2200);
  await shot(page, "plan-overview");
  await humanScroll(page, 1, 2);
  await shot(page, "plan-tasks");

  const expand = page.locator('button:has-text("四科目标")').first();
  if (await expand.count()) {
    await expand.click();
    await sleep(1200);
    await shot(page, "target-scores-expanded");
    await expand.click().catch(() => {});
    await sleep(600);
  }
  const tasks = page.locator("text=/打字练习|阅读|写作|听力/");
  const n = Math.min(await tasks.count(), 4);
  if (n > 0) {
    await tasks.nth(0).hover().catch(() => {});
    await pause(400, 600);
    await shot(page, "today-task-hover");
  }
  for (const [arrow, tag] of [["‹", "calendar-prev"], ["›", "calendar-next"]]) {
    const btn = page.locator(`button:has-text("${arrow}")`).first();
    if (await btn.count()) {
      await btn.click().catch(() => {});
      await sleep(900);
      await shot(page, tag);
    }
  }
  await ctx.close();
}

/** 03 打字练习 */
async function sceneTyping(browser) {
  beginScene("03-typing");
  const { ctx, page } = await newContext(browser);
  await page.goto(BASE + "/typing", { waitUntil: "networkidle" }).catch(() => {});
  await sleep(2200);
  await shot(page, "typing-home");
  await humanScroll(page, 1, 2);
  await shot(page, "article-list");

  const cont = page.locator('button:has-text("继续"), a:has-text("继续")').first();
  const start = page.locator('button:has-text("开始"), a:has-text("开始")').first();
  const target = (await cont.count()) ? cont : start;
  if (await target.count()) {
    await target.click().catch(() => {});
    await sleep(2000);
  }
  const text = await page.evaluate(() => {
    const tb = document.querySelector(".tbox");
    if (!tb) return "";
    return [...tb.querySelectorAll(".pending, .cur")].map((e) => e.textContent).join("").replace(/\n/g, "");
  });
  if (text) {
    await page.mouse.click(800, 520);
    await sleep(700);
    await shot(page, "typing-ready");
    await humanType(page, text.slice(0, 60), { min: 40, max: 80 });
    await shot(page, "typing-live-wpm");
    await humanType(page, text.slice(60, 140), { min: 40, max: 80 });
    await sleep(600);
    await shot(page, "typing-stats-accumulated");
    await page.keyboard.press("Escape");
    await sleep(1800);
    await shot(page, "esc-paused-toast");
  }
  await ctx.close();
}

/** 04 场次成绩单 */
async function sceneScorecard(browser) {
  beginScene("04-scorecard");
  const db = new BetterSqlite3("data/app.db", { readonly: true });
  const s = db.prepare("SELECT session_id FROM exam_sessions WHERE exam_set_id LIKE 'a-2025%' LIMIT 1").get();
  db.close();
  const { ctx, page } = await newContext(browser);
  await page.goto(`${BASE}/session/${s.session_id}`, { waitUntil: "networkidle" }).catch(() => {});
  await sleep(2400);
  await shot(page, "scorecard-overview");
  await humanScroll(page, 1, 4);
  await shot(page, "scorecard-skill-details");
  await humanScroll(page, 1, 4);
  await shot(page, "scorecard-lower");
  await humanScroll(page, -1, 5);
  await ctx.close();
}

/** 05 阅读学习(库 → 文章列表 → 文章页滚动阅读) */
async function sceneReadingStudy(browser) {
  beginScene("05-reading-study");
  const { ctx, page } = await newContext(browser);
  await page.goto(BASE + "/learn/reading", { waitUntil: "networkidle" }).catch(() => {});
  await sleep(2000);
  await shot(page, "reading-hub");
  // 进库 → 文章列表
  const lib = page.locator('a[href*="/learn/reading/libraries/"]').first();
  if (await lib.count()) {
    await lib.click().catch(() => {});
    await sleep(2200);
    await shot(page, "library-article-list");
  }
  // 点进一篇文章
  const art = page.locator('a[href^="/learn/reading/"]:not([href*="libraries"])').first();
  if (await art.count()) {
    await art.click().catch(() => {});
    await sleep(2400);
    await shot(page, "article-top");
    await humanScroll(page, 1, 5);
    await shot(page, "article-middle");
    await humanScroll(page, 1, 8);
    await sleep(1200);
    await shot(page, "article-completed");
    await page.goBack({ waitUntil: "commit", timeout: 20000 }).catch(() => {});
    await sleep(1600);
    await shot(page, "back-to-article-list");
  }
  await ctx.close();
}

/** 06 背单词(拼写模式: 卡面 → 逐字拼写镜像 → 判定 → 跳词) */
async function sceneVocab(browser) {
  beginScene("06-vocab");
  const { ctx, page } = await newContext(browser);
  await page.goto(BASE + "/learn", { waitUntil: "networkidle" }).catch(() => {});
  await sleep(2200);
  await shot(page, "learn-home");

  const input = page.locator('input[aria-label^="拼写练习"]').first();
  for (let i = 0; i < 3; i++) {
    const word = await page.evaluate(() =>
      document.querySelector(".recog-word")?.innerText?.trim() ?? "",
    );
    if (!word || !(await input.count())) break;
    await input.click().catch(() => {});
    const half = Math.ceil(word.length / 2);
    await humanType(page, word.slice(0, half), { min: 70, max: 140 });
    await shot(page, `card-${i + 1}-typing-mirror`);
    if (i === 1) {
      // 第二张卡故意先拼错, 拍判错镜像(对位白字/错位红字)
      await page.keyboard.press("Enter");
      await sleep(900);
      await shot(page, "card-2-wrong-verdict");
      await page.keyboard.press("Meta+a");
      await sleep(300);
    }
    await humanType(page, word.slice(i === 1 ? 0 : half), { min: 70, max: 140 });
    await page.keyboard.press("Enter"); // 判对 → 音效 + 900ms 自动跳词
    await sleep(1400);
    await shot(page, `card-${i + 1}-verdict-ok`);
  }
  await ctx.close();
}

/** 07 机考 · 听力 */
async function sceneExamListening(browser) {
  beginScene("07-exam-listening");
  const { ctx, page } = await newContext(browser);
  await page.goto(BASE + "/mock", { waitUntil: "networkidle" }).catch(() => {});
  await sleep(2000);
  await shot(page, "mock-page-listening");
  await page.locator('button:text-is("听力")').first().click();
  await sleep(1100);
  await humanScroll(page, 1, 2);
  await shot(page, "listening-selected");
  await humanScroll(page, -1, 3);
  await page.locator('a:has-text("开始机考")').first().click();
  await sleep(1800);

  const f1 = await waitExamFrame(page, { sound: true });
  await sleep(800);
  await shot(page, "sound-test");
  const play = f1.locator('button:has-text("Play sound"), .ts-btn:has-text("Play")').first();
  if (await play.count()) {
    await play.click().catch(() => {});
    await sleep(2500);
    await shot(page, "sound-playing");
  }
  const cont = f1.locator('.ts-btn:has-text("Continue"), button:has-text("Continue")').first();
  if (await cont.count()) {
    await cont.click().catch(() => {});
    await sleep(2500);
  }
  for (let i = 0; i < 8; i++) {
    const fi = examFrame(page);
    const url = fi?.url() ?? "";
    if (/(listening|reading|writing)\.html([?#]|$)/.test(url)) break;
    if (url.includes("instructions")) {
      await shot(page, "instructions");
      const st = fi.locator('button:has-text("Start test")').first();
      if (await st.count()) await st.click({ timeout: 6000 }).catch(() => {});
    }
    await sleep(2200);
  }

  const f2 = await waitExamFrame(page);
  await sleep(1500);
  let screen = 0;
  for (let i = 0; i < 5; i++) {
    screen += 1;
    await shot(page, `question-screen-${screen}`);
    await answerVisible(f2);
    if (i === 1) await shot(page, `question-screen-${screen}-answered`);
    if (!(await gotoNextScreen(f2))) break;
  }
  await sleep(1200);
  const submit = f2.locator(".realtest-header__bt-submit");
  await submit.click({ timeout: 8000 });
  await sleep(1400);
  await shot(page, "submit-confirm-modal");
  await confirmSubmitModal(f2);
  await sleep(4000);
  await shot(page, "after-submit");
  await page.goBack({ waitUntil: "commit", timeout: 20000 }).catch(() => {});
  await sleep(1600);
  await ctx.close();
}

/** 08 机考 · 阅读 */
async function sceneExamReading(browser) {
  beginScene("08-exam-reading");
  const { ctx, page } = await newContext(browser);
  await page.goto(BASE + "/mock", { waitUntil: "networkidle" }).catch(() => {});
  await sleep(2000);
  await page.locator('button:text-is("阅读")').first().click();
  await sleep(1100);
  await humanScroll(page, 1, 2);
  await shot(page, "reading-selected");
  await humanScroll(page, -1, 3);
  await page.locator('a:has-text("开始机考")').first().click();
  await sleep(2200);

  const f = await waitExamFrame(page);
  await sleep(1800);
  await shot(page, "passage-screen-1");
  for (let i = 0; i < 4; i++) {
    await answerVisible(f);
    if (i === 0) await shot(page, "passage-answered");
    if (!(await gotoNextScreen(f))) break;
    await shot(page, `passage-screen-${i + 2}`);
  }
  await sleep(1200);
  const submit = f.locator(".realtest-header__bt-submit");
  await submit.click({ timeout: 8000 });
  await sleep(1400);
  await shot(page, "submit-confirm-modal");
  await confirmSubmitModal(f);
  await sleep(4500);
  await shot(page, "after-submit");
  await page.goBack({ waitUntil: "commit", timeout: 20000 }).catch(() => {});
  await sleep(1600);
  await ctx.close();
}

/** 09 机考 · 写作 */
async function sceneExamWriting(browser) {
  beginScene("09-exam-writing");
  const { ctx, page } = await newContext(browser);
  await page.goto(BASE + "/mock", { waitUntil: "networkidle" }).catch(() => {});
  await sleep(2000);
  await page.locator('button:text-is("写作")').first().click();
  await sleep(1100);
  await humanScroll(page, 1, 2);
  await shot(page, "writing-selected");
  await humanScroll(page, -1, 3);
  await page.locator('a:has-text("开始机考")').first().click();
  await sleep(2200);

  const f = await waitExamFrame(page);
  await sleep(1500);
  await shot(page, "task1-topic");
  const b1 = f.locator("#input1");
  await b1.scrollIntoViewIfNeeded().catch(() => {});
  await b1.click().catch(() => {});
  await humanType(page, ESSAY_T1.slice(0, 200), { min: 8, max: 20 });
  await shot(page, "task1-typing");
  await humanType(page, ESSAY_T1.slice(200), { min: 8, max: 20 });
  await sleep(900);
  await shot(page, "task1-completed");
  await f.locator("#js-btn-next").click({ timeout: 6000 }).catch(() => {});
  await sleep(1600);
  await shot(page, "task2-topic");
  const b2 = f.locator("#input2");
  await b2.scrollIntoViewIfNeeded().catch(() => {});
  await b2.click().catch(() => {});
  await humanType(page, ESSAY_T2, { min: 8, max: 20 });
  await sleep(900);
  await shot(page, "task2-completed");
  try {
    const submit = f.locator(".realtest-header__bt-submit");
    await submit.click({ timeout: 8000 });
    await sleep(1400);
    await shot(page, "submit-confirm-modal");
    await submitExam(f);
  } catch { /* detach 属预期 */ }
  // AI 批改: 抓「批改中」与「出分」两个状态
  let gradingShot = false;
  for (let i = 0; i < 16; i++) {
    await sleep(5000);
    const cur = examFrame(page);
    if (!cur) continue;
    const st = await cur.evaluate(() => {
      const t = document.body?.innerText ?? "";
      return {
        grading: /批改中|Grading/i.test(t),
        done: /总评分|批改完成|Overall|Band/i.test(t) && !/批改中|Grading/i.test(t),
      };
    }).catch(() => ({ grading: false, done: false }));
    if (st.grading && !gradingShot) {
      await shot(page, "ai-grading").catch(() => {});
      gradingShot = true;
    }
    if (st.done) break;
  }
  await sleep(1500);
  await shot(page, "ai-result-overview").catch(() => {});
  try {
    await humanScroll(page, 1, 4);
    await shot(page, "ai-result-details").catch(() => {});
  } catch { /* 忽略 */ }
  await page.goBack().catch(() => {});
  await sleep(1600);
  await ctx.close();
}

/** 10 写作仿真页 */
async function sceneWritingSim(browser) {
  beginScene("10-writing-sim");
  const { ctx, page } = await newContext(browser);
  await page.goto(BASE + "/writing", { waitUntil: "networkidle" }).catch(() => {});
  await sleep(2200);
  await shot(page, "writing-home");
  await humanScroll(page, 1, 2);
  await shot(page, "writing-home-scrolled");
  await humanScroll(page, -1, 3);

  const pick = page.locator('button.btn.main:has-text("随机"), button:has-text("换")').first();
  if (await pick.count()) {
    await pick.click().catch(() => {});
    await sleep(1500);
    await shot(page, "topic-picked");
  }
  const editor = page.locator("textarea.editor, textarea").first();
  if (await editor.count()) {
    await editor.click().catch(() => {});
    await humanType(page, ESSAY_SIM.slice(0, 180), { min: 10, max: 24 });
    await shot(page, "letter-typing");
    await humanType(page, ESSAY_SIM.slice(180), { min: 10, max: 24 });
    await sleep(900);
    await shot(page, "letter-completed");
    const submit = page.locator('button.btn.main:has-text("交卷")').first();
    if (await submit.count()) {
      await submit.click().catch(() => {});
      await sleep(6000);
      await shot(page, "practice-stats");
      const ai = page.locator('button:has-text("AI 批改")').first();
      if (await ai.count()) {
        await ai.click().catch(() => {});
        let gradingShot = false;
        for (let i = 0; i < 18; i++) {
          await sleep(5000);
          const st = await page.evaluate(() => {
            const t = document.body.innerText ?? "";
            return {
              grading: /(批改中|分析中)/.test(t),
              done: /(任务响应|连贯衔接|词汇丰富|语法|总评|范文)/.test(t),
            };
          }).catch(() => ({ grading: false, done: false }));
          if (st.grading && !gradingShot) {
            await shot(page, "ai-grading").catch(() => {});
            gradingShot = true;
          }
          if (st.done) break;
        }
        await sleep(1500);
        await shot(page, "ai-feedback-overview");
        await humanScroll(page, 1, 4);
        await shot(page, "ai-feedback-details");
        await humanScroll(page, 1, 3);
        await shot(page, "ai-feedback-model-essay");
      }
    }
  }
  await ctx.close();
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
  try {
    for (const name of names) {
      try {
        await SCENES[name](browser);
        console.log(`  ✓ ${name} 完成`);
      } catch (e) {
        console.error(`  ✗ ${name} 失败: ${e.message}`);
      }
    }
  } finally {
    await browser.close();
  }
  // 汇总
  let total = 0;
  for (const d of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const files = fs.readdirSync(path.join(ROOT, d.name)).filter((f) => f.endsWith(".png"));
    total += files.length;
    console.log(`${d.name}: ${files.length} 张`);
  }
  console.log(`共 ${total} 张 → ${ROOT}`);
}

function findChromium() {
  const root = path.join(process.env.HOME, "Library/Caches/ms-playwright");
  for (const dir of fs.readdirSync(root)) {
    if (!dir.startsWith("chromium-")) continue;
    const cand = path.join(root, dir, "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing");
    if (fs.existsSync(cand)) return cand;
  }
  throw new Error("未找到 chromium 可执行文件, 先 agent-browser install");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
