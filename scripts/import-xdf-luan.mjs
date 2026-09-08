#!/usr/bin/env node
/**
 * scripts/import-xdf-luan.mjs — 雅思词汇乱序版 3427 导入(P0 文本入库)
 * 对齐:docs/新东方雅思词汇3575入库计划.md §3 转换规则(同源 JSONL 复用)
 *
 * 数据源:~/Downloads/雅思词汇乱序版.json(bookId=IELTSluan_2 百词斩导出 JSONL,5.6MB,3427 词)
 * 词书标识:bookId="ielts-luan-3427"、name="雅思词汇乱序版"、source="builtin"、origin="baicizhan"
 *
 * 与 import-xdf-ielts.mjs 的差异:
 *   1. BOOK_ID / JSON 路径 / 词书描述改 luan
 *   2. 去掉存量 morph 修复 buckets(luan 唯一性:1692 词 DB 全库无,8 词在其它书,无重叠 morph 修复场景)
 *   3. 重叠词主内容不动(origin=baicizhan 先到原则;luan 与 book17 数据同源,无补 morphSeed 必要)
 *   4. 用法同源:--apply 写库前自动备份
 *
 * 不生成:image / audio / morph / syl / derives LLM / contexts LLM(plan §4 P1-P4 后置)
 * 仅做 P0:入库 + 挂词书(P1 ECDICT 富化按需另跑)
 *
 * 用法:node scripts/import-xdf-luan.mjs [--apply] [jsonPath]
 *   默认 dry-run 只打印报告;--apply 写库前自动备份 data/app.db
 */
