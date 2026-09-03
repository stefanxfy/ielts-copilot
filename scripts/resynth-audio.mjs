#!/usr/bin/env node
/**
 * scripts/resynth-audio.mjs — 词书音频批量重合成（换音色用）
 *
 * 用途：edge-tts 音色升级/用户在导入界面改选音色后，对已有词书重新合成
 * 单词 + 例句 mp3。文件名与管线约定一致（/audio/words/<word>.mp3、
 * /audio/sentences/<word>_<idx>.mp3），路径不变 → contentJson 无需回写，
 * 直接覆盖文件即可。
 *
 * 与 import-vocab-pipeline.mjs 的区别：
 * - 不抓百词斩、不写库（纯音频再生）
 * - 无幂等跳过：已存在的 mp3 一律覆盖（管线 synth() 会跳过已有文件）
 * - 词源：--book=<book_id> 从 DB 读，或 --seed=<txt> 从种子文件读
 *
 * 用法：
 *   node scripts/resynth-audio.mjs                          # 默认 ielts-core-pilot 全量
 *   node scripts/resynth-audio.mjs --voice-word=... --voice-sent=...
 *   node scripts/resynth-audio.mjs --seed=./seeds/xxx.txt --limit=20
 *
 * 音色默认(2026-09-03 试音定稿)：单词=en-US-AndrewMultilingualNeural,
 * 例句=en-US-EmmaMultilingualNeural + rate=-8%。
 */

import Database from "better-sqlite3";
import { spawn } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";

// ===== CLI =====
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  }),
);
const BOOK_ID = args.book ?? "ielts-core-pilot";
const SEED = args.seed;
const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity;
const VOICE_WORD = args["voice-word"] ?? "en-US-AndrewMultilingualNeural";
const VOICE_SENT = args["voice-sent"] ?? "en-US-EmmaMultilingualNeural";
const SENT_RATE = "--rate=-8%";
const CONCURRENCY = args.concurrency ? parseInt(args.concurrency, 10) : 4;

const log = (...a) => console.log("[resynth]", ...a);
log(`词源=${SEED ?? `book:${BOOK_ID}`} 单词音色=${VOICE_WORD} 例句音色=${VOICE_SENT}(-8%)`);

// ===== 词列表 =====
let wordList;
if (SEED) {
  const raw = await readFile(SEED, "utf8");
  wordList = raw
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith("#"))
    .slice(0, LIMIT);
} else {
  const sqlite = new Database("./data/app.db");
  wordList = sqlite
    .prepare(
      `SELECT w.word FROM words w
       JOIN book_word_relation bwr ON bwr.word_id = w.id
       JOIN word_books wb ON wb.id = bwr.book_id
       WHERE wb.book_id = ? ORDER BY bwr."order"`,
    )
    .all(BOOK_ID)
    .map((r) => r.word);
}
wordList = wordList.slice(0, LIMIT);
log(`待处理 ${wordList.length} 词`);

// ===== 例句文本：从 DB contentJson 读（seed/book 两种词源都查）=====
const sqlite = new Database("./data/app.db");
const jobs = []; // {kind, word, idx, text, outPath}
const stmt = sqlite.prepare("SELECT content_json FROM words WHERE word = ?");
for (const w of wordList) {
  let examples = [];
  const row = stmt.get(w);
  const c = row ? JSON.parse(row.content_json || "{}") : {};
  examples = c.examples || [];
  jobs.push({
    kind: "word",
    word: w,
    text: w,
    outPath: join("./public/audio/words", `${w}.mp3`),
  });
  examples.forEach((ex, idx) => {
    if (ex.en)
      jobs.push({
        kind: "sent",
        word: w,
        idx,
        text: ex.en,
        outPath: join("./public/audio/sentences", `${w}_${idx}.mp3`),
      });
  });
}
log(
  `任务 ${jobs.length} (单词=${jobs.filter((j) => j.kind === "word").length} 例句=${jobs.filter((j) => j.kind === "sent").length})`,
);

// ===== 覆盖说明：不预删旧文件 =====
// edge-tts --write-media 对已存在文件直接覆盖写，无需先 rm。
// （沙箱环境的批量删除守卫会拦截脚本内 rm，且预删+失败重试窗口里会出现文件缺失态。）
await mkdir("./public/audio/words", { recursive: true });
await mkdir("./public/audio/sentences", { recursive: true });

// ===== 合成（重试 + 退避，同管线）=====
const PY = "/Users/fanyunxu/.workbuddy/binaries/python/envs/default/bin/python3";
async function synth(text, outPath, voice, extraArgs, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const ok = await new Promise((resolve) => {
      const child = spawn(
        PY,
        ["-m", "edge_tts", "--voice", voice, ...extraArgs, "--text", text, "--write-media", outPath],
        { stdio: ["ignore", "pipe", "pipe"] },
      );
      let stderr = "";
      child.stderr.on("data", (d) => (stderr += d.toString()));
      child.on("exit", (code) => resolve(code === 0 && existsSync(outPath) ? true : stderr));
    });
    if (ok === true) return true;
    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, 800 * attempt + Math.random() * 500));
    } else {
      log(`  FAIL ${outPath}: ${String(ok).slice(0, 80)}`);
      return false;
    }
  }
}

let cursor = 0, okCount = 0, failCount = 0;
async function worker() {
  while (cursor < jobs.length) {
    const j = jobs[cursor++];
    const voice = j.kind === "word" ? VOICE_WORD : VOICE_SENT;
    const extra = j.kind === "sent" ? [SENT_RATE] : [];
    const ok = await synth(j.text, j.outPath, voice, extra);
    ok ? okCount++ : failCount++;
    if ((cursor % 20 === 0) || cursor === jobs.length)
      log(`进度 ${cursor}/${jobs.length} (ok=${okCount} fail=${failCount})`);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
log(`完成: ok=${okCount} fail=${failCount}`);
if (failCount > 0) process.exit(1);
