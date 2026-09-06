#!/usr/bin/env node
/**
 * scripts/gen-mnemonic.mjs — 助记字段生成管线(Stage 1,docs/助记卡学习页实施方案.md §6)
 *
 * 四次独立 LLM 调用生成 words.contentJson 的助记字段:
 *   ① morph    构词解析(derived/compound/blend 三型)
 *   ② syl      读音解析(音节+音素双层,phonemes 拼合 === ipa 拼合 硬校验)
 *   ③ derives  派生·词性·近义
 *   ④ context  真实语境(词组内嵌例句同条一体,v2.5 契约)
 *
 * 工程铁律:
 *   - 单路校验不过 → 重新调用该路(最多 3 次尝试),失败隔离不影响其他三路
 *   - 每次调用的原始返回全量落盘 data/mnemonic-debug/{word}/{field}-try{n}.json
 *   - contentJson 幂等 merge:只写本次成功字段,--rebuild 先清旧四字段;其余字段不动
 *   - TTS 例句音频(edge-tts Emma --rate=-8%)落 public/audio/contexts/,>1KB 才回写 audio;
 *     TTS 失败不阻塞(audio 缺省由前端 speechSynthesis 兜底)
 *
 * 用法:
 *   node scripts/gen-mnemonic.mjs --word=literature                # 单词全字段
 *   node scripts/gen-mnemonic.mjs --word=abandon,isolate           # 多词
 *   node scripts/gen-mnemonic.mjs --word=abandon --fields=morph,syl
 *   node scripts/gen-mnemonic.mjs --word=abandon --rebuild         # 先清旧四字段再生成
 *   node scripts/gen-mnemonic.mjs --word=abandon --dry-run         # 只调 LLM 不写库
 */
import Database from "better-sqlite3";
import { spawn } from "node:child_process";
import { mkdir, writeFile, stat, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

// ===== CLI =====
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  }),
);
const WORDS = (args.word ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const REBUILD = !!args.rebuild;
const DRY_RUN = !!args["dry-run"];
const TTS_ONLY = !!args["tts-only"]; // 只对已存在 contexts 补缺失音频,不调 LLM
const FIELDS = (args.fields ?? "morph,syl,derives,context")
  .split(",")
  .map((s) => s.trim())
  .filter((f) => ["morph", "syl", "derives", "context"].includes(f));
const TRIES_PER_FIELD = 3;

if (!WORDS.length) {
  console.error("用法: node scripts/gen-mnemonic.mjs --word=literature[,abandon] [--fields=morph,syl,derives,context] [--rebuild] [--dry-run]");
  process.exit(1);
}

// ===== config.json(JSONC 剥注释,状态机:字符串内 // 不误伤) =====
function stripJsonComments(src) {
  let out = "";
  let inStr = false;
  let esc = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inStr) {
      out += ch;
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') { inStr = true; out += ch; continue; }
    if (ch === "/" && src[i + 1] === "/") { while (i < src.length && src[i] !== "\n") i++; out += "\n"; continue; }
    if (ch === "/" && src[i + 1] === "*") { i += 2; while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) i++; i++; continue; }
    out += ch;
  }
  return out;
}
const CFG = JSON.parse(stripJsonComments(await readFile(join(process.cwd(), "config.json"), "utf8")));
const LLM = CFG.llm;
if (!LLM?.apiKey) { console.error("config.json 缺 llm.apiKey"); process.exit(1); }
const MODEL = LLM.gradingModel;
const TIMEOUT_MS = (LLM.timeoutSec ?? 120) * 1000;

// ===== DB(裸 SQL,不 import TS schema) =====
const sqlite = new Database("./data/app.db");
sqlite.pragma("foreign_keys = ON");
const getWord = sqlite.prepare("SELECT id, word, phonetic_uk, content_json FROM words WHERE word = ?");

// ===== debug 落盘 =====
async function dumpDebug(word, field, n, payload) {
  const dir = join(process.cwd(), "data", "mnemonic-debug", word);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, `${field}-try${n}.json`), JSON.stringify(payload, null, 2), "utf8");
}

