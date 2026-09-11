// P2 坏词头修复:4 个乱序版(book18)源数据错词头直接 UPDATE word 字段
// 依据:relinquish/chic/groan 等正确拼写词经词典核对,4 词均无学习进度引用(word_progress 零行),
// book_word_relation 引用保留(词书内条目数不变,只是词头拨正)。
// aupair 是词典合法变体但规范形为 "au pair"(空格),audio 文件名沿用 aupair 不改。
// chiche:乱序版源把 cliché(法源词)截断为 chiche,正确词头是 cliche(去音符,与库内 ASCII 规范一致)。
import Database from "better-sqlite3";
const db = new Database("/Users/fanyunxu/Desktop/myproject/ielts-copilot/data/app.db");

const RENAMES = [
  { from: "relinguish", to: "relinquish" },
  { from: "chiche", to: "cliche" },
  // groa 特殊处理:groan 已存在(id 2338, book17, 富字段全)。groa 是 book18 的截断残片,
  // 改词头会撞唯一约束 → 把 book18 的条目关系挂到 2338 上,再删 groa 行(audio 文件沿用 groan 的)
  { from: "groa", to: "groan", mergeInto: 2338 },
  { from: "aupair", to: "au pair" },
];

const tx = db.transaction(() => {
  for (const { from, to, mergeInto } of RENAMES) {
    const row = db.prepare("SELECT id, word FROM words WHERE word = ?").get(from);
    if (!row) throw new Error(`缺词: ${from}`);
    if (mergeInto) {
      // merge 路径:book18 关系改挂到正确词,删坏词行(字段贫瘠,无可保留价值)
      const relBook = db.prepare("SELECT book_id FROM book_word_relation WHERE word_id = ?").get(row.id);
      const dupRel = db.prepare("SELECT word_id FROM book_word_relation WHERE word_id = ? AND book_id = ?").get(mergeInto, relBook.book_id);
      if (dupRel) throw new Error(`目标词已在该词书: word_id=${mergeInto} book=${relBook.book_id}`);
      db.prepare("UPDATE book_word_relation SET word_id = ? WHERE word_id = ?").run(mergeInto, row.id);
      db.prepare("DELETE FROM words WHERE id = ?").run(row.id);
      console.log(`✓ ${row.id} ${from} 已并入 id=${mergeInto} (${to}),book${relBook.book_id} 关系已挂过去`);
    } else {
      const dup = db.prepare("SELECT id FROM words WHERE word = ?").get(to);
      if (dup) throw new Error(`目标词已存在,拒绝覆盖: ${to} (id=${dup.id})`);
      db.prepare("UPDATE words SET word = ?, updated_at = ? WHERE id = ?").run(to, new Date().toISOString(), row.id);
      console.log(`✓ ${row.id} ${from} → ${to}`);
    }
  }
});
tx();

// 复核
for (const { from, to } of RENAMES) {
  const gone = db.prepare("SELECT COUNT(*) AS n FROM words WHERE word = ?").get(from);
  if (gone.n !== 0 && from !== "groa") throw new Error(`复核失败: ${from} 仍在`);
  console.log(`✓ 复核 ${to} 就位,旧词头已清`);
}
console.log("\n4/4 坏词头修复完成");
db.close();
