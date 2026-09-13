#!/usr/bin/env node
/**
 * scripts/backfill-writing-activity.mjs — 一次性回填 study_activities.writing_submission_count
 *
 * 背景:写作追踪口径(2026-09-13 用户定:写作篇数 = /writing 仿真交卷 或 考试写作交卷,
 * 连考/单科都计)落地前,已有完赛流水但 study_activities.writing_submission_count 恒 0。
 *
 * 口径与运行时埋点一致:
 *   - writing_sessions 每行 = 一次 /writing 仿真交卷,按 finished_at 本地日归组;
 *   - exam_records(subject='writing', status='SUBMITTED')每行按 submitted_at 本地日归组。
 *     注意:交卷去重走「覆盖更新」,被覆盖的原始 submitted_at 已不可考,按现存行数计为
 *     best-effort(每行至少对应一次完赛)。
 * 写入用「按日设精确值」而非累加 —— 幂等可重跑,重跑即按当前流水重算,不会双重计数。
 *
 * 用法:node scripts/backfill-writing-activity.mjs [--dry]
 * 活库三件套不碰;只 UPDATE/INSERT writing_submission_count 一个计数列。
 */
import Database from "better-sqlite3";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = process.env.IELTS_APP_ROOT ?? process.cwd();
const dbFile = join(root, "data", "app.db");
const DRY = process.argv.includes("--dry");

if (!existsSync(dbFile)) {
  console.error(`[backfill-writing] ${dbFile} 不存在`);
  process.exit(1);
}

const db = new Database(dbFile);
db.pragma("busy_timeout = 5000");

/** unixepoch 秒 → 本地 YYYY-MM-DD(与 src/lib/study/date.ts toLocalDateStr 同口径) */
function localDate(unixSec) {
  const d = new Date(unixSec * 1000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const byDate = new Map();
const add = (d, n) => byDate.set(d, (byDate.get(d) ?? 0) + n);

// /writing 仿真交卷
for (const r of db
  .prepare(`SELECT finished_at FROM writing_sessions WHERE finished_at IS NOT NULL`)
  .all()) {
  add(localDate(r.finished_at), 1);
}
// 考试写作交卷(连考 + 单科;去重覆盖后每现存行计一次)
for (const r of db
  .prepare(
    `SELECT submitted_at FROM exam_records WHERE subject = 'writing' AND status = 'SUBMITTED' AND submitted_at IS NOT NULL`,
  )
  .all()) {
  add(localDate(r.submitted_at), 1);
}

if (byDate.size === 0) {
  console.log("[backfill-writing] 无写作完赛流水,无需回填");
  process.exit(0);
}

console.log(`[backfill-writing] 待回填 ${byDate.size} 天:`);
for (const [d, n] of [...byDate.entries()].sort()) console.log(`  ${d}  ${n} 篇`);
if (DRY) {
  console.log("[backfill-writing] --dry,未写库");
  process.exit(0);
}

const upsert = db.prepare(`
  INSERT INTO study_activities (activity_date, writing_submission_count, created_at, updated_at)
  VALUES (?, ?, unixepoch(), unixepoch())
  ON CONFLICT(activity_date) DO UPDATE
    SET writing_submission_count = excluded.writing_submission_count, updated_at = unixepoch()
`);

const tx = db.transaction(() => {
  for (const [d, n] of byDate) upsert.run(d, n);
});
tx();

const total = db
  .prepare(`SELECT coalesce(sum(writing_submission_count), 0) AS s FROM study_activities`)
  .get().s;
console.log(`[backfill-writing] 完成;study_activities.writing_submission_count 合计 = ${total}`);
