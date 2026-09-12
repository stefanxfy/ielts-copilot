import Database from "better-sqlite3";
import { existsSync, statSync } from "node:fs";
const db = new Database("data/app.db", { readonly: true });
const rows = db.prepare("SELECT word, content_json FROM words").all();

const len = (w) => w.replace(/[^a-zA-Z]/g, "").length;
const stat = { total: 0, haveImg: 0, noImg: 0, noImgByBook: {} };
const noImgSamples = [];

for (const r of rows) {
  const w = String(r.word ?? "").trim();
  if (w.includes(" ")) continue;          // 排除短语
  const L = len(w);
  if (L < 6 || L > 8) continue;           // 只看 6-8 字母
  stat.total++;
  let c; try { c = JSON.parse(r.content_json || "{}"); } catch { c = {}; }
  const f = "public/images/words/" + w + ".png";
  const hasImg = (typeof c.image === "string" && c.image) || (existsSync(f) && statSync(f).size > 1000);
  if (hasImg) { stat.haveImg++; continue; }
  stat.noImg++;
  if (noImgSamples.length < 40) noImgSamples.push(w);
  // 词书分布
  const books = db.prepare("SELECT book_id FROM book_word_relation WHERE word_id = ?").all(r.id);
  for (const b of books) stat.noImgByBook[b.book_id] = (stat.noImgByBook[b.book_id] ?? 0) + 1;
}

console.log("6-8 字母单词:", stat.total);
console.log("  有图:", stat.haveImg);
console.log("  无图:", stat.noImg);
console.log("无图词书分布:", JSON.stringify(stat.noImgByBook));
console.log("无图样例(前40):", noImgSamples.join(", "));
db.close();
