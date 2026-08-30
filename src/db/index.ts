/**
 * src/db/index.ts — better-sqlite3 单例 + drizzle 实例(M1 步骤 2)
 *
 * 计划要求:WAL(读写并发)+ foreign_keys=ON(better-sqlite3 默认关 FK,必须显式开)
 *          + busy_timeout(WAL 下偶发写锁等待)。
 * globalThis 缓存:dev 热重载会重建模块作用域,SQLite 连接必须跨重载复用
 * (重复 open 同一文件句柄泄漏 + WAL 锁竞争)。
 */
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { dbFile, ensureDataDir } from "@/lib/paths";

export type Db = BetterSQLite3Database<typeof schema>;

const g = globalThis as unknown as {
  __ieltsSqlite?: Database.Database;
  __ieltsDb?: Db;
};

export function getSqlite(): Database.Database {
  if (g.__ieltsSqlite) return g.__ieltsSqlite;
  ensureDataDir();
  const sqlite = new Database(dbFile());
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  g.__ieltsSqlite = sqlite;
  return sqlite;
}

export function getDb(): Db {
  if (g.__ieltsDb) return g.__ieltsDb;
  const db = drizzle(getSqlite(), { schema });
  g.__ieltsDb = db;
  return db;
}
