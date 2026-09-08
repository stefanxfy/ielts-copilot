import Database from "better-sqlite3";
import { existsSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const db = new Database("data/app.db");
const BOOK_ID = "ielts-luan-3427";
const book = db.prepare("SELECT id, name FROM word_books WHERE book_id = ?").get(BOOK_ID);

const isBad = (p) => {
  if (!p) return true;
  const rel = String(p).replace(/^\/+/, "");
  const abs = join(process.cwd(), "public", rel);
  if (!existsSync(abs)) return true;
  return statSync(abs).size < 1024;
};

const rows = db
  .prepare(
    `SELECT w.id, w.word, w.content_json FROM words w
     JOIN book_word_relation r ON r.word_id = w.id
     WHERE r.book_id = ?`,
  )
  .all(book.id);

const fix = [];
for (const r of rows) {
  const cj = JSON.parse(r.content_json || "{}");
  let touched = false;
  if (cj.audio?.word && isBad(cj.audio.word)) {
    delete cj.audio.word;
    touched = true;
  }
  if (Array.isArray(cj.contexts)) {
    for (const c of cj.contexts) {
      if (c.audio && isBad(c.audio)) {
        delete c.audio;
        touched = true;
      }
    }
  }
  if (Array.isArray(cj.examples)) {
    for (const e of cj.examples) {
      if (e.audio && isBad(e.audio)) {
        delete e.audio;
        touched = true;
      }
    }
  }
  if (touched) fix.push({ id: r.id, word: r.word, cj });
}

console.log(`[zombie] DB 有 audio 路径但文件缺失/为空的词: ${fix.length}`);
fix.slice(0, 15).forEach((f) => console.log(`  - ${f.word}`));

// 清 0 字节文件
for (const dir of ["public/audio/words", "public/audio/contexts"]) {
  const { readdirSync } = await import("node:fs");
  let files;
  try {
    files = readdirSync(dir);
  } catch {
    continue;
  }
  let n = 0;
  for (const f of files) {
    if (!f.endsWith(".mp3")) continue;
    const p = join(dir, f);
    if (statSync(p).size < 1024) {
      unlinkSync(p);
      n++;
    }
  }
  console.log(`[purge] ${dir} 删除 <1KB 文件 ${n} 个`);
}

if (process.env.APPLY === "1") {
  const upd = db.prepare("UPDATE words SET content_json = ?, updated_at = unixepoch() WHERE id = ?");
  const tx = db.transaction((list) => list.forEach((f) => upd.run(JSON.stringify(f.cj), f.id)));
  tx(fix);
  console.log(`[apply] 已清 ${fix.length} 词的僵尸 audio 路径`);
} else {
  console.log("[dry-run] 加 APPLY=1 生效");
}
db.close();
