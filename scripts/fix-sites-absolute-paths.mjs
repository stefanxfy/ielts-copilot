/**
 * 一次性修复(2026-09-10):历史卷面残留站方聚合 CSS/JS 绝对路径
 *   "/sites/default/files/css/css_*.css" / "/sites/default/files/js/js_*.js"
 * → "../shared/exam-assets/<同名>"
 *
 * 背景:transformPage 原规则只改写相对路径 exam-assets/,2022-12 ~ 2023 部分卷源页
 * 用绝对路径,整批漏网 → 基础样式 404,卷面布局散架(2022dec-test2-reading 首报)。
 * 管线规则已补(import-iot-paper.mjs transformPage),本脚本修复存量。
 *
 * 安全性:仅做字符串改写,引用的资源先逐一断言存在于 shared/exam-assets,缺失即 exit 1 不落盘。
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "public", "exams");
const SHARED = join(ROOT, "shared", "exam-assets");
const RE = /"\/sites\/default\/files\/(?:css|js)\/([^"]+)"/g;

const have = new Set(readdirSync(SHARED));
const refs = new Set();
const targets = [];

(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const fp = join(dir, name);
    if (statSync(fp).isDirectory()) walk(fp);
    else if (name.endsWith(".html")) {
      const html = readFileSync(fp, "utf8");
      const ms = [...html.matchAll(RE)].map((m) => m[1]);
      if (ms.length) {
        targets.push({ fp, html, count: ms.length });
        ms.forEach((r) => refs.add(r));
      }
    }
  }
})(ROOT);

const missing = [...refs].filter((r) => !have.has(r));
if (missing.length) {
  console.error("FAIL: 共享目录缺资源,拒绝改写:", missing);
  process.exit(1);
}

let changed = 0;
for (const t of targets) {
  const out = t.html.replace(RE, '"../shared/exam-assets/$1"');
  if (out === t.html) {
    console.error("WARN: 匹配到但改写为空?", t.fp);
    continue;
  }
  writeFileSync(t.fp, out);
  changed++;
  console.log(`fixed ${t.count} refs: ${t.fp.replace(ROOT + "/", "")}`);
}

// 改后复核:全树必须 0 残留(仅查目标形态;img onerror 的 /sites/... 回源兜底属既有设计,不算残留)
let residue = 0;
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const fp = join(dir, name);
    if (statSync(fp).isDirectory()) walk(fp);
    else if (name.endsWith(".html") && RE.test(readFileSync(fp, "utf8"))) {
      residue++;
      console.error("RESIDUE:", fp);
    }
  }
})(ROOT);

console.log(`\nchanged=${changed}/${targets.length}, residue=${residue}, assets=${refs.size} all-present`);
if (changed !== targets.length || residue !== 0) process.exit(1);
console.log("PASS");