// ===== LLM(OpenAI 协议;MiniMax-M3 为推理模型,必须关 thinking —— 写作批改实测教训) =====
async function llmJson(userPrompt) {
  const body = {
    model: MODEL,
    messages: [
      { role: "system", content: "你只输出一个 JSON 对象——不要 markdown 围栏、不要解释文字。中文一律简体。" },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 4096,
    temperature: 0.6,
    thinking: { type: "disabled" },
  };
  const resp = await fetch(`${LLM.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${LLM.apiKey}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const rawText = await resp.text();
  // 调试铁律:任何失败路径都携带原始返回,由调用方全量落盘
  const fail = (msg) => { const e = new Error(msg); e.rawText = rawText; throw e; };
  if (!resp.ok) fail(`HTTP ${resp.status} ${rawText.slice(0, 300)}`);
  let raw;
  try { raw = JSON.parse(rawText); } catch { fail(`响应非 JSON: ${rawText.slice(0, 200)}`); }
  const content = raw?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) fail("响应缺少 content");
  // 剥可能的围栏 + 取首个 {...} 平衡块
  let text = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  const start = text.indexOf("{");
  if (start < 0) throw new Error(`输出无 JSON 对象: ${text.slice(0, 200)}`);
  let depth = 0, end = -1, inStr = false, esc = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inStr) { if (esc) esc = false; else if (ch === "\\") esc = true; else if (ch === '"') inStr = false; continue; }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end < 0) fail(`JSON 不平衡: ${text.slice(0, 200)}`);
  const slice = text.slice(start, end + 1);
  let parsed;
  try { parsed = JSON.parse(slice); } catch (e) { fail(`输出 JSON 解析失败(position ${e?.message?.match(/position (\d+)/)?.[1] ?? "?"}): ${slice.slice(0, 200)}`); }
  return { parsed, usage: raw?.usage?.total_tokens, rawContent: content };
}

/** 挑一个词的屈折容差匹配:coll 的每个实义词,例句里存在「词干前缀」命中(前 4 字符,短词取全长);
 *  反身代词特殊规则:coll 用 oneself/themselves 时,en 中任意 -self/-selves 词(himself 等)即算命中 */
function stemHits(sentence, phrase) {
  const norm = (s) => s.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
  const sent = norm(sentence);
  const reflexive = (w) => /(?:self|selves)$/.test(w);
  return norm(phrase).every((w) => {
    if (reflexive(w)) return sent.some(reflexive);
    const stem = w.length <= 4 ? w : w.slice(0, 4);
    return sent.some((s) => s.startsWith(stem));
  });
}

// ===== 四路 prompt(设计文档 §5 定稿模板) =====
const COMMON = "只输出一个 JSON 对象——不要 markdown 围栏、不要解释文字;字段名与嵌套结构严格按模板,不得增删字段;中文一律简体。";

const PROMPTS = {
  morph: (w, ipa, meaningZh) => [
    `你是英语构词分析专家。分析单词 ${w}(音标 ${ipa},释义:${meaningZh})的构词方式。`,
    COMMON,
    `输出模板:\n{ "morph": { "type": "derived", "literal": "un- 否定 + believ 相信 + -able 能…的", "pieces": [ { "piece": "un-", "kind": "prefix", "meaningZh": "否定" } ] } }`,
    `规则:`,
    `- type ∈ derived(派生) | compound(合成) | blend(截搭混合);不强求 compound/blend——明确是派生就给 derived`,
    `- derived: piece 的 kind ∈ prefix|root|suffix,不填 fromWord;前/后缀 piece 含连字符(如 un- / -able)`,
    `- compound: kind 一律 "word",每个 piece 填 fromWord=来源真词(如 outbreak = out + break)`,
    `- blend: kind ∈ blend-head|blend-tail,fromWord=被截取真词(如 brunch = breakfast 截头 + lunch 截尾)`,
    `- pieces 依序拼合必须覆盖整词拼写(去连字符后逐字符 === ${w})`,
  ].join("\n"),

  syl: (w, ipa) => [
    `你是英语发音教学专家。为单词 ${w} 生成「音节+音素」双层读音解析。`,
    `参考音标(库内):${ipa}。若你确信的标准读音与该音标是不同变体(如 /ˈlɪtərətʃə/ 与 /ˈlɪtrətʃər/ 同为词典合法变体),以你确信的读音为准——但输出内部必须完全自洽。`,
    COMMON,
    `输出模板:\n{ "syl": { "parts": ["lit","e","ra","ture"], "ipa": ["lɪt","ə","rə","tʃə"], "stress": 0, "secondary": [], "phonemes": [ { "p": "l", "syl": 0, "type": "consonant", "desc": "边音:舌尖抵上齿龈,气流从舌两侧通过" } ], "combos": [ { "letters": "ture", "sound": "/tʃə/", "desc": "字母组合读音规律" } ], "notes": ["发音要点,1-3 条"] } }`,
    `规则:`,
    `- parts=字母分段(依序拼合覆盖整词拼写);ipa=每段读音,重音符号 ˈ(主)/ˌ(次)放在对应音节段的 ipa 串开头`,
    `- stress=主重音音节下标(0 起);secondary=次重音下标数组(可省略则 [])`,
    `- phonemes: p=纯音素(**不含重音符号/斜杠**),依序拼合必须 === ipa 拼合去掉重音符号后(逐字符);syl=归属音节下标;type ∈ vowel|consonant;desc=一句发音要领,重复音素(如多次 schwa)desc 允许 ""`,
    `- **内部自洽是硬约束**:ipa 拼合、phonemes 拼合、parts 拼合三者在去重音符号后必须两两一致对应,不得自行增删音素`,
    `- combos/notes 可省略;combos 记字母组合读音规律(如 ture→/tʃə/ 同 nature/future)`,
  ].join("\n"),

  derives: (w, meaningZh) => [
    `你是英语词汇教学专家。列出单词 ${w}(释义:${meaningZh})的同族派生词(可含近义词)。`,
    COMMON,
    `输出模板:\n{ "derives": [ { "word": "belief", "pos": "n.", "meaningZh": "相信;信念" } ] }`,
    `规则:`,
    `- 2-5 条,优先高频、与 ${w} 形近/同根清晰的派生`,
    `- pos 用标准缩写(n. / v. / adj. / adv. / phr.);meaningZh 简洁`,
    `- 覆盖常见派生即可不穷举;确无合适派生时输出 "derives": []`,
  ].join("\n"),

  context: (w, meaningZh) => [
    `你是英语搭配与例句写作专家。为单词 ${w}(释义:${meaningZh})生成真实语境例句。`,
    COMMON,
    `输出模板:\n{ "contexts": [ { "coll": "hard to believe", "collZh": "很难相信", "en": "It is hard to believe he finished it overnight.", "cn": "很难相信他一夜之间就做完了。" } ] }`,
    `规则:`,
    `- 2-3 条;coll=真实高频搭配(学术/日常场景优先),collZh=搭配中文`,
    `- en(8-20 词)须自然嵌入该 coll,不得只出现 ${w};各条 coll 不重复`,
    `- en 中须出现 ${w}(允许屈折变体,如 accomplish→accomplished);cn 自然通顺`,
    `注:例句音频由 TTS 管线另行合成,本调用不生成音频。`,
  ].join("\n"),
};

// ===== 单路校验(不过=拒收该路,计入重试) =====
// syl 规范化:去斜杠/重音符号/分隔点/空格(重音符号归 ipa 段,phonemes 只存纯音素)
const normIpa = (x) => x.replace(/[/ˈˌ.\s]/g, "");
function validate(field, parsed, word, ipaInput) {
  const errs = [];
  if (field === "morph") {
    const m = parsed.morph;
    if (!m || typeof m !== "object") return ["morph 缺失"];
    if (!["derived", "compound", "blend"].includes(m.type)) errs.push(`type=${m.type} 非法`);
    if (!Array.isArray(m.pieces) || m.pieces.length === 0) errs.push("pieces 空");
    else {
      const joined = m.pieces.map((p) => (p.piece ?? "")).join("").replace(/[-\s]/g, "").toLowerCase();
      if (joined !== word.toLowerCase()) errs.push(`pieces 拼合「${joined}」≠ ${word}`);
      for (const p of m.pieces) {
        if (!p.piece || !p.meaningZh) errs.push(`piece 缺字段: ${JSON.stringify(p).slice(0, 80)}`);
        if ((m.type === "compound" || m.type === "blend") && !p.fromWord) errs.push(`${m.type} 缺 fromWord: ${p.piece}`);
        if (m.type === "derived" && !["prefix", "root", "suffix"].includes(p.kind)) errs.push(`derived kind 非法: ${p.kind}`);
      }
    }
  } else if (field === "syl") {
    const s = parsed.syl;
    if (!s || typeof s !== "object") return ["syl 缺失"];
    if (!Array.isArray(s.parts) || !Array.isArray(s.ipa) || s.parts.length !== s.ipa.length || !s.parts.length)
      errs.push("parts/ipa 数组不合法或长度不一致");
    if (typeof s.stress !== "number" || s.stress < 0 || s.stress >= (s.parts?.length ?? 0)) errs.push(`stress=${s.stress} 越界`);
    if (ipaInput) {
      const ipaJoined = normIpa(s.ipa?.join("") ?? "");
      const inputJoined = normIpa(ipaInput);
      if (ipaJoined !== inputJoined) console.warn(`  ℹ syl 音标与库内不同变体(模型标准读音 ${s.ipa?.join("")} vs 库内 ${ipaInput})——内部自洽即放行`);
    }
    if (!Array.isArray(s.phonemes) || !s.phonemes.length) errs.push("phonemes 空");
    else {
      const joined = normIpa(s.phonemes.map((p) => p.p ?? "").join(""));
      const ipaJoined = normIpa(s.ipa?.join("") ?? "");
      if (joined !== ipaJoined) errs.push(`phonemes 拼合「${joined}」≠ ipa 拼合「${ipaJoined}」(去重音符比对)`);
      for (const p of s.phonemes) {
        if (!p.p) errs.push("phoneme 缺 p");
        if (!["vowel", "consonant"].includes(p.type)) errs.push(`type 非法: ${p.type}`);
        if (!Number.isInteger(p.syl) || p.syl < 0 || p.syl >= s.parts.length) errs.push(`phoneme syl 下标越界: ${p.syl}`);
      }
    }
  } else if (field === "derives") {
    const d = parsed.derives;
    if (!Array.isArray(d)) return ["derives 缺失或非数组"];
    if (d.length > 5) errs.push(`条数 ${d.length} > 5`);
    const posOk = /^(n|v|adj|adv|phr)\.$/;
    for (const it of d) {
      if (!it.word || !it.pos || !it.meaningZh) errs.push(`derives 缺字段: ${JSON.stringify(it).slice(0, 80)}`);
      if (it.pos && !posOk.test(it.pos)) errs.push(`pos 非标准缩写: ${it.pos}`);
    }
  } else if (field === "context") {
    const c = parsed.contexts;
    if (!Array.isArray(c) || c.length < 2) return ["contexts 缺失或 <2 条"];
    if (c.length > 3) errs.push(`条数 ${c.length} > 3`);
    const seen = new Set();
    for (const it of c) {
      if (!it.coll || !it.en) errs.push(`context 缺 coll/en: ${JSON.stringify(it).slice(0, 80)}`);
      else {
        const key = it.coll.toLowerCase();
        if (seen.has(key)) errs.push(`coll 重复: ${it.coll}`);
        seen.add(key);
        if (!stemHits(it.en, it.coll)) errs.push(`coll「${it.coll}」定位不到 en`);
        if (!stemHits(it.en, word)) errs.push(`例句未出现 ${word}`);
      }
    }
  }
  return errs;
}

// ===== TTS(edge-tts,Emma --rate=-8%;>1KB 才算成功) =====
const PY = "/Users/fanyunxu/.workbuddy/binaries/python/envs/default/bin/python3";
const VOICE_SENT = args["voice-sent"] ?? "en-US-EmmaMultilingualNeural";
const SENT_RATE = "--rate=-8%";
async function synth(text, outPath, retries = 3) {
  await mkdir(dirname(outPath), { recursive: true });
  for (let attempt = 1; attempt <= retries; attempt++) {
    const ok = await new Promise((resolve) => {
      const child = spawn(PY, ["-m", "edge_tts", "--voice", VOICE_SENT, SENT_RATE, "--text", text, "--write-media", outPath], { stdio: ["ignore", "pipe", "pipe"] });
      let stderr = "";
      child.stderr.on("data", (d) => (stderr += d.toString()));
      child.on("exit", async (code) => {
        const size = existsSync(outPath) ? (await stat(outPath).catch(() => null))?.size ?? 0 : 0;
        resolve(code === 0 && size > 1000 ? true : stderr || `exit=${code} size=${size}`);
      });
    });
    if (ok === true) return true;
    console.warn(`  [tts] attempt ${attempt}/${retries} failed: ${String(ok).slice(0, 120)}`);
    await new Promise((r) => setTimeout(r, 500 * attempt));
  }
  return false;
}

// ===== 主流程 =====
const safeName = (w) => w.replace(/[^\w-]/g, "_");

for (const word of WORDS) {
  console.log(`\n========== ${word} ==========`);
  const row = getWord.get(word);
  if (!row) { console.error(`  ✗ 词库中不存在: ${word}`); continue; }
  const content = JSON.parse(row.content_json ?? "{}");
  const ipa = row.phonetic_uk || "";
  const meaningZh = (content.translation ?? []).join("; ") || "(暂无释义)";

  // --tts-only:只补已存在 contexts 的缺失音频(幂等;不调 LLM、不重合成已有音频)
  if (TTS_ONLY) {
    if (!Array.isArray(content.contexts) || !content.contexts.length) {
      console.log("  ↷ 无 contexts,跳过");
      continue;
    }
    let changed = false;
    for (let i = 0; i < content.contexts.length; i++) {
      const it = content.contexts[i];
      if (it.audio && existsSync(join(process.cwd(), "public", it.audio))) { console.log(`  ↷ ctx${i} 音频已存在`); continue; }
      const out = join(process.cwd(), "public", "audio", "contexts", `${safeName(word)}_${i}.mp3`);
      const ok = await synth(it.en, out);
      console.log(`  ${ok ? "🔊" : "⚠"} tts ctx${i}${ok ? ": /audio/contexts/" + safeName(word) + "_" + i + ".mp3" : ": 失败"}`);
      if (ok) { it.audio = `/audio/contexts/${safeName(word)}_${i}.mp3`; changed = true; }
    }
    if (changed) {
      sqlite.prepare("UPDATE words SET content_json = ?, updated_at = ? WHERE id = ?")
        .run(JSON.stringify(content), new Date().toISOString(), row.id);
      console.log("  💾 audio 已回写");
    }
    continue;
  }

  if (REBUILD) for (const k of ["morph", "syl", "derives", "contexts"]) delete content[k];

  const generated = {};   // 成功字段
  const failures = {};    // 失败字段 → 原因

  for (const field of FIELDS) {
    const dbKey = field === "context" ? "contexts" : field;
    if (!REBUILD && content[dbKey] !== undefined) {
      console.log(`  ↷ ${field}: 已存在(跳过;--rebuild 可重建)`);
      continue;
    }
    let done = false;
    for (let n = 1; n <= TRIES_PER_FIELD && !done; n++) {
      const t0 = Date.now();
      try {
        const prompt = PROMPTS[field](word, ipa, meaningZh);
        const { parsed, usage, rawContent } = await llmJson(prompt);
        const errs = validate(field, parsed, word, field === "syl" ? ipa : undefined);
        await dumpDebug(word, field, n, {
          status: "ok", latencyMs: Date.now() - t0, tokens: usage,
          rawContent, parsed, validation: errs,
        });
        if (errs.length) {
          console.warn(`  ✗ ${field} try${n} 校验不过: ${errs.join("; ")}`);
          continue;
        }
        generated[dbKey] = parsed[dbKey];
        console.log(`  ✓ ${field} try${n} 通过(${Date.now() - t0}ms, ${usage ?? "?"} tok)`);
        done = true;
      } catch (e) {
        await dumpDebug(word, field, n, { status: "error", latencyMs: Date.now() - t0, error: String(e), rawText: e.rawText ?? undefined });
        console.warn(`  ✗ ${field} try${n} 调用失败: ${String(e).slice(0, 160)}`);
      }
    }
    if (!done) failures[field] = `${TRIES_PER_FIELD} 次尝试均失败(详见 data/mnemonic-debug/${word}/)`;
  }

  // TTS:成功生成的 contexts 逐句合成音频
  if (generated.contexts?.length) {
    generated.contexts = await Promise.all(
      generated.contexts.map(async (it, i) => {
        const out = join(process.cwd(), "public", "audio", "contexts", `${safeName(word)}_${i}.mp3`);
        const ok = await synth(it.en, out);
        const audio = ok ? `/audio/contexts/${safeName(word)}_${i}.mp3` : undefined;
        console.log(`  ${ok ? "🔊" : "⚠"} tts ctx${i}: ${audio ?? "失败(前端 speechSynthesis 兜底)"}`);
        return audio ? { ...it, audio } : it;
      }),
    );
  }

  // 写回(幂等 merge;--dry-run 只打印)
  if (!DRY_RUN && Object.keys(generated).length) {
    const merged = { ...content, ...generated };
    sqlite
      .prepare("UPDATE words SET content_json = ?, updated_at = ? WHERE id = ?")
      .run(JSON.stringify(merged), new Date().toISOString(), row.id);
    console.log(`  💾 content_json 已更新字段: ${Object.keys(generated).join(", ")}`);
  } else if (DRY_RUN) {
    console.log(`  (dry-run) 成功字段: ${Object.keys(generated).join(", ") || "无"}`);
  }
  if (Object.keys(failures).length) console.warn(`  ⚠ 失败字段: ${JSON.stringify(failures)}`);
}
sqlite.close();
console.log("\n[gen-mnemonic] done");
