#!/usr/bin/env node
/**
 * scripts/debug-image-prompt.mjs — MiniMax 文生图提示词调试（P8 生图管线前置实验）
 *
 * 目的:在定风格之前,用真实词库内容对比「提示词策略 × 风格前缀」的出图效果,
 *      把图摆在一起看,再和用户讨论定稿。
 *
 * 用法:
 *   node scripts/debug-image-prompt.mjs                                  # 全部组合(增量,已有图跳过)
 *   node scripts/debug-image-prompt.mjs --strategy v2                    # 只跑某提示词策略
 *   node scripts/debug-image-prompt.mjs --styles s3,s4                   # 只跑某些风格
 *   node scripts/debug-image-prompt.mjs --words abundant,isolate         # 只跑某些词
 *   node scripts/debug-image-prompt.mjs --dry                            # 只打印提示词不调 API
 *
 * 产物:tmp/image-debug/<style>-<strategy>/<word>.png + manifest.json(增量合并留档)
 *      + 对比.html(每次非 dry 运行后自动重建)
 * 图片不入 git(tmp/ 已 gitignore);确认效果后把策略固化进正式管线。
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

/* ---------- 读 config.json(带注释,同 src/lib/config.ts 惯例) ---------- */
function readMiniMaxKey() {
  const raw = readFileSync(join(ROOT, "config.json"), "utf8");
  const cleaned = raw
    .split("\n")
    .map((l) => l.replace(/(^|\s)\/\/.*$/, "$1"))
    .join("\n");
  const cfg = JSON.parse(cleaned);
  const key = cfg?.llm?.apiKey;
  if (!key) throw new Error("config.json 里没有 llm.apiKey");
  return key;
}

/* ---------- 从 SQLite 取词的真实内容 ---------- */
function loadWords(words) {
  const D = require("better-sqlite3");
  const db = new D(join(ROOT, "data", "app.db"), { readonly: true });
  const out = [];
  for (const w of words) {
    const row = db.prepare("SELECT word, content_json FROM words WHERE word = ?").get(w);
    if (!row) continue;
    const c = JSON.parse(row.content_json);
    out.push({
      word: row.word,
      zh: Array.isArray(c.translation) ? c.translation.join("; ") : String(c.translation ?? ""),
      def: Array.isArray(c.definition) ? c.definition.join("; ") : String(c.definition ?? ""),
      ex: c.examples?.[0]?.en ?? "",
      root: c.root ?? "",
    });
  }
  db.close();
  return out;
}

/* ---------- 风格候选 ---------- */
const STYLE_CANDIDATES = {
  // S1: 温和插画记忆卡风(贴近百词斩/不背单词类产品的钩子图)
  s1: "Warm flat illustration, soft pastel colors, clean minimal composition, single central scene, no text, no letters, children's picture-book style",
  // S2: 写实摄影记忆卡风(更"真实",贴近成人学习者审美)
  s2: "Photorealistic photography, natural lighting, shallow depth of field, one clear focal subject, editorial magazine quality, no text, no letters, no watermark",
  // S3: 3D 黏土/软渲染风(立体玩偶感,记忆钩子强)
  s3: "Cute 3D clay render style, soft rounded shapes, matte pastel materials, soft studio lighting, playful miniature diorama scene, high detail, no text, no letters",
  // S4: 水彩手绘风(温和文艺)
  s4: "Delicate watercolor painting, hand-drawn ink sketch lines, soft washes of color, warm paper texture background, gentle literary mood, no text, no letters",
  // S5: 极简扁平符号风(符号化最强,信息最纯粹)
  s5: "Minimal flat vector illustration, bold simple geometric shapes, limited warm color palette, strong silhouette, symbolic composition, generous negative space, no text, no letters",
};
const STYLE_LABEL = {
  s1: "S1 暖色扁平插画",
  s2: "S2 写实摄影",
  s3: "S3 3D黏土渲染",
  s4: "S4 水彩手绘",
  s5: "S5 极简扁平符号",
};

