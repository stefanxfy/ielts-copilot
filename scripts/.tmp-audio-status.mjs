import Database from "better-sqlite3";
import { readdirSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const db = new Database("data/app.db", { readonly: true });
const BOOK_ID = "ielts-luan-3427";

const book = db.prepare("SELECT id, name FROM word_books WHERE book_id = ?").get(BOOK_ID);
const rows = db
  .prepare(
    `SELECT w.id, w.word, w.content_json FROM words w
     JOIN book_word_relation r ON r.word_id = w.id
     WHERE r.book_id = ?`,
  )
  .all(book.id);

let hasWordAudio = 0;
let ctxTotal = 0;
let ctxWithAudio = 0;
for (const r of rows) {
  const cj = JSON.parse(r.content_json || "{}");
  if (cj.audio?.word) hasWordAudio++;
  const ctxs = cj.contexts || [];
  for (const c of ctxs) {
    ctxTotal++;
    if (c.audio) ctxWithAudio++;
  }
}
console.log(`[db] ${book.name} 关联词 ${rows.length}`);
console.log(`[db] 单词音频: ${hasWordAudio}/${rows.length}`);
console.log(`[db] 例句音频: ${ctxWithAudio}/${ctxTotal}`);

// 检查可疑小文件(kill 留下的半截 mp3)
for (const dir of ["public/audio/words", "public/audio/contexts"]) {
  let files;
  try {
    files = readdirSync(dir);
  } catch {
    console.log(`[fs] ${dir} 不存在,跳过`);
    continue;
  }
  const suspicious = [];
  for (const f of files) {
    if (!f.endsWith(".mp3")) continue;
    const size = statSync(join(dir, f)).size;
    if (size < 1024) suspicious.push({ f, size });
  }
  console.log(`[fs] ${dir}: ${files.length} 个 mp3, 其中 <1KB 可疑 ${suspicious.length}`);
  suspicious.slice(0, 10).forEach((s) => console.log(`     - ${s.f} (${s.size}B)`));
  if (process.env.PURGE === "1") {
    suspicious.forEach((s) => {
      unlinkSync(join(dir, s.f));
      console.log(`     [purge] 删除 ${s.f}`);
    });
  }
}
db.close();
