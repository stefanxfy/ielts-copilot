#!/usr/bin/env node
/**
 * normalize-en-punct.mjs — 全库英文文本域标点归一化(存量修补)
 *
 * 链路内归一化已下沉为共享模块 scripts/lib/normalize-en-punct.mjs:
 *   import-xdf-ielts.mjs / import-vocab-pipeline.mjs / backfill-collocations.mjs / gen-mnemonic.mjs
 *   均在写库前调用 walkEnPunct()。本脚本用于存量修补与链路验证(幂等,应报 0)。
 *
 * 背景:上游(百词斩等)例句用弯撇号 U+2019,而 Noto Sans SC 将
 * U+2018–U+201D 四个引号字符按中文标点风格渲染(全角、字形靠左、右侧留白),
 * 导致 I'm 显示成 I' m(撇号后出现空隙)。
 * 英文域统一归一化为 ASCII 排版字符;中文域(cn/translation/morphSeed)不动。
 *
 * v2: 支持 EN_KEYS 键下的字符串数组(修复 definition 数组漏归一化盲区,存量 80 处)。
 *
 * 用法:
 *   node scripts/normalize-en-punct.mjs            # dry-run,只出报告
 *   node scripts/normalize-en-punct.mjs --apply    # 备份 app.db 后写库
 */
import { createRequire } from "node:module";
import { copyFileSync } from "node:fs";
import { walkEnPunct, normEnPunct, EN_KEYS, EN_PUNCT_MAP } from "./lib/normalize-en-punct.mjs";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");

const APPLY = process.argv.includes("--apply");
const DB_PATH = new URL("../data/app.db", import.meta.url).pathname;

/** 找出将被归一化的值(报告用;与共享模块 walkEnPunct 同口径) */
function collectHits(node, key = null, hits = []) {
  if (Array.isArray(node)) {
    for (const el of node) {
      if (typeof el === "string") {
        if (key && normEnPunct(el) !== null) hits.push({ key, from: el, to: normEnPunct(el) });
      } else if (el && typeof el === "object") {
        collectHits(el, key, hits);
      }
    }
    return hits;
  }
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      if (typeof v === "string" && EN_KEYS.has(k)) {
        if (normEnPunct(v) !== null) hits.push({ key: k, from: v, to: normEnPunct(v) });
      } else if (v && typeof v === "object") {
        collectHits(v, EN_KEYS.has(k) ? k : key, hits);
      }
    }
  }
  return hits;
}

function main() {
  if (APPLY) {
    const bak = `${DB_PATH}.bak-normen-${Date.now()}`;
    copyFileSync(DB_PATH, bak);
    console.log(`[norm] 已备份 → ${bak}`);
  }

  const db = new Database(DB_PATH, { readonly: !APPLY });
  const rows = db.prepare("SELECT id, word, content_json FROM words").all();

  let changedWords = 0;
  let changedFields = 0;
  const charTally = {};
  const samples = [];
  const reportHit = (word, h) => {
    changedFields++;
    for (const ch of h.from) {
      if (EN_PUNCT_MAP[ch] !== undefined) {
        const label = "U+" + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0");
        charTally[label] = (charTally[label] || 0) + 1;
      }
    }
    if (samples.length < 8) samples.push(`${word} [${h.key}] ${JSON.stringify(h.from).slice(0, 70)} → ${JSON.stringify(h.to).slice(0, 70)}`);
  };

  const update = APPLY
    ? db.prepare("UPDATE words SET content_json = ?, updated_at = unixepoch() WHERE id = ?")
    : null;

  const processRow = (r) => {
    if (!r.content_json) return;
    const cj = JSON.parse(r.content_json);
    const hits = collectHits(cj);
    if (!hits.length) return;
    changedWords++;
    walkEnPunct(cj); // 就地归一化
    if (APPLY) update.run(JSON.stringify(cj), r.id);
    hits.forEach((h) => reportHit(r.word, h));
  };

  if (APPLY) db.transaction(() => rows.forEach(processRow))();
  else rows.forEach(processRow);

  console.log(`[norm] 词总数: ${rows.length}`);
  console.log(`[norm] ${APPLY ? "已更新" : "将更新( dry-run )"} 词: ${changedWords} | 字段: ${changedFields}`);
  console.log("[norm] 字符命中统计:", JSON.stringify(charTally, null, 1));
  console.log("[norm] 样例:");
  samples.forEach((s) => console.log("  " + s));

  db.close();
  console.log(`[norm] ${APPLY ? "写库完成" : "dry-run 结束(加 --apply 写库)"}`);
}

main();
