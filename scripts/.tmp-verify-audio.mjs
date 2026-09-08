import Database from "better-sqlite3";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

const db = new Database("data/app.db", { readonly: true });
const r = db
  .prepare("SELECT id, word, phonetic_uk, content_json FROM words WHERE word = ?")
  .get("telecommunication");
const cj = JSON.parse(r.content_json || "{}");

console.log(`词: ${r.word}  (${r.phonetic_uk})`);
const wp = cj.audio?.word;
if (wp) {
  const abs = join(process.cwd(), "public", String(wp).replace(/^\/+/, ""));
  console.log(`单词音频: ${wp}  ${existsSync(abs) ? (statSync(abs).size / 1024).toFixed(1) + "KB ✓" : "文件缺失 ✗"}`);
} else {
  console.log("单词音频: 无 ✗");
}
(cj.contexts || []).forEach((c, i) => {
  const p = c.audio;
  if (!p) return console.log(`例句${i} 音频: 无 ✗`);
  const abs = join(process.cwd(), "public", String(p).replace(/^\/+/, ""));
  console.log(`例句${i} 音频: ${p}  ${existsSync(abs) ? (statSync(abs).size / 1024).toFixed(1) + "KB ✓" : "缺失 ✗"}`);
  console.log(`     文本: ${String(c.en).slice(0, 60)}`);
});

// 全库抽查 20 个 luan 新词
console.log("\n--- 随机抽查 20 个 luan 新词 ---");
const rows = db
  .prepare(
    `SELECT w.word, w.content_json FROM words w
     JOIN book_word_relation r ON r.word_id = w.id
     WHERE r.book_id = 18 ORDER BY RANDOM() LIMIT 20`,
  )
  .all();
let bad = 0;
for (const row of rows) {
  const c = JSON.parse(row.content_json || "{}");
  const p = c.audio?.word;
  const abs = p ? join(process.cwd(), "public", String(p).replace(/^\/+/, "")) : null;
  const ok = abs && existsSync(abs) && statSync(abs).size > 1000;
  if (!ok) {
    bad++;
    console.log(`  ✗ ${row.word}: ${p || "无路径"}`);
  }
}
console.log(`抽查 20 词, 异常 ${bad} 个`);
db.close();