import { createRequire } from "node:module";
import { copyFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { walkEnPunct } from "./lib/normalize-en-punct.mjs";
const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");

const APPLY = process.argv.includes("--apply");
const jsonArg =
  process.argv.find((a) => a.endsWith(".json")) ??
  "/Users/fanyunxu/Downloads/雅思词汇乱序版.json";
if (!existsSync(jsonArg)) {
  console.error(`✗ 词书 JSON 不存在: ${jsonArg}`);
  process.exit(1);
}

const BOOK_ID = "ielts-luan-3427";
const BOOK_NAME = "雅思词汇乱序版";
const BOOK_DESC = "雅思词汇乱序版(bookId=IELTSluan_2 百词斩导出),3427 词;例句全取+词组+同根直转+morphSeed。与新东方雅思词汇 3575(book17)同源不同书。";
const DERIVES_CAP = 5;

/* ---------- 词性映射(gen-mnemonic posOk 值域一致) ---------- */
const POS_MAP = { n: "n.", v: "v.", vt: "v.", vi: "v.", adj: "adj.", adv: "adv." };

/* ---------- 工具 ---------- */
const log = (...a) => console.log("[luan-import]", ...a);

function normPhon(s) {
  s = String(s ?? "").replace(/\s+/g, " ").trim();
  if (!s) return undefined;
  s = s.replace(/'/g, "ˈ"); // apostrophe 重音符 → IPA ˈ
  return s.startsWith("/") && s.endsWith("/") ? s : `/${s}/`;
}

/** 中文释义清洗:标点后多余空格 + 连续空格归一(§3:「取消， 废除」→「取消，废除」) */
function cleanZh(s) {
  return String(s ?? "")
    .replace(/，\s+/g, "，")
    .replace(/；\s+/g, "；")
    .replace(/：\s+/g, "：")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/* ---------- 单词转换(§3 规则;与 import-xdf-ielts.mjs 同步) ---------- */
function convertWord(o, fallbackRank) {
  const warnings = [];
  const head = String(o.headWord ?? "").trim();
  const w = head.toLowerCase();
  if (!w) return null;
  const c = o.content?.word?.content ?? {};

  const phoneticUk = normPhon(c.ukphone);
  const phoneticUs = normPhon(c.usphone);
  if (!phoneticUk) warnings.push("缺 ukphone");

  // translation / definition
  const translation = [];
  const defSet = new Set();
  for (const t of c.trans ?? []) {
    const pos = POS_MAP[String(t.pos ?? "").trim()];
    const cn = cleanZh(t.tranCn);
    if (cn) {
      const segs = cn.split(/[;；]/).map((s) => s.trim()).filter(Boolean);
      segs.forEach((seg, i) => translation.push(i === 0 && pos ? `${pos}${seg}` : seg));
    }
    const en = String(t.tranOther ?? "").replace(/\s+/g, " ").trim();
    if (en && !defSet.has(en)) defSet.add(en);
  }
  const definition = [...defSet];
  if (!translation.length) warnings.push("translation 为空");

  // 例句(全取)与首条
  const sentences = (c.sentence?.sentences ?? [])
    .map((s) => ({ en: String(s.sContent ?? "").trim(), cn: cleanZh(s.sCn) || undefined }))
    .filter((s) => s.en);

  // collocations(v2.8 规则)
  const collocations = [];
  const seenColl = new Set();
  for (const p of c.phrase?.phrases ?? []) {
    const phrase = String(p.pContent ?? "").replace(/\s+/g, " ").trim();
    if (!phrase || phrase.toLowerCase() === w) continue;
    const k = phrase.toLowerCase();
    if (seenColl.has(k)) continue;
    seenColl.add(k);
    const cn = cleanZh(p.pCn) || undefined;
    collocations.push({ phrase, ...(cn ? { cn } : {}) });
  }

  // contexts:例句全取,词组命中条带 coll/collZh(多命中取最长词组)
  const contexts = sentences.map((s) => {
    const low = s.en.toLowerCase();
    let hit = null;
    for (const col of collocations) {
      if (low.includes(col.phrase.toLowerCase()) && (!hit || col.phrase.length > hit.phrase.length)) hit = col;
    }
    return {
      ...(hit ? { coll: hit.phrase, ...(hit.cn ? { collZh: hit.cn } : {}) } : {}),
      en: s.en,
      ...(s.cn ? { cn: s.cn } : {}),
      src: "example",
    };
  });

  // examples[0] = 首条例句(默写卡判分唯一来源)
  const examples = sentences.length
    ? [{ en: sentences[0].en, ...(sentences[0].cn ? { cn: sentences[0].cn } : {}) }]
    : [];

  // derives 直转(D2):pos 映射不了的整组跳过;同词去重;上限 5
  const derives = [];
  const seenD = new Set();
  for (const rel of c.relWord?.rels ?? []) {
    const pos = POS_MAP[String(rel.pos ?? "").trim()];
    if (!pos) continue;
    for (const x of rel.words ?? []) {
      const dw = String(x.hwd ?? "").replace(/\s+/g, " ").trim();
      const dlow = dw.toLowerCase();
      const tran = cleanZh(x.tran);
      if (!dw || !tran || dlow === w || seenD.has(dlow)) continue;
      seenD.add(dlow);
      derives.push({ word: dw, pos, meaningZh: tran });
      if (derives.length >= DERIVES_CAP) break;
    }
    if (derives.length >= DERIVES_CAP) break;
  }

  // morphSeed(D1):remMethod 原样整存
  const remRaw = c.remMethod?.val;
  const morphSeed = remRaw && String(remRaw).trim() ? String(remRaw).trim() : undefined;

  const content = {
    translation,
    examples,
    ...(definition.length ? { definition } : {}),
    ...(collocations.length ? { collocations } : {}),
    ...(contexts.length ? { contexts } : {}),
    ...(morphSeed ? { morphSeed } : {}),
    ...(derives.length ? { derives } : {}),
  };

  // 英文域标点归一化(Noto Sans SC 弯引号渲染问题,导入层铁律)
  walkEnPunct(content);

  const rank = Number.isFinite(o.wordRank) ? o.wordRank : fallbackRank;
  return { word: w, phoneticUk, phoneticUs, content, rank, morphSeed, warnings };
}

/* ================= 主流程 ================= */

// ① 读 JSONL 全量转换
const entries = [];
const jsonProblems = [];
const seenJsonWord = new Set();
let lineNo = 0;
for (const line of readFileSync(jsonArg, "utf8").split("\n")) {
  lineNo++;
  if (!line.trim()) continue;
  let o;
  try {
    o = JSON.parse(line);
  } catch (e) {
    jsonProblems.push(`行 ${lineNo}: JSON 解析失败 ${e.message.slice(0, 60)}`);
    continue;
  }
  const conv = convertWord(o, lineNo);
  if (!conv) {
    jsonProblems.push(`行 ${lineNo}: headWord 为空`);
    continue;
  }
  if (seenJsonWord.has(conv.word)) {
    jsonProblems.push(`行 ${lineNo}: JSON 内重复词「${conv.word}」(保留首个)`);
    continue;
  }
  seenJsonWord.add(conv.word);
  entries.push(conv);
}

// ② 读 DB 判定重叠
const db = new Database(join(process.cwd(), "data", "app.db"));
db.pragma("foreign_keys = ON");
let backupPath = null;
if (APPLY) {
  backupPath = join(process.cwd(), "data", `app.db.bak-luan-p0-${Date.now()}`);
  copyFileSync(join(process.cwd(), "data", "app.db"), backupPath);
  log(`已备份 → ${backupPath}`);
}

const dbRows = db.prepare("SELECT id, word, content_json FROM words").all();
const dbByWord = new Map(dbRows.map((r) => [r.word.toLowerCase(), r]));

const newWords = [];
const overlapWords = [];
for (const e of entries) (dbByWord.has(e.word) ? overlapWords : newWords).push(e);

// ③ 统计报告
const totalCtx = newWords.reduce((n, e) => n + (e.content.contexts?.length ?? 0), 0);
const totalColl = newWords.reduce((n, e) => n + (e.content.collocations?.length ?? 0), 0);
const derivesCov = newWords.filter((e) => e.content.derives?.length).length;
const seedCovNew = newWords.filter((e) => e.morphSeed).length;
const noUk = entries.filter((e) => !e.phoneticUk);
const apostropheLeft = entries.filter(
  (e) => (e.phoneticUk ?? "").includes("'") || (e.phoneticUs ?? "").includes("'"),
);

console.log(`\n===== ${APPLY ? "已写库" : "DRY-RUN(未写库,加 --apply 执行)"} =====`);
console.log(`门禁三数: JSONL 转换 ${entries.length} / 净新增 ${newWords.length} / 重叠 ${overlapWords.length}`);
console.log(`音标: 缺 ukphone ${noUk.length} 词 / apostrophe 残留 ${apostropheLeft.length}(期望 0)`);
console.log(`素材: contexts ${totalCtx} 条 / collocations ${totalColl} 条 / derives 覆盖 ${derivesCov}/${newWords.length} / morphSeed 覆盖(新词) ${seedCovNew}/${newWords.length}`);
console.log(`重叠词处理策略: 主内容一律不动(origin=baicizhan 先到;luan 与 book17 同源,无 morph 修复场景)`);

if (jsonProblems.length) {
  console.log(`\nJSONL 异常 ${jsonProblems.length} 条:`);
  for (const p of jsonProblems.slice(0, 10)) console.log(`  ${p}`);
}
if (noUk.length) console.log(`\n缺 ukphone 词(${noUk.length}): ${noUk.slice(0, 20).map((e) => e.word).join(", ")}${noUk.length > 20 ? ` ... 等 ${noUk.length} 词` : ""}`);

// 抽样对拍
console.log("\n----- 抽样对拍(前 3 词完整) -----");
for (const e of entries.slice(0, 3)) {
  console.log(JSON.stringify({ word: e.word, phoneticUk: e.phoneticUk, phoneticUs: e.phoneticUs, content: e.content }, null, 1).slice(0, 1600));
}
const sampleIdx = [99, 499, 999, 1999, 2999, entries.length - 1].filter((i) => i < entries.length);
console.log("----- 抽样摘要 -----");
for (const idx of sampleIdx) {
  const e = entries[idx];
  if (!e) continue;
  console.log(`  #${idx} ${e.word} | ${e.phoneticUk} | trans=${e.content.translation.length} ctx=${e.content.contexts?.length ?? 0} coll=${e.content.collocations?.length ?? 0} drv=${e.content.derives?.length ?? 0} seed=${e.morphSeed ? "Y" : "N"}`);
}

// ④ 写库(只入新词+挂词书;重叠词不动主内容,bwr 仍按 wordRank 挂载)
if (APPLY) {
  const insWord = db.prepare(
    "INSERT INTO words (word, phonetic_uk, phonetic_us, content_json, origin, created_at, updated_at) VALUES (?, ?, ?, ?, 'baicizhan', unixepoch(), unixepoch())",
  );
  const result = db.transaction(() => {
    let inserted = 0;
    for (const e of newWords) {
      const info = insWord.run(e.word, e.phoneticUk ?? null, e.phoneticUs ?? null, JSON.stringify(e.content));
      inserted += info.changes;
    }
    // 词书 upsert
    let book = db.prepare("SELECT id FROM word_books WHERE book_id = ?").get(BOOK_ID);
    if (!book) {
      const info = db
        .prepare("INSERT INTO word_books (book_id, name, description, source, created_at, updated_at) VALUES (?, ?, ?, 'builtin', unixepoch(), unixepoch())")
        .run(BOOK_ID, BOOK_NAME, BOOK_DESC);
      book = { id: info.lastInsertRowid };
    } else {
      db.prepare("UPDATE word_books SET name = ?, description = ?, updated_at = unixepoch() WHERE id = ?").run(BOOK_NAME, BOOK_DESC, book.id);
    }
    // bwr 清旧重挂(order = wordRank - 1,0 起)
    db.prepare("DELETE FROM book_word_relation WHERE book_id = ?").run(book.id);
    const insBwr = db.prepare('INSERT INTO book_word_relation (book_id, word_id, "order") VALUES (?, ?, ?)');
    let bwr = 0;
    for (const e of entries) {
      const row = dbByWord.get(e.word);
      let wordId;
      if (row) {
        wordId = row.id;
      } else {
        wordId = db.prepare("SELECT id FROM words WHERE word = ?").get(e.word)?.id;
      }
      if (!wordId) throw new Error(`词「${e.word}」无 wordId,bwr 挂载中止`);
      insBwr.run(book.id, wordId, Math.max(0, e.rank - 1));
      bwr++;
    }
    return { inserted, bwr, bookId: book.id };
  })();

  console.log(`\n写库完成: 新词 +${result.inserted} / bwr ${result.bwr} 行(book_id=${result.bookId})`);

  const wc = db.prepare("SELECT count(*) n FROM words").get().n;
  const bc = db.prepare("SELECT count(*) n FROM book_word_relation WHERE book_id = ?").get(result.bookId).n;
  console.log(`验收: words 总行数 ${wc} / 本书关联 ${bc}(期望 3427)`);
}

db.close();
log(`=== ${APPLY ? "DONE" : "DRY-RUN 完成"} ===`);
