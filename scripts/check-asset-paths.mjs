#!/usr/bin/env node
/**
 * scripts/check-asset-paths.mjs — 安装包路径长度门禁(可重入)
 *
 * 背景:questions/_files、public/、prototype/ 下零散存在爬虫原始整句标题
 *       文件名(179 字符级别),与目录叠加后撞 Windows MAX_PATH=260。
 *       CI 表现为:
 *         - actions/checkout → "Filename too long"
 *         - tauri/makensis  → "failed opening file ..."
 *       即使 checkout 开了 core.longpaths,makensis 的 LZMA 仍可能撞上限。
 *
 * 策略:递归扫 public/ prototype/ questions/(NSIS 会把 public/ 装配进
 *       src-tauri/server/,prototype/ 不进但保持一致便于排查;questions/
 *       影响 zip 分发)。超阈值即报错,给出全部路径。退出码:
 *         0 = 无超长路径
 *         1 = 有超长路径
 *
 * 用法:node scripts/check-asset-paths.mjs
 *      node scripts/check-asset-paths.mjs --limit=200
 */
import { readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LIMIT = parseInt(
  (process.argv.find((a) => a.startsWith("--limit=")) ?? "--limit=200").slice(8),
  10,
);
const SCAN_ROOTS = ["public", "prototype", "questions"].filter((r) =>
  // 不依赖 existsSync —— skip 即可
  true,
);

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "target",
  "data",
  "dist",
  "out",
]);

function walk(p) {
  const out = [];
  for (const ent of readdirSync(p)) {
    if (SKIP_DIRS.has(ent)) continue;
    const fp = join(p, ent);
    const st = statSync(fp);
    if (st.isDirectory()) out.push(...walk(fp));
    else if (st.isFile()) out.push(fp);
  }
  return out;
}

const all = [];
for (const root of SCAN_ROOTS) {
  const abs = join(ROOT, root);
  try {
    all.push(...walk(abs).map((fp) => relative(ROOT, fp)));
  } catch {
    /* 目录不存在,跳过 */
  }
}

const over = all.filter((p) => p.length > LIMIT).sort((a, b) => b.length - a.length);
console.log(
  `[check-asset-paths] 扫描 ${SCAN_ROOTS.join("/")} 路径长度 > ${LIMIT}: ${over.length} 个`,
);
for (const p of over) console.log(`  ${p.length.toString().padStart(3)} · ${p}`);
process.exit(over.length > 0 ? 1 : 0);
