import Database from "better-sqlite3";
const db = new Database("data/app.db", { readonly: true });
const rows = db.prepare("SELECT w.word, w.content_json AS contentJson FROM book_word_relation r JOIN words w ON w.id = r.word_id WHERE r.book_id = 10").all();
let withExample = 0, withAudio = 0, withImage = 0, withMeaning = 0;
const noExample = [];
for (const r of rows) {
  const c = typeof r.contentJson === "string" ? JSON.parse(r.contentJson) : r.contentJson;
  const exs = c && c.examples ? c.examples : [];
  if (exs.length > 0) { withExample++; } else { if (noExample.length < 10) noExample.push(r.word); }
  if (c && c.audio && c.audio.word) withAudio++;
  if (c && c.image && c.image.word) withImage++;
  if (c && c.meaning) withMeaning++;
}
console.log("总词数:", rows.length);
console.log("有例句:", withExample, " 无例句:", rows.length - withExample);
console.log("有音频:", withAudio, " 有配图:", withImage, " 有释义:", withMeaning);
if (noExample.length) console.log("无例句样例:", noExample.join(", "));
// 顺带看看测试词书
const t = db.prepare("SELECT book_id, name FROM word_books").all();
console.log("词书表:", t.map(b => b.book_id + "(" + b.name + ")").join(", "));
db.close();
