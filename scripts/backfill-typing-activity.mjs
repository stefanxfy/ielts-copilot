#!/usr/bin/env node
/**
 * scripts/backfill-typing-activity.mjs — 一次性回填 study_activities.typing_submission_count
 *
 * 背景:打字追踪埋点(2026-09-13)上线前,typing_sessions 已有完赛流水但
 * study_activities.typing_submission_count 恒 0 → 今日任务/打卡/AI 总结的打字口径缺历史。
 *
 * 口径与运行时埋点一致:只数 mode='article' 的完赛篇数,按 started_at 的
 * 本地时区日期归日;写入用「按日设精确值」而非累加 —— 幂等可重跑,重跑即按
 * 当前流水重算,不会双重计数。
 *
 * 用法:node scripts/backfill-typing-activity.mjs [--dry]
 * 活库三件套不碰;只 UPDATE/INSERT typing_submission_count 一个计数列。
 */
import Database from "better-sqlite3";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = process.env.IELTS_APP_ROOT ?? process.cwd();
const dbFile = join(root, "data", "app.db");
const DRY = process.argv.includes("--dry");

if (!existsSync(dbFile)) {
  console.error(`[backfill-typing] ${dbFile} 不存在`);
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

// 按本地日归组数 article 完赛篇数
const rows = db
  .prepare(`SELECT started_at, count(*) AS n FROM typing_sessions WHERE mode = 'article' GROUP BY started_at`)
  .all();
const byDate = new Map();
for (const r of rows) {
  const d = localDate(r.started_at);
  byDate.set(d, (byDate.get(d) ?? 0) + r.n);
}

if (byDate.size === 0) {
  console.log("[backfill-typing] typing_sessions 无 article 流水,无需回填");
  process.exit(0);
}

console.log(`[backfill-typing] 待回填 ${byDate.size} 天:`);
for (const [d, n] of [...byDate.entries()].sort()) console.log(`  ${d}  ${n} 篇`);
if (DRY) {
  console.log("[backfill-typing] --dry,未写库");
  process.exit(0);
}

const upsert = db.prepare(`
  INSERT INTO study_activities (activity_date, typing_submission_count, created_at, updated_at)
  VALUES (?, ?, unixepoch(), unixepoch())
  ON CONFLICT(activity_date) DO UPDATE
    SET typing_submission_count = excluded.typing_submission_count, updated_at = unixepoch()
`);

const tx = db.transaction(() => {
  for (const [d, n] of byDate) upsert.run(d, n);
});
tx();

const total = db
  .prepare(`SELECT coalesce(sum(typing_submission_count), 0) AS s FROM study_activities`)
  .get().s;
console.log(`[backfill-typing] 完成;study_activities.typing_submission_count 合计 = ${total}`);
