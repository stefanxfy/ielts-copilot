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
 *
 * 桌面安装态(Tauri,docs/桌面App分发方案设计.md §5.5,由 Rust 壳注入 env):
 *   IELTS_APP_ROOT    = 安装目录\server(next-server 内容平铺根,public 命中)
 *   IELTS_DATA_ROOT   = 数据目录(portable 双态:安装目录可写 → 就地;否则 %APPDATA%)
 *   IELTS_CONFIG_ROOT = 配置目录(= 数据目录;config.json 跟数据走,apiKey 不落安装区)
 *   三者不注入时行为与 zip / dev 态完全一致。
 */
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export function appRoot(): string {
  return process.env.IELTS_APP_ROOT ?? process.cwd();
}

/** 数据目录:桌面态重定向(Rust 注入 IELTS_DATA_ROOT),其余态就地 data/ */
export function dataDir(): string {
  if (process.env.IELTS_DATA_ROOT) return process.env.IELTS_DATA_ROOT;
  return join(appRoot(), "data");
}

/** 配置目录:桌面态 = 数据目录(config.json 须落在可写区);其余态 = appRoot */
export function configDir(): string {
  if (process.env.IELTS_CONFIG_ROOT) return process.env.IELTS_CONFIG_ROOT;
  return appRoot();
}

/** public 静态资源目录(音频 mp3 / 联想配图 png 落盘处) */
export function publicDir(): string {
  return join(appRoot(), "public");
}

export function dbFile(): string {
  return join(dataDir(), "app.db");
}

export function ensureDataDir(): string {
  const dir = dataDir();
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** 迁移目录:按 dev → 打包 → 桌面平铺 顺序探测,找不到给出可行动的错误 */
export function resolveMigrationsFolder(): string {
  const root = appRoot();
  const candidates = [
    join(root, "src", "db", "migrations"),
    join(root, "next-server", "drizzle-migrations"),
    // 桌面安装态:IELTS_APP_ROOT 即 next-server 内容平铺根,迁移目录直接在根下
    join(root, "drizzle-migrations"),
  ];
  for (const dir of candidates) {
    if (existsSync(dir)) return dir;
  }
  throw new Error(
    `[db] 迁移目录不存在,dev 态应构建后存在 ${candidates[0]}(npm run db:generate),` +
      `打包态由 postbuild 拷贝至 ${candidates[1]}`,
  );
}
