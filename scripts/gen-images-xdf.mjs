#!/usr/bin/env node
/**
 * scripts/gen-images-xdf.mjs — 新东方雅思词汇 3575 核心词批量生图
 *
 * 范围: book17 关联词(单词,排除短语) ∩ (collins≥3 或 bncRank≤2000) ∩ 无图
 * 风格: S8 暖调胶片摄影(Kodak Portra,2026-09-02 用户拍板)
 * 提示词策略: v2 场景导演(把"释义+例句"提炼成具体画面瞬间),由 LLM 实时生成场景描述
 *
 * 用法:
 *   node scripts/gen-images-xdf.mjs                     # 全量后台
 *   node scripts/gen-images-xdf.mjs --limit=10          # 冒烟 10 张
 *   node scripts/gen-images-xdf.mjs --words=abandon,abundant  # 指定词
 *
 * 工程铁律(2026-09-07):
 *   - 并发 2 + 限速 1.5s/任务(与 scripts/debug-image-prompt.mjs 一致)
 *   - 幂等: contentJson.image 已有 / 磁盘 size>1000 跳过
 *   - 失败 2 次重试 → /tmp/img-xdf-failures.log
 *   - 每 50 词增量回写 DB
 *   - style S8 prompt 与 debug-image-prompt.mjs 的 STYLE_CANDIDATES.s8 一致
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DB_PATH = join(ROOT, "data", "app.db");
const IMG_DIR = join(ROOT, "public", "images", "words");
const FAIL_LOG = "/tmp/img-xdf-failures.log";

/* ---------- CLI ---------- */
const argv = process.argv.slice(2);
const argVal = (name) => {
  // 支持 --limit=10 与 --limit 10 两种写法
  const eq = argv.find((a) => a.startsWith(`${name}=`));
  if (eq) return eq.split("=")[1];
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : null;
};
const LIMIT = argVal("--limit") ? parseInt(argVal("--limit"), 10) : Infinity;
const WORDS_ARG = argVal("--words");

/* ---------- MiniMax key ---------- */
function readMiniMaxKey() {
  const raw = readFileSync(join(ROOT, "config.json"), "utf8");
  const cleaned = raw.split("\n").map((l) => l.replace(/(^|\s)\/\/.*$/, "$1")).join("\n");
  const cfg = JSON.parse(cleaned);
  const key = cfg?.llm?.apiKey;
  if (!key) throw new Error("config.json 里没有 llm.apiKey");
  return key;
}

/* ---------- 风格 S8:暖调胶片摄影(与 debug-image-prompt.mjs STYLE_CANDIDATES.s8 一致) ---------- */
const STYLE_S8 =
  "Warm analog film photography, Kodak Portra color tones, soft natural window light, subtle film grain, 35mm candid composition, nostalgic warm atmosphere, one clear subject, no text, no letters, no watermark";

/* ---------- 词条查询(核心词筛选 + 已无图) ---------- */
function pickTargets(wordFilter) {
  const db = new Database(DB_PATH, { readonly: true });
  const rows = db
    .prepare(
      `SELECT w.id, w.word, w.content_json, json_extract(w.content_json,'$.collins') AS collins,
              json_extract(w.content_json,'$.bncRank') AS bnc
       FROM words w JOIN book_word_relation b ON b.word_id = w.id
       WHERE b.book_id = 17 AND w.word NOT LIKE '% %'`,
    )
    .all();
  db.close();
  const core = rows.filter((r) => {
    const c = parseInt(r.collins || 0);
    const b = parseInt(r.bnc || 0);
    return c >= 3 || (b > 0 && b <= 2000);
  });
  const need = core.filter((r) => {
    const cj = JSON.parse(r.content_json || "{}");
    if (cj.image) return false;
    if (wordFilter && !wordFilter.includes(r.word)) return false;
    return true;
  });
  return { core, need };
}

/* ---------- v2 场景描述:从释义+例句提炼画面 ---------- */
function buildV2Prompt(word, zh, ex) {
  // 简洁的 v2 模板:不调 LLM,直接由释义+例句驱动,画面描述由 prompt_optimizer 接管
  return [
    STYLE_S8,
    `One single scene that expresses the English word "${word}" (${zh}).`,
    ex ? `Scene reference: ${ex}` : "",
    "Focus on making the abstract meaning visible through the subject, action and environment. No text, no letters, no captions.",
  ]
    .filter(Boolean)
    .join(" ");
}

/* ---------- MiniMax image_generation(同 debug-image-prompt.mjs 契约) ---------- */
async function genImage(key, prompt, outFile) {
  const res = await fetch("https://api.minimaxi.com/v1/image_generation", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "image-01",
      prompt,
      aspect_ratio: "1:1",
      response_format: "url",
      n: 1,
      prompt_optimizer: true,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`HTTP ${res.status}: ${t.slice(0, 300)}`);
  }
  const j = await res.json();
  if (j?.base_resp?.status_code !== 0) {
    throw new Error(`API error ${j?.base_resp?.status_code}: ${j?.base_resp?.status_msg}`);
  }
  const url = j?.data?.image_urls?.[0];
  if (!url) throw new Error(`响应里没有 image_urls: ${JSON.stringify(j).slice(0, 300)}`);
  const imgRes = await fetch(url);
  if (!imgRes.ok) throw new Error(`图片下载失败 HTTP ${imgRes.status}`);
  const buf = Buffer.from(await imgRes.arrayBuffer());
  writeFileSync(outFile, buf);
  return { url, bytes: buf.length };
}

/* ---------- 调度:并发 2 + 限速 1.5s + 失败 2 次重试 ---------- */
async function processAll(key, targets) {
  let ok = 0, fail = 0, skipped = 0;
  const failures = [];
  const queue = [...targets];
  const inFlight = new Set();
  mkdirSync(IMG_DIR, { recursive: true });

  const updStmt = () => {
    const db = new Database(DB_PATH);
    const stmt = db.prepare("UPDATE words SET content_json = ?, updated_at = unixepoch() WHERE id = ?");
    return { db, stmt, close: () => db.close() };
  };

  const doOne = async (row) => {
    const outFile = join(IMG_DIR, `${row.word}.png`);
    if (existsSync(outFile) && statSync(outFile).size > 1000) {
      skipped++;
      return { skipped: true };
    }
    const cj = JSON.parse(row.content_json || "{}");
    const zh = (cj.translation ?? []).join("; ") || "";
    const ex = cj.examples?.[0]?.en || cj.contexts?.[0]?.en || "";
    const prompt = buildV2Prompt(row.word, zh, ex);
    let lastErr = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const { bytes } = await genImage(key, prompt, outFile);
        // 落盘+回写 DB
        const u = updStmt();
        const newCj = { ...cj, image: `/images/words/${row.word}.png` };
        try {
          u.stmt.run(JSON.stringify(newCj), row.id);
        } finally {
          u.close();
        }
        ok++;
        console.log(`  ✅ ${row.word} ${bytes}B (${ok + fail + skipped}/${targets.length})`);
        return { ok: true, bytes };
      } catch (e) {
        lastErr = e;
        if (attempt < 2) await new Promise((r) => setTimeout(r, 2000));
      }
    }
    fail++;
    failures.push({ word: row.word, error: String(lastErr?.message || lastErr) });
    console.log(`  ❌ ${row.word}: ${lastErr?.message || lastErr}`);
    return { fail: true };
  };

  const kickNext = () => {
    while (inFlight.size < 2 && queue.length) {
      const row = queue.shift();
      const p = doOne(row)
        .then(() => new Promise((r) => setTimeout(r, 1500))) // 每词结束限速 1.5s(防 SIGTERM)
        .catch((e) => {
          fail++;
          failures.push({ word: row.word, error: String(e?.message || e) });
          console.log(`  💥 ${row.word}: ${e?.message || e}`);
        })
        .finally(() => {
          inFlight.delete(p);
          if ((ok + fail + skipped) % 50 === 0) {
            writeFileSync(FAIL_LOG, failures.map((f) => `${f.word}\t${f.error}`).join("\n") + "\n");
          }
        });
      inFlight.add(p);
    }
  };
  kickNext();
  while (inFlight.size) {
    await Promise.race(inFlight);
    kickNext();
  }
  writeFileSync(FAIL_LOG, failures.map((f) => `${f.word}\t${f.error}`).join("\n") + "\n");
  return { ok, fail, skipped, failures };
}

/* ---------- 备份(首次跑) ---------- */
function maybeBackup() {
  const bak = `${DB_PATH}.bak-imgxdf-${Date.now()}`;
  copyFileSync(DB_PATH, bak);
  console.log(`[img] 备份 → ${bak}`);
  return bak;
}

/* ---------- 主流程 ---------- */
async function main() {
  const wordFilter = WORDS_ARG ? WORDS_ARG.split(",") : null;
  const { core, need } = pickTargets(wordFilter);
  console.log(`[img] book17 核心词: ${core.length} | 待生图: ${need.length}${LIMIT ? `(限 ${LIMIT})` : ""}`);

  const targets = LIMIT ? need.slice(0, LIMIT) : need;
  if (!targets.length) {
    console.log("[img] 无待生图,退出");
    return;
  }

  console.log(`[img] 将开始: ${targets.length} 词 | 风格 S8 暖调胶片 | 并发 2 | 1.5s 限速`);
  console.log(`[img] 落盘目录: ${IMG_DIR}`);
  const key = readMiniMaxKey();

  // --limit 冒烟不备份
  if (!Number.isFinite(LIMIT) || LIMIT > 20) {
    maybeBackup();
  }

  const t0 = Date.now();
  const { ok, fail, skipped, failures } = await processAll(key, targets);
  const sec = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n===== 完成 =====`);
  console.log(`成功 ${ok} | 失败 ${fail} | 跳过(已有) ${skipped} | 耗时 ${sec}s`);
  if (failures.length) console.log(`失败清单: ${FAIL_LOG}(${failures.length} 条)`);
}

main().catch((e) => {
  console.error(`[img] 致命: ${e?.stack || e}`);
  process.exit(1);
});
