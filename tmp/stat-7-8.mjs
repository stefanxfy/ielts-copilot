import Database from "better-sqlite3";
import { existsSync, statSync, writeFileSync } from "node:fs";
const db = new Database("data/app.db", { readonly: true });
const rows = db.prepare("SELECT id, word, content_json FROM words").all();

const len = (w) => w.replace(/[^a-zA-Z]/g, "").length;
const bookName = { 10: "核心100", 16: "核心563", 17: "新东方3575", 18: "乱序版3427" };
const stat = { total: 0, haveImg: 0, noImg: 0 };
const noImgByBook = {};
const noImgWords = [];

for (const r of rows) {
  const w = String(r.word ?? "").trim();
  if (w.includes(" ")) continue;
  const L = len(w);
  if (L < 7 || L > 8) continue;
  stat.total++;
  let c; try { c = JSON.parse(r.content_json || "{}"); } catch { c = {}; }
  const f = "public/images/words/" + w + ".png";
  const hasImg = (typeof c.image === "string" && c.image) || (existsSync(f) && statSync(f).size > 1000);
  if (hasImg) { stat.haveImg++; continue; }
  stat.noImg++;
  noImgWords.push(w);
  const books = db.prepare("SELECT book_id FROM book_word_relation WHERE word_id = ?").all(r.id);
  for (const b of books) {
    const k = bookName[b.book_id] ?? ("book" + b.book_id);
    noImgByBook[k] = (noImgByBook[k] ?? 0) + 1;
  }
}

console.log("7-8 字母单词:", stat.total);
console.log("  有图:", stat.haveImg, "(" + (stat.haveImg / stat.total * 100).toFixed(1) + "%)");
console.log("  无图:", stat.noImg, "(" + (stat.noImg / stat.total * 100).toFixed(1) + "%)");
console.log("无图词书分布(一词多书重复计):", JSON.stringify(noImgByBook));
console.log("无图样例(前30):", noImgWords.slice(0, 30).join(", "));
writeFileSync("data/mnemonic-debug/p2-image-words-7to8.txt", noImgWords.join("\n") + "\n");
console.log("\n清单已落盘: data/mnemonic-debug/p2-image-words-7to8.txt");
db.close();
