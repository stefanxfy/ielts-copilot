#!/usr/bin/env node
/**
 * scripts/import-vocab-pipeline.mjs — 背单词素材导入管线(P8 垂直切片版)
 *
 * 流程:
 *  1. 读 data/seed/ielts-100.txt(每行一个词)
 *  2. 逐词 GET jsdelivr 百词斩 JSON(超时+重试+失败跳过)
 *  3. 解析 → 写 words 表(contentJson 包含 translation/definition/examples/phoneticUk/exchange)
 *  4. 建 word_books 行(bookId="ielts-core-pilot")
 *  5. 建 book_word_relation 行,order 按种子文件顺序
 *  6. 调 edge-tts 子进程合成单词+例句音频落 public/audio/words/ 与 public/audio/sentences/
 *  7. 音频落盘后回写 contentJson.audio.word / examples[].audio
 *
 * 幂等:已存在的 word 跳过主内容写入;bookId 重复导入会清旧 bwr 重挂。
 *
 * 用法:
 *  node scripts/import-vocab-pipeline.mjs                          # 默认跑 ielts-100
 *  node scripts/import-vocab-pipeline.mjs --limit=20              # 前 20 词
 *  node scripts/import-vocab-pipeline.mjs --seed=path/to/list.txt
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq, sql, inArray } from "drizzle-orm";
import { wordBooks, words, bookWordRelation } from "../src/db/schema.ts";
import { spawn } from "node:child_process";
import { mkdir, writeFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";

// ===== CLI =====
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  }),
);
const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity;
const SEED = args.seed ?? "./seeds/ielts-100.txt";
const BOOK_ID = "ielts-core-pilot";
const BCZ_BASE = "https://cdn.jsdelivr.net/gh/lyc8503/baicizhan-word-meaning-API/data/words/";
// 音色策略(2026-09-03 用户试音定稿):单词=Andrew(节奏最佳男声),例句=Emma(女声韵律最佳)。
// Multilingual 系韵律显著优于经典 Neural 系(停顿/连读/语调接近真人)。
// CLI 可覆盖: --voice-word= --voice-sent= ;例句统一 --rate=-8% 稍慢,停顿感更明显。
const VOICE_WORD = args["voice-word"] ?? "en-US-AndrewMultilingualNeural";
const VOICE_SENT = args["voice-sent"] ?? "en-US-EmmaMultilingualNeural";
const SENT_RATE = "--rate=-8%";

// ===== DB =====
const sqlite = new Database("./data/app.db");
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite, { schema: { wordBooks, words, bookWordRelation } });

// ===== helpers =====
const log = (...a) => console.log("[import]", ...a);

function safeFilename(word) {
  return word.replace(/[\/\\:*?"<>|\s]/g, "_");
}

async function fetchWithRetry(url, attempts = 3) {
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (res.ok) return await res.json();
      if (res.status === 404) return null;
    } catch (e) {
      log(`  attempt ${i}/${attempts} failed: ${e.message}`);
    }
    if (i < attempts) await new Promise((r) => setTimeout(r, 500 * i));
  }
  return null;
}

/**
 * 调 edge-tts (Python CLI) 合成音频,落 mp3。
 * 用 managed venv 下的 edge-tts(pip 装在 default env,免污染系统)。
 * 失败重试 3 次 + 退避(speech.platform.bing.com 偶发 SSL reset)。
 * extraArgs: 例句传 [SENT_RATE] 实现稍慢语速。
 */
async function synth(text, outPath, voice, extraArgs = [], retries = 3) {
  await mkdir(dirname(outPath), { recursive: true });
  if (existsSync(outPath) && (await import("node:fs/promises")).stat) {
    const stat = await (await import("node:fs/promises")).stat(outPath).catch(() => null);
    if (stat && stat.size > 1000) return { ok: true, skipped: true };
  }
  const py = "/Users/fanyunxu/.workbuddy/binaries/python/envs/default/bin/python3";
  for (let attempt = 1; attempt <= retries; attempt++) {
    const result = await new Promise((resolve) => {
      const child = spawn(
        py,
        ["-m", "edge_tts", "--voice", voice, ...extraArgs, "--text", text, "--write-media", outPath],
        { stdio: ["ignore", "pipe", "pipe"] },
      );
      let stderr = "";
      child.stderr.on("data", (d) => (stderr += d.toString()));
      child.on("exit", (code) => {
        resolve({
          ok: code === 0 && existsSync(outPath),
          error: stderr || `exit=${code}`,
        });
      });
    });
    if (result.ok) return { ok: true };
    if (attempt < retries) {
      const backoff = 800 * attempt + Math.random() * 500;
      await new Promise((r) => setTimeout(r, backoff));
    } else {
      return { ok: false, error: result.error };
    }
  }
  return { ok: false, error: "exhausted retries" };
}

