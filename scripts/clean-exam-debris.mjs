#!/usr/bin/env node
/**
 * scripts/clean-exam-debris.mjs — 清理静态卷 HTML 中残破 meta 残骸
 *
 * 现象:换皮产物在 </title> 之后残留形如 ` content="xxx"/>` 的裸片段(剥
 * <meta name=... 前缀时的尾巴)。位于 <head> 内的裸文本会把 HTML 解析器踢出
 * head,CSS 加载前这些内容直接裸画 → 进入机考跳转时闪现一屏乱码文本。
 *
 * 处理:删除 </title> 后紧跟的 ` content="..."/>` 连续片段(291 个文件各 1 处,
 * 已全量扫描确认无其他位置)。幂等:清理过的文件内容不变,可重复执行。
 *
 * 用法:
 *   node scripts/clean-exam-debris.mjs --dry   # 只报告不写
 *   node scripts/clean-exam-debris.mjs         # 实际写回
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";

const dry = process.argv.includes("--dry");
const root = "public/exams";

const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name.endsWith(".html")) files.push(p);
  }
})(root);

// 残骸:裸 content 片段(前无 name="..." 属性,紧贴上一标签的收尾 '>' 之后),
// 成簇出现,结尾可能是 /> 或 >。合法 meta 的 content 前必然是 name="..." 引号,
// 不会被误伤(<meta content= 前置写法的前置字符是 'a',同样不匹配)。
const DEBRIS = />([ \n\t]+content="[^"]*"(?:[ \n\t]*\/>|>))+/g;
const cleanup = (src) => src.replace(DEBRIS, ">");

let hit = 0;
let changed = 0;
for (const f of files) {
  const src = readFileSync(f, "utf8");
  const out = cleanup(src);
  if (out !== src) {
    hit++;
    if (!dry) writeFileSync(f, out);
  }
  changed++;
}

console.log(
  `${dry ? "[dry] " : ""}scanned ${changed} html files, cleaned ${hit} file(s)`,
);
