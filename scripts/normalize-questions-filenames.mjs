#!/usr/bin/env node
/**
 * scripts/normalize-questions-filenames.mjs — 真题存档超长文件名治理(一次性,幂等)
 *
 * 背景:questions/ 下网页存档(_files 目录)保留了爬虫原始整句标题文件名,
 *       目录(~91 字符)+文件名(~175 字符)叠加后完整路径最长 293 字符,
 *       Windows 默认 MAX_PATH=260 —— GitHub Actions checkout 直接挂
 *       "Filename too long",客户机 zip 自解压也撞 0x80010135。
 *
 * 策略:只缩文件名(目录不动)。新名 = stem 截断 ≤70 + "." + hash8 + 原扩展名,
 *       hash 取旧 basename 的 sha256 前 8 位,天然防撞名。
 *       同步重写 questions/ 内全部文本文件的引用(raw 与 URL-encoded 两种形态)。
 *
 * 用法:node scripts/normalize-questions-filenames.mjs [--dry-run]
 */
import { readFileSync, writeFileSync, readdirSync, statSync, renameSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const QUESTIONS = join(ROOT, "questions");
const DRY_RUN = process.argv.includes("--dry-run");
const PATH_LIMIT = 200; // 完整相对路径阈值(字符数,同 Windows MAX_PATH 口径;runner 前缀 33 + 解压余量)

const TEXT_EXT = new Set([".html", ".htm", ".css", ".js", ".mjs", ".json", ".txt", ".svg", ".xml"]);

/** 递归收集文件 */
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/** 以 questions/ 为根的相对 POSIX 路径 */
const allFiles = walk(QUESTIONS).map((p) => ({
  abs: p,
  rel: p.slice(QUESTIONS.length + 1).split("\\").join("/"),
}));

// ---------- 1. 找出超长文件,生成新名 ----------
const renames = []; // {abs, rel, newAbs, newRel, oldBase, newBase}
for (const f of allFiles) {
  if (f.rel.length <= PATH_LIMIT) continue;
  const oldBase = basename(f.rel);
  const ext = extname(oldBase);
  const stem = oldBase.slice(0, oldBase.length - ext.length);
  const hash = createHash("sha256").update(oldBase).digest("hex").slice(0, 8);
  const newBase = `${stem.slice(0, 70)}.${hash}${ext}`;
  renames.push({
    ...f,
    newAbs: join(dirname(f.abs), newBase),
    newRel: join(dirname(f.rel), newBase).split("\\").join("/"),
    oldBase,
    newBase,
  });
}
console.log(`[rename] 超长文件(路径>${PATH_LIMIT}): ${renames.length} 个`);
for (const r of renames) console.log(`  ${r.rel.length} → ${r.newRel.length}  ${r.rel}\n    → ${r.newBase}`);

// ---------- 2. 执行改名(断言旧名存在,防静默失效) ----------
if (!DRY_RUN) {
  for (const r of renames) {
    if (!statSync(r.abs).isFile()) throw new Error(`旧文件不存在,中止: ${r.abs}`);
    renameSync(r.abs, r.newAbs);
  }
  console.log(`[rename] 已改名 ${renames.length} 个`);
}

// ---------- 3. 重写引用(raw + URL-encoded 两种形态,字符串替换不用正则) ----------
const refRewrites = []; // {oldBase, newBase}
for (const r of renames) refRewrites.push({ oldBase: r.oldBase, newBase: r.newBase });

/** 递归改后重新收集(改名后目录内容已变) */
const filesAfter = DRY_RUN ? allFiles : walk(QUESTIONS);
let touched = 0;
if (!DRY_RUN) {
  for (const p of filesAfter) {
    if (!TEXT_EXT.has(extname(p).toLowerCase())) continue;
    let raw;
    try {
      raw = readFileSync(p, "utf8");
    } catch {
      continue; // 非严格 UTF-8 的文本跳过
    }
    let next = raw;
    for (const { oldBase, newBase } of refRewrites) {
      for (const [from, to] of [
        [oldBase, newBase],
        [encodeURIComponent(oldBase), encodeURIComponent(newBase)],
      ]) {
        if (next.includes(from)) next = next.split(from).join(to);
      }
    }
    if (next !== raw) {
      writeFileSync(p, next, "utf8");
      touched++;
    }
  }
}
console.log(`[refs] 重写引用的文件数: ${touched}(dry-run 为 0)`);

// ---------- 4. 自验:重扫不应再有超长路径 ----------
const finalFiles = DRY_RUN
  ? allFiles
  : walk(QUESTIONS).map((p) => ({
      abs: p,
      rel: p.slice(QUESTIONS.length + 1).split("\\").join("/"),
    }));
const leftover = finalFiles.filter((f) => f.rel.length > PATH_LIMIT);
console.log(`[verify] 残留超长路径: ${leftover.length}`);
if (!DRY_RUN && leftover.length > 0) {
  for (const f of leftover) console.log(`  仍超长: ${f.rel} (${f.rel.length})`);
  process.exit(1);
}
const maxLen = Math.max(...finalFiles.map((f) => f.rel.length));
console.log(`[verify] 改后 questions/ 最长相对路径: ${maxLen}(红线 225,含解压根仍安全)`);
console.log(DRY_RUN ? "[done] dry-run 结束,未落盘" : "[done] 完成");
