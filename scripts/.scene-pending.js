#!/usr/bin/env node
/**
 * scripts/.scene-pending.js — 输出「缺场景文件 ∧ DB 无图」的核心词(每行一个)
 * 口径: book17 ∧ 单词 ∧ (collins≥3 ∨ bncRank≤2000) ∧ 无 data/image-scenes/{word}.txt ∧ content_json.image 为空
 * 这才是需要补场景的集合(有老图的词不需要场景)。夜间 runner 对账用,只读。
 */
import { createRequire } from "node:module";
import { existsSync, statSync } from "node:fs";
const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");

const ROOT = new URL("..", import.meta.url).pathname;
const db = new Database(ROOT + "data/app.db", { readonly: true });
const rows = db
  .prepare(
    `SELECT w.word, json_extract(w.content_json,'$.collins') AS collins,
            json_extract(w.content_json,'$.bncRank') AS bnc,
            json_extract(w.content_json,'$.image') AS img
     FROM words w JOIN book_word_relation b ON b.word_id = w.id
     WHERE b.book_id = 17 AND w.word NOT LIKE '% %'`,
  )
  .all();
db.close();
const need = rows.filter((r) => {
  const c = parseInt(r.collins || 0);
  const b = parseInt(r.bnc || 0);
  if (!(c >= 3 || (b > 0 && b <= 2000))) return false;
  if (r.img) return false;
  const f = `${ROOT}data/image-scenes/${r.word}.txt`;
  return !(existsSync(f) && statSync(f).size > 0);
});
process.stdout.write(need.map((r) => r.word).join("\n") + "\n");
