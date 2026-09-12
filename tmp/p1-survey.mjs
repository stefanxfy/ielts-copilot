import Database from "better-sqlite3";
import { existsSync, readFileSync } from "node:fs";
const db = new Database("data/app.db", { readonly: true });
const a = JSON.parse(readFileSync("data/mnemonic-debug/audit-result.json", "utf8"));
const miss = a.image.missEligible.filter((w) => !w.includes(" "));
console.log("缺图单词(非短语):", miss.length);
const dist = db.prepare(`
  SELECT b.id, b.name, COUNT(DISTINCT w.id) n FROM book_word_relation r
  JOIN words w ON w.id = r.word_id JOIN word_books b ON b.id = r.book_id
  WHERE w.word NOT LIKE '% %' AND length(replace(w.word,'-','')) >= 9
    AND json_extract(w.content_json, '$.image') IS NULL
  GROUP BY b.id ORDER BY n DESC`).all();
for (const d of dist) console.log(`book${d.id} ${d.name}: ${d.n}`);
let hasScene = 0;
for (const w of miss) if (existsSync("data/image-scenes/" + w + ".txt")) hasScene++;
console.log("缺图词已有场景脚本:", hasScene, "/", miss.length);
db.close();
