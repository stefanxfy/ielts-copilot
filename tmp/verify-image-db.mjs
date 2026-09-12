import Database from "better-sqlite3";
import { readFileSync, existsSync, statSync } from "node:fs";
const db = new Database("data/app.db", { readonly: true });
const words = readFileSync("data/mnemonic-debug/p1-image-words.txt", "utf8").split("\n").filter(Boolean);

let dbHasPath = 0, dbNull = [], pathMismatch = [];
const stmt = db.prepare("SELECT content_json FROM words WHERE word = ?");
for (const w of words) {
  const r = stmt.get(w);
  if (!r) { dbNull.push(w + "(缺行)"); continue; }
  let c; try { c = JSON.parse(r.content_json); } catch { dbNull.push(w + "(JSON坏)"); continue; }
  if (c.image === `/images/words/${w}.png`) {
    // 双向核验:库里路径 → 盘上文件真实存在且 >1KB
    const f = "public/images/words/" + w + ".png";
    if (existsSync(f) && statSync(f).size > 1000) dbHasPath++;
    else pathMismatch.push(w + "(库有路径盘无文件)");
  } else {
    dbNull.push(w);
  }
}
console.log("词表", words.length, "| DB 路径正确且文件健康:", dbHasPath, "| DB 无路径/异常:", dbNull.length, "| 路径错位:", pathMismatch.length);
if (dbNull.length) console.log("DB 无路径清单:", dbNull.join(","));
if (pathMismatch.length) console.log("路径错位:", pathMismatch.join(","));

// 全库维度:盘上有图但库里没路径的(历史断链自愈漏网)
const rows = db.prepare("SELECT id, word, content_json FROM words").all();
let diskNoDb = [];
const stmt2 = db.p ? null : null;
for (const r of rows) {
  let c; try { c = JSON.parse(r.content_json || "{}"); } catch { continue; }
  const w = String(r.word);
  if (w.includes(" ")) continue;
  const f = "public/images/words/" + w + ".png";
  if (!c.image && existsSync(f) && statSync(f).size > 1000) diskNoDb.push(w);
}
console.log("\n全库盘点: 盘有图但 contentJson.image 为空(断链):", diskNoDb.length);
if (diskNoDb.length) console.log("清单(前30):", diskNoDb.slice(0, 30).join(","));
db.close();
