#!/usr/bin/env node
/**
 * scripts/.core-words.js — 输出 book17 核心词清单(每行一个)
 * 口径与 gen-images-xdf/gen-image-scenes 完全一致:
 *   book17 ∧ 无空格(单词) ∧ (collins≥3 ∨ bncRank≤2000)
 * 供夜间 runner 对账用;只读 DB。
 */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");

const db = new Database(new URL("../data/app.db", import.meta.url).pathname, { readonly: true });
const rows = db
  .prepare(
    `SELECT w.word, json_extract(w.content_json,'$.collins') AS collins,
            json_extract(w.content_json,'$.bncRank') AS bnc
     FROM words w JOIN book_word_relation b ON b.word_id = w.id
     WHERE b.book_id = 17 AND w.word NOT LIKE '% %'`,
  )
  .all();
db.close();
const core = rows.filter((r) => {
  const c = parseInt(r.collins || 0);
  const b = parseInt(r.bnc || 0);
  return c >= 3 || (b > 0 && b <= 2000);
});
process.stdout.write(core.map((r) => r.word).join("\n") + "\n");
