#!/usr/bin/env node
/**
 * scripts/seed-from-html.mjs — prototype HTML → seeds/<slug>/paper.json + 拷图(M2 步骤 1 骨架)
 *
 * 设计要点:
 *  - 锚点统一:data-num="N" / data-num="N-M"(块题)/ name="q-N" / name="q-N-M"
 *  - 四种 skill 各有专属提取逻辑:LISTENING / READING 共享同一段(数据元素一致);
 *    WRITING 从 drupalSettings 的 tasks 字段读(question JSON)
 *  - 题面清洗:全走 sanitize-html 白名单(用户在 M2-1 拍板:style/class 全剥)
 *  - 与手写 answers-*.js 对账:解析器扫到的题数应 = js 里 key 数(块题时按块成员算)
 *
 * 当前形态(M2-1 收尾):骨架就位,只解析 + 输出 paper.json,不直接入库。
 * 实际 6 卷完整解析逻辑将在 M2-2 逐步收口(逐卷适配)。
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, cpSync, readdirSync } from "node:fs";
import { join, dirname, basename, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import vm from "node:vm";
import { JSDOM } from "jsdom";
import sanitize from "sanitize-html";
import DOMPurify from "isomorphic-dompurify";

/* ---------- 配置 ---------- */

const PROTOTYPE_DIR = resolve(process.cwd(), "prototype");
const SEEDS_DIR = resolve(process.cwd(), "seeds");

/** 6 套卷的"源文件 → 卷源 slug → skill"映射;
 *  新增一卷 = 加一行。答案 js 在解析过程中读用来校验题数对账。 */
const JOBS = [
  { slug: "a-2025jan-listening-test1", file: "a-listening-test.html", skill: "LISTENING", category: "A", answersJs: "answers-a-2025jan-listening-test1.js" },
  { slug: "a-2025jan-reading-test1",   file: "a-reading-test.html",   skill: "READING",   category: "A", answersJs: "answers-a-2025jan-test1.js" },
  { slug: "a-2025jan-writing-test1",    file: "a-writing-test.html",   skill: "WRITING",   category: "A", answersJs: null },
  { slug: "gt-vol1-listening-test1",   file: "gt-listening-test.html", skill: "LISTENING", category: "G", answersJs: "answers-gt-vol1-listening-test1.js" },
  { slug: "gt-vol1-reading-test1",     file: "gt-reading-test.html",   skill: "READING",   category: "G", answersJs: "answers-gt-vol1-test1.js" },
  { slug: "gt-vol1-writing-test1",     file: "gt-writing-test.html",   skill: "WRITING",   category: "G", answersJs: null },
];

/* ---------- sanitize-html 白名单(与 src/lib/seed-validate.ts 同源) ---------- */

const SANITIZE_OPTS = {
  allowedTags: [
    "p", "span", "div", "br", "strong", "em", "b", "i", "u", "sub", "sup",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
    "ul", "ol", "li", "dl", "dt", "dd",
    "input", "textarea", "select", "option", "optgroup",
    "label", "fieldset", "legend", "form",
    "a", "img",
    "svg", "g", "path", "circle", "rect", "line", "polyline", "polygon",
    "text", "defs", "linearGradient", "stop",
  ],
  allowedAttributes: {
    "*": ["class", "data-num", "data-template", "data-q_type", "title"],
    a: ["href"], img: ["src", "alt", "width", "height"],
    input: ["type", "name", "value", "placeholder", "checked", "disabled", "readonly", "required"],
    textarea: ["name", "rows", "cols", "placeholder", "readonly"],
    select: ["name", "disabled", "required"], option: ["value", "selected", "disabled"],
    form: ["action"],
    th: ["colspan", "rowspan", "scope"], td: ["colspan", "rowspan"],
    svg: ["viewBox", "width", "height", "xmlns"],
    path: ["d", "fill", "stroke"], circle: ["cx", "cy", "r", "fill", "stroke"],
    rect: ["x", "y", "width", "height", "rx", "ry", "fill", "stroke"],
    line: ["x1", "y1", "x2", "y2", "stroke"],
    text: ["x", "y", "fill", "font-size", "font-weight", "text-anchor"],
    linearGradient: ["id", "x1", "y1", "x2", "y2"],
    stop: ["offset", "stop-color"], g: ["transform"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["http", "https", "data"] },
  allowedSchemesAppliedToAttributes: ["href", "src"],
  disallowedTagsMode: "discard",
};

function sanitizeHtml(s) {
  return sanitize(s ?? "", SANITIZE_OPTS);
}

/** 渲染层二次防御(纵深):清洗后再过 DOMPurify。
 *  对 SSR 场景 isomorphic-dompurify 在 jsdom 下工作,M2/M3 渲染路径走它。 */
function purifyHtml(s) {
  return DOMPurify.sanitize(s, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["script", "iframe", "object", "embed"],
    FORBID_ATTR: ["style", "on*"],
  });
}

