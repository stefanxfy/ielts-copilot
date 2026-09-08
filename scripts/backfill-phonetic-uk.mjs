#!/usr/bin/env node
/**
 * scripts/backfill-phonetic-uk.mjs — 用 minmax 给 phonetic_uk 为空的非短语词补英式 IPA
 *
 * 触发:gen-mnemonic 的 syl 任务被 phonemic_uk 闸死(scripts/gen-mnemonic.mjs:106 skipNoIpa),
 *       而 phonemic_uk 来自百词斩入库的 data.accent / 新东方 ukphone,部分词缺;ECDICT enrich
 *       不补 phonetic_uk(只补 phonetic_us,scripts/enrich-words-ecdict.mjs:10 注释)。
 *       GLM 5h 配额 2026-09-08 撞顶,临时切 minmax(MiniMax-M3)写音标。
 *
 * 范围:kind != phrase 且 phonetic_uk 空 且 没 syl 的词(本批 71 词)
 * 流程:分批(默认 15 词/批)→ minmax 写英式 IPA → 基础校验(必含元音/重音符号位置合法)→ 回填
 * 输出:每批打印「✓ batch N: K/15 入库」「✗ 失败词: ...」
 *
 * 调用:
 *   node scripts/backfill-phonetic-uk.mjs              # 跑全部 71 词,15 词/批
 *   node scripts/backfill-phonetic-uk.mjs --batch=10   # 改批大小
 *   node scripts/backfill-phonetic-uk.mjs --limit=5    # 只跑前 5 词(烟雾测试)
 *   node scripts/backfill-phonetic-uk.mjs --dry-run    # 只打印任务,不调 API、不入库
 */
import Database from "better-sqlite3";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// ===== CLI =====
const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, "").split("=");
  return [k, v ?? "true"];
}));
const BATCH_SIZE = args.batch ? parseInt(args.batch, 10) : null;
const LIMIT = args.limit ? parseInt(args.limit, 10) : null;
const DRY_RUN = !!args["dry-run"];

// ===== config =====
const stripJsonComments = (src) => {
  let out = "", inStr = false, esc = false;
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
    if (ch === "/" && src[i+1] === "/") { while (i < src.length && src[i] !== "\n") i++; out += "\n"; continue; }
    if (ch === "/" && src[i+1] === "*") { i += 2; while (i < src.length && !(src[i] === "*" && src[i+1] === "/")) i++; i++; continue; }
    out += ch;
  }
  return out;
};
const CFG = JSON.parse(stripJsonComments(await readFile(join(process.cwd(), "config.json"), "utf8")));
const LLM = CFG.llm;
if (!LLM?.apiKey) { console.error("config.json 缺 llm.apiKey"); process.exit(1); }
const MODEL = LLM.gradingModel || "MiniMax-M3";
const BASE_URL = (LLM.baseUrl || "https://api.minimaxi.com/v1").replace(/\/+$/, "");
const API_KEY = LLM.apiKey;
const TIMEOUT_MS = (LLM.timeoutSec || 120) * 1000;

// ===== DB =====
const sqlite = new Database("./data/app.db");
sqlite.pragma("foreign_keys = ON");

// ===== 取词(phonetic_uk 空 且 非短语 且 没 syl) =====
const allRows = sqlite.prepare(`
  SELECT id, word FROM words
  WHERE word NOT GLOB '* *'
    AND (phonetic_uk IS NULL OR TRIM(phonetic_uk) = '')
    AND json_extract(content_json, '$.syl') IS NULL
  ORDER BY id
`).all();
const targets = LIMIT ? allRows.slice(0, LIMIT) : allRows;
console.log(`[backfill-ipa] 待补 ${targets.length} 词(逐词调用)${DRY_RUN ? " (DRY-RUN)" : ""}`);
if (DRY_RUN) { targets.forEach(r => console.log(`  - ${String(r.id).padStart(4)} ${r.word}`)); process.exit(0); }

