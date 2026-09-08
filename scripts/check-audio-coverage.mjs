#!/usr/bin/env node
/**
 * scripts/check-audio-coverage.mjs — 词书 TTS 覆盖率体检(含僵尸记录检测)
 *
 * 用法:
 *   node scripts/check-audio-coverage.mjs --book=ielts-luan-3427
 *   node scripts/check-audio-coverage.mjs --book=ielts-luan-3427 --zombies   # 只列僵尸
 *
 * 输出:
 *   单词 audio 覆盖 X/N、例句 contexts[].audio 覆盖 Y/M
 *   僵尸: DB 写了路径但 public/ 下文件缺失或 <1KB
 */
import Database from "better-sqlite3";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  }),
);
const BOOK_ID = args.book ?? "ielts-luan-3427";
const ONLY_ZOMBIES = !!args.zombies;

const db = new Database("./data/app.db");
db.pragma("journal_mode = WAL");
const book = db.prepare("SELECT id, name FROM word_books WHERE book_id = ?").get(BOOK_ID);
if (!book) {
  console.error(`✗ 词书不存在: ${BOOK_ID}`);
  process.exit(1);
}

const rows = db
  .prepare(
    `SELECT w.id, w.word, w.content_json FROM words w
     JOIN book_word_relation b ON b.word_id = w.id
     JOIN word_books bk ON bk.id = b.book_id
     WHERE bk.name = ?`,
  )
  .all(book.name);

let totalWords = rows.length;
let wordHas = 0, wordMissing = 0, wordZombie = 0;
let ctxTotal = 0, ctxHas = 0, ctxMissing = 0, ctxZombie = 0;
const zombieList = [];

const real = (rel) => {
  if (!rel) return false;
  const p = join("./public", rel);
  return existsSync(p) && statSync(p).size > 1000;
};

for (const r of rows) {
  let cj;
  try { cj = JSON.parse(r.content_json || "{}"); } catch { cj = {}; }
  const wa = cj.audio?.word;
  if (wa) {
    if (real(wa)) wordHas++;
    else { wordZombie++; zombieList.push({ word: r.word, kind: "word", path: wa }); }
  } else wordMissing++;

  for (let i = 0; i < (cj.contexts || []).length; i++) {
    const c = cj.contexts[i];
    if (!c.en) continue;
    ctxTotal++;
    if (c.audio) {
      if (real(c.audio)) ctxHas++;
      else { ctxZombie++; zombieList.push({ word: r.word, kind: `ctx[${i}]`, path: c.audio }); }
    } else ctxMissing++;
  }
}

if (ONLY_ZOMBIES) {
  console.log(JSON.stringify(zombieList, null, 2));
  console.error(`僵尸记录: ${zombieList.length} (单词 ${wordZombie} / 例句 ${ctxZombie})`);
  db.close();
  process.exit(0);
}

const pct = (a, b) => (b ? ((a / b) * 100).toFixed(2) : "0.00");
console.log(`\n=== TTS 覆盖率 · ${book.name} (book_id=${BOOK_ID}, id=${book.id}) ===`);
console.log(`单词: ${wordHas}/${totalWords} = ${pct(wordHas, totalWords)}%  (缺 ${wordMissing}, 僵尸 ${wordZombie})`);
console.log(`例句: ${ctxHas}/${ctxTotal} = ${pct(ctxHas, ctxTotal)}%  (缺 ${ctxMissing}, 僵尸 ${ctxZombie})`);
const effWord = wordHas, effCtx = ctxHas;
console.log(`有效覆盖(真文件): 单词 ${effWord}/${totalWords}, 例句 ${effCtx}/${ctxTotal}`);
if (zombieList.length) {
  console.log(`\n僵尸样例(前10):`);
  for (const z of zombieList.slice(0, 10)) console.log(`  ${z.word} ${z.kind} -> ${z.path}`);
}
db.close();