/* ---------- 解析核心 ---------- */

/** 解析四套入口 skill:listening/reading/writing */
function parsePaper(job, html, answersKeyCount) {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const { title, durationSec } = parsePaperMeta(document, job);
  const sections = parseSections(document, job);
  const passages = parsePassages(document, job);
  const { questionGroups, questions, choices } = parseItems(document, job);
  const answers = loadAnswersFromJs(job, questions.length);
  const writingTasks = job.skill === "WRITING" ? parseWritingTasks(document, job) : [];

  return {
    paper: {
      slug: job.slug,
      title,
      category: job.category,
      skill: job.skill,
      source: "ieltsonlinetests.com",
      durationSec,
      status: "PUBLISHED",
      meta: {}, // 音频/写作字数限制等 M2-2 补
      bandTable: parseBandTable(document, job),
    },
    sections,
    passages,
    questionGroups,
    questions,
    choices,
    answers,
    writingTasks,
  };
}

function parsePaperMeta(document, job) {
  let durationSec = 3600;
  if (job.skill === "LISTENING") {
    const t = document.querySelector("[data-time]");
    if (t) durationSec = Number(t.getAttribute("data-time"));
  } else if (job.skill === "WRITING") {
    // 写作从 wot task suggestedTimeSec 之和取(无则 3600)
    const wot = readWotTasks(document);
    durationSec = wot.reduce((s, t) => s + (t.suggestedTimeSec ?? 0), 0) || 3600;
  }
  const title = document.querySelector("title")?.textContent?.trim() ?? job.slug;
  return { title, durationSec };
}

function parseSections(document, job) {
  if (job.skill === "WRITING") {
    return [{
      sectionNo: 1, sectionType: "WRITING", title: "Writing", timeLimitSec: 3600,
    }];
  }
  const panels = Array.from(document.querySelectorAll("section.test-panel"));
  const dur = (idx) => job.skill === "LISTENING"
    ? (idx === 0 ? Number(document.querySelector("[data-time]")?.getAttribute("data-time") ?? 0) : 0)
    : 0;
  return panels.map((p, idx) => {
    const part = p.querySelector(".test-panel__part-title")?.textContent?.trim()
      ?? (job.skill === "READING" ? `Section ${idx + 1}` : `Part ${idx + 1}`);
    return {
      sectionNo: idx + 1,
      sectionType: job.skill,
      title: part,
      timeLimitSec: dur(idx),
    };
  });
}

/** 阅卷 passage:每个 panel 顶部 .field--name-field-question 体
 *  (题号前 / 跨 Part) 整段抽为 passages[].bodyHtml,顺序 orderIndex */
function parsePassages(document, job) {
  if (job.skill !== "READING") return [];
  const panels = Array.from(document.querySelectorAll("section.test-panel"));
  const out = [];
  panels.forEach((p, idx) => {
    // 取 panel 内所有 .field--item 但只在 question-title 之前(题面)
    // 题号前的内容 = passage body
    const firstTitle = p.querySelector(".test-panel__question-title, .test-panel__title");
    const item = p.querySelector(".field--name-field-question .field--item");
    if (!item) return;
    const html = item.innerHTML ?? "";
    out.push({
      sectionNo: idx + 1,
      orderIndex: 1,
      title: firstTitle?.textContent?.trim()?.slice(0, 80) ?? null,
      subtitle: null,
      bodyHtml: sanitizeHtml(html),
      imageUrl: null,
    });
  });
  return out;
}


/** bandTable 抽取:读 window.IELTS_EXAM.bandTable(已在 answers-*.js 里),
 *  没源 js 的卷用兜底值 */
