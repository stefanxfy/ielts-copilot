#!/usr/bin/env node
/**
 * normalize-en-punct.mjs — 英文文本域标点归一化
 *
 * 背景:上游(百词斩等)例句用弯撇号 U+2019,而 Noto Sans SC 将
 * U+2018–U+201D 四个引号字符按中文标点风格渲染(全角、字形靠左、右侧留白),
 * 导致 I'm 显示成 I' m(撇号后出现空隙)。
 * 英文域统一归一化为 ASCII 排版字符;中文域(cn/translation/morphSeed)不动。
 *
 * 归一化映射(仅递归处理 contentJson 中键名为 en/phrase/definition 的字符串):
 *   U+2018 U+2019 → '     弯单引号(缩写/所有格)
 *   U+201C U+201D → "     弯双引号(en 域当前 0 处,防 LLM 生成引入)
 *   U+00A0        → 空格   不换行空格
 *   U+00AD        → 删除   软连字符(不可见)
 *   U+02DA        → °     上环符误用(12˚ east → 12° east)
 *   U+FF01 → !  U+FF08 → (  U+FF09 → )
 *   U+FF0C → ,  U+FF1A → :  U+FF1B → ;  U+FF1F → ?   全角标点防引入
 *
 * 保留不动(渲染正常/语义正确):
 *   U+2013 en-dash、U+2014 em-dash、U+2026 省略号(Noto 下宽度正常)
 *   U+00A3 £、U+00E7 ç、U+00E9 é 等合法西文字符
 *
 * 用法:
 *   node scripts/normalize-en-punct.mjs            # dry-run,只出报告
 *   node scripts/normalize-en-punct.mjs --apply    # 备份 app.db 后写库
 *
 * 幂等:重复执行第二遍 changed=0。
 */
import { createRequire } from "node:module";
import { copyFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");

const APPLY = process.argv.includes("--apply");
const DB_PATH = new URL("../data/app.db", import.meta.url).pathname;

// 键名为这些的字符串值视为英文文本域
const EN_KEYS = new Set(["en", "phrase", "definition"]);

const MAP = {
  "\u2018": "'",
  "\u2019": "'",
  "\u201C": '"',
  "\u201D": '"',
  "\u00A0": " ",
  "\u00AD": "",
  "\u02DA": "\u00B0",
  "\uFF01": "!",
  "\uFF08": "(",
  "\uFF09": ")",
  "\uFF0C": ",",
  "\uFF1A": ":",
  "\uFF1B": ";",
  "\uFF1F": "?",
};

/** 返回归一化后的字符串;无变化返回 null(避免无谓写库) */
function normEn(s) {
  let out = "";
  let changed = false;
  for (const ch of s) {
    const m = MAP[ch];
    if (m !== undefined) {
      out += m;
      changed = true;
    } else {
      out += ch;
    }
  }
  return changed ? out : null;
}

/** 递归遍历 contentJson,原位替换 EN_KEYS 键的值;返回该词的命中清单 */
function walk(node, hits) {
  if (Array.isArray(node)) {
    for (const n of node) walk(n, hits);
    return;
  }
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      if (typeof v === "string" && EN_KEYS.has(k)) {
        const n = normEn(v);
        if (n !== null) {
          hits.push({ key: k, from: v, to: n });
          node[k] = n;
        }
      } else if (v && typeof v === "object") {
        walk(v, hits);
      }
    }
  }
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

  const update = APPLY
    ? db.prepare("UPDATE words SET content_json = ?, updated_at = unixepoch() WHERE id = ?")
    : null;

  const tx = APPLY
    ? db.transaction(() => {
        for (const r of rows) {
          if (!r.content_json) continue;
          const cj = JSON.parse(r.content_json);
          const hits = [];
          walk(cj, hits);
          if (hits.length === 0) continue;
          changedWords++;
          changedFields += hits.length;
          for (const h of hits) {
            for (const ch of h.from) {
              if (MAP[ch] !== undefined) {
                const label = "U+" + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0");
                charTally[label] = (charTally[label] || 0) + 1;
              }
            }
            if (samples.length < 8) samples.push(`${r.word} [${h.key}] ${JSON.stringify(h.from).slice(0, 70)} → ${JSON.stringify(h.to).slice(0, 70)}`);
          }
          update.run(JSON.stringify(cj), r.id);
        }
      })
    : null;

  if (APPLY) {
    tx();
  } else {
    for (const r of rows) {
      if (!r.content_json) continue;
      const cj = JSON.parse(r.content_json);
      const hits = [];
      walk(cj, hits);
      if (hits.length === 0) continue;
      changedWords++;
      changedFields += hits.length;
      for (const h of hits) {
        for (const ch of h.from) {
          if (MAP[ch] !== undefined) {
            const label = "U+" + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0");
            charTally[label] = (charTally[label] || 0) + 1;
          }
        }
        if (samples.length < 8) samples.push(`${r.word} [${h.key}] ${JSON.stringify(h.from).slice(0, 70)} → ${JSON.stringify(h.to).slice(0, 70)}`);
      }
    }
  }

  console.log(`[norm] 词总数: ${rows.length}`);
  console.log(`[norm] ${APPLY ? "已更新" : "将更新( dry-run )"} 词: ${changedWords} | 字段: ${changedFields}`);
  console.log("[norm] 字符命中统计:", JSON.stringify(charTally, null, 1));
  console.log("[norm] 样例:");
  samples.forEach((s) => console.log("  " + s));

  db.close();
  console.log(`[norm] ${APPLY ? "写库完成" : "dry-run 结束(加 --apply 写库)"}`);
}

main();
