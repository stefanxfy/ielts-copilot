/**
 * src/lib/paths.ts — 路径解析(M1 步骤 2)
 *
 * 双态约定(docs/M1-实施计划.md「迁移策略」):
 *   root = env IELTS_APP_ROOT(覆盖) || process.cwd()
 *   dev:start next dev 于仓库根 → <root>/src/db/migrations 命中
 *   打包:postbuild 拷贝到 <root>/next-server/drizzle-migrations(server.js 也在该目录,
 *         cwd 即仓库根,start 脚本 node next-server/server.js)
 *   兼容:步骤 1 的临时 start(node .next/standalone/server.js,cwd 同为仓库根,
 *         src/db/migrations 命中,无需特判)
 */
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export function appRoot(): string {
  return process.env.IELTS_APP_ROOT ?? process.cwd();
}

export function dataDir(): string {
  return join(appRoot(), "data");
}

export function dbFile(): string {
  return join(dataDir(), "app.db");
}

export function ensureDataDir(): string {
  const dir = dataDir();
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** 迁移目录:按 dev → 打包 顺序探测,找不到给出可行动的错误 */
export function resolveMigrationsFolder(): string {
  const root = appRoot();
  const candidates = [
    join(root, "src", "db", "migrations"),
    join(root, "next-server", "drizzle-migrations"),
  ];
  for (const dir of candidates) {
    if (existsSync(dir)) return dir;
  }
  throw new Error(
    `[db] 迁移目录不存在,dev 态应构建后存在 ${candidates[0]}(npm run db:generate),` +
      `打包态由 postbuild 拷贝至 ${candidates[1]}`,
  );
}
