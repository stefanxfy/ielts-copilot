#!/usr/bin/env node
/**
 * scripts/debug-image-prompt.mjs — MiniMax 文生图提示词调试（P8 生图管线前置实验）
 *
 * 目的:在定风格之前,先用同一组词对比「提示词策略 × 固定风格前缀」的出图效果,
 *      把图摆在一起看,再和用户讨论定风格。
 *
 * 用法:
 *   node scripts/debug-image-prompt.mjs                # 跑全部策略×词
 *   node scripts/debug-image-prompt.mjs --strategy v2  # 只跑某策略
 *   node scripts/debug-image-prompt.mjs --dry          # 只打印提示词不调 API
 *
 * 产物:tmp/image-debug/<strategy>/<word>.png + manifest.json(提示词与参数留档)
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
  // 轻量去注释(不引依赖):逐行去掉 // 后内容(本文件注释都在行尾或整行)
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

/* ---------- 提示词策略 ---------- */
// 固定风格前缀:先给两版候选,出图对比后定稿(这一步就是要和用户讨论的东西)
const STYLE_CANDIDATES = {
  // S1: 温和插画记忆卡风(贴近百词斩/不背单词类产品的钩子图)
  s1: "Warm flat illustration, soft pastel colors, clean minimal composition, single central scene, no text, no letters, children's picture-book style",
  // S2: 写实摄影记忆卡风(更"真实",贴近成人学习者审美)
  s2: "Photorealistic photography, natural lighting, shallow depth of field, one clear focal subject, editorial magazine quality, no text, no letters, no watermark",
};

// 提示词结构策略:都遵循「场景具体化、把词义放进一个可拍/可画的瞬间」
const STRATEGIES = {
  // v1: 直译策略 — 词+释义+例句原样丢给模型,靠模型自己理解(对照组)
  v1: {
    label: "v1 直译组(词+中文释义+definition+例句 原样拼装)",
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
    label: "v2 场景导演组(基于例句提炼画面瞬间,信息更聚焦)",
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

/* ---------- 主流程 ---------- */
const argv = process.argv.slice(2);
const dry = argv.includes("--dry");
const strategyArg = (() => {
  const i = argv.indexOf("--strategy");
  return i >= 0 ? argv[i + 1] : null;
})();

const WORDS = ["abandon", "abundant", "discard", "isolate", "accomplish"];
const key = readMiniMaxKey();
const allWords = await loadWords(WORDS);
if (allWords.length === 0) throw new Error("没从库里取到词");

const outDir = join(ROOT, "tmp", "image-debug");
mkdirSync(outDir, { recursive: true });
const manifest = { generatedAt: new Date().toISOString(), items: [] };

for (const [sid, style] of Object.entries(STYLE_CANDIDATES)) {
  if (strategyArg && !STRATEGIES[strategyArg]) throw new Error(`未知策略 ${strategyArg}`);
  for (const [vid, strat] of Object.entries(STRATEGIES)) {
    if (strategyArg && vid !== strategyArg) continue;
    const dir = join(outDir, `${sid}-${vid}`);
    mkdirSync(dir, { recursive: true });
    for (const w of allWords) {
      const prompt = strat.build(w, style);
      console.log(`\n[${sid}-${vid}] ${w.word}\n  ${prompt}`);
      if (dry) {
        manifest.items.push({ id: `${sid}-${vid}`, word: w.word, prompt });
        continue;
      }
      const outFile = join(dir, `${w.word}.png`);
      if (existsSync(outFile)) {
        console.log("  已存在,跳过(删除后重跑可强制重新生成)");
        continue;
      }
      try {
        const { url, bytes } = await genImage(key, prompt, outFile);
        console.log(`  ✅ ${bytes} bytes → ${outFile}`);
        manifest.items.push({ id: `${sid}-${vid}`, word: w.word, prompt, url, file: outFile });
      } catch (e) {
        console.log(`  ❌ ${e.message}`);
        manifest.items.push({ id: `${sid}-${vid}`, word: w.word, prompt, error: e.message });
      }
      await new Promise((r) => setTimeout(r, 1500)); // 温和限速
    }
  }
}

writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`\n完成。产物目录: ${outDir}(${manifest.items.length} 条记录)`);
