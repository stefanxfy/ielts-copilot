#!/usr/bin/env node
/**
 * collocations 回填 + 例句→contexts 关系维护(2026-09-07, v2.8)
 *
 * 数据源:新东方雅思词汇 JSON(bookId=IELTS_3,百词斩导出 JSONL):
 *   - phrase.phrases[].pContent/pCn → contentJson.collocations(独立词组清单,v2.8 回归)
 *   - sentence.sentences[].sContent/sCn 已在 examples 导入时落库,此处只做匹配源
 * 规则(docs/单词助记系统设计.md §2.4 v2.8):
 *   - 匹配:example.en 小写化后精确包含 collocation.phrase 小写化串(不做屈折展开)
 *   - 落库:contexts 无同 coll 条目 → 追加 {coll, collZh, en, cn, audio: example.audio, src: "example"}
 *   - 幂等:collocations 已存在跳过;同 coll 的 example 条目已存在跳过
 * 用法:node scripts/backfill-collocations.mjs [--apply] [jsonPath]
 *   默认 dry-run 只打印报告;--apply 写库前自动备份 data/app.db
 */
import { createRequire } from "node:module";
import { copyFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { walkEnPunct } from "./lib/normalize-en-punct.mjs";
const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");

const APPLY = process.argv.includes("--apply");
const jsonArg = process.argv.find((a) => a.endsWith(".json")) ?? "/Users/fanyunxu/Downloads/新东方雅思词汇.json";
if (!existsSync(jsonArg)) {
  console.error(`✗ 词书 JSON 不存在: ${jsonArg}`);
  process.exit(1);
}

/* ---------- 载入词书 JSON(JSONL) ---------- */
const book = new Map(); // lower(headWord) → { phrases: Map<lower(phrase), {phrase, cn}> }
for (const line of readFileSync(jsonArg, "utf8").split("\n")) {
  if (!line.trim()) continue;
  const o = JSON.parse(line);
  const head = String(o.headWord || "").trim().toLowerCase();
  if (!head) continue;
  const raw = o.content?.word?.content?.phrase?.phrases ?? [];
  const phrases = book.get(head) ?? new Map();
  for (const p of raw) {
    const phrase = String(p.pContent || "").replace(/\s+/g, " ").trim();
    if (!phrase || phrase.toLowerCase() === head) continue; // 词组=单词本身,无价值
    if (!phrases.has(phrase.toLowerCase())) {
      phrases.set(phrase.toLowerCase(), { phrase, cn: String(p.pCn || "").replace(/\s+/g, " ").trim() || undefined });
    }
  }
  if (phrases.size) book.set(head, phrases);
}
console.log(`词书 JSON: ${jsonArg} → ${book.size} 词带词组数据`);

/* ---------- 扫描 DB ---------- */
const db = new Database(join(process.cwd(), "data", "app.db"));
if (APPLY) {
  const backup = join(process.cwd(), "data", `app.db.bak-collocations-${Date.now()}`);
  copyFileSync(join(process.cwd(), "data", "app.db"), backup);
  console.log(`已备份 → ${backup}`);
}
const rows = db.prepare("SELECT id, word, content_json FROM words").all();

let matchedWords = 0, collAdded = 0, ctxAdded = 0, skippedExisting = 0;
const details = [];
const updStmt = db.prepare("UPDATE words SET content_json = ?, updated_at = unixepoch() WHERE id = ?");

for (const r of rows) {
  let cj;
  try { cj = JSON.parse(r.content_json); } catch { continue; }
  if (cj.kind === "affix") continue; // 词根特殊词不参与
  const phrases = book.get(r.word.toLowerCase());
  if (!phrases?.size) continue;
  matchedWords++;

  const examples = Array.isArray(cj.examples) ? cj.examples : [];
  const contexts = Array.isArray(cj.contexts) ? cj.contexts : [];
  const collLowerSet = new Set(contexts.map((c) => String(c.coll || "").toLowerCase()));
  const existingColl = new Set((cj.collocations ?? []).map((c) => String(c.phrase || "").toLowerCase()));

  const beforeColl = cj.collocations?.length ?? 0;
  const beforeCtx = contexts.length;
  const wordLog = { word: r.word, coll: [], ctx: [] };

  // ① collocations 回填
  cj.collocations = cj.collocations ?? [];
  for (const [, p] of phrases) {
    if (existingColl.has(p.phrase.toLowerCase())) { skippedExisting++; continue; }
    cj.collocations.push({ phrase: p.phrase, ...(p.cn ? { cn: p.cn } : {}) });
    existingColl.add(p.phrase.toLowerCase());
    collAdded++;
    wordLog.coll.push(p.phrase);
  }
  if (!cj.collocations.length) delete cj.collocations; // 空数组不留字段

  // ② 例句包含词组 → contexts 追加 src="example" 条目
  for (const c of cj.collocations) {
    const low = c.phrase.toLowerCase();
    if (collLowerSet.has(low)) continue; // contexts 已有同 coll(LLM 或上次回填)
    const hit = examples.find((e) => typeof e?.en === "string" && e.en.toLowerCase().includes(low));
    if (!hit) continue;
    contexts.push({
      coll: c.phrase,
      ...(c.cn ? { collZh: c.cn } : {}),
      en: hit.en,
      ...(hit.cn ? { cn: hit.cn } : {}),
      ...(hit.audio ? { audio: hit.audio } : {}), // 复用例句音频,免重合成
      src: "example",
    });
    collLowerSet.add(low);
    ctxAdded++;
    wordLog.ctx.push(`${c.phrase} ← "${hit.en.slice(0, 48)}…"`);
  }
  if (contexts.length) cj.contexts = contexts;

  // 英文域标点归一化(phrase/en/coll;导入层铁律,含新回填条目)
  const punctChanged = walkEnPunct(cj);

  const changed = (cj.collocations?.length ?? 0) !== beforeColl || contexts.length !== beforeCtx || punctChanged;
  if (changed) {
    details.push(wordLog);
    if (APPLY) updStmt.run(JSON.stringify(cj), r.id);
  }
}

/* ---------- 报告 ---------- */
console.log(`\n===== ${APPLY ? "已写库" : "DRY-RUN(未写库,加 --apply 执行)"} =====`);
console.log(`DB 词数: ${rows.length} | 命中词书: ${matchedWords}`);
console.log(`collocations 新增: ${collAdded} 条(已存在跳过 ${skippedExisting})`);
console.log(`contexts 追加(src=example): ${ctxAdded} 条`);
console.log(`有变更的词: ${details.length}`);
for (const d of details.slice(0, 12)) {
  console.log(`  ${d.word}: +coll[${d.coll.join(" / ")}]${d.ctx.length ? ` +ctx: ${d.ctx.join(" ; ")}` : ""}`);
}
if (details.length > 12) console.log(`  … 其余 ${details.length - 12} 词见下次运行输出`);