// ===== 1. 读种子列表 =====
const seedRaw = await (await import("node:fs/promises")).readFile(SEED, "utf8");
const seedList = seedRaw
  .split("\n")
  .map((s) => s.trim())
  .filter((s) => s && !s.startsWith("#"))
  .slice(0, LIMIT);
log(`seed=${SEED},共 ${seedList.length} 词`);

// ===== 2. 拉百词斩(逐词) =====
log("step 1/3 拉百词斩 join...");
const fetched = new Map(); // word -> {translation, definition, examples, phoneticUk, exchange, sentence_phrase}
let hitCount = 0;
for (let i = 0; i < seedList.length; i++) {
  const w = seedList[i];
  const url = BCZ_BASE + safeFilename(w) + ".json";
  const data = await fetchWithRetry(url, 3);
  if (!data) {
    log(`  [${i + 1}/${seedList.length}] ${w}: 未命中`);
    continue;
  }
  const translation = (data.mean_cn ?? "")
    .split(/[;；]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const definition = data.mean_en ? [data.mean_en] : [];
  const examples = [];
  if (data.sentence) {
    examples.push({ en: data.sentence, cn: data.sentence_trans || undefined });
  }
  fetched.set(w, {
    phoneticUk: data.accent || undefined,
    translation,
    definition,
    examples,
    exchange: data.sentence_phrase || undefined,
  });
  hitCount++;
  if ((i + 1) % 10 === 0) log(`  [${i + 1}/${seedList.length}] 命中 ${hitCount}`);
}
log(`百词斩命中 ${hitCount}/${seedList.length}`);

// ===== 3. upsert words =====
log("step 2/3 入库 words...");
const wordIdByName = new Map();
for (const w of seedList) {
  const data = fetched.get(w) || { translation: [], examples: [] };
  const contentJson = {
    translation: data.translation,
    examples: data.examples,
    ...(data.definition?.length ? { definition: data.definition } : {}),
    ...(data.exchange ? { exchange: data.exchange } : {}),
  };
  // 先查
  const existing = db
    .select({ id: words.id, origin: words.origin, contentJson: words.contentJson })
    .from(words)
    .where(eq(words.word, w))
    .get();
  if (existing) {
    wordIdByName.set(w, existing.id);
    // 不覆盖:仅当现有 contentJson.translation 为空时补全(防百词斩二次拉取丢失手动改的内容)
    if (data.translation.length && (!existing.contentJson.translation || existing.contentJson.translation.length === 0)) {
      db.update(words)
        .set({
          contentJson: { ...existing.contentJson, ...contentJson },
          updatedAt: new Date(),
        })
        .where(eq(words.id, existing.id))
        .run();
    }
  } else {
    const row = db
      .insert(words)
      .values({
        word: w,
        phoneticUk: data.phoneticUk,
        contentJson,
        origin: "baicizhan",
      })
      .returning({ id: words.id })
      .get();
    wordIdByName.set(w, row.id);
  }
}
log(`words 表共 ${db.select({ n: sql`count(*)` }).from(words).get().n} 行`);

// ===== 4. upsert word_book =====
log("step 2.5 建/更新 word_book...");
let book = db.select().from(wordBooks).where(eq(wordBooks.bookId, BOOK_ID)).get();
if (!book) {
  book = db
    .insert(wordBooks)
    .values({
      bookId: BOOK_ID,
      name: "雅思核心 100 词(P8 切片)",
      description: "Pipeline 拉自百词斩 + 自选经典 100 词。",
      source: "builtin",
    })
    .returning()
    .get();
} else {
  db.update(wordBooks)
    .set({ name: "雅思核心 100 词(P8 切片)", updatedAt: new Date() })
    .where(eq(wordBooks.id, book.id))
    .run();
}
// 清旧 bwr 重挂
db.delete(bookWordRelation).where(eq(bookWordRelation.bookId, book.id)).run();

// 挂关联
const bwrRows = seedList
  .map((w, i) => ({ bookId: book.id, wordId: wordIdByName.get(w), order: i }))
  .filter((r) => r.wordId);
for (const r of bwrRows) {
  db.insert(bookWordRelation).values(r).run();
}
log(`book_word_relation 新增 ${bwrRows.length} 行`);

// ===== 5. 合成音频(单词 + 例句,并发度 4) =====
log("step 3/3 合成音频(单词 + 例句, 并发 4)...");
const AUDIO_WORDS_DIR = "./public/audio/words";
const AUDIO_SENTS_DIR = "./public/audio/sentences";
await mkdir(AUDIO_WORDS_DIR, { recursive: true });
await mkdir(AUDIO_SENTS_DIR, { recursive: true });

// 准备待合成任务
const jobs = []; // [{word, id, kind:'word'|'sent', idx?, text, outPath, relPath}]
for (const w of seedList) {
  const id = wordIdByName.get(w);
  if (!id) continue;
  const data = fetched.get(w);
  const existing = db
    .select({ contentJson: words.contentJson })
    .from(words)
    .where(eq(words.id, id))
    .get();
  const content = existing.contentJson;
  if (!content.audio?.word) {
    jobs.push({
      word: w,
      id,
      kind: "word",
      text: w,
      outPath: join(AUDIO_WORDS_DIR, `${w}.mp3`),
      relPath: `/audio/words/${w}.mp3`,
    });
  }
  if (content.examples?.length) {
    for (let idx = 0; idx < content.examples.length; idx++) {
      const ex = content.examples[idx];
      if (!ex.audio) {
        jobs.push({
          word: w,
          id,
          kind: "sent",
          idx,
          text: ex.en,
          outPath: join(AUDIO_SENTS_DIR, `${w}_${idx}.mp3`),
          relPath: `/audio/sentences/${w}_${idx}.mp3`,
        });
      }
    }
  }
}
log(`待合成任务: ${jobs.length} (单词=${jobs.filter((j) => j.kind === "word").length} 例句=${jobs.filter((j) => j.kind === "sent").length})`);

// 并发执行
const CONCURRENCY = 4;
let cursor = 0;
let wordAudioOk = 0, wordAudioFail = 0, sentAudioOk = 0, sentAudioFail = 0;
const touchedIds = new Set(); // 记录哪些 word 需要回写 contentJson

async function worker() {
  while (cursor < jobs.length) {
    const job = jobs[cursor++];
    const r = await synth(
      job.text,
      job.outPath,
      job.kind === "word" ? VOICE_WORD : VOICE_SENT,
      job.kind === "sent" ? [SENT_RATE] : [],
    );
    if (r.ok) {
      if (job.kind === "word") wordAudioOk++;
      else sentAudioOk++;
      touchedIds.add(job.id);
    } else {
      if (job.kind === "word") wordAudioFail++;
      else sentAudioFail++;
      log(`  ${job.kind}音频失败: ${job.word}${job.idx !== undefined ? "/" + job.idx : ""} (${r.error?.slice(0, 80)})`);
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
log(`音频完成: 单词 ok=${wordAudioOk} fail=${wordAudioFail}; 例句 ok=${sentAudioOk} fail=${sentAudioFail}`);

// ===== 6. 回写 contentJson.audio / examples[].audio =====
log("step 3.5 回写 contentJson.audio...");
let backfillOk = 0;
for (const id of touchedIds) {
  const row = db.select().from(words).where(eq(words.id, id)).get();
  if (!row) continue;
  const content = row.contentJson;
  const w = row.word;
  // 单词音频
  if (content.examples?.length) {
    for (let idx = 0; idx < content.examples.length; idx++) {
      const ex = content.examples[idx];
      if (!ex.audio) {
        const p = `/audio/sentences/${w}_${idx}.mp3`;
        if (existsSync(join(".", "public", p))) ex.audio = p;
      }
    }
  }
  if (!content.audio?.word) {
    const p = `/audio/words/${w}.mp3`;
    if (existsSync(join(".", "public", p))) content.audio = { ...(content.audio || {}), word: p };
  }
  db.update(words)
    .set({ contentJson: content, updatedAt: new Date() })
    .where(eq(words.id, id))
    .run();
  backfillOk++;
}
log(`回写完成: ${backfillOk} 词`);

// ===== 收尾 =====
const finalCount = db
  .select({ n: sql`count(*)` })
  .from(bookWordRelation)
  .where(eq(bookWordRelation.bookId, book.id))
  .get();
log(`=== DONE === book=${BOOK_ID} (${finalCount.n} 词)`);
sqlite.close();