function parseBandTable(document, job) {
  if (job.answersJs) {
    const p = join(PROTOTYPE_DIR, "exam-assets", job.answersJs);
    if (existsSync(p)) {
      try {
        const src = readFileSync(p, "utf8");
        const start = src.indexOf("window.IELTS_EXAM = {");
        if (start >= 0) {
          let depth = 0; let end = -1;
          for (let k = start; k < src.length; k++) {
            if (src[k] === "{") depth++;
            else if (src[k] === "}") { depth--; if (depth === 0) { end = k + 1; break; } }
          }
          if (end >= 0) {
            let cleaned = src.substring(start, end).replace(/\/\*[\s\S]*?\*\//g, "");
            cleaned = cleaned.replace(/\/\/[^\n]*/g, "");
            const objStart = cleaned.indexOf("{");
            let d2 = 0; let objEnd = -1;
            for (let k = objStart; k < cleaned.length; k++) {
              if (cleaned[k] === "{") d2++;
              else if (cleaned[k] === "}") { d2--; if (d2 === 0) { objEnd = k + 1; break; } }
            }
            if (objEnd >= 0) {
              const objLit = cleaned.substring(objStart, objEnd);
              const exam = vm.runInNewContext(`(${objLit});`, {}, { filename: p });
              if (Array.isArray(exam.bandTable) && exam.bandTable.length > 0) {
                return exam.bandTable.map(([min, band]) => [Number(min), Number(band)]);
              }
            }
          }
        }
      } catch {}
    }
  }
  // 兜底:A 听 13 档 / G 听 14 档
  return [
    [39, 9], [37, 8.5], [35, 8], [32, 7.5], [30, 7],
    [26, 6.5], [23, 6], [18, 5.5], [16, 5],
    [13, 4.5], [11, 4], [9, 3.5], [5, 3],
  ];
}

/** 共享:从 drupalSettings.wot2.tasks 抽任务(被 parsePaperMeta / parseWritingTasks 共用) */
function readWotTasks(document) {
  // 主路径:drupalSettings JSON 里有 wot.task(title/question/number_of_words/duration/image)
  for (const s of document.querySelectorAll("script")) {
    if (s.getAttribute("data-drupal-selector") !== "drupal-settings-json") continue;
    try {
      const obj = JSON.parse(s.textContent ?? "{}");
      const arr = obj?.wot?.task;
      if (Array.isArray(arr) && arr.length > 0) return arr;
    } catch {}
  }
  return [];
}

/** 抽出 questionGroups / questions / choices;
 *  听/阅共用,锚点统一:data-num / name="q-N" / name="q-N-M" */
function parseItems(document, job) {
  if (job.skill === "WRITING") return { questionGroups: [], questions: [], choices: [] };

  const inputs = Array.from(document.querySelectorAll("input[data-num]"));
  const selects = Array.from(document.querySelectorAll("select[data-num]"));
  const groups = new Map(); // groupId -> { id, sectionNo, scoreMode, maxSelect, choices[], members[] }
  const questions = [];
  const choices = [];
  const seenQ = new Set();

  // 块题:把所有 name="q-N-M" 的 group 收集
  for (const el of [...inputs, ...selects]) {
    const name = el.getAttribute("name");
    if (!name) continue;
    const blockMatch = name.match(/^q-(\d+)-(\d+)$/);
    if (blockMatch) {
      const gid = `g-q-${blockMatch[1]}-${blockMatch[2]}`;
      if (!groups.has(gid)) {
        groups.set(gid, {
          id: gid,
          sectionNo: sectionOfEl(el, job),
          orderIndex: groups.size + 1,
          scoreMode: "SET_INTERSECTION",
          maxSelect: Number(el.getAttribute("data-num").split("-").length) || null,
          instructionHtml: null,
          choiceInputs: [],
          memberNumbers: new Set(),
        });
      }
      groups.get(gid).choiceInputs.push(el);
    }
  }

  // 单题:每个 data-num 是一条 question;同样属性的 select/checkbox 共享同一 groupId 的 choices
  for (const el of [...inputs, ...selects]) {
    const name = el.getAttribute("name");
    const dn = el.getAttribute("data-num");
    if (!dn) continue;
    if (name && /^q-\d+-\d+$/.test(name)) continue; // 块题输入在 group 里已收集
    // 题号可能是 "6"(单题)或 "28-30"(块成员:但此时 name 必为 q-N-M,前面已 continue)
    const blockMember = /^\d+-\d+$/.test(dn); // 双选单题也可能 data-num="6"
    const singleQNum = Number(dn);
    if (blockMember) continue; // 安全网

    // 双选单题 / 普通多选
    const gid = name && /^q-\d+$/.test(name) ? `g-${name}` : null;
    const isMulti = (el.type === "checkbox" && name) || gid !== null;
    if (isMulti) {
      const realGid = gid ?? `g-${name}`;
      if (!groups.has(realGid)) {
        groups.set(realGid, {
          id: realGid,
          sectionNo: sectionOfEl(el, job),
          orderIndex: groups.size + 1,
          scoreMode: "PER_QUESTION",
          maxSelect: el.type === "checkbox" ? null : 1,
          instructionHtml: null,
          choiceInputs: [el],
          memberNumbers: new Set(),
        });
      }
      groups.get(realGid).choiceInputs.push(el);
    }

    // 普通题(文本 / 单选 / 下拉非块非多选)——直接产 question 一条
    if (!isMulti && !seenQ.has(singleQNum)) {
      seenQ.add(singleQNum);
      const type = inferQuestionType(el);
      questions.push({
        number: singleQNum,
        type,
        sectionNo: sectionOfEl(el, job),
        stemHtml: stemHtmlFor(el, document),
        instructionHtml: instructionHtmlFor(el, document),
        questionGroupId: null,
      });
    }
  }

  // questions:从 group 派生(双选单题 / 块题各产若干)
  let qNumberOrder = []; // 保留原题号顺序(由 prototype 已固化)
  for (const [gid, g] of groups) {
    if (g.scoreMode === "PER_QUESTION" && g.memberNumbers.size <= 1) {
      // 双选单题:从第一个 input 的 data-num 取
      const dn = g.choiceInputs[0].getAttribute("data-num");
      const num = Number(dn);
      if (Number.isFinite(num) && !seenQ.has(num)) {
        seenQ.add(num);
        questions.push({
          number: num,
          type: "MULTI_CHOICE",
          sectionNo: g.sectionNo,
          stemHtml: stemHtmlFor(g.choiceInputs[0], document),
          instructionHtml: instructionHtmlFor(g.choiceInputs[0], document),
          questionGroupId: gid,
        });
      }
    } else if (g.scoreMode === "SET_INTERSECTION") {
      // 块题:取 data-num "N-M" 拆题号
      const dn = g.choiceInputs[0].getAttribute("data-num");
      const [from, to] = dn.split("-").map(Number);
      const memberNums = [];
      for (let n = from; n <= to; n++) {
        if (Number.isFinite(n) && !seenQ.has(n)) {
          seenQ.add(n);
          questions.push({
            number: n,
            type: "MULTI_CHOICE",
            sectionNo: g.sectionNo,
            stemHtml: null,
            instructionHtml: null,
            questionGroupId: gid,
          });
          memberNums.push(n);
        }
      }
    }
  }

  // choices:每个 group 把每个 input 的 value 抽成一条 choice
  for (const [gid, g] of groups) {
    for (const el of g.choiceInputs) {
      const value = el.getAttribute("value");
      const textHtml = textHtmlFor(el, document);
      const orderIndex = (choices.filter((c) => c.questionGroupId === gid).length) + 1;
      choices.push({
        label: value,
        textHtml,
        orderIndex,
        questionId: null,
        questionGroupId: gid,
      });
    }
    // 块题 / 双选单题:choices 共享,questionGroupId 标 groupId
  }

  // 普通 radio 单选 / select 下拉也属 choices(questionId 挂)
  for (const el of [...inputs, ...selects]) {
    const name = el.getAttribute("name");
    const dn = el.getAttribute("data-num");
    if (!dn || !name) continue;
    if (groups.has(`g-${name}`)) continue; // 已被 group 处理
    if (/^q-\d+-\d+$/.test(name)) continue;
    const qNum = Number(dn);
    if (!Number.isFinite(qNum)) continue;
    const textHtml = textHtmlFor(el, document);
    const value = el.tagName === "SELECT"
      ? Array.from(el.querySelectorAll("option")).map((o) => ({
          label: o.textContent.trim(),
          value: o.getAttribute("value") ?? o.textContent.trim(),
          selected: o.hasAttribute("selected"),
        })).filter((o) => o.value && o.value !== "0")
      : el.getAttribute("value");
    if (Array.isArray(value)) {
      for (const opt of value) {
        choices.push({
          label: opt.label || opt.value,
          textHtml: opt.selected ? null : textHtml,
          orderIndex: choices.filter((c) => c.questionId === String(qNum)).length + 1,
          questionId: String(qNum),
          questionGroupId: null,
        });
      }
    } else if (value) {
      choices.push({
        label: value,
        textHtml: textHtml && textHtml !== value ? textHtml : null,
        orderIndex: choices.filter((c) => c.questionId === String(qNum)).length + 1,
        questionId: String(qNum),
        questionGroupId: null,
      });
    }
  }

  return { questionGroups: Array.from(groups.values()), questions, choices };
}

/** 听/阅:题所在 panel index = sectionNo */
function sectionOfEl(el, job) {
  if (job.skill === "WRITING") return 1;
  const panel = el.closest("section.test-panel");
  if (!panel) return 1;
  const all = Array.from(el.ownerDocument.querySelectorAll("section.test-panel"));
  return all.indexOf(panel) + 1;
}

/** 题干 HTML:取到题号对应的"题目 title"周围块;找不到就给空(null)。 */
/** 题面抽取:取 panel 内 el 上方最近的题号 (.iot-question-number / data-num)
 *  与下方下一题号之间的 innerHTML;若无明确边界,返回题号前后段。
 *  听卷:题干通常在 data-num 上方的 .test-panel__question 块内(.field--item)
 *  阅卷:题干在 .test-panel__question-title 后,到下一 title 前 */
function stemHtmlFor(el, document) {
  // 策略1(单题型如 31-40):与 data-num 同级的 .test-panel__question-sm-title
  const sm = el.closest(".test-panel__question-sm-group");
  if (sm) {
    const t = sm.querySelector(".test-panel__question-sm-title");
    if (t) return sanitizeHtml(t.innerHTML);
  }
  // 策略2(整组如 1-5):.test-panel__question > .test-panel__instruction / field--item
  const panel = el.closest("section.test-panel");
  if (!panel) return null;
  const dn = el.getAttribute("data-num") ?? "";
  const qNum = Number(dn.split("-")[0]);
  const titles = Array.from(panel.querySelectorAll(".test-panel__question-title"));
  for (const t of titles) {
    const txt = t.textContent ?? "";
    const m = txt.match(/(?:Questions?|Question)\s+(\d+)(?:\s*-\s*(\d+))?/i);
    if (!m) continue;
    const from = Number(m[1]); const to = m[2] ? Number(m[2]) : from;
    if (qNum < from || qNum > to) continue;
    const block = t.closest(".test-panel__question") ?? t.parentElement;
    const desc = block?.querySelector(".test-panel__instruction, .test-panel__question-desc, .field--item");
    if (desc) return sanitizeHtml(desc.innerHTML);
    return null;
  }
  return null;
}

/** 指令(填词要求)抽取:读题面里 `NO MORE THAN X WORDS` 这类说明 */
function instructionHtmlFor(el, document) {
  const panel = el.closest("section.test-panel");
  if (!panel) return null;
  // 阅:典型 <p>Complete the notes below. Write NO MORE THAN TWO WORDS for each answer.</p>
  const noteLike = panel.querySelector(".test-panel__instruction, .test-panel__question-instruction");
  if (noteLike) return sanitizeHtml(noteLike.innerHTML);
  return null;
}
function textHtmlFor(el, document) {
  // 取紧邻 label/option 内的文字(html 形态,白名单清洗后)
  const label = el.closest("label");
  if (label) {
    const cbLabel = label.querySelector(".cb-label");
    const text = cbLabel ? cbLabel.textContent.trim() : label.textContent.trim();
    return sanitizeHtml(text);
  }
  return null;
}

/** 推断题型(仅靠元素形态);M2-2 用更精细的数据 */
function inferQuestionType(el) {
  if (el.tagName === "SELECT") {
    // 阅 28-33 = TRUE_FALSE_NG(MATCH 其它情况由 data-template hint)
    const opts = Array.from(el.querySelectorAll("option")).map(o => o.textContent.trim());
    if (opts.includes("NOT GIVEN") || opts.includes("TRUE")) return "TRUE_FALSE_NG";
    return "MATCH_INFO";
  }
  if (el.type === "radio") return "SINGLE_CHOICE";
  if (el.type === "checkbox") return "MULTI_CHOICE";
  return "FILL_BLANK";
}

/** 从 answers-*.js 抽 answers(目前只校验题数对账;M2-2 改用真正解析) */
function loadAnswersFromJs(job, expectedCount) {
  if (!job.answersJs) return [];
  const p = join(PROTOTYPE_DIR, "exam-assets", job.answersJs);
  if (!existsSync(p)) return [];
  // 平衡括号抓 window.IELTS_EXAM = { ... };剥块/单行注释后 vm 跑
  const src = readFileSync(p, "utf8");
  const start = src.indexOf("window.IELTS_EXAM = {");
  if (start < 0) return [];
  let depth = 0; let end = -1;
  for (let k = start; k < src.length; k++) {
    if (src[k] === "{") depth++;
    else if (src[k] === "}") { depth--; if (depth === 0) { end = k + 1; break; } }
  }
  if (end < 0) return [];
  try {
    let cleaned = src.substring(start, end)
      .replace(/\/\*[\s\S]*?\*\//g, "")       // 块注释
      .replace(/\/\/[^\n]*/g, "");             // 单行注释(GT 阅读 js 中存在)
    const objStart = cleaned.indexOf("{");
    let depth2 = 0; let objEnd = -1;
    for (let k = objStart; k < cleaned.length; k++) {
      if (cleaned[k] === "{") depth2++;
      else if (cleaned[k] === "}") { depth2--; if (depth2 === 0) { objEnd = k + 1; break; } }
    }
    if (objEnd < 0) return [];
    const objLit = cleaned.substring(objStart, objEnd);
    const exam = vm.runInNewContext(`(${objLit});`, {}, { filename: p });
    const entries = Object.entries(exam.answers ?? {});
    return entries.map(([n, v]) => ({
      questionNumber: Number(n),
      value: String(v),
      alternatives: [],
      questionGroupId: null,
      explanationHtml: null,
    }));
  } catch (e) {
    console.warn(`[seed] ${job.slug} 解析 answers js 失败:`, e.message);
    return [];
  }
}

/** 写作 task JSON 从 drupalSettings.wot2.tasks 抽 */
function parseWritingTasks(document, job) {
  const arr = readWotTasks(document);
  if (arr.length === 0) return [];
  return arr.map((t, idx) => {
    const wordMin = Number(t.number_of_words ?? t.wordMin ?? 0) || (idx === 0 ? 150 : 250);
    const suggestedTimeSec = Number(t.duration ?? t.suggestedTimeSec ?? 0) || (idx === 0 ? 1200 : 2400);
    const images = Array.isArray(t.image) ? t.image : (t.image ? [t.image] : []);
    // image 路径是 Drupal 绝对路径 (/sites/default/files/.../2_0.jpg),
    // 仅用 basename 作为本地 /exam-assets/<slug>/<filename> 引用 —— M2-3 入库时
    // 再拷图并改 src 为最终路径(当前路径是种子阶段的"声明",M2-3 落地)
    const materialHtml = images.length
      ? images.map((src) => {
          const fname = String(src).split("/").pop();
          return `<img src="/exam-assets/${job.slug}/${fname}">`;
        }).join("")
      : null;
    return {
      taskId: idx === 0 ? "T1" : "T2",
      promptHtml: sanitizeHtml(t.question ?? ""),
      materialHtml: materialHtml ? sanitizeHtml(materialHtml) : null,
      wordMin,
      suggestedTimeSec,
      orderIndex: idx + 1,
    };
  });
}

/* ---------- 拷图 ---------- */

/** 拷 prototype/exam-assets/ 下非 js/css/ico 的资产到 seeds/<slug>/assets/
 *  原型 HTML 的图片全在 prototype/exam-assets/(另一会话 reskin 时全拷过去)。
 *  实际只拷与本卷有关的图片+音频;骨架阶段(M2-1)先全拷,M2-2 收口做"按 slug 过滤"。
 *  M2-3 入库脚本会再拷到 public/exam-assets/<slug>/ 并重写 paper.json 里所有引用。 */
function copyAssets(job, seed) {
  const srcFiles = join(PROTOTYPE_DIR, "exam-assets");
  if (!existsSync(srcFiles)) return { copied: [], skipped: [] };
  const dstAssets = join(SEEDS_DIR, job.slug, "assets");
  mkdirSync(dstAssets, { recursive: true });
  // 收集 paper.json 里所有引用的图片 / mp3:扫描 stemHtml + bodyHtml + writingTasks
  const referenced = new Set();
  const collectFrom = (s) => {
    if (!s) return;
    const ms = s.matchAll(/src="([^"]+)"/g);
    for (const m of ms) {
      const u = m[1];
      if (u.startsWith("/exam-assets/")) {
        // /exam-assets/<slug>/<file> → 找 <file>
        const fname = u.split("/").pop();
        if (fname) referenced.add(fname);
      }
    }
  };
  // 仅 stemHtml 在解析器阶段就有内容(听卷);阅卷 bodyHtml 进来后扫
  for (const q of seed.questions) collectFrom(q.stemHtml ?? "");
  for (const p of seed.passages ?? []) collectFrom(p.bodyHtml ?? "");
  for (const w of seed.writingTasks ?? []) collectFrom(w.materialHtml ?? "");
  // 听力卷:把 meta.audioUrl 加进引用集合
  if (job.skill === "LISTENING" && seed.paper?.meta?.audioUrl) {
    referenced.add(seed.paper.meta.audioUrl.split("/").pop());
  }
  const dropped = (name) =>
    /\.(css|js|ico|html)$/i.test(name) ||
    name.startsWith(".") ||
    name === "hm.js" ||
    /^answers-/.test(name);
  const fresh = [];
  for (const f of readdirSync(srcFiles)) {
    if (dropped(f)) continue;
    if (!referenced.has(f)) continue; // 只拷被 paper.json 引用的
    cpSync(join(srcFiles, f), join(dstAssets, f));
    fresh.push(f);
  }
  return { copied: fresh };
}

/* ---------- 主流程 ---------- */

async function runOne(job) {
  const srcFile = join(PROTOTYPE_DIR, job.file);
  if (!existsSync(srcFile)) {
    console.error(`[seed] 缺少源文件 ${srcFile}`);
    return null;
  }
  const html = readFileSync(srcFile, "utf8");
  const seed = parsePaper(job, html, null);

  // 拷图
  const { copied } = copyAssets(job, seed);

  // 输出
  const outDir = join(SEEDS_DIR, job.slug);
  mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, "paper.json");
  writeFileSync(outFile, JSON.stringify(seed, null, 2), "utf8");

  // 二次过滤:用 DOMPurify 对所有 HTML 字段再过一道(zod transform 也会做,这里是冗余防御)
  const purified = {
    ...seed,
    questions: seed.questions.map((q) => ({
      ...q,
      stemHtml: q.stemHtml ? purifyHtml(q.stemHtml) : null,
      instructionHtml: q.instructionHtml ? purifyHtml(q.instructionHtml) : null,
    })),
    passages: seed.passages.map((p) => ({
      ...p,
      bodyHtml: p.bodyHtml ? purifyHtml(p.bodyHtml) : null,
    })),
    writingTasks: seed.writingTasks?.map((w) => ({
      ...w,
      promptHtml: purifyHtml(w.promptHtml),
      materialHtml: w.materialHtml ? purifyHtml(w.materialHtml) : null,
    })) ?? [],
  };
  writeFileSync(outFile, JSON.stringify(purified, null, 2), "utf8");

  console.log(
    `[seed] ${job.slug}: questions=${seed.questions.length} groups=${seed.questionGroups.length} choices=${seed.choices.length} answers=${seed.answers.length} assets=${copied.length}`,
  );
  return { slug: job.slug, ...purified };
}

async function main() {
  const only = process.argv[2]; // 可指定单卷
  for (const job of JOBS) {
    if (only && job.slug !== only && only !== "all") continue;
    await runOne(job);
  }
}

// CLI:node scripts/seed-from-html.mjs [slug|all]
main().catch((e) => {
  console.error(e);
  process.exit(1);
});