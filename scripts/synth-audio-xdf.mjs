#!/usr/bin/env node
/**
 * scripts/synth-audio-xdf.mjs — P2 TTS 音频合成(单词 + contexts 例句)
 *
 * 范围:
 *  - 单词: contentJson.audio.word 缺失 → 合成 → public/audio/words/{safe}.mp3
 *  - 例句: contexts[] 缺 audio → 合成 → public/audio/contexts/{safe}_{i}.mp3
 *          (examples[0].en 与 contexts[k].en 同句时复用同一文件回写)
 *
 * 音色(2026-09-03 试音定稿 / 2026-09-06 降速决策):
 *  - 单词 en-US-AndrewMultilingualNeural --rate=-8%
 *  - 例句 en-US-EmmaMultilingualNeural   --rate=-8%
 *
 * 幂等:文件已存在(>1KB)跳过合成;DB 已有 audio 路径不重跑。失败可重跑本脚本续传。
 * 增量回写:每 100 个 job 完成即 flush DB,中途崩溃不丢进度。
 * 失败清单: /tmp/tts-xdf-failures.log (重跑本脚本即自动补失败项)
 *
 * 用法:
 *  node scripts/synth-audio-xdf.mjs                       # 默认 book17
 *  node scripts/synth-audio-xdf.mjs --book=ielts-luan-3427  # 换词书
 *  node scripts/synth-audio-xdf.mjs --limit=5              # 冒烟:前 5 词
 */
import Database from "better-sqlite3";
import { spawn } from "node:child_process";
import { existsSync, statSync, mkdirSync, appendFileSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

// ===== CLI =====
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  }),
);
const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity;
const BOOK_ID = args.book ?? "ielts-xdf-3575"; // 默认 book17,luan 用 --book=ielts-luan-3427
// ===== 常量(与 import-vocab-pipeline.mjs 对齐) =====
const VOICE_WORD = "en-US-AndrewMultilingualNeural";
const VOICE_SENT = "en-US-EmmaMultilingualNeural";
const RATE = "--rate=-8%";
const PY = "/Users/fanyunxu/.workbuddy/binaries/python/envs/default/bin/python3";
const AUDIO_WORDS_DIR = "./public/audio/words";
const AUDIO_CTX_DIR = "./public/audio/contexts";
const FAIL_LOG = "/tmp/tts-xdf-failures.log";
const CONCURRENCY = 4;
const FLUSH_EVERY = 100;

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), "[tts]", ...a);

function safeFilename(word) {
  return word.replace(/[\/\\:*?"<>|\s]/g, "_");
}

// ===== DB =====
const db = new Database("./data/app.db");
db.pragma("journal_mode = WAL");

// 词书名动态查(支持多词书 P2,2026-09-08 加 book 参数)
const book = db.prepare("SELECT id, name FROM word_books WHERE book_id = ?").get(BOOK_ID);
if (!book) {
  console.error(`✗ 词书不存在: ${BOOK_ID}`);
  process.exit(1);
}
const BOOK_NAME = book.name;
log(`book_id=${BOOK_ID}  name=${BOOK_NAME}`);

const getWord = db.prepare("SELECT id, word, content_json FROM words WHERE id = ?");
const rows = db
  .prepare(
    `SELECT w.id, w.word, w.content_json FROM words w
     JOIN book_word_relation b ON b.word_id = w.id
     JOIN word_books bk ON bk.id = b.book_id
     WHERE bk.name = ? ORDER BY b."order"`,
  )
  .all(BOOK_NAME);
log(`${BOOK_NAME} 词: ${rows.length}`);

// ===== 组装任务 =====
const jobs = []; // {wordId, word, kind:'word'|'ctx', ctxIdx?, text, outPath, relPath, voice}
for (const r of rows.slice(0, LIMIT)) {
  const cj = JSON.parse(r.content_json || "{}");
  if (!cj.audio?.word) {
    const safe = safeFilename(r.word);
    jobs.push({
      wordId: r.id,
      word: r.word,
      kind: "word",
      text: r.word,
      outPath: join(AUDIO_WORDS_DIR, `${safe}.mp3`),
      relPath: `/audio/words/${safe}.mp3`,
      voice: VOICE_WORD,
    });
  }
  (cj.contexts || []).forEach((c, i) => {
    if (c.en && !c.audio) {
      const safe = safeFilename(r.word);
      jobs.push({
        wordId: r.id,
        word: r.word,
        kind: "ctx",
        ctxIdx: i,
        text: c.en,
        outPath: join(AUDIO_CTX_DIR, `${safe}_${i}.mp3`),
        relPath: `/audio/contexts/${safe}_${i}.mp3`,
        voice: VOICE_SENT,
      });
    }
  });
}
const wordJobs = jobs.filter((j) => j.kind === "word").length;
const ctxJobs = jobs.length - wordJobs;
log(`待合成: ${jobs.length} (单词=${wordJobs} 例句=${ctxJobs})`);
if (jobs.length === 0) {
  log("无待合成任务,退出");
  process.exit(0);
}

// ===== 合成(edge-tts 子进程,重试 3 次+退避) =====
async function synth(job) {
  mkdirSync(dirname(job.outPath), { recursive: true });
  if (existsSync(job.outPath) && statSync(job.outPath).size > 1000) return { ok: true, skipped: true };
  for (let attempt = 1; attempt <= 3; attempt++) {
    const ok = await new Promise((resolve) => {
      const child = spawn(
        PY,
        ["-m", "edge_tts", "--voice", job.voice, RATE, "--text", job.text, "--write-media", job.outPath],
        { stdio: ["ignore", "pipe", "pipe"] },
      );
      child.on("exit", (code) => resolve(code === 0 && existsSync(job.outPath) && statSync(job.outPath).size > 1000));
      child.on("error", () => resolve(false));
    });
    if (ok) return { ok: true };
    if (attempt < 3) await new Promise((r) => setTimeout(r, 800 * attempt + Math.random() * 500));
  }
  return { ok: false };
}

// ===== 执行 + 增量回写 =====
let cursor = 0;
let okCount = 0, failCount = 0, done = 0;
const touched = new Map(); // wordId -> true
const t0 = Date.now();

async function flush() {
  if (touched.size === 0) return;
  const tx = db.transaction((ids) => {
    for (const id of ids) {
      const row = getWord.get(id);
      if (!row) continue;
      const cj = JSON.parse(row.content_json || "{}");
      const safe = safeFilename(row.word);
      // 铁律:只认 >1KB 的真文件。edge-tts 失败时 spawn 重定向会留下 0 字节壳,
      // 仅 existsSync 会把空文件路径写进 DB → 僵尸记录(UI 显示有音频实则无声)。
      const realMp3 = (p) => existsSync(p) && statSync(p).size > 1000;
      if (!cj.audio?.word && realMp3(join(AUDIO_WORDS_DIR, `${safe}.mp3`))) {
        cj.audio = { ...(cj.audio || {}), word: `/audio/words/${safe}.mp3` };
      }
      (cj.contexts || []).forEach((c, i) => {
        const p = join(AUDIO_CTX_DIR, `${safe}_${i}.mp3`);
        if (c.en && !c.audio && realMp3(p)) c.audio = `/audio/contexts/${safe}_${i}.mp3`;
      });
      // examples[0] 与 contexts 同句复用同一文件
      if (cj.examples?.length && !cj.examples[0].audio) {
        const ex0 = cj.examples[0];
        const hit = (cj.contexts || []).find((c) => c.audio && c.en === ex0.en);
        if (hit) ex0.audio = hit.audio;
      }
      db.prepare("UPDATE words SET content_json = ?, updated_at = unixepoch() WHERE id = ?").run(
        JSON.stringify(cj),
        id,
      );
    }
  });
  tx([...touched.keys()]);
  touched.clear();
}

async function worker() {
  while (cursor < jobs.length) {
    const job = jobs[cursor++];
    const r = await synth(job);
    done++;
    if (r.ok) {
      okCount++;
      touched.set(job.wordId, true);
    } else {
      failCount++;
      appendFileSync(FAIL_LOG, `${job.kind}\t${job.word}\t${job.ctxIdx ?? ""}\t${job.text.slice(0, 80)}\n`);
    }
    if (done % 50 === 0) {
      const rate = done / ((Date.now() - t0) / 1000);
      const eta = Math.round((jobs.length - done) / rate / 60);
      log(`进度 ${done}/${jobs.length} (ok=${okCount} fail=${failCount}) ${rate.toFixed(1)}/s ETA ${eta}min`);
    }
    if (touched.size >= FLUSH_EVERY) await flush();
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
await flush();
log(`=== DONE === ok=${okCount} fail=${failCount} 耗时 ${Math.round((Date.now() - t0) / 60000)}min`);
if (failCount > 0) log(`失败清单: ${FAIL_LOG}(重跑本脚本自动续传)`);

// ===== 终态核验 =====
const remain = db
  .prepare(
    `SELECT COUNT(*) c FROM words w JOIN book_word_relation b ON b.word_id=w.id
     JOIN word_books bk ON bk.id=b.book_id WHERE bk.name = ? AND w.content_json NOT LIKE '%"/audio/words/%'`,
  )
  .get(BOOK_NAME);
log(`终态: 仍缺单词音频的 ${BOOK_NAME} 词 ≈ ${remain.c}`);
db.close();
