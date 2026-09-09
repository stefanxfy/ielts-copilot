#!/usr/bin/env node
/**
 * scripts/import-iot-paper.mjs — IOT 批量抓取卷导入(单套:听力+阅读+写作,幂等)
 *
 * 数据源:questions/<科>/<年>/<slug>/(scripts/iot-fetch.mjs 产物)
 *   test.html(IOT 原生 DOM) + answers.json({num:ans}) + audio.mp3(听力)
 * 产物对齐 import-papers.mjs 的工程版五表体系:
 *   - 静态托管 public/exams/<exam_id>/,共享资源 public/exams/shared/exam-assets/
 *     ⚠️ 共享目录含手工补丁(scoring/exam-guard/exam-note/audio-lock),只增不删,严禁 rmSync
 *   - 注入 scoring.js(听/阅)/exam-note.js(写)+ answers js + clock-sec + exam-guard
 *   - DB:exam_sets + papers upsert(questions_json 自 data-num/q_type/part 分区生成)
 *
 * 与 prototype 管线的差异:
 *   - 答案来自 answers.json(扁平 num→ans),blocks 留空(本套无 checkbox 块题;
 *     若引入含块题的卷,需在 HTML 中解析 checkbox name="q-a-b" 生成 blocks)
 *   - bandTable/duration 沿用 prototype answers js 的同科目值(官方口径不变)
 */
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

const ROOT = process.cwd();
const EXAMS_OUT = join(ROOT, "public", "exams");
const SHARED_ASSETS = join(EXAMS_OUT, "shared", "exam-assets");
const IOT_ASSETS = join(ROOT, "questions", "exam-assets");
const PROTO = join(ROOT, "prototype", "exam");
const DB_FILE = join(ROOT, "data", "app.db");
const MIGRATIONS = join(ROOT, "src", "db", "migrations");

/* ---------- 本次导入的卷(换卷改这里) ---------- */

const SET = {
  examSetId: "a-2025mar",
  title: "A类 · 2025年3月真题 Test 1",
  category: "A",
  testPeriod: "2025-03",
  /** 英文卷标(写作/口语页标题与页眉用,与原库 "A类写作 · 2025 January Test 1" 同构) */
  enLabel: "2025 March Test 1",
  papers: [
    {
      subject: "listening",
      dir: "questions/听力/2025/ielts-mock-test-2025-march-listening-practice-test-1",
      bandTableSrc: "answers-a-2025jan-listening-test1.js",
      audioDst: "listening-a-2025mar-test1.mp3",
    },
    {
      subject: "reading",
      dir: "questions/阅读/2025/ielts-mock-test-2025-march-reading-practice-test-1",
      bandTableSrc: "answers-a-2025jan-test1.js",
    },
    {
      subject: "writing",
      dir: "questions/写作/2025/ielts-mock-test-2025-march-writing-practice-test-1",
    },
    {
      subject: "speaking",
      dir: "questions/口语/2025/ielts-mock-test-2025-march-speaking-practice-test-1",
    },
  ],
};

const SUBJECT_TITLE = { reading: "阅读", listening: "听力", writing: "写作", speaking: "口语" };
const examIdOf = (p) => `${SET.examSetId}-${p.subject}-test1`;

/* ---------- 工具 ---------- */

/** prototype answers js → IELTS_EXAM(bandTable/duration 口径沿用) */
function loadProtoExam(file) {
  const code = readFileSync(join(PROTO, "exam-assets", file), "utf8");
  const fakeWindow = {};
  new Function("window", code)(fakeWindow);
  if (!fakeWindow.IELTS_EXAM) throw new Error(`${file} 未定义 window.IELTS_EXAM`);
  return fakeWindow.IELTS_EXAM;
}

/** IOT 卷页 HTML → {qTypeByNum, partOf, totalQ}(同 import-papers.parsePaperHtml) */
function parsePaperHtml(testHtml) {
  const qTypeByNum = new Map();
  for (const [, num, code] of testHtml.matchAll(/data-num="(\d+)"[^>]*data-q_type="(\d+)"/g)) {
    qTypeByNum.set(Number(num), Number(code));
  }
  const partCounts = [...testHtml.matchAll(/data-part="\d+"[^>]*data-questions="(\d+)"/g)].map((m) => Number(m[1]));
  if (!partCounts.length) throw new Error("卷页未找到 part 分区(data-part/data-questions)");
  const partOf = new Map();
  let n = 1;
  partCounts.forEach((count, i) => {
    for (let k = 0; k < count; k++) partOf.set(n++, i + 1);
  });
  return { qTypeByNum, partOf, totalQ: n - 1 };
}

const LETTER_ANS = /^[A-D](\s*,\s*[A-D])?$/;

