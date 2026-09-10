/**
 * 一次性修复(2026-09-10):剥离卷面 img 标签里指向原站的 onerror 回源兜底
 *   onerror="this.onerror=null;this.src='/sites/default/files/...'"
 *
 * 背景:onerror 兜底是抓取侧既有设计(本地 img 缺失时回源)。实测存量 121 处
 * 兜底对应的本地 img/ 文件全部存在(>1KB),兜底永不触发,属原站元素残留(铁律③)。
 * 用户要求产物图片全本地化 → 图片已在本地,剥离兜底链即达成。
 *
 * 安全性:仅当该 img 的本地 src 图存在且 >1KB 才剥离;否则保留兜底并警告。
 * 管线侧 transformPage 已同步补剥离规则(import-iot-paper.mjs),本脚本清存量。
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EXAMS = join(ROOT, "public", "exams");
const RE_TAG = /<img\b[^>]*>/gi;
const RE_ONERROR = /\sonerror="[^"]*this\.src='\/sites\/default\/files\/[^']*'"/i;

let stripped = 0;
const kept = [];
const targets = [];

(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const fp = join(dir, name);
    if (statSync(fp).isDirectory()) walk(fp);
    else if (name.endsWith(".html")) {
      const html = readFileSync(fp, "utf8");
      let out = html.replace(RE_TAG, (tag) => {
        const m = tag.match(RE_ONERROR);
        if (!m) return tag;
        // 断言本地 src 图存在(>1KB)才允许剥离
        const src = tag.match(/\bsrc="(img\/[^"]+)"/i)?.[1];
        const local = src ? join(dirname(fp), src) : null;
        if (!local || !statSync(local).isFile() || statSync(local).size <= 1000) {
          kept.push(`${fp.replace(EXAMS + "/", "")} src=${src ?? "?"}(本地缺失,保留兜底)`);
          return tag;
        }
        stripped++;
        return tag.replace(RE_ONERROR, "");
      });
      if (out !== html) {
        writeFileSync(fp, out);
        targets.push(fp.replace(EXAMS + "/", ""));
      }
    }
  }
})(EXAMS);

// 复核:全树 0 残留
let residue = 0;
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const fp = join(dir, name);
    if (statSync(fp).isDirectory()) walk(fp);
    else if (name.endsWith(".html") && RE_ONERROR.test(readFileSync(fp, "utf8"))) {
      residue++;
      console.error("RESIDUE:", fp);
    }
  }
})(EXAMS);

console.log(`\nfiles=${targets.length}, stripped=${stripped}, kept=${kept.length}, residue=${residue}`);
if (kept.length) for (const k of kept) console.log("  [kept] " + k);
if (residue !== 0) process.exit(1);
console.log("PASS");
