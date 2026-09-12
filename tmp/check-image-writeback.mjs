import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
const db = new Database("data/app.db", { readonly: true });
const words = readFileSync("tmp/p1-smoke-words.txt", "utf8").split("\n").filter(Boolean);
const stmt = db.prepare(`SELECT word, content_json FROM words WHERE word = ?`);
for (const w of words) {
  const r = stmt.get(w);
  if (!r) { console.log(w, "缺词!"); continue; }
  try { console.log(w, "image =", JSON.parse(r.content_json).image ?? null); }
  catch (e) { console.log(w, "*** JSON 损坏"); }
}
db.close();