function classify(num, answers, qTypeByNum) {
  const ans = String(answers[String(num)] ?? "");
  if (qTypeByNum.get(num) === 11) return { type: "TFNG", anchor: `q-${num}`, max: 1 };
  if (LETTER_ANS.test(ans)) return { type: ans.includes(",") ? "MULTI" : "SINGLE", anchor: `q-${num}`, max: 1 };
  return { type: "FILL", anchor: `q-${num}`, max: 1 };
}

/** IOT 页面通用改写:相对资源 → 共享目录,去掉 data-iot-orig,页尾注入脚本 */
function transformPage(html, extraScripts) {
  let out = html
    .replace(/(\.\/|\.\.\/\.\.\/\.\.\/)exam-assets\//g, "../shared/exam-assets/")
    // 装饰图(页脚二维码/封面缩略图等 inline-images/styles/themes)本地从未下载,还原原站外链
    .replace(/(src)="img\/[^"]*"([^>]*)data-iot-orig="([^"]*(?:\/inline-images\/|\/styles\/|\/themes\/)[^"]*)"/gi, "$1=\"$3\"$2")
    .replace(/ data-iot-orig="[^"]*"/g, "")
    // 原站标识清洗(导入铁律③):favicon/canonical/hreflang/og/twitter 及 Drupal 管理链一律不留
    .replace(/<link[^>]*rel="(?:shortcut )?icon"[^>]*>/g, "")
    .replace(/<link[^>]*rel="(?:canonical|alternate|delete-[a-z-]*form|edit-form|add-form|version-history|devel-[a-z-]+|token-devel|drupal:[a-z-]+|to-[a-z-]+|revision[a-z-]*)"[^>]*>/g, "")
    .replace(/<link[^>]*href="https?:\/\/[^"]*ieltsonlinetests\.com[^"]*"[^>]*>/g, "")
    .replace(/<meta[^>]*property="og:[a-z:]+"[^>]*>/g, "")
    .replace(/<meta[^>]*name="twitter:[a-z:]+"[^>]*>/g, "");
  if (extraScripts?.length) {
    const inject = extraScripts.map((s) => `<script src="../shared/exam-assets/${s}"></script>`).join("\n");
    out = out.replace(/<\/body>/i, `${inject}\n</body>`);
  }
  return out;
}

/* ---------- 听/阅卷面框架对齐(范本:原库 a-2025jan 卷面,用户 2026-09-09 立规) ---------- */

/** 本地品牌 logo(与原库卷面同款"雅"字 SVG) */
/** 固定头部单一事实源:按科目直接复用范本原型(prototype/exam/a-{listening,reading}-test.html)的
 *  <header class="realtest-header"> 整块,不手抄。听/阅头部存在真实结构差异
 *  (阅读版便签图标带 Notepad tooltip 属性),不可互相推导。可变槽位:副标题/计时秒数/audio(仅听力)。
 *  范本头部日后改动只需改对应原型文件,导入自动跟随。 */
