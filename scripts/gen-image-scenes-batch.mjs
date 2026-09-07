#!/usr/bin/env node
/**
 * scripts/gen-image-scenes-batch.mjs — 全量场景脚本分批调度器
 *
 * broker 对单条 Bash 命令有 ~60s SIGTERM 硬限制,本调度器在外层循环每批 25 词
 * 调子脚本,每批 < 50s,跨批次断点续跑(data/image-scenes/ 已存在的不再生成)。
 *
 * 用法: node scripts/gen-image-scenes-batch.mjs [--book=17] [--target=core] [--per-batch=25]
 */
import { execSync } from "node:child_process";
import { readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DB_PATH = join(ROOT, "data", "app.db");
const SCENES_DIR = join(ROOT, "data", "image-scenes");

const argv = process.argv.slice(2);
const argVal = (name) => {
  const eq = argv.find((a) => a.startsWith(`${name}=`));
  if (eq) return eq.split("=")[1];
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : null;
};
const BOOK = argVal("--book") || "17";
const TARGET = argVal("--target") || "core";
const PER_BATCH = parseInt(argVal("--per-batch") || "25", 10);
const MAX_BATCH = parseInt(argVal("--max-batch") || "40", 10); // 兜底,防止无限循环

// 统计未生成的词数
function pendingCount() {
  const db = new Database(DB_PATH, { readonly: true });
  const rows = db.prepare(
    `SELECT w.word, json_extract(w.content_json,'$.collins') AS collins, json_extract(w.content_json,'$.bncRank') AS bnc
     FROM words w JOIN book_word_relation b ON b.word_id = w.id
     WHERE b.book_id = ? AND w.word NOT LIKE '% %' AND json_extract(w.content_json,'$.image') IS NULL`,
  ).all(BOOK);
  db.close();
  const core = rows.filter((r) => {
    const c = parseInt(r.collins || 0);
    const b = parseInt(r.bnc || 0);
    return c >= 3 || (b > 0 && b <= 2000);
  });
  let missing = 0;
  for (const r of core) if (!existsSync(join(SCENES_DIR, `${r.word}.txt`))) missing++;
  return { total: core.length, missing };
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

const { total, missing: initialMissing } = pendingCount();
console.log(`[batch] book${BOOK} 核心词 ${total} | 待生成场景 ${initialMissing} | 每批 ${PER_BATCH} 词`);
if (initialMissing === 0) { console.log("[batch] 无待生成,退出"); process.exit(0); }

let batchNo = 0;
while (batchNo < MAX_BATCH) {
  batchNo++;
  const before = pendingCount().missing;
  if (before === 0) { console.log(`[batch] 全部完成于第 ${batchNo - 1} 批`); break; }
  console.log(`\n[batch] === 第 ${batchNo} 批, 剩余 ${before} 词 ===`);
  try {
    execSync(
      `cd "${ROOT}" && env -u NODE_OPTIONS /Users/fanyunxu/.workbuddy/binaries/node/versions/22.22.2-2/bin/node scripts/gen-image-scenes.mjs --book ${BOOK} --target ${TARGET} --count ${PER_BATCH}`,
      { stdio: "inherit", timeout: 90_000 },
    );
  } catch (e) {
    console.log(`[batch] 本批异常(可能 broker SIGTERM): ${e.message?.slice(0, 100)}`);
  }
  const after = pendingCount().missing;
  console.log(`[batch] 本批减少 ${before - after} 词`);
  if (after >= before) {
    console.log("[batch] 无进展,停止(可能网络问题或 LLM 报错)");
    break;
  }
  await sleep(1500); // 批间温和限速
}
const { missing: finalMissing } = pendingCount();
console.log(`\n[batch] 完成. 剩余待生成 ${finalMissing} 词`);