/* ---------- 提示词结构策略 ---------- */
const STRATEGIES = {
  // v1: 直译策略 — 词+释义+例句原样丢给模型,靠模型自己理解(对照组)
  v1: {
    label: "v1 直译拼装",
    build(w, style) {
      return [
        style,
        `Illustrate the meaning of the English word "${w.word}".`,
        `Meaning: ${w.zh}. English definition: ${w.def}.`,
        w.ex ? `Example sentence: "${w.ex}"` : "",
        "The image must make the word's meaning instantly recognizable without any text.",
      ]
        .filter(Boolean)
        .join(" ");
    },
  },
  // v2: 场景导演策略 — 把例句提炼成一个具体画面瞬间(主体+动作+环境+情绪)
  v2: {
    label: "v2 场景导演",
    build(w, style) {
      // 人工为测试词写画面脚本(正式管线这一步由 LLM 生成)
      const scenes = {
        abandon:
          "A lone car parked in a vast empty desert, one door left open, no people around, long shadows of dusk — the feeling of leaving something behind forever",
        abundant:
          "A wooden market stall overflowing with piles of fresh oranges and fish, baskets stacked high, morning light — the feeling of more than enough",
        discard:
          "A hand dropping an empty plastic bottle toward a recycling bin, crumpled papers scattered nearby — the decisive moment of throwing something away",
        isolate:
          "A small wooden cabin on a remote snowy field, one tiny window glowing, distant village far away beyond a fence — the feeling of being cut off from others",
        accomplish:
          "A tired runner crossing a finish line at sunrise, arms raised, medal around neck, crowd blurred behind — the moment of finally achieving a hard goal",
      };
      const scene = scenes[w.word] ?? w.ex;
      return [
        style,
        `One single scene that expresses the English word "${w.word}" (${w.zh}).`,
        `Scene: ${scene}.`,
        "Focus on making the abstract meaning visible through the subject, action and environment. No text, no letters, no captions.",
      ].join(" ");
    },
  },
};
const STRAT_DESC = {
  v1: "词+释义+例句原样给模型",
  v2: "例句提炼成具体画面瞬间",
};

/* ---------- MiniMax image_generation 调用 ---------- */
async function genImage(key, prompt, outFile) {
  const res = await fetch("https://api.minimaxi.com/v1/image_generation", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "image-01",
      prompt,
      aspect_ratio: "1:1",
      response_format: "url", // 先拿 URL 再下载落盘,和正式管线行为一致
      n: 1,
      prompt_optimizer: true,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`HTTP ${res.status}: ${t.slice(0, 300)}`);
  }
  const j = await res.json();
  if (j.base_resp?.status_code !== 0) {
    throw new Error(`API error ${j.base_resp?.status_code}: ${j.base_resp?.status_msg}`);
  }
  const url = j?.data?.image_urls?.[0];
  if (!url) throw new Error(`响应里没有 image_urls: ${JSON.stringify(j).slice(0, 300)}`);
  const imgRes = await fetch(url);
  if (!imgRes.ok) throw new Error(`图片下载失败 HTTP ${imgRes.status}`);
  const buf = Buffer.from(await imgRes.arrayBuffer());
  writeFileSync(outFile, buf);
  return { url, bytes: buf.length };
}

