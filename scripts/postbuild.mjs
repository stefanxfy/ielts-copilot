#!/usr/bin/env node
/**
 * scripts/postbuild.mjs — standalone 产物修补(M1 步骤 6,npm postbuild 钩子自动跑)
 *
 * .next/standalone 只是「最小 server」,要能用还差四件事:
 *   1. 拷为 next-server/(PRD §3.1 命名;产物目录与源码解耦)
 *   2. migrations → next-server/drizzle-migrations(instrumentation 迁移的打包态目录,
 *      paths.ts 双态解析的 fallback)
 *   3. 强制补拷 better-sqlite3 整目录 —— Next tracing 对原生模块(.node)偶发漏拷,
 *      这是 M1 计划风险 #1 的兜底
 *   4. public 与 .next/static —— Next standalone 不含静态资源(M2 真题图片靠这步进包)
 */
import { cpSync, rmSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const standalone = join(root, ".next", "standalone");
const target = join(root, "next-server");

for (const [label, dir] of [
  [".next/standalone", standalone],
  ["node_modules/better-sqlite3", join(root, "node_modules", "better-sqlite3")],
  ["src/db/migrations", join(root, "src", "db", "migrations")],
  ["public", join(root, "public")],
  [".next/static", join(root, ".next", "static")],
]) {
  if (!existsSync(dir)) {
    console.error(`[postbuild] 缺少 ${label}(${dir})—— 先跑完整 npm run build`);
    process.exit(1);
  }
}

rmSync(target, { recursive: true, force: true });
cpSync(standalone, target, { recursive: true });

mkdirSync(join(target, "drizzle-migrations"), { recursive: true });
cpSync(join(root, "src", "db", "migrations"), join(target, "drizzle-migrations"), {
  recursive: true,
});

/* 强制补拷 better-sqlite3 整目录(含 prebuilds/*.node;覆盖 tracing 拷出的不完整版本) */
cpSync(
  join(root, "node_modules", "better-sqlite3"),
  join(target, "node_modules", "better-sqlite3"),
  { recursive: true },
);

cpSync(join(root, "public"), join(target, "public"), { recursive: true });
mkdirSync(join(target, ".next"), { recursive: true });
cpSync(join(root, ".next", "static"), join(target, ".next", "static"), {
  recursive: true,
});

console.log("[postbuild] next-server/ 就绪:server.js + drizzle-migrations + better-sqlite3 + public + static");
