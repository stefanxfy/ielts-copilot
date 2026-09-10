#!/usr/bin/env node
/**
 * scripts/reading-import-paper.mjs — 阅读库真题导入(P2,docs/阅读功能实施计划.md)
 *
 * 数据流:papers(subject=reading) → assetsJson.entry 定位 public/exams/<examId>/reading.html
 *   → 3 个 field--name-field-passage 容器(div 平衡边界提取,对应 P1/P2/P3)
 *   → <p> 切段(段内不二次切分,对齐粒度=段落)
 *   → 清洗:剥标签 / 剔空 <strong> 与段落字母标记(A./B.) / HTML 实体解码 / 空白规整 / 剔空段
 *   → 护栏:段数 1–40、词数 350–1100(越界=warning 记入报告不阻塞;硬错误 <3 段或 <100 词跳过)
 *   → articleId = "<examSetId>-r-t<testNo>-p<passageNo>" 幂等(已存在跳过,--force 重导)
 *   → upsert 预置库 reading_libraries("past-paper", builtin) → libraryId 归属
 *   → 可选 LLM 逐段翻译(--with-zh / --fill-zh;失败段落 zh=null 进失败清单,不阻塞整篇)
 *   → 报告落盘 data/reading/import-report.json
 *
 * 本期限制(2026-09-10 用户明确):不生成音频 —— audio 恒 null、audioVoice 不写入。
 *
 * 用法:
 *   node scripts/reading-import-paper.mjs                 # 导入全部真题(纯文本,zh=null)
 *   node scripts/reading-import-paper.mjs --set=a-2025jan # 只导指定套卷
 *   node scripts/reading-import-paper.mjs --with-zh       # 导入 + LLM 逐段翻译
 *   node scripts/reading-import-paper.mjs --fill-zh       # 只补翻译(zh=null 的段落)
 *   node scripts/reading-import-paper.mjs --force --with-zh # 重导并翻译(重置段落与 zh)
 *
 * LLM 配置:同 gen-mnemonic.mjs —— config.json llm.glmApiKey(GLM-5.3 coding 端点,默认)
 *   或 --provider=minmax 走 llm.apiKey(MiniMax-M3)。
 */
import Database from "better-sqlite3";
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";

// ===== CLI =====
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  }),
);
const ONLY_SET = args.set ?? null;
const FORCE = !!args.force;
const WITH_ZH = !!args["with-zh"] || !!args["fill-zh"];
const FILL_ONLY = !!args["fill-zh"];
const PROVIDER = args.provider ?? "minmax"; // 本机 config.json 已配 MiniMax key;--provider=glm 切 GLM coding

// ===== config.json(JSONC 剥注释,同 gen-mnemonic.mjs 状态机) =====
function stripJsonComments(src) {
  let out = "";
  let inStr = false;
  let esc = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inStr) {
      out += ch;
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') { inStr = true; out += ch; continue; }
    if (ch === "/" && src[i + 1] === "/") { while (i < src.length && src[i] !== "\n") i++; out += "\n"; continue; }
    if (ch === "/" && src[i + 1] === "*") { i += 2; while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) i++; i++; continue; }
    out += ch;
  }
  return out;
}

// ===== DB =====
const ROOT = process.cwd();
const DB_FILE = join(ROOT, "data", "app.db");
if (!existsSync(DB_FILE)) {
  console.error(`[fail] 未找到 ${DB_FILE} —— 先运行 npm run db:import 建库并导入真题卷`);
  process.exit(1);
}
const sqlite = new Database(DB_FILE);
sqlite.pragma("foreign_keys = ON");

