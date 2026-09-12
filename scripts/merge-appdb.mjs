#!/usr/bin/env node
/**
 * scripts/merge-appdb.mjs — 双机 app.db 数据级合并
 *
 * 背景:两台机器分头提交了 data/app.db(git 无法合并二进制)。盘点结论
 * (scripts/compare-appdb.mjs):
 *   - v3 版 words 表内容全面领先(配图 image/字段扩充 derives,contexts/拼写修正),
 *     master 侧对 words 既有行零改动 → words 内容字段整表取 v3,master 独有行保留;
 *   - v3 独有学习数据 3 处:word_review_log 1 条、book_word_relation 1 行、
 *     study_activities 9月12日 行(与 master 的 9月11日 行同 id 撞号,需重映射);
 *   - word_progress id=658 v3 是 9月12日 真实复习行为 → 取 v3;
 *   - 其余(7 张新功能表/生词本/ui_theme 等)以 master 为准。
 *
 * 用法: node scripts/merge-appdb.mjs <基座masterDb> <v3Db>   # 两者都应是副本!
 * 幂等性:各步骤均为"缺失才插/按 id 覆写",重复执行无副作用。
 */
import Database from "better-sqlite3";

const [masterPath, v3Path] = process.argv.slice(2);
if (!masterPath || !v3Path) {
  console.error("用法: node scripts/merge-appdb.mjs <基座masterDb副本> <v3Db>");
  process.exit(1);
}

const m = new Database(masterPath); // 可写:操作对象是副本
m.exec(`ATTACH DATABASE '${v3Path.replace(/\\/g, "/").replace(/'/g, "''")}' AS v3`);
m.pragma("foreign_keys = OFF");
m.pragma("journal_mode = DELETE"); // 副本不用 WAL,方便最终落盘替换

const report = [];

/* ---------- 1) words:内容字段整表取 v3(严格领先已验证) ---------- */
{
  const r = m
    .prepare(
      `UPDATE main.words SET
         word = w3.word, phonetic_uk = w3.phonetic_uk, phonetic_us = w3.phonetic_us,
         content_json = w3.content_json, origin = w3.origin, updated_at = w3.updated_at
       FROM v3.words AS w3 WHERE main.words.id = w3.id`,
    )
    .run();
  report.push(`words: 按 v3 更新 ${r.changes} 行(master 独有行保留)`);
}

/* ---------- 2) word_progress:658 取 v3 的复习状态 ---------- */
{
  const r = m
    .prepare(
      `UPDATE main.word_progress SET
         stage = w3.stage, status = w3.status, due = w3.due,
         fsrs_state_json = w3.fsrs_state_json, reps = w3.reps, lapses = w3.lapses,
         last_review_at = w3.last_review_at, updated_at = w3.updated_at
       FROM v3.word_progress AS w3
       WHERE main.word_progress.id = w3.id AND main.word_progress.id = 658`,
    )
    .run();
  report.push(`word_progress: id=658 取 v3 复习状态(${r.changes} 行)`);
}

/* ---------- 3) word_review_log:v3 独有复习记录并入 ---------- */
{
  const rows = m
    .prepare(
      `SELECT * FROM v3.word_review_log a
       WHERE NOT EXISTS (SELECT 1 FROM main.word_review_log b WHERE b.id = a.id)`,
    )
    .all();
  const ins = m.prepare(
    `INSERT INTO main.word_review_log (id, progress_id, rating, stage, reviewed_at)
     VALUES (@id, @progress_id, @rating, @stage, @reviewed_at)`,
  );
  for (const row of rows) ins.run(row);
  report.push(`word_review_log: 并入 v3 独有 ${rows.length} 条(${rows.map((r) => r.id).join(",") || "无"})`);
}

/* ---------- 4) book_word_relation:无单列 PK,但有 UNIQUE(book_id,"order") ----------
   双机可能往同一本书的同一位置各插一词(如两边都在 order=3308 插了不同词),
   冲突时把对方行的 order 重排到该书当前最大值+1,两行都保留。 */
{
  const rows = m
    .prepare(
      `SELECT * FROM v3.book_word_relation a
       WHERE NOT EXISTS (
         SELECT 1 FROM main.book_word_relation b
         WHERE b.book_id IS a.book_id AND b.word_id IS a.word_id AND b."order" IS a."order"
       )`,
    )
    .all();
  const maxOrder = m.prepare(
    `SELECT COALESCE(MAX("order"), -1) o FROM main.book_word_relation WHERE book_id = ?`,
  );
  const slotTaken = m.prepare(
    `SELECT COUNT(*) n FROM main.book_word_relation WHERE book_id = ? AND "order" = ?`,
  );
  const ins = m.prepare(
    `INSERT INTO main.book_word_relation (book_id, word_id, "order") VALUES (@book_id, @word_id, @order)`,
  );
  for (const row of rows) {
    let order = row.order;
    if (slotTaken.get(row.book_id, order).n > 0) {
      order = maxOrder.get(row.book_id).o + 1;
      console.warn(`  [order 冲突] book=${row.book_id} word=${row.word_id} 原 order=${row.order} → 重排 ${order}`);
    }
    ins.run({ book_id: row.book_id, word_id: row.word_id, order });
  }
  report.push(`book_word_relation: 并入 v3 独有 ${rows.length} 行`);
}

/* ---------- 5) study_activities:按 activity_date 为逻辑键合并 ---------- */
{
  // v3 有、main(按日期)没有的活动日 → 重映射新 id 插入;撞号不覆盖语义行
  const v3Rows = m
    .prepare(
      `SELECT * FROM v3.study_activities a
       WHERE NOT EXISTS (SELECT 1 FROM main.study_activities b WHERE b.activity_date = a.activity_date)`,
    )
    .all();
  const nextId = () => m.prepare(`SELECT MAX(id)+1 n FROM main.study_activities`).get().n;
  const ins = m.prepare(
    `INSERT INTO main.study_activities
       (id, activity_date, exam_set_completion_count, listening_submission_count,
        reading_submission_count, writing_submission_count, speaking_submission_count,
        memorized_word_count, created_at, updated_at)
     VALUES (@id, @activity_date, @exam_set_completion_count, @listening_submission_count,
        @reading_submission_count, @writing_submission_count, @speaking_submission_count,
        @memorized_word_count, @created_at, @updated_at)`,
  );
  for (const row of v3Rows) ins.run({ ...row, id: nextId() });
  report.push(
    `study_activities: 按 activity_date 合并,重映射插入 ${v3Rows.length} 行(${v3Rows.map((r) => r.activity_date).join(",") || "无"})`,
  );
}

/* ---------- 6) 校验 ---------- */
m.pragma("foreign_keys = ON");
const check = m.pragma("quick_check");
const cnt = (t) => m.prepare(`SELECT COUNT(*) n FROM main.${t}`).get().n;
report.push(
  `校验: quick_check=${JSON.stringify(check[0].quick_check)} | words=${cnt("words")} word_review_log=${cnt("word_review_log")} book_word_relation=${cnt("book_word_relation")} study_activities=${cnt("study_activities")}`,
);

console.log(report.join("\n"));
m.close();
