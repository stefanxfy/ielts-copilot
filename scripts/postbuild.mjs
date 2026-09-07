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
import { cpSync, rmSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
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

/* Next tracing 偶发漏拷核心包(next/react/react-dom/server-only)——
   standalone 模式下 server.js 仍 require('next'),缺这些会启动立即 throw。
   强制补拷工程根 node_modules 下整个 next / react / react-dom 家族。

   关键陷阱:Next tracing 只追踪 .js / .cjs 文件,把 package.json 当作
   「不必要的元数据」丢弃,导致打包后 next/package.json 缺失 —— Node
   require 时找不到 main/exports,报 'Cannot find module next'。
   所以这里必须用 rm + cp 强制覆盖整个包目录,而不是增量拷贝。 */
const CRITICAL_PACKAGES = [
  "next",
  "react",
  "react-dom",
  "scheduler",
  "server-only",
  "client-only",
  "styled-jsx",
];
for (const pkg of CRITICAL_PACKAGES) {
  const src = join(root, "node_modules", pkg);
  const dst = join(target, "node_modules", pkg);
  if (!existsSync(src)) {
    console.warn(`[postbuild] 跳过(工程无 ${pkg})`);
    continue;
  }
  // 强制覆盖:删目标目录再 cp,避免 standalone 已存在的 stub 文件残留
  rmSync(dst, { recursive: true, force: true });
  cpSync(src, dst, { recursive: true });
}

//  兜底校验:对 critical 包确认 package.json 必须存在
for (const pkg of CRITICAL_PACKAGES) {
  const dst = join(target, "node_modules", pkg);
  const pj = join(dst, "package.json");
  if (existsSync(dst) && !existsSync(pj)) {
    console.error(`[postbuild] 致命: ${pkg}/package.json 缺失 —— Next standalone tracing bug?`);
    process.exit(1);
  }
}

cpSync(join(root, "public"), join(target, "public"), { recursive: true });
mkdirSync(join(target, ".next"), { recursive: true });
cpSync(join(root, ".next", "static"), join(target, ".next", "static"), {
  recursive: true,
});

/* Next standalone 第二个已知 bug:server.js 内 nextConfig 字符串硬编码了构建机
   的绝对路径("outputFileTracingRoot": "D:\\a\\ielts-copilot\\ielts-copilot")。
   Next 启动时会 realpathSync 该路径 —— 在用户机器上根本不存在,导致
   EISDIR 'C:' 错(把 'D:\\a' 的盘符当 root 解析)或 ENOENT。

   修复策略:扫描 server.js,把 nextConfig 里的三个字段置为空字符串,Next
   会自动从 process.cwd() 推断,不再依赖构建机路径。
   - outputFileTracingRoot
   - repoRoot
   - turbopack.root
*/
const serverJsPath = join(target, "server.js");
if (existsSync(serverJsPath)) {
  let src = readFileSync(serverJsPath, "utf8");
  let rewrote = false;
  for (const field of ["outputFileTracingRoot", "repoRoot"]) {
    // 匹配 "field":"<任何 Windows/macOS 绝对路径>" 字符串,置为空
    const re = new RegExp(`("${field}":\\s*)"[^"]*"`, "g");
    const before = src;
    src = src.replace(re, `$1""`);
    if (src !== before) rewrote = true;
  }
  // turbopack.root 是嵌套对象
  const tpRe = new RegExp(`("turbopack":\\s*\\{[^}]*?"root":\\s*)"[^"]*"`, "g");
  const before = src;
  src = src.replace(tpRe, `$1""`);
  if (src !== before) rewrote = true;

  if (rewrote) {
    writeFileSync(serverJsPath, src);
    console.log("[postbuild] 已清空 server.js 中 nextConfig 的构建机绝对路径(outputFileTracingRoot/repoRoot/turbopack.root)");
  }
}

console.log("[postbuild] next-server/ 就绪:server.js + drizzle-migrations + better-sqlite3 + public + static");