// ===== 音标基础校验(防 LLM 给出垃圾) =====
/** 必须:含至少一个元音符号 + 必含 ˈ(主重音);
 *       IPA 音素白名单兜底(避免 LLM 写出英文单词如 "ree" 蒙混过关);
 *       长度合理(<=50); */
// 双字符音素先列(affricate 等),优先匹配
const IPA_PHONEMES = [
  // 元音双元音/长元音/三元音
  "eɪ","aɪ","ɔɪ","aʊ","əʊ","ɪə","eə","ʊə","əɪ","ʌə","ɪə","iː","uː","ɑː","ɔː","ɜː","ɑː",
  // 辅音双字符(affricate 等)
  "dʒ","tʃ","ts","dz","tr","dr","kw","ɡw","hw","ŋk","mp","nt","nd","ŋg","lk","lp","lt","st","sp","sk","sl","sm","sn","sw","spl","spr","str","skr","ʃr","θr","pl","pr","bl","br","kl","kr","fl","fr","gl","gr","vl","vr","hj","hw","nj",
  // 单字符元音
  "ə","ɛ","æ","ɪ","ɒ","ʌ","ɔ","ʊ","i","ɑ","ɜ","a","e","o","u","y","ʏ","ø","œ","ɐ","ɒ","ɘ","ɵ","ɤ","ɯ",
  // 单字符辅音
  "ʃ","ʒ","θ","ð","ŋ","ɲ","ɹ","ɾ","ɫ","p","b","t","d","k","ɡ","g","f","v","s","z","m","n","l","h","w","j","r","x","ɣ","β","ç","ʝ","ʁ","ʔ",
];
// 音素识别正则:必须按长度从长到短,否则 dʒ 会被拆成 d + ʒ
const PHONEME_RE = new RegExp(
  "(" + IPA_PHONEMES.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).sort((a, b) => b.length - a.length).join("|") + "|.)",
  "g"
);
const VOWEL_PHONEMES = new Set([
  "ə","ɛ","æ","ɪ","ɒ","ʌ","ɔ","ʊ","i","ɑ","ɜ","a","e","o","u","y","ʏ","ø","œ","ɐ","ɘ","ɵ","ɤ","ɯ",
  "eɪ","aɪ","ɔɪ","aʊ","əʊ","ɪə","eə","ʊə","əɪ","ʌə","iː","uː","ɑː","ɔː","ɜː",
]);
function sanityCheckIpa(raw, word) {
  if (typeof raw !== "string" || !raw.trim()) return `音标为空`;
  let ipa = raw.trim().replace(/^\/|\/$/g, "");
  if (ipa.length > 50) return `「${raw}」过长(>50 字符)`;
  if (!ipa.includes("ˈ")) return `「${raw}」缺主重音 ˈ(单音节词也按惯例标注,英式词典都带)`;
  // 走音素白名单,逐步扫描
  const cleaned = ipa.replace(/[ˈˌ\s().,;]/g, "");
  if (cleaned.length === 0) return `「${raw}」剥离重音/分隔后无内容`;
  let i = 0, vowelCount = 0;
  const leftovers = [];
  while (i < cleaned.length) {
    let matched = false;
    for (const p of IPA_PHONEMES) {
      if (cleaned.startsWith(p, i)) {
        if (VOWEL_PHONEMES.has(p)) vowelCount++;
        i += p.length;
        matched = true;
        break;
      }
    }
    if (!matched) { leftovers.push(cleaned[i]); i++; }
  }
  if (vowelCount === 0) return `「${raw}」无元音音素`;
  if (leftovers.length > 0) {
    return `「${raw}」含非 IPA 字符「${leftovers.join("")}」`;
  }
  return null;
}

