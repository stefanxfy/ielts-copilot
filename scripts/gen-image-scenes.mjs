#!/usr/bin/env node
/**
 * scripts/gen-image-scenes.mjs — LLM 批量生「单画面场景脚本」
 *
 * 给定一组词 + 释义,调 GLM-5.3 coding 端点,为每词生成一句适合 S8 暖调胶片摄影的
 * 画面描述(主体+动作+环境+情绪)。供 scripts/gen-images-xdf.mjs 后续生图用。
 *
 * 输出: data/image-scenes/{word}.txt(每文件一句 25-50 词的英文画面描述)
 *
 * 用法:
 *   node scripts/gen-image-scenes.mjs --words=abandon,abundant
 *   node scripts/gen-image-scenes.mjs --book=17 --target=core    # book17 全部核心词
 *   node scripts/gen-image-scenes.mjs --book=17 --target=core --all   # 含已有图也重写
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DB_PATH = join(ROOT, "data", "app.db");
const OUT_DIR = join(ROOT, "data", "image-scenes");

/* ---------- CLI ---------- */
const argv = process.argv.slice(2);
const argVal = (name) => {
  const eq = argv.find((a) => a.startsWith(`${name}=`));
  if (eq) return eq.split("=")[1];
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : null;
};
const WORDS_ARG = argVal("--words");
const BOOK_ID = argVal("--book") ? parseInt(argVal("--book"), 10) : null;
const TARGET = argVal("--target") || "core"; // core=仅核心词(无图)
const ALL = argv.includes("--all");
const COUNT = argVal("--count") ? parseInt(argVal("--count"), 10) : Infinity; // 每批上限, broker SIGTERM 兜底

/* ---------- LLM 配置(GLM-5.3 coding 端点,同 gen-mnemonic) ---------- */
function readCfg() {
  const raw = readFileSync(join(ROOT, "config.json"), "utf8");
  const cleaned = raw.split("\n").map((l) => l.replace(/(^|\s)\/\/.*$/, "$1")).join("\n");
  return JSON.parse(cleaned);
}
const stripComments = (s) => s;
const CFG = readCfg();
const LLM = CFG.llm;
if (!LLM?.glmApiKey) { console.error("config.json 缺 llm.glmApiKey"); process.exit(1); }
const MODEL = "glm-5.3";
const BASE_URL = "https://open.bigmodel.cn/api/coding/paas/v4";
const API_KEY = LLM.glmApiKey;
const TIMEOUT_MS = 120000;

async function llmChat(prompt, maxTokens = 1024) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2048, // GLM reasoning_content 经常超 1024,提到 2048 避免空响应
        temperature: 0.4,
        // 思考关闭: 场景脚本要直白,thinking 反而拖慢且产出冗长
        // (与 gen-mnemonic 不同的关键选择,因这是单步短文)
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const j = await res.json();
    const content = j.choices?.[0]?.message?.content || "";
    if (!content) throw new Error(`空响应: ${JSON.stringify(j).slice(0, 300)}`);
    return content.trim();
  } finally {
    clearTimeout(t);
  }
}

/* ---------- Prompt(关键:约束「单画面/具象主体/无文字/无副词连接词/优先多义词主义项」) ---------- */
// 双轨风格: GLM 决定 [PHOTO] 真人场景(S8 暖调胶片) 或 [ILLUSTRATION] 符号化插画(S1 暖色插画)
// 真人场景: 具体人物/物品在做事; 符号化插画: 抽象概念/无主体的人/范畴词
const SCENE_PROMPT = (w, zh, ex) => `You generate a single scene description for an English vocabulary flashcard image.

Word: "${w}"
Primary meaning (Chinese): ${zh}
${ex ? `Example sentence: ${ex}` : ""}

Pick the rendering mode:
- [PHOTO]    A REAL photographic scene with a specific person/people doing something concrete in a real setting
             (use this when the word can be shown through a real human action or visible object)
             → warm analog film photography, Kodak Portra tones, soft window light, 35mm candid
- [ILLUSTRATION] A symbolic/flat illustration of the concept using icons, abstract figures, or stylized elements
             (use this when the word is hard to show with a real person, e.g. abstract categories, vague "a person" roles, or hard-to-photograph concepts)
             → warm flat illustration, soft pastel colors, clean minimal composition, single central icon, children's picture-book style
- [SKIP]     ONLY if the word is a pure grammar word with no visual meaning at all
             (besides, however, therefore, although, otherwise, presumably, whereas, etc.)

Rules:
1. ONE single scene, 25-50 English words.
2. Pick the MOST COMMON meaning (the dictionary headword sense). For polysemous words, the noun sense is usually safest.
3. For action verbs → usually [PHOTO] (a person performing the action)
4. For abstract nouns (resolve, ambition, freedom) → usually [PHOTO] with ONE concrete symbol
5. For category nouns (equipment, direction) → usually [ILLUSTRATION] (icons of representative items)
6. For vague role words (supervisor, commissioner) → usually [ILLUSTRATION] (a generic figure with role symbols)
7. NO text, NO letters, NO captions, NO watermarks in the image. Do not write the word in your scene.
8. Output FIRST line is just the tag: [PHOTO] or [ILLUSTRATION] or [SKIP]
   Then one blank line, then the scene description (one paragraph). No preamble, no labels.

Example output:
[PHOTO]
A young woman stands in a sunlit kitchen pouring orange juice into a glass…

Scene:`;