/* ---------- 对比页重建(每次非 dry 运行后调用) ---------- */
function buildPage(manifest) {
  const outDir = join(ROOT, "tmp", "image-debug");
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const groups = {};
  for (const it of manifest.items) {
    if (it.file && existsSync(it.file)) (groups[it.id] ??= []).push(it);
  }
  const KNOWN = ["s1-v1", "s1-v2", "s2-v1", "s2-v2", "s3-v2", "s4-v2", "s5-v2"];
  const order = KNOWN.filter((g) => groups[g]).concat(
    Object.keys(groups).filter((g) => !KNOWN.includes(g)),
  );
  const CANON = ["abandon", "abundant", "discard", "isolate", "accomplish"];
  const words = [
    ...CANON,
    ...new Set(manifest.items.filter((i) => i.file).map((i) => i.word)),
  ].filter((w, i, a) => a.indexOf(w) === i);

  const stylePrefix = (p) => esc(p.split(/(?=Illustrate|One single scene)/)[0] || "");
  const shortLabel = (gid) => {
    const [s, v] = gid.split("-");
    return `${(STYLE_LABEL[s] ?? s).replace(/^S\d /, "")}·${v}`;
  };

  let html = `<!DOCTYPE html><html lang="zh"><head><meta charset="UTF-8"><title>文生图提示词调试对比</title><style>
body{font-family:-apple-system,"PingFang SC",sans-serif;background:#f5f1e8;color:#2b2620;margin:0;padding:32px;}
h1{font-size:22px;margin:0 0 6px;}.sub{color:#8a7f6f;font-size:13px;margin-bottom:28px;}
.group{background:#fff;border-radius:14px;padding:22px;margin-bottom:26px;box-shadow:0 1px 4px rgba(60,50,30,.08);}
.gh{display:flex;align-items:baseline;gap:12px;margin-bottom:4px;flex-wrap:wrap;}
.gh h2{font-size:17px;margin:0;}.tag{font-size:11px;background:#efe7d8;color:#7a6a4f;padding:2px 10px;border-radius:99px;}
.gd{font-size:12.5px;color:#8a7f6f;margin:0 0 16px;}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;}
.card{position:relative;border-radius:10px;overflow:hidden;background:#eee;}
.card img{width:100%;aspect-ratio:1;object-fit:cover;display:block;}
.card .w{position:absolute;left:0;right:0;bottom:0;background:linear-gradient(transparent,rgba(0,0,0,.62));color:#fff;padding:18px 8px 6px;font-size:12.5px;font-weight:600;}
.prompt{margin-top:14px;}.prompt summary{cursor:pointer;font-size:12px;color:#a08c5f;user-select:none;}
.prompt pre{font-size:11px;line-height:1.55;background:#faf7f0;border:1px solid #eee4d2;border-radius:8px;padding:10px 12px;white-space:pre-wrap;word-break:break-word;color:#5a5248;margin:8px 0 0;}
h3.wordh{font-size:15px;margin:18px 0 8px;}
</style></head><body><h1>MiniMax 文生图 · 提示词策略 × 风格 对比</h1><div class="sub">词 × 风格 × 提示词策略 · model=image-01 · 1:1 · prompt_optimizer=on · 自动重建于 ${esc(manifest.generatedAt)}</div>`;

  for (const gid of order) {
    const [s, v] = gid.split("-");
    const items = groups[gid];
    html += `<div class="group"><div class="gh"><h2>${esc(STYLE_LABEL[s] ?? s)} × ${esc(STRATEGIES[v]?.label ?? v)}</h2><span class="tag">${esc(STRAT_DESC[v] ?? "")}</span></div><div class="gd">风格前缀: ${stylePrefix(items[0].prompt)}</div><div class="grid">`;
    for (const it of items) {
      const rel = it.file.replace(/^.*tmp\/image-debug\//, "");
      html += `<div class="card"><img src="${rel}" alt="${it.word}"><div class="w">${it.word}</div></div>`;
    }
    html += `</div><details class="prompt"><summary>查看本组 ${items.length} 条提示词</summary>`;
    for (const it of items) html += `<pre>[${it.word}] ${esc(it.prompt)}</pre>`;
    html += `</details></div>`;
  }

  html += `<div class="group"><div class="gh"><h2>同一词 · 跨组横向对照</h2><span class="tag">看哪个组合词义最可读</span></div>`;
  for (const w of words) {
    const rows = order.map((gid) => ({ gid, it: groups[gid]?.find((x) => x.word === w) })).filter((r) => r.it);
    if (!rows.length) continue;
    html += `<h3 class="wordh">${w}</h3><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));">`;
    for (const { gid, it } of rows) {
      const rel = it.file.replace(/^.*tmp\/image-debug\//, "");
      html += `<div class="card"><img src="${rel}" alt="${gid}"><div class="w">${shortLabel(gid)}</div></div>`;
    }
    html += `</div>`;
  }
  html += `</div></body></html>`;
  writeFileSync(join(outDir, "对比.html"), html);
}

/* ---------- 主流程 ---------- */
const argv = process.argv.slice(2);
const dry = argv.includes("--dry");
const argVal = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : null;
};
const strategyArg = argVal("--strategy");
const stylesArg = argVal("--styles");
const wordsArg = argVal("--words");

const ALL_WORDS = ["abandon", "abundant", "discard", "isolate", "accomplish"];
const chosenWords = wordsArg ? wordsArg.split(",") : ALL_WORDS;
const chosenStyles = stylesArg ? stylesArg.split(",") : Object.keys(STYLE_CANDIDATES);
for (const s of chosenStyles) if (!STYLE_CANDIDATES[s]) throw new Error(`未知风格 ${s}`);
if (strategyArg && !STRATEGIES[strategyArg]) throw new Error(`未知策略 ${strategyArg}`);

const key = readMiniMaxKey();
const allWords = await loadWords(chosenWords);
if (allWords.length === 0) throw new Error("没从库里取到词");

const outDir = join(ROOT, "tmp", "image-debug");
mkdirSync(outDir, { recursive: true });

// manifest 增量合并:同 (组,词) 记录覆盖,历史记录保留
const manifestPath = join(outDir, "manifest.json");
const manifest = existsSync(manifestPath)
  ? JSON.parse(readFileSync(manifestPath, "utf8"))
  : { generatedAt: new Date().toISOString(), items: [] };
manifest.generatedAt = new Date().toISOString();
const idx = new Map(manifest.items.map((it, i) => [`${it.id}/${it.word}`, i]));
const upsert = (rec) => {
  const k = `${rec.id}/${rec.word}`;
  if (idx.has(k)) manifest.items[idx.get(k)] = rec;
  else {
    manifest.items.push(rec);
    idx.set(k, manifest.items.length - 1);
  }
};

for (const sid of chosenStyles) {
  const style = STYLE_CANDIDATES[sid];
  for (const [vid, strat] of Object.entries(STRATEGIES)) {
    if (strategyArg && vid !== strategyArg) continue;
    const dir = join(outDir, `${sid}-${vid}`);
    mkdirSync(dir, { recursive: true });
    for (const w of allWords) {
      const prompt = strat.build(w, style);
      console.log(`\n[${sid}-${vid}] ${w.word}\n  ${prompt}`);
      if (dry) {
        upsert({ id: `${sid}-${vid}`, word: w.word, prompt });
        continue;
      }
      const outFile = join(dir, `${w.word}.png`);
      if (existsSync(outFile)) {
        console.log("  已存在,跳过(删除后重跑可强制重新生成)");
        upsert({ id: `${sid}-${vid}`, word: w.word, prompt, file: outFile });
        continue;
      }
      try {
        const { url, bytes } = await genImage(key, prompt, outFile);
        console.log(`  ✅ ${bytes} bytes → ${outFile}`);
        upsert({ id: `${sid}-${vid}`, word: w.word, prompt, url, file: outFile });
      } catch (e) {
        console.log(`  ❌ ${e.message}`);
        upsert({ id: `${sid}-${vid}`, word: w.word, prompt, error: e.message });
      }
      await new Promise((r) => setTimeout(r, 1500)); // 温和限速
    }
  }
}

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
if (!dry) buildPage(manifest);
console.log(`\n完成。产物目录: ${outDir}(${manifest.items.length} 条记录)`);