function getProtoHeader(subject) {
  const file = subject === "reading" ? "a-reading-test.html" : "a-listening-test.html";
  const tpl = readFileSync(join(PROTO, file), "utf8");
  const m = tpl.match(/<header class="realtest-header[\s\S]*?<\/header>/);
  if (!m) throw new Error(`原型模板 ${file} 缺少 realtest-header 头部块`);
  const hd = m[0];
  // 关键结构断言:范本被误改时快速失败,避免静默产出残缺头部
  for (const marker of [
    "realtest-header__logo",
    "ieltshome-brand",
    'id="time-clock"',
    "realtest-header__btn-group",
    "js-bt-notepad",
    "js-full-screen",
    "realtest-header__bt-submit",
    "ioticon-check-v2",
  ]) {
    if (!hd.includes(marker)) throw new Error(`原型头部缺少关键元素: ${marker}`);
  }
  if (subject === "listening" && !hd.includes('id="ielts-local-audio"'))
    throw new Error("原型听力头部缺少 ielts-local-audio");
  if (subject === "reading" && hd.includes('id="ielts-local-audio"'))
    throw new Error("原型阅读头部不应含 ielts-local-audio");
  return hd;
}

/** 按 id 平衡删除整个 <div> 块(modal 等嵌套结构) */
function removeDivById(html, id) {
  const at = html.indexOf(`id="${id}"`);
  if (at === -1) return html;
  const start = html.lastIndexOf("<div", at);
  const re = /<div\b|<\/div>/g;
  re.lastIndex = start;
  let depth = 0, m;
  while ((m = re.exec(html))) {
    depth += m[0] === "<div" ? 1 : -1;
    if (depth === 0) return html.slice(0, start) + html.slice(re.lastIndex);
  }
  return html;
}

/** 音量 UI 样式块(audio-lock.js 注入的 .ielts-vol 的视觉全靠它,缺失则音量条被裁剪不可见)。
 *  从原型听力模板提取,与原库范本同款。 */
function injectAudioLockStyle(html) {
  if (html.includes('id="audio-lock-style"')) return html;
  const tpl = readFileSync(join(PROTO, "a-listening-test.html"), "utf8");
  const m = tpl.match(/<style id="audio-lock-style">[\s\S]*?<\/style>/);
  if (!m) throw new Error("原型听力模板缺少 audio-lock-style 样式块");
  return html.replace(/<\/head>/i, `${m[0]}\n</head>`);
}

/** 听/阅卷面头部/框架与原库对齐:
 *  ① 整头替换:原站 IOT logo + practice-nav 菜单(Share/Report/TextSize/Solution/Download/SaveDraft)
 *     + Review 按钮 → 原库同款"雅"logo + 本地品牌标题块 + 纯净按钮组(便签/全屏/Submit);
 *     保留原卷计时秒数(data-time)与本地 audio 元素
 *  ② 原站功能 modal 清洗(原库卷面没有的 modal 一律删除)
 *  ③ 原站音轨选择器(audioSource select)删除
 *  ④ <title> 对齐原库命名 */
function alignQuizFrame(html, subject) {
  const headerMatch = html.match(/<header class="realtest-header[\s\S]*?<\/header>/);
  if (!headerMatch) throw new Error(`${subject}: 未找到 realtest-header`);
  const timeAttr = headerMatch[0].match(/id="time-clock"[^>]*?data-time="(\d+)"/) ?? headerMatch[0].match(/data-time="(\d+)"/);
  const dataTime = timeAttr ? timeAttr[1] : subject === "listening" ? "1920" : "3600";
  // 本地 audio 可能不在头部(新卷在 take-test__player-wrap 里)——全页提取,收进模板头部按钮组
  const audioMatch = html.match(/<audio id="ielts-local-audio"[\s\S]*?<\/audio>/);
  const audio = audioMatch ? audioMatch[0] : "";
  if (audioMatch) {
    html = html.replace(audioMatch[0], "").replace(
      /<div class="take-test__player-wrap"><div class="take-test__player-container">\s*<\/div><\/div>/,
      "",
    );
  }
  const sub = `${SET.category}类 · ${SUBJECT_TITLE[subject]} · ${SET.enLabel}`;
  // 头部直接取自本科目范本原型,仅替换可变槽位:副标题 / 计时秒数 / audio(仅听力)
  let header = getProtoHeader(subject);
  header = header.replace(
    /(<span style="font-size:11px;color:#5a6472">)[^<]*(<\/span>)/,
    `$1${sub}$2`,
  );
  header = header.replace(
    /data-time="\d+" data-duration-default="\d+"/,
    `data-time="${dataTime}" data-duration-default="${dataTime}"`,
  );
  if (subject === "listening") {
    header = header.replace(
      /<audio id="ielts-local-audio">[\s\S]*?<\/audio>|<audio id="ielts-local-audio"[\s\S]*?<\/audio>/,
      audio,
    );
  }
  html = html.replace(headerMatch[0], header);
  for (const id of [
    "modal-exit-test",
    "modal-review-test",
    "modal-save-draft-message-lr",
    "modal-share",
    "modal-share-lesson",
    "modal-submit-test",
    "modal-time-up",
    "modal-view-solution",
  ]) {
    html = removeDivById(html, id);
  }
  html = html.replace(/<select name="audioSource"[\s\S]*?<\/select>/g, "");
  // 音频已收进头部,原播放器容器(audio+select 均已移出)若已为空壳则移除
  html = html.replace(
    /<div class="take-test__player-wrap"><div class="take-test__player-container">\s*<\/div><\/div>/g,
    "",
  );
  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>IELTS 本地机考 · ${SET.category}类${SUBJECT_TITLE[subject]} · ${SET.enLabel}</title>`,
  );
  if (audio) html = injectAudioLockStyle(html);
  return html;
}

/* ---------- 写作/口语模拟页生成 ---------- */

/** 写作内容页 → {T1:{html,img}, T2:{html}}。
 *  .test-question__question 里是结构化题干 <p>(与原库模板插槽同构);
 *  T1 图在 .test-question__img-writing 的 data-src(懒加载 div)。 */
function loadWritingSections(testHtml, srcLabel) {
  const out = {};
  for (const m of testHtml.matchAll(/Writing Task ([12])<\/span>[\s\S]*?<div class="test-question__question">([\s\S]*?)<div class="test-question__expand/g)) {
    const key = m[1] === "1" ? "T1" : "T2";
    if (out[key]) continue;
    let body = m[2].replace(/<\/div>\s*$/, ""); // 去掉 question div 自身的闭合
    const imgMatch = body.match(/data-src="(img\/[^"]+)"/);
    // 题干只留 <p> 段落(懒加载图 div/多余标签剔除)
    const paras = [...body.matchAll(/<p[\s\S]*?<\/p>/g)].map((x) => x[0]).join("");
    if (!paras) throw new Error(`${srcLabel} ${key} 题干段落解析为空`);
    out[key] = { html: paras, img: imgMatch ? imgMatch[1] : null };
  }
  if (!out.T1 || !out.T2) throw new Error(`${srcLabel} 写作题干解析不足 2 组(得到 ${Object.keys(out).join(",")})`);
  return out;
}

/** 原库写作模拟页模板(a-writing-test.html) + 题干插槽替换 → writing.html。
 *  模板其余(计时/字数统计/草稿板/提交弹窗)原样保留。 */
function buildWritingSim(testHtml, examId) {
  const tpl = readFileSync(join(PROTO, "a-writing-test.html"), "utf8");
  const sec = loadWritingSections(testHtml, examId);
  let out = tpl;

  // 标题 + 页眉副标题(两处:原库同构 "A类写作 · <enLabel>")
  const pageTitle = `IELTS 本地机考 · ${SET.category}类写作 · ${SET.enLabel}`;
  out = out.replace(/<title>[^<]*<\/title>/, `<title>${pageTitle}</title>`);
  out = out.replace(
    /(<span style="font-size:11px;color:#5a6472">)[^<]*(<\/span>)/,
    `$1${SET.category}类 · 写作 · ${SET.enLabel}$2`,
  );

  // 两个题干 section:第一个可见(T1),第二个 display:none(T2)
  const buildSection = (openTag, key) => {
    const s = sec[key];
    const title = key === "T1" ? "Writing Task 1" : "Writing Task 2";
    const img = s.img
      ? ` <img src="${s.img}" alt="${title}" class="test-contents__img-custom img-center"> `
      : "";
    return `${openTag}<h1 class="test-contents__title">${title}</h1>${s.html}${img}</section>`;
  };
  // 逐个替换两个题干 section(保留各自 open tag:第一个可见,第二个 display:none)
  const secs = [...out.matchAll(/<section class="test-contents ckeditor-wrapper"[^>]*>[\s\S]*?<\/section>/g)];
  if (secs.length !== 2) throw new Error(`${examId}: 写作模板题干 section 数量异常(${secs.length})`);
  const tags = secs.map((m) => m[0].match(/^<section[^>]*>/)[0]);
  out = out
    .replace(secs[0][0], buildSection(tags[0], "T1"))
    .replace(secs[1][0], buildSection(tags[1], "T2"));

  // 资产路径 + 离开防护(与听/阅同款)
  out = transformPage(out);
  out = out.replace(
    /<\/body>/i,
    `<script src="../shared/exam-assets/exam-guard.js" defer></script>\n</body>`,
  );
  return out;
}

/** 口语内容页 → {P1:[q...], P2:{cue, points[]}, P3:[q...]}(recording accordion 三面板) */
function loadSpeakingParts(testHtml, srcLabel) {
  const cutAt = (start) => {
    const next = testHtml.slice(start).search(/href="#part[23]|做题|class="recording__footer/);
    return next === -1 ? testHtml.slice(start) : testHtml.slice(start, start + next);
  };
  const linesOf = (html) =>
    [...html.matchAll(/>([^<>]+)</g)]
      .map((m) => m[1].replace(/&amp;/g, "&").replace(/&#039;|&rsquo;/g, "'").replace(/&quot;/g, '"').trim())
      .filter((t) => t && !/^(PART \d|Introduction and Interview|Topic|Topic Discussion)$/.test(t));

  const seg1 = cutAt(testHtml.indexOf('id="part1"'));
  const seg2 = cutAt(testHtml.indexOf('id="part2"'));
  const seg3 = cutAt(testHtml.indexOf('id="part3"'));
  const l1 = linesOf(seg1);
  const l2 = linesOf(seg2);
  const l3 = linesOf(seg3);
  if (!l1.length || !l2.length || !l3.length) throw new Error(`${srcLabel} 口语题目解析为空(P1=${l1.length} P2=${l2.length} P3=${l3.length})`);
  // P2 第一行 = cue card 任务,其后为 You should say 要点
  const cueIdx = l2.findIndex((t) => /^You should say/i.test(t));
  const cue = l2.slice(0, cueIdx === -1 ? 1 : cueIdx).join(" ");
  const points = cueIdx === -1 ? l2.slice(1) : l2.slice(cueIdx + 1);
  return { P1: l1, P2: { cue, points }, P3: l3 };
}

/** 口语模拟页(自研,无原站对应页):三部分导航 + P2 cue card 准备/作答计时。
 *  视觉沿用原库 realtest-header 风格;无判分,行前离开确认。 */
function buildSpeakingHtml(testHtml, examId) {
  const parts = loadSpeakingParts(testHtml, examId);
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const title = `IELTS 本地机考 · ${SET.category}类口语 · ${SET.enLabel}`;
  const qList = (arr) => `<ol class="sp-qlist">${arr.map((q) => `<li>${esc(q)}</li>`).join("")}</ol>`;
  const p2 = parts.P2;
  return `<!DOCTYPE html>
<html lang="zh-hans">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif; color: #1c2330; background: #f4f6fa; }
  .rt-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 28px; background: #fff; border-bottom: 1px solid #e3e8f0; position: sticky; top: 0; z-index: 10; }
  .rt-brand { display: flex; align-items: center; gap: 10px; }
  .rt-brand__logo { height: 38px; width: 38px; display: block; }
  .rt-brand__main { font-size: 17px; font-weight: 700; color: #1c2330; display: block; }
  .rt-brand__sub { font-size: 11px; color: #5a6472; }
  .rt-timer { text-align: right; }
  .rt-timer__val { font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums; color: #1c2330; }
  .rt-timer__text { font-size: 11px; color: #5a6472; margin-left: 6px; }
  .sp-tabs { display: flex; gap: 8px; max-width: 960px; margin: 20px auto 0; padding: 0 24px; }
  .sp-tab { flex: 1; padding: 10px 12px; border: 1px solid #dfe4ec; border-radius: 8px 8px 0 0; background: #e9edf4; color: #5a6472; font-size: 13px; font-weight: 600; cursor: pointer; border-bottom: none; }
  .sp-tab.-active { background: #fff; color: #1a6feb; border-color: #dfe4ec; }
  .sp-panel { display: none; max-width: 960px; margin: 0 auto; padding: 24px; background: #fff; border: 1px solid #dfe4ec; border-top: none; border-radius: 0 0 8px 8px; min-height: 420px; }
  .sp-panel.-active { display: block; }
  .sp-part-tag { display: inline-block; font-size: 12px; font-weight: 700; color: #fff; background: #1a6feb; border-radius: 4px; padding: 3px 10px; margin-bottom: 6px; letter-spacing: .5px; }
  .sp-part-name { display: block; font-size: 15px; color: #5a6472; margin-bottom: 16px; }
  .sp-qlist { padding-left: 22px; line-height: 2.1; font-size: 15.5px; }
  .sp-qlist li::marker { color: #1a6feb; font-weight: 700; }
  .sp-cue { border: 1.5px solid #1a6feb; border-radius: 10px; padding: 22px 26px; background: #f7faff; }
  .sp-cue__topic { font-size: 16.5px; line-height: 1.7; font-weight: 600; }
  .sp-cue__points { margin-top: 14px; padding-left: 20px; line-height: 2; font-size: 15px; color: #3c4657; }
  .sp-cue__hint { margin-top: 14px; font-size: 12.5px; color: #8a93a2; }
  .sp-timerbox { margin-top: 22px; display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
  .sp-clock { font-size: 40px; font-weight: 800; font-variant-numeric: tabular-nums; color: #1c2330; min-width: 120px; }
  .sp-clock.-run { color: #1a6feb; }
  .sp-clock.-warn { color: #d64545; }
  .sp-btn { padding: 9px 18px; border: none; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; background: #1a6feb; color: #fff; }
  .sp-btn.-ghost { background: #fff; color: #1c2330; border: 1px solid #c9d2e0; }
  .sp-btn:disabled { opacity: .45; cursor: not-allowed; }
  .sp-stage { font-size: 13px; color: #5a6472; }
  .sp-foot { max-width: 960px; margin: 14px auto 40px; padding: 0 24px; font-size: 12px; color: #8a93a2; }
</style>
</head>
<body>
<header class="rt-header">
  <div class="rt-brand"><img class="rt-brand__logo" src="../shared/exam-assets/app-logo.svg" alt="IELTS 本地机考"><div class="rt-brand__text"><span class="rt-brand__main">IELTS 本地机考</span><span class="rt-brand__sub">${SET.category}类 · 口语 · ${SET.enLabel}</span></div></div>
  <div class="rt-timer"><span class="rt-timer__val" id="sp-elapsed">00:00</span><span class="rt-timer__text">已用时 · 口语全程 11–14 分钟</span></div>
</header>
<nav class="sp-tabs">
  <button class="sp-tab -active" data-part="1">PART 1 · Introduction &amp; Interview</button>
  <button class="sp-tab" data-part="2">PART 2 · Topic Card</button>
  <button class="sp-tab" data-part="3">PART 3 · Discussion</button>
</nav>
<main>
  <section class="sp-panel -active" id="sp-part1">
    <span class="sp-part-tag">PART 1</span><span class="sp-part-name">Introduction and Interview(考官提问,每题 2–4 句作答)</span>
    ${qList(parts.P1)}
  </section>
  <section class="sp-panel" id="sp-part2">
    <span class="sp-part-tag">PART 2</span><span class="sp-part-name">Topic Card(准备 1 分钟,连续作答 1–2 分钟)</span>
    <div class="sp-cue">
      <div class="sp-cue__topic">${esc(p2.cue)}</div>
      <ul class="sp-cue__points">${p2.points.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
      <div class="sp-cue__hint">You should say: 要点已列于卡片 · 可在准备阶段做笔记</div>
    </div>
    <div class="sp-timerbox">
      <div class="sp-clock" id="sp-p2clock">01:00</div>
      <button class="sp-btn" id="sp-prep">1 分钟准备</button>
      <button class="sp-btn" id="sp-speak" disabled>开始作答(2 分钟)</button>
      <button class="sp-btn -ghost" id="sp-reset">重置</button>
      <span class="sp-stage" id="sp-stage">待开始</span>
    </div>
  </section>
  <section class="sp-panel" id="sp-part3">
    <span class="sp-part-tag">PART 3</span><span class="sp-part-name">Two-way Discussion(双向讨论,围绕 Part 2 话题展开)</span>
    ${qList(parts.P3)}
  </section>
</main>
<div class="sp-foot">IELTS 本地机考 · 自研口语模拟页(题目取自 IOT ${SET.enLabel}) · 答题请自行录音存档</div>
<script>
(function () {
  var $ = function (id) { return document.getElementById(id); };
  // 全程计时
  var t0 = Date.now(), el = $("sp-elapsed");
  setInterval(function () {
    var s = Math.floor((Date.now() - t0) / 1000);
    el.textContent = String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  }, 500);
  // Part 切换
  document.querySelectorAll(".sp-tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      document.querySelectorAll(".sp-tab").forEach(function (t) { t.classList.remove("-active"); });
      document.querySelectorAll(".sp-panel").forEach(function (p) { p.classList.remove("-active"); });
      tab.classList.add("-active");
      $("sp-part" + tab.dataset.part).classList.add("-active");
    });
  });
  // P2 计时:准备 60s → 作答 120s
  var clock = $("sp-clock") || $("sp-p2clock"), stage = $("sp-stage");
  var handle = null, mode = null;
  var btnPrep = $("sp-prep"), btnSpeak = $("sp-speak"), btnReset = $("sp-reset");
  function fmt(sec) { return String(Math.floor(sec / 60)).padStart(2, "0") + ":" + String(sec % 60).padStart(2, "0"); }
  function run(total, label, done) {
    stop(); mode = label; var left = total;
    clock.textContent = fmt(left); clock.className = "sp-clock -run"; stage.textContent = label;
    handle = setInterval(function () {
      left--;
      clock.textContent = fmt(Math.max(left, 0));
      if (left <= 10) clock.className = "sp-clock -warn";
      if (left <= 0) { stop(); stage.textContent = label + "结束"; if (done) done(); }
    }, 1000);
  }
  function stop() { if (handle) clearInterval(handle); handle = null; }
  btnPrep.addEventListener("click", function () { run(60, "准备中", function () { btnSpeak.disabled = false; }); });
  btnSpeak.addEventListener("click", function () { run(120, "作答中"); });
  btnReset.addEventListener("click", function () {
    stop(); mode = null; clock.textContent = "01:00"; clock.className = "sp-clock";
    stage.textContent = "待开始"; btnSpeak.disabled = true;
  });
  // 离开防护(与听/阅 exam-guard 同口径)
  window.addEventListener("beforeunload", function (e) { e.preventDefault(); e.returnValue = ""; });
})();
</script>
</body>
</html>`;
}

/* ---------- 步骤 1:静态托管 ---------- */

function copyStatic() {
  // 共享资源只增不删(保护手工补丁:scoring/exam-guard/exam-note/audio-lock/clock-sec 等)
  mkdirSync(SHARED_ASSETS, { recursive: true });
  let added = 0;
  for (const f of readdirSync(IOT_ASSETS)) {
    const dst = join(SHARED_ASSETS, f);
    if (!existsSync(dst)) {
      cpSync(join(IOT_ASSETS, f), dst);
      added++;
    }
  }
  console.log(`[import] 共享资源补齐:${added} 个新文件(其余沿用已打补丁版本)`);

  for (const p of SET.papers) {
    const examId = examIdOf(p);
    const dir = join(EXAMS_OUT, examId);
    mkdirSync(dir, { recursive: true });
    const testHtml = readFileSync(join(ROOT, p.dir, "test.html"), "utf8");
    // 卷内题目图片目录(写作 T1 图/阅读配图/听力题卡图)
    const imgDir = join(ROOT, p.dir, "img");
    if (existsSync(imgDir)) {
      const dstImg = join(dir, "img");
      mkdirSync(dstImg, { recursive: true });
      for (const f of readdirSync(imgDir)) copyFileSync(join(imgDir, f), join(dstImg, f));
    }

    if (p.subject === "listening") {
      // 音频入共享(对齐 prototype 命名:listening-<examSetId>-test1.mp3)
      copyFileSync(join(ROOT, p.dir, "audio.mp3"), join(SHARED_ASSETS, p.audioDst));
      // 原站播放器 → 本地真考模式隐藏 audio(autoplay+muted 绕自动播放策略,audio-lock 接管)
      const html = transformPage(testHtml).replace(
        /<audio id="listening-practice-player"[^>]*>[\s\S]*?<\/audio>/,
        `<audio id="ielts-local-audio" preload="auto" autoplay muted class="ielts-local-audio" style="display:none" title="IELTS 本地机考 · 听力音频（本地 · 真考模式：仅播一次）"><source src="../shared/exam-assets/${p.audioDst}" type="audio/mp3"></audio>`,
      );
      // 框架对齐范本(a-2025jan):头部/品牌/modal/标题统一,再注入判分链脚本
      writeFileSync(
        join(dir, "listening.html"),
        transformPage(alignQuizFrame(html, "listening"), [
          `answers-${examId}.js`,
          "clock-sec.js",
          "scoring.js",
          "exam-guard.js",
          "audio-lock.js",
        ]).replace(/<script src="(\.\.\/shared\/exam-assets\/exam-guard\.js)"><\/script>/, '<script src="$1" defer></script>'),
      );
      // 进入链路:试音 → 须知(同 import-papers,副标题/跳转目标逐卷改写)
      const sub = `${SET.category}类 听力 · ${SET.title.split("·")[1]?.trim() ?? SET.title}`;
      let ts = transformPage(readFileSync(join(PROTO, "test-sound.html"), "utf8"));
      ts = ts
        .replace(/(<div class="ts-sub">)[^<]*(<\/div>)/, `$1${sub} · Test sound$2`)
        .replace(/var target = 'instructions\.html\?clockdefer=1'[^;]*;/, "var target = 'instructions.html?clockdefer=1';");
      writeFileSync(join(dir, "test-sound.html"), ts);
      let ins = transformPage(readFileSync(join(PROTO, "instructions.html"), "utf8"));
      ins = ins
        .replace(/(<div class="ts-sub">)[^<]*(<\/div>)/, `$1${sub} · Instructions$2`)
        .replace(/var targetTest = [^;]*;/, "var targetTest = 'listening.html';");
      writeFileSync(join(dir, "instructions.html"), ins);
    } else if (p.subject === "reading") {
      writeFileSync(
        join(dir, "reading.html"),
        transformPage(alignQuizFrame(transformPage(testHtml), "reading"), [
          `answers-${examId}.js`,
          "clock-sec.js",
          "scoring.js",
          "exam-guard.js",
        ]).replace(
          /<script src="(\.\.\/shared\/exam-assets\/exam-guard\.js)"><\/script>/,
          '<script src="$1" defer></script>',
        ),
      );
    } else if (p.subject === "writing") {
      // 写作:自研模拟页(原库 a-writing-test 模板 + 本卷题干插槽),无判分,exam-note 上报 + 离开防护
      writeFileSync(join(dir, "writing.html"), buildWritingSim(testHtml, examId));
    } else {
      // 口语:自研模拟页(无原站对应页)
      writeFileSync(join(dir, "speaking.html"), buildSpeakingHtml(testHtml, examId));
    }
    console.log(`[import] 静态托管 ${examId} → public/exams/${examId}/`);
  }
}

/* ---------- 步骤 2:answers-<examId>.js 生成(听/阅,scoring.js 依赖) ---------- */

function writeAnswersJs() {
  for (const p of SET.papers) {
    if (p.subject === "writing" || p.subject === "speaking") continue;
    const examId = examIdOf(p);
    const answers = JSON.parse(readFileSync(join(ROOT, p.dir, "answers.json"), "utf8"));
    const proto = loadProtoExam(p.bandTableSrc);
    const total = Object.keys(answers).length;
    const js = `/* ${SET.title} · ${SUBJECT_TITLE[p.subject]} · 判分数据(由 scripts/import-iot-paper.mjs 生成)
 * 来源:${p.dir}/answers.json(IOT /solution 页 sys-answer 解析)
 * bandTable/duration 沿用 prototype 同科目口径(${p.bandTableSrc})
 */
window.IELTS_EXAM = {
  id: '${examId}',
  total: ${total},
  duration: ${proto.duration ?? (p.subject === "listening" ? 30 : 60)},
  bandTable: ${JSON.stringify(proto.bandTable ?? [])},
  blocks: [],
  answers: ${JSON.stringify(answers, null, 2)},
};
`;
    writeFileSync(join(SHARED_ASSETS, `answers-${examId}.js`), js);
    console.log(`[import] answers-${examId}.js(${total} 题)`);
  }
}

/* ---------- 步骤 3:DB 导入 ---------- */

function ensureSchema(sqlite) {
  const has = sqlite.prepare("select name from sqlite_master where type='table' and name='papers'").get();
  if (!has) migrate(drizzle(sqlite), { migrationsFolder: MIGRATIONS });
}

function importDb() {
  const sqlite = new Database(DB_FILE);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  ensureSchema(sqlite);

  const upSet = sqlite.prepare(`
    INSERT INTO exam_sets (exam_set_id, title, category, test_period)
    VALUES (@examSetId, @title, @category, @testPeriod)
    ON CONFLICT(exam_set_id) DO UPDATE SET
      title = excluded.title, category = excluded.category, test_period = excluded.test_period
  `);
  const upPaper = sqlite.prepare(`
    INSERT INTO papers (exam_id, exam_set_id, subject, title, category, test_period,
                        duration_sec, band_table_json, assets_json, questions_json, answers_json, updated_at)
    VALUES (@examId, @examSetId, @subject, @title, @category, @testPeriod,
            @durationSec, @bandTableJson, @assetsJson, @questionsJson, @answersJson, unixepoch())
    ON CONFLICT(exam_id) DO UPDATE SET
      exam_set_id = excluded.exam_set_id, subject = excluded.subject, title = excluded.title,
      category = excluded.category, test_period = excluded.test_period, duration_sec = excluded.duration_sec,
      band_table_json = excluded.band_table_json, assets_json = excluded.assets_json,
      questions_json = excluded.questions_json, answers_json = excluded.answers_json,
      updated_at = unixepoch()
  `);

  const tx = sqlite.transaction(() => {
    upSet.run({ examSetId: SET.examSetId, title: SET.title, category: SET.category, testPeriod: SET.testPeriod });
    for (const p of SET.papers) {
      const examId = examIdOf(p);
      const entryFile = p.subject === "listening" ? "test-sound.html" : `${p.subject}.html`;
      const assets = { entry: `/exams/${examId}/${entryFile}` };
      if (p.subject === "listening") assets.audio = `/exams/shared/exam-assets/${p.audioDst}`;

      let questionsJson, answersJson = null, bandTable = [], durationSec = 3600;
      const testHtml = readFileSync(join(ROOT, p.dir, "test.html"), "utf8");
      if (p.subject === "writing") {
        const sec = loadWritingSections(testHtml, examId);
        const stripHtml = (s) => String(s ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
        const mk = (key, isT1) => ({
          part: null,
          type: "WRITING_TASK",
          anchor: null,
          max: null,
          prompt: stripHtml(sec[key].html),
          wordMin: isT1 ? 150 : 250,
          suggestedSec: (isT1 ? 20 : 40) * 60,
        });
        questionsJson = { T1: mk("T1", true), T2: mk("T2", false) };
      } else if (p.subject === "speaking") {
        questionsJson = loadSpeakingParts(testHtml, examId);
        durationSec = 14 * 60; // 口语全程 11–14 分钟,按上限记
      } else {
        const answers = JSON.parse(readFileSync(join(ROOT, p.dir, "answers.json"), "utf8"));
        const { qTypeByNum, partOf, totalQ } = parsePaperHtml(testHtml);
        const total = Object.keys(answers).length;
        if (totalQ !== total) throw new Error(`${examId}: 页面题数 ${totalQ} ≠ answers.json ${total} 条`);
        const proto = loadProtoExam(p.bandTableSrc);
        questionsJson = {};
        answersJson = {};
        for (let n = 1; n <= total; n++) {
          const c = classify(n, answers, qTypeByNum);
          questionsJson[String(n)] = { part: partOf.get(n) ?? null, type: c.type, anchor: c.anchor, max: c.max };
          answersJson[c.anchor] = String(answers[String(n)]);
        }
        bandTable = proto.bandTable ?? [];
        durationSec = (proto.duration ?? (p.subject === "listening" ? 30 : 60)) * 60;
      }

      upPaper.run({
        examId,
        examSetId: SET.examSetId,
        subject: p.subject,
        title: `${SET.category}类 ${SUBJECT_TITLE[p.subject]} · ${SET.title.split("·")[1]?.trim() ?? SET.title}`,
        category: SET.category,
        testPeriod: SET.testPeriod,
        durationSec,
        bandTableJson: JSON.stringify(bandTable),
        assetsJson: JSON.stringify(assets),
        questionsJson: JSON.stringify(questionsJson),
        answersJson: answersJson ? JSON.stringify(answersJson) : null,
      });
    }
  });
  tx();

  const rows = sqlite
    .prepare("select exam_id, subject, duration_sec, json_array_length(questions_json) qs from papers where exam_set_id = ?")
    .all(SET.examSetId);
  console.log(`[import] DB 导入完成:exam_sets +${1} · papers ${rows.length} 行`);
  for (const r of rows) console.log(`  - ${r.exam_id}(${r.subject})时长 ${r.duration_sec}s · 档案 ${r.qs} 条`);
  sqlite.close();
}

/* ---------- 主流程 ---------- */

for (const p of SET.papers) {
  const d = join(ROOT, p.dir);
  if (!existsSync(d) || !existsSync(join(d, "test.html"))) {
    console.error(`[import] 卷源缺失:${d}`);
    process.exit(1);
  }
}

copyStatic();
writeAnswersJs();
importDb();
