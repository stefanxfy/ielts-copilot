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
// --list=<文件>: P1 全库补图用,从词表文件读词清单(一行一词),绕开 book17 核心词筛选
const LIST_ARG = argVal("--list");
const PREFIX = argv.includes("--prefix") ? argVal("--prefix") : ""; // 子目录前缀, 避免覆盖主图
const NO_WRITE_DB = argv.includes("--no-write-db"); // 只落盘不写库(对照实验用)
const IMG_DIR = PREFIX
  ? join(ROOT, "public", "images", "words", PREFIX)
  : join(ROOT, "public", "images", "words");

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

/* ---------- 风格 S1:暖色扁平插画(与 debug-image-prompt.mjs STYLE_CANDIDATES.s1 一致)---------- */
const STYLE_S1 =
  "Warm flat illustration, soft pastel colors, clean minimal composition, single central scene, no text, no letters, children's picture-book style";

/* ---------- 词条查询 ---------- */
function pickTargets(wordFilter) {
  const db = new Database(DB_PATH, { readonly: true });
  // --list 模式:词表驱动(audit missEligible 清单),无图即目标,不管核心词与否
  if (LIST_ARG) {
    const list = readFileSync(LIST_ARG, "utf8").split("\n").map((s) => s.trim()).filter(Boolean);
    const chunks = [];
    for (let i = 0; i < list.length; i += 400) chunks.push(list.slice(i, i + 400));
    const rows = [];
    for (const chunk of chunks) {
      const r = db.prepare(
        `SELECT w.id, w.word, w.content_json FROM words w WHERE w.word IN (${chunk.map(() => "?").join(",")})`,
      ).all(...chunk);
      rows.push(...r);
    }
    db.close();
    const order = new Map(list.map((w, i) => [w, i]));
    const sorted = rows.sort((a, b) => (order.get(a.word) ?? 1e9) - (order.get(b.word) ?? 1e9));
    // 幂等由 doOne 的磁盘检查兜底(文件已存在且 >1KB 即 skip);contentJson.image 不再看——
    // 词表本就是 image IS NULL 的词,若用户单独回写过 DB,磁盘有图也会被 doOne 跳过
    return { core: sorted, need: sorted };
  }
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
    if (wordFilter && !wordFilter.includes(r.word)) return false;
    // wordFilter 模式:用户明确指定,不跳过已有图
    if (wordFilter) return true;
    const cj = JSON.parse(r.content_json || "{}");
    if (cj.image) return false;
    return true;
  });
  return { core, need };
}

/* ---------- v2/v3 场景:有 LLM 场景脚本则用 v3,无则回退 v2 ---------- */
// 内容过滤改写:MiniMax 对部分词(polic* 等)返回 status 0 但 failed_count:1 空响应,
// 原样重试永远失败——替换敏感词后重试(2026-09-12 AB 测试实锤)
const FILTER_REWRITES = [
  [/police officers?/gi, "security guards"],
  [/policemen?/gi, "security guards"],
  [/police/gi, "security"],
  [/handcuff/gi, "ribbon"],
  [/blood/gi, "red ink"],
  [/weapon|gun|rifle/gi, "tool"],
];
function applyFilterRewrites(body) {
  let out = body, changed = false;
  for (const [re, to] of FILTER_REWRITES) {
    if (re.test(out)) { out = out.replace(re, to); changed = true; }
  }
  return changed ? out : null; // null = 无敏感词,失败另有原因
}

function loadScene(word) {
  const f = join(ROOT, "data", "image-scenes", `${word}.txt`);
  if (!existsSync(f)) return { mode: null, body: null };
  const c = readFileSync(f, "utf8").trim();
  if (!c || c === "SKIP" || c.startsWith("ERROR")) return { mode: "SKIP", body: null };
  // 解析 [PHOTO]/[ILLUSTRATION] 标记
  const m = c.match(/^\[(PHOTO|ILLUSTRATION)\]\s*([\s\S]*)/i);
  if (m) return { mode: m[1].toUpperCase(), body: m[2].trim() };
  // 旧格式(无标记): 默认 PHOTO
  return { mode: "PHOTO", body: c };
}
function buildPrompt(word, zh, ex, scene) {
  if (scene.mode === "SKIP") return null; // 上层判 null 跳过该词
  if (scene.body) {
    // v3: 用 LLM 预生的具体场景画面, 走 GLM 决定的风格
    const style = scene.mode === "ILLUSTRATION" ? STYLE_S1 : STYLE_S8;
    return [
      style,
      `Scene: ${scene.body}`,
      "No text, no letters, no captions, no watermarks.",
    ].join(" ");
  }
  // v2 回退: 词+释义+例句原样拼装, prompt_optimizer 自由发挥(准确率 30%)
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
    // 裸 ?: SQLite 会把字符串参数包成 JSON string;不能用 json(?)——那会把参数当 JSON 文档解析,
    // 路径字符串直接报 malformed JSON(2026-09-11 P1 冒烟实测,9 张图全没回写就是这个根因)
    const stmt = db.prepare(
      "UPDATE words SET content_json = json_set(COALESCE(content_json,'{}'), '$.image', ?), updated_at = unixepoch() WHERE id = ?",
    );
    return { db, stmt, close: () => db.close() };
  };

  const doOne = async (row) => {
    const outFile = join(IMG_DIR, `${row.word}.png`);
    if (existsSync(outFile) && statSync(outFile).size > 1000) {
      skipped++;
      // 幂等补写:文件在而 contentJson.image 为空 → 补回写(修复历史 json(?) bug 造成的盘有图库无路径)
      if (!NO_WRITE_DB) {
        const cj = JSON.parse(row.content_json || "{}");
        const imagePath = `/images/words/${PREFIX ? PREFIX + "/" : ""}${row.word}.png`;
        if (cj.image !== imagePath) {
          const u = updStmt();
          try {
            u.stmt.run(imagePath, row.id);
          } finally {
            u.close();
          }
          console.log(`  ↻ ${row.word} 补回写 image 字段`);
        }
      }
      return { skipped: true };
    }
    const cj = JSON.parse(row.content_json || "{}");
    const zh = (cj.translation ?? []).join("; ") || "";
    const ex = cj.examples?.[0]?.en || cj.contexts?.[0]?.en || "";
    const scene = loadScene(row.word);
    // SKIP 词直接跳过(场景脚本明确返 SKIP, 不画图)
    if (scene.mode === "SKIP") {
      skipped++;
      console.log(`  ↷ ${row.word} SKIP(脚本判定不可画), 跳过`);
      return { skipped: true };
    }
    // 预防性内容过滤改写:场景含敏感词直接替换,不浪费首次调用
    if (scene.body) {
      const rewritten = applyFilterRewrites(scene.body);
      if (rewritten) {
        scene.body = rewritten;
        console.log(`  ✎ ${row.word} 场景含敏感词,已预防改写`);
      }
    }
    let prompt = buildPrompt(row.word, zh, ex, scene);
    let lastErr = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const { bytes } = await genImage(key, prompt, outFile);
        // 落盘+回写 DB(--no-write-db 时跳过)
        if (NO_WRITE_DB) {
          ok++;
          console.log(`  ✅ ${row.word} ${bytes}B (${ok + fail + skipped}/${targets.length}) [no-db]`);
          return { ok: true, bytes };
        }
        const u = updStmt();
        // 回写路径必须与落盘目录一致(含 PREFIX),否则展示层断链
        // 原子回写:SQL 层 json_set 只动 image 键,防与 gen-mnemonic 等脚本并发互覆盖丢字段
        const imagePath = `/images/words/${PREFIX ? PREFIX + "/" : ""}${row.word}.png`;
        try {
          u.stmt.run(imagePath, row.id);
        } finally {
          u.close();
        }
        ok++;
        console.log(`  ✅ ${row.word} ${bytes}B (${ok + fail + skipped}/${targets.length})`);
        return { ok: true, bytes };
      } catch (e) {
        lastErr = e;
        // 空响应型失败(status 0 但 failed_count:1)= 内容过滤,改写场景后重试
        if (/响应里没有 image_urls/.test(String(lastErr?.message)) && scene.body) {
          const rewritten = applyFilterRewrites(scene.body);
          if (rewritten) {
            scene.body = rewritten;
            prompt = buildPrompt(row.word, zh, ex, scene);
            console.log(`  ✎ ${row.word} 疑似内容过滤,改写场景重试`);
          }
        }
        if (attempt < 3) await new Promise((r) => setTimeout(r, 2000));
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
  const coreDesc = LIST_ARG ? "list 模式(词表驱动)" : `book17 核心词: ${core.length}`;
  console.log(`[img] ${coreDesc} | 待生图: ${need.length}${LIMIT ? `(限 ${LIMIT})` : ""}`);

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
