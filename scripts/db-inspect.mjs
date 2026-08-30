#!/usr/bin/env node
/**
 * scripts/db-inspect.mjs — 调试:列出 data/app.db 全部表与行计数(M1 步骤 2 验收面)
 * 用法:node scripts/db-inspect.mjs
 */
import Database from "better-sqlite3";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = process.env.IELTS_APP_ROOT ?? process.cwd();
const dbFile = join(root, "data", "app.db");

if (!existsSync(dbFile)) {
  console.error(`[db-inspect] ${dbFile} 不存在 —— 先跑一次 dev(自动建库)再检查`);
  process.exit(1);
}

const db = new Database(dbFile, { readonly: true });
const tables = db
  .prepare(
    "select name from sqlite_master where type='table' and name not like 'sqlite_%' order by name",
  )
  .all()
  .map((r) => r.name);

console.log(`[db-inspect] ${dbFile}`);
console.log(`表数量: ${tables.length}`);
for (const t of tables) {
  const { n } = db.prepare(`select count(*) as n from "${t}"`).get();
  console.log(`  ${t.padEnd(20)} ${n} 行`);
}
db.close();