// ===== LLM(可选;仅 --with-zh / --fill-zh 需要) =====
let llm = null;
if (WITH_ZH) {
  const cfgPath = join(ROOT, "config.json");
  if (!existsSync(cfgPath)) {
    console.error("[fail] config.json 不存在 —— LLM 翻译需要 llm 密钥;先不带 --with-zh 导入纯文本");
    process.exit(1);
  }
  const CFG = JSON.parse(stripJsonComments(readFileSync(cfgPath, "utf8")));
  const L = CFG.llm ?? {};
  let MODEL, BASE_URL, API_KEY, TIMEOUT_MS, EXTRA_BODY;
  if (PROVIDER === "glm") {
    if (!L.glmApiKey) { console.error("config.json 缺 llm.glmApiKey(GLM coding plan key)"); process.exit(1); }
    MODEL = "glm-5.3";
    BASE_URL = "https://open.bigmodel.cn/api/coding/paas/v4";
    API_KEY = L.glmApiKey;
    TIMEOUT_MS = 180000;
    EXTRA_BODY = { thinking: { type: "enabled" }, reasoning_effort: "low" };
  } else {
    if (!L.apiKey) { console.error("config.json 缺 llm.apiKey(minmax key)"); process.exit(1); }
    MODEL = L.gradingModel || "MiniMax-M3";
    BASE_URL = (L.baseUrl || "https://api.minimaxi.com/v1").replace(/\/+$/, "");
    API_KEY = L.apiKey;
    TIMEOUT_MS = (L.timeoutSec || 120) * 1000;
    EXTRA_BODY = {};
  }
  console.log(`[llm] provider=${PROVIDER} model=${MODEL}`);

  async function llmZh(enList, tries = 3) {
    const prompt =
      "你是专业学术翻译。把下面 JSON 数组里的每个英文段落译成简体中文,返回一个 JSON 对象," +
      `形如 {"translations":["译文1","译文2",...]}。要求:\n` +
      "1. translations 数组长度、顺序与输入段落数组严格一致,不得合并/拆分段落;\n" +
      "2. 译文面向中文读者自然通读:按中文语序重组句子,长句按意群断成短句,避免翻译腔" +
      "(如连串「的」字长定语、生硬的被动句);不添油加醋、不省略任何信息;\n" +
      "3. 术语、数字、专有名词与原文一致;专有名词首次出现可保留英文括注,如「安提基特拉机械(Antikythera Mechanism)」;\n" +
      "4. 不要输出任何解释或 markdown 围栏。\n\n" +
      JSON.stringify(enList);
    const body = {
      model: MODEL,
      messages: [
        { role: "system", content: "你只输出一个 JSON 对象——不要 markdown 围栏、不要解释文字。中文一律简体。" },
        { role: "user", content: prompt },
      ],
      max_tokens: 4096,
      temperature: 0.3,
      ...EXTRA_BODY,
    };
    for (let t = 1; t <= tries; t++) {
      try {
        const resp = await fetch(`${BASE_URL.replace(/\/+$/, "")}/chat/completions`, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${API_KEY}` },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        const rawText = await resp.text();
        if (!resp.ok) throw new Error(`HTTP ${resp.status} ${rawText.slice(0, 200)}`);
        const raw = JSON.parse(rawText);
        let text = (raw?.choices?.[0]?.message?.content ?? "").trim()
          .replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "")
          .replace(/<think>[\s\S]*?<\/think>/g, "").trim();
        const start = text.indexOf("{");
        const end = text.lastIndexOf("}");
        if (start < 0 || end <= start) throw new Error(`输出无 JSON 对象: ${text.slice(0, 120)}`);
        const parsed = JSON.parse(text.slice(start, end + 1));
        const arr = parsed?.translations;
        if (!Array.isArray(arr) || arr.length !== enList.length ||
            arr.some((x) => typeof x !== "string" || !x.trim())) {
          throw new Error(`句数不一致或非法(期望 ${enList.length})`);
        }
        return arr;
      } catch (e) {
        console.warn(`  [llm] 第 ${t} 次尝试失败: ${String(e.message ?? e).slice(0, 140)}`);
        if (t === tries) return null; // 整篇翻译失败 → 段落 zh=null 进失败清单
      }
    }
    return null;
  }
  llm = { llmZh };
}

// ===== HTML 解析(容器 div 平衡边界 + 纯文本清洗) =====

/** 取第 from 个(1 起)field--name-field-passage 容器的 [start,end) 与整体位置 */
function passageContainers(html) {
  const out = [];
  let pos = 0;
  while (true) {
    const i = html.indexOf("field--name-field-passage ", pos);
    if (i < 0) break;
    const dopen = html.lastIndexOf("<div", i);
    let depth = 0;
    let j = dopen;
    while (true) {
      const m = /<div\b|<\/div>/.exec(html.slice(j));
      if (!m) { j = html.length; break; }
      j += m.index + m[0].length;
      depth += m[0] === "<div" ? 1 : -1;
      if (depth === 0) break;
    }
    out.push({ start: dopen, end: j });
    pos = j;
  }
  return out;
}

function subtitle(html, beforePos) {
  const i = html.lastIndexOf("field--name-field-subtitle-section", beforePos);
  if (i < 0) return null;
  const seg = html.slice(i, i + 400);
  const m = />([^<>]+)</.exec(seg.slice(seg.indexOf(">") + 1));
  const t = m?.[1]?.trim();
  return t || null;
}

/** 段落纯文本化:剔空/字母标记 strong → 剥全部标签 → 实体解码 → 空白规整 */
function cleanPara(fragment) {
  let x = fragment
    .replace(/<strong[^>]*>\s*([A-Z]?|\d+)?\s*[.、]?\s*<\/strong>/gi, "") // 空 strong / 段落字母标记
    .replace(/<[^>]+>/g, " ");
  x = x
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&rsquo;/gi, "’").replace(/&lsquo;/gi, "‘").replace(/&rdquo;/gi, "”").replace(/&ldquo;/gi, "“")
    .replace(/&mdash;/gi, "—").replace(/&ndash;/gi, "–").replace(/&hellip;/gi, "…");
  return x.replace(/\s+/g, " ").trim();
}

// ===== 主流程 =====
const papers = sqlite
  .prepare(
    "SELECT exam_id, exam_set_id, title, assets_json FROM papers WHERE subject = 'reading' ORDER BY exam_id",
  )
  .all()
  .filter((p) => !ONLY_SET || p.exam_set_id === ONLY_SET);

if (!papers.length) {
  console.error("[fail] papers 表无阅读卷 —— 先运行 npm run db:import");
  process.exit(1);
}

// upsert 预置库 past-paper(builtin)
sqlite.prepare(
  `INSERT INTO reading_libraries (library_id, name, description, source)
   VALUES ('past-paper', '剑桥雅思真题库', '从现有真题阅读解析导入 · 注明出处', 'builtin')
   ON CONFLICT(library_id) DO NOTHING`,
).run();
const LIB_ID = sqlite.prepare("SELECT id FROM reading_libraries WHERE library_id = 'past-paper'").get().id;

const getArticle = sqlite.prepare("SELECT article_id, paragraphs_json FROM reading_articles WHERE article_id = ?");
const insertArticle = sqlite.prepare(
  `INSERT INTO reading_articles (article_id, library_id, title, source, source_ref_json, level, word_count, topic_tags_json, paragraphs_json)
   VALUES (?, ?, ?, 'past_paper', ?, 'L3', ?, '[]', ?)`,
);
const updateArticle = sqlite.prepare(
  `UPDATE reading_articles SET title = ?, word_count = ?, paragraphs_json = ?, source_ref_json = ?, updated_at = unixepoch()
   WHERE article_id = ?`,
);

const report = { startedAt: new Date().toISOString(), imported: [], skipped: [], warnings: [], failures: [] };

for (const paper of papers) {
  const htmlPath = join(ROOT, "public", JSON.parse(paper.assets_json).entry.replace(/^\//, ""));
  const html = readFileSync(htmlPath, "utf8");
  const containers = passageContainers(html);
  if (containers.length !== 3) {
    report.failures.push({ examId: paper.exam_id, reason: `容器数 ${containers.length} ≠ 3` });
    continue;
  }
  const testNo = /test(\d+)/.exec(paper.exam_id)?.[1] ?? "1";

  for (let p = 1; p <= 3; p++) {
    const { start, end } = containers[p - 1];
    const c = html.slice(start, end);
    const rawParas = [...c.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => cleanPara(m[1])).filter(Boolean);
    if (rawParas.length < 3) {
      report.failures.push({ examId: paper.exam_id, passage: p, reason: `有效段落数 ${rawParas.length} < 3` });
      continue;
    }
    const wordCount = rawParas.reduce((s, x) => s + x.split(/\s+/).length, 0);
    const title = subtitle(html, start) ?? `${paper.title} · Passage ${p}`;

    const articleId = `${paper.exam_set_id}-r-t${testNo}-p${p}`;
    const sourceRef = { examSetId: paper.exam_set_id, examId: paper.exam_id, paperTitle: paper.title, passageNo: p };

    // 护栏(越界=warning 不阻塞;硬错误已在上面 fail)
    if (rawParas.length > 20) report.warnings.push({ articleId, reason: `段数 ${rawParas.length} > 20(GT 广告类文本属正常)` });
    if (wordCount < 350 || wordCount > 1100) report.warnings.push({ articleId, reason: `词数 ${wordCount} 越出 350–1100` });

    const existing = getArticle.get(articleId);
    if (existing && !FORCE && !FILL_ONLY) {
      report.skipped.push(articleId);
      continue;
    }

    let paragraphs = null;
    if (existing && FILL_ONLY) {
      paragraphs = JSON.parse(existing.paragraphs_json);
    } else {
      paragraphs = rawParas.map((en, idx) => ({ idx, en, zh: null, audio: null }));
    }

    // LLM 逐段翻译(整篇一批;失败段落保持 zh=null 进失败清单)
    if (WITH_ZH && llm) {
      const needIdx = paragraphs.map((x, i) => (x.zh == null ? i : -1)).filter((i) => i >= 0);
      if (needIdx.length) {
        const enList = needIdx.map((i) => paragraphs[i].en);
        const zhList = await llm.llmZh(enList);
        if (zhList) {
          needIdx.forEach((i, k) => (paragraphs[i].zh = zhList[k]));
          console.log(`  [zh] ${articleId}: ${needIdx.length} 段翻译完成`);
        } else {
          report.failures.push({ articleId, reason: `LLM 整篇翻译失败(${needIdx.length} 段 zh=null)` });
        }
      }
    }

    if (existing) {
      updateArticle.run(title, wordCount, JSON.stringify(paragraphs), JSON.stringify(sourceRef), articleId);
      report.imported.push({ articleId, mode: "updated" });
    } else {
      insertArticle.run(articleId, LIB_ID, title, JSON.stringify(sourceRef), wordCount, JSON.stringify(paragraphs));
      report.imported.push({ articleId, mode: "created", paras: paragraphs.length, words: wordCount, title });
    }
    console.log(`[ok] ${articleId} · ${title} · ${paragraphs.length} 段 · ${wordCount} 词`);
  }
}

const outDir = join(ROOT, "data", "reading");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "import-report.json"), JSON.stringify(report, null, 2), "utf8");
console.log(`\n=== 汇总:新增/更新 ${report.imported.length} · 跳过 ${report.skipped.length} · 警告 ${report.warnings.length} · 失败 ${report.failures.length} ===`);
console.log(`报告: data/reading/import-report.json`);
sqlite.close();