/* ---------- 词条选择 ---------- */
function pickTargets(wordFilter) {
  const db = new Database(DB_PATH, { readonly: true });
  const where = [];
  const params = [];
  if (wordFilter) {
    where.push("w.word IN (" + wordFilter.map(() => "?").join(",") + ")");
    params.push(...wordFilter);
  }
  if (BOOK_ID) {
    where.push("w.id IN (SELECT word_id FROM book_word_relation WHERE book_id = ?)");
    params.push(BOOK_ID);
  }
  if (TARGET === "core" && !ALL) {
    where.push("json_extract(w.content_json,'$.image') IS NULL");
  }
  const sql = `SELECT w.id, w.word, w.content_json, json_extract(w.content_json,'$.collins') AS collins,
                      json_extract(w.content_json,'$.bncRank') AS bnc
               FROM words w ${where.length ? "WHERE " + where.join(" AND ") : ""}`;
  const rows = db.prepare(sql).all(...params);
  db.close();
  if (TARGET === "core" && !ALL && !wordFilter) {
    // 核心词筛选: collins>=3 或 bncRank<=2000,排除短语
    return rows.filter((r) => {
      if (r.word.includes(" ")) return false;
      const c = parseInt(r.collins || 0);
      const b = parseInt(r.bnc || 0);
      return c >= 3 || (b > 0 && b <= 2000);
    });
  }
  return rows;
}

/* ---------- 主流程:批量调 LLM,逐词落盘 ---------- */
async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const wordFilter = WORDS_ARG ? WORDS_ARG.split(",") : null;
  const targets = pickTargets(wordFilter);
  console.log(`[scene] 目标词: ${targets.length}${wordFilter ? `(指定: ${wordFilter.join(",")})` : ""}`);
  if (!targets.length) { console.log("无目标,退出"); return; }

  let ok = 0, skip = 0, fail = 0;
  let processed = 0;
  for (const row of targets) {
    if (processed >= COUNT) {
      console.log(`[scene] 已达本批上限 ${COUNT}, 停止(剩余 ${targets.length - processed} 词下次跑)`);
      break;
    }
    const out = join(OUT_DIR, `${row.word}.txt`);
    if (existsSync(out) && !ALL && !WORDS_ARG) {
      skip++;
      continue;
    }
    processed++;
    const cj = JSON.parse(row.content_json || "{}");
    const zh = (cj.translation ?? []).join("; ") || "";
    const ex = cj.examples?.[0]?.en || cj.contexts?.[0]?.en || "";
    try {
      const scene = await llmChat(SCENE_PROMPT(row.word, zh, ex));
      const trimmed = scene.replace(/^Scene:\s*/i, "").trim();
      // 解析 [PHOTO] / [ILLUSTRATION] / [SKIP] 标记
      const tagMatch = trimmed.match(/^\[(PHOTO|ILLUSTRATION|SKIP)\]\s*([\s\S]*)/i);
      if (tagMatch && tagMatch[1].toUpperCase() === "SKIP") {
        writeFileSync(out, "SKIP\n");
        skip++;
        console.log(`  ↷ ${row.word} → SKIP(抽象词)`);
        continue;
      }
      if (!tagMatch) {
        // 没解析到 tag, 兜底: 视为 PHOTO 并剥 Scene: 前缀
        const fallback = trimmed;
        writeFileSync(out, `[PHOTO]\n${fallback}\n`);
        ok++;
        console.log(`  ✓ ${row.word} → [PHOTO 兜底] ${fallback.slice(0, 60)}…`);
        continue;
      }
      const tag = tagMatch[1].toUpperCase();
      const body = tagMatch[2].trim();
      writeFileSync(out, `[${tag}]\n${body}\n`);
      ok++;
      console.log(`  ✓ ${row.word} → [${tag}] ${body.slice(0, 60)}…`);
    } catch (e) {
      fail++;
      writeFileSync(out, `ERROR: ${e.message}\n`);
      console.log(`  ❌ ${row.word}: ${e.message}`);
    }
    // 温和限速
    await new Promise((r) => setTimeout(r, 300));
  }
  console.log(`\n===== 完成 =====`);
  console.log(`场景脚本落盘: ${OUT_DIR} | 成功 ${ok} | 跳过 ${skip} | 失败 ${fail}`);
}

main().catch((e) => { console.error(`[scene] 致命: ${e?.stack || e}`); process.exit(1); });