// ===== minmax 调用(逐词,OpenAI 协议,剥 <think> 块)
// 2026-09-08 实测:minmax think 块较长,多词批调用 max_tokens=4096 易把 JSON 末尾截断
// (返回缺 ])。改每词一次调用最稳;71 词串行 ~6min 可接受。
async function callMinmaxOne(word) {
  const prompt = `你是英语词典编纂者(英国 BBC/RP 音系专家)。给单词 "${word}" 写出英式 IPA 音标。
要求:
- 严格英式发音(RP),不是美式(GA)
- 含主重音 ˈ(必填);次重音 ˌ(若有)
- 用 // 包裹
- 只给一个读音(若有公认多变体,选最高频的英式读音)

输出严格按下面模板,不要 markdown 围栏、不要解释文字:
{ "word": "${word}", "ipa": "/音标/" }`;
  const body = {
    model: MODEL,
    messages: [
      { role: "system", content: "只输出一个 JSON 对象。" },
      { role: "user", content: prompt },
    ],
    max_tokens: 4096,
    temperature: 0.3,
  };
  const resp = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const rawText = await resp.text();
  if (!resp.ok) { const e = new Error(`HTTP ${resp.status}`); e.rawText = rawText; throw e; }
  let raw;
  try { raw = JSON.parse(rawText); }
  catch { const e = new Error("响应非 JSON"); e.rawText = rawText; throw e; }
  const content = raw?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    const e = new Error("响应缺 content"); e.rawText = rawText; throw e;
  }
  // 剥 <think> 块 + markdown 围栏
  let text = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  text = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  // 找首个 {...} 平衡块
  const start = text.indexOf("{");
  if (start < 0) throw new Error(`输出无 JSON 对象(text 前 500): ${text.slice(0, 500)}\n---finish_reason=${raw?.choices?.[0]?.finish_reason}`);
  if (process.env.DEBUG_IPA) console.log(`[debug] 剥 think 后 text: ${text}`);
  let depth = 0, end = -1, inStr = false, esc = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inStr) { if (esc) esc = false; else if (ch === "\\") esc = true; else if (ch === '"') inStr = false; continue; }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end < 0) throw new Error(`JSON 对象不平衡: ${text.slice(0, 200)}`);
  const slice = text.slice(start, end + 1);
  let parsed;
  try { parsed = JSON.parse(slice); }
  catch (e) { const err = new Error(`JSON 解析失败: ${e?.message}`); err.rawText = slice; throw err; }
  return parsed;
}

// ===== 入库 =====
const updStmt = sqlite.prepare("UPDATE words SET phonetic_uk = ?, updated_at = unixepoch() WHERE id = ?");

let totalOk = 0, totalFail = 0;
const failedWords = [];

for (let i = 0; i < targets.length; i++) {
  const row = targets[i];
  const w = row.word;
  process.stdout.write(`[${i+1}/${targets.length}] ${w.padEnd(22)} `);
  let parsed;
  try {
    parsed = await callMinmaxOne(w);
  } catch (e) {
    console.log(`✗ 调用失败: ${e.message.slice(0, 100)}`);
    if (e.rawText) console.log(`    raw: ${String(e.rawText).slice(0, 200)}`);
    failedWords.push({ word: w, reason: "API 调用失败" });
    totalFail++;
    continue;
  }
  const err = sanityCheckIpa(parsed?.ipa, w);
  if (err) {
    console.log(`✗ ${err} (raw: ${parsed?.ipa})`);
    failedWords.push({ word: w, reason: err, raw: parsed?.ipa });
    totalFail++;
    continue;
  }
  const ipaClean = parsed.ipa.trim().replace(/^\/|\/$/g, "");
  updStmt.run("/" + ipaClean + "/", row.id);
  console.log(`✓ /${ipaClean}/`);
  totalOk++;
}

console.log(`\n==========`);
console.log(`[done] 入库 ${totalOk} / 失败 ${totalFail} / 总 ${targets.length}`);
if (failedWords.length) {
  console.log(`[failed]`);
  failedWords.forEach(f => console.log(`  - ${f.word}: ${f.reason}${f.raw ? ` (raw: ${f.raw})` : ""}`));
}
sqlite.close();
