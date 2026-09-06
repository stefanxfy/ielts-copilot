#!/usr/bin/env node
/**
 * scripts/review-mnemonic.mjs — 一次性语义审查:核心100词四字段内容质量
 * 不写库,只输出问题清单到 data/mnemonic-debug/review-result.json
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import Database from "better-sqlite3";

const BOOK_ID = Number(process.argv[2] ?? 10);
const BATCH = 10;

function stripJsonComments(src) {
  let out = ""; let inStr = false; let esc = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inStr) { out += ch; if (esc) esc = false; else if (ch === "\\") esc = true; else if (ch === '"') inStr = false; continue; }
    if (ch === '"') { inStr = true; out += ch; continue; }
    if (ch === "/" && src[i + 1] === "/") { while (i < src.length && src[i] !== "\n") i++; out += "\n"; continue; }
    if (ch === "/" && src[i + 1] === "*") { i += 2; while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) i++; i++; continue; }
    out += ch;
  }
  return out;
}
const CFG = JSON.parse(stripJsonComments(await readFile(join(process.cwd(), "config.json"), "utf8")));
const LLM = CFG.llm;

const sqlite = new Database("./data/app.db", { readonly: true });
const rows = sqlite.prepare(
  "SELECT w.word, w.phonetic_uk, w.content_json FROM book_word_relation r JOIN words w ON w.id = r.word_id WHERE r.book_id = ? ORDER BY r.\"order\""
).all(BOOK_ID);
sqlite.close();

const words = rows.map(r => ({ word: r.word, ipa: r.phonetic_uk, ...JSON.parse(r.content_json || "{}") }));

async function llmJson(userPrompt) {
  const body = {
    model: LLM.gradingModel,
    messages: [
      { role: "system", content: "你只输出一个 JSON 对象——不要 markdown 围栏、不要解释文字。中文一律简体。" },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 4096,
    temperature: 0.2,
    thinking: { type: "disabled" },
  };
  const resp = await fetch(`${LLM.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${LLM.apiKey}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout((LLM.timeoutSec ?? 120) * 1000),
  });
  const rawText = await resp.text();
  if (!resp.ok) throw new Error(`HTTP ${resp.status} ${rawText.slice(0, 300)}`);
  const raw = JSON.parse(rawText);
  const content = raw?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("响应缺少 content");
  let text = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  const start = text.indexOf("{");
  let depth = 0, end = -1, inStr = false, esc = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inStr) { if (esc) esc = false; else if (ch === "\\") esc = true; else if (ch === '"') inStr = false; continue; }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end < 0) throw new Error(`JSON 不平衡: ${text.slice(0, 200)}`);
  return JSON.parse(text.slice(start, end + 1));
}

const reviewPrompt = (batch) => [
  `你是雅思词汇教学的资深审校。以下 ${batch.length} 个单词的助记数据由 AI 生成,请逐词逐字段审查内容是否有误。`,
  ``,
  `审查维度(只报明确错误,不报风格偏好):`,
  `1. morph: 词根词缀含义错误、literal 直译与 pieces 语义矛盾、type 分类明显不当`,
  `2. syl: 音标拼写错误(非合法变体而是真错)、stress 主重音位置错误、phonemes 发音描述错误`,
  `3. derives: 拼写错误、与主词非同族/非近义、pos 词性错误、meaningZh 释义错误`,
  `4. contexts: en 语法错误或搭配不地道(中国式英语)、cn 翻译错误或漏译、collZh 中文不当`,
  ``,
  `注意:音标存在合法变体(英/美、弱读差异),仅当拼写本身错误才报;释义允许合理表述差异。`,
  ``,
  `输出模板(无问题的词不要出现在 issues 里;全部无误输出 {"issues":[]}):`,
  `{ "issues": [ { "word": "xxx", "field": "morph|syl|derives|contexts", "severity": "error|warn", "detail": "具体哪里错、正确应是什么", "path": "定位如 ctx0/pieces[1]/derives[2]" } ] }`,
  ``,
  `以下是待审查数据(JSON):`,
  JSON.stringify(batch.map(w => ({ word: w.word, ipa: w.ipa, morph: w.morph, syl: w.syl, derives: w.derives, contexts: w.contexts }))),
].join("\n");

const allIssues = [];
for (let i = 0; i < words.length; i += BATCH) {
  const batch = words.slice(i, i + BATCH);
  console.log(`批 ${Math.floor(i / BATCH) + 1}/${Math.ceil(words.length / BATCH)}: ${batch.map(w => w.word).join(", ")}`);
  let ok = false;
  for (let t = 1; t <= 3 && !ok; t++) {
    try {
      const r = await llmJson(reviewPrompt(batch));
      if (Array.isArray(r.issues)) {
        allIssues.push(...r.issues);
        console.log(`  发现问题 ${r.issues.length} 条`);
        ok = true;
      } else { console.warn(`  try${t}: 输出缺 issues`); }
    } catch (e) { console.warn(`  try${t} 失败: ${String(e).slice(0, 140)}`); }
  }
  if (!ok) console.warn(`  ✗ 该批审查失败跳过`);
}

await mkdir(join(process.cwd(), "data", "mnemonic-debug"), { recursive: true });
await writeFile(join(process.cwd(), "data", "mnemonic-debug", "review-result.json"), JSON.stringify({ reviewedAt: new Date().toISOString(), bookId: BOOK_ID, totalWords: words.length, issues: allIssues }, null, 2));
console.log(`\n共 ${allIssues.length} 条问题 → data/mnemonic-debug/review-result.json`);
const err = allIssues.filter(x => x.severity === "error");
console.log(`其中 error 级 ${err.length} 条:`);
err.forEach(x => console.log(`  [${x.word}/${x.field}] ${x.detail}`));
