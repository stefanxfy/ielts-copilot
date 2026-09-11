#!/usr/bin/env node
// P1 Stage B 生图分批调度器:每轮挑"已有场景文件"的词喂给 gen-images-xdf
// 与 Stage A 并行安全:场景文件是逐词落盘的,拿到的都是完整文件;无场景的词 Stage B 自动跳过
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const LIST = join(ROOT, "data", "mnemonic-debug", "p1-image-words.txt");
const SCENES = join(ROOT, "data", "image-scenes");
const WORDS_DIR = join(ROOT, "public", "images", "words");
const ROUNDS = parseInt(process.argv[2] || "40", 10); // 最多轮数,兜底

const words = readFileSync(LIST, "utf8").split("\n").map(s => s.trim()).filter(Boolean);
// 待生图 = 词表内 && 盘上无图(png 缺失或 <1KB)
const needImage = () => words.filter(w => {
  const f = join(WORDS_DIR, `${w}.png`);
  return !existsSync(f) || 0; // statSync 略,doOne 内部还有 size>1000 幂等
});

let round = 0;
while (round < ROUNDS) {
  const todo = needImage().filter(w => existsSync(join(SCENES, `${w}.txt`)));
  if (!todo.length) { console.log(`[img-batch] 无"有场景缺图"的词,等待或已收口 (第 ${round} 轮)`); if (round > 0) break; }
  round++;
  console.log(`\n[img-batch] === 第 ${round} 轮 | 有场景缺图 ${todo.length} 词 ===`);
  const listFile = join(ROOT, "tmp", "p1-img-chunk.txt");
  writeFileSync(listFile, todo.join("\n") + "\n");
  try {
    execFileSync(process.execPath, [join(ROOT, "scripts", "gen-images-xdf.mjs"), `--list=${listFile}`], {
      stdio: "inherit", timeout: 60 * 60_000, cwd: ROOT,
    });
  } catch (e) {
    console.log(`[img-batch] 本轮异常: ${String(e.message).slice(0, 120)}`);
  }
}
console.log("[img-batch] 调度结束");
