#!/usr/bin/env node
// P1 全量场景补图分批调度器(仿 gen-image-scenes-batch.mjs)
// 每批 40 词串行循环直到词表全部有场景文件;断点续跑(已有场景文件自动跳过)
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const LIST = join(ROOT, "data", "mnemonic-debug", "p1-image-words.txt");
const SCENES = join(ROOT, "data", "image-scenes");
const PER_BATCH = 40;
const MAX_BATCH = 60; // 1417/40 ≈ 36 批,60 是兜底

const words = readFileSync(LIST, "utf8").split("\n").map(s => s.trim()).filter(Boolean);
const pending = () => words.filter(w => !existsSync(join(SCENES, `${w}.txt`)));

let batch = 0;
while (batch < MAX_BATCH) {
  const before = pending();
  if (!before.length) { console.log(`[p1-batch] 全部完成(共 ${words.length} 词)`); break; }
  batch++;
  console.log(`\n[p1-batch] === 第 ${batch} 批 | 剩余 ${before.length} 词 ===`);
  const slice = before.slice(0, PER_BATCH);
  const listFile = join(ROOT, "tmp", "p1-scene-chunk.txt");
  const { writeFileSync } = await import("node:fs");
  writeFileSync(listFile, slice.join("\n") + "\n");
  try {
    execFileSync(process.execPath, [join(ROOT, "scripts", "gen-image-scenes.mjs"), `--list=${listFile}`], {
      stdio: "inherit", timeout: 8 * 60_000, cwd: ROOT,
    });
  } catch (e) {
    console.log(`[p1-batch] 本批异常: ${String(e.message).slice(0, 120)}`);
  }
  const after = pending();
  console.log(`[p1-batch] 本批完成 ${before.length - after.length} 词`);
  if (after.length >= before.length) { console.log("[p1-batch] 无进展,停止"); break; }
}
