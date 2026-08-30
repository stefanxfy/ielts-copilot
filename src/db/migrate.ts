/**
 * src/db/migrate.ts — 迁移执行(M1 步骤 2)
 *
 * drizzle-orm migrator 按 __drizzle_migrations journal 记录已应用迁移,
 * 重复执行只补新增 —— 这就是「二次启动幂等」的机制来源。
 * 目录解析见 src/lib/paths.ts(dev/打包双态)。
 */
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { getDb, getSqlite } from "./index";
import { resolveMigrationsFolder } from "@/lib/paths";

export interface MigrationInfo {
  folder: string;
  applied: number;
}

export function runMigrations(): MigrationInfo {
  const db = getDb();
  const folder = resolveMigrationsFolder();
  migrate(db, { migrationsFolder: folder });
  const row = getSqlite()
    .prepare("select count(*) as n from __drizzle_migrations")
    .get() as { n: number };
  return { folder, applied: row.n };
}
