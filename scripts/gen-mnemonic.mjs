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
 *   node scripts/gen-mnemonic.mjs --book=17                        # 整书批量(D7 选词,morph+syl)
 *   node scripts/gen-mnemonic.mjs --book=17 --fields=morph         # 只跑 morph
 *   node scripts/gen-mnemonic.mjs --book=17 --pilot=100            # 试点:morph 按 4 档分层抽 100 + syl 抽 25
 *   node scripts/gen-mnemonic.mjs --book=17 --limit=200            # morph 任务截前 200
 *
 * D7 选词规则(2026-09-07 三轮收敛,docs/新东方雅思词汇3575入库计划.md):
 *   morph: 有 morphSeed 必跑(不限词长);>8 有 ECDICT root 跑;>8 双无证据 LLM 自判(skip 合法);
 *          ≤8 且无 seed 放弃;短语词条放弃
 *   syl:   非短语且有 phonetic_uk 即跑(音标门禁兜底)
 *   种子注入: morph prompt 喂 morphSeed/ECDICT root;validate 做 piece 级交叉校验
 *     (有种子=piece 双向集合一致;仅 root=≥1 piece 命中词根;双无=skip 合法终态,不入库)
 *
 * 生成模型(2026-09-06 定):GLM-5.3 走 coding plan 专用端点 /api/coding/paas/v4(包月额度,
 * 不烧 MiniMax 按量余额)。bench 对比实验结论:GLM-5.3 语义错误率 0.30 vs MiniMax-M3 0.47。
 * 写作批改仍走 config.json llm.* 的 MiniMax-M3,与本脚本互不影响。
 */
import Database from "better-sqlite3";
import { spawn } from "node:child_process";
import { mkdir, writeFile, stat, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { walkEnPunct } from "./lib/normalize-en-punct.mjs";

// ===== CLI =====
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  }),
);
const WORDS = (args.word ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const BOOK = args.book ? parseInt(args.book, 10) : null;
const PILOT = args.pilot ? parseInt(args.pilot, 10) : null;
const LIMIT = args.limit ? parseInt(args.limit, 10) : null;
const REBUILD = !!args.rebuild;
const DRY_RUN = !!args["dry-run"];
const TTS_ONLY = !!args["tts-only"]; // 只对已存在 contexts 补缺失音频,不调 LLM
const FIELDS = (args.fields ?? "morph,syl,derives,context")
  .split(",")
  .map((s) => s.trim())
  .filter((f) => ["morph", "syl", "derives", "context"].includes(f));
const TRIES_PER_FIELD = 3;

// ===== D7 选词(book17 实测口径,词长=纯字母数) =====
const letterLen = (w) => w.replace(/[^a-zA-Z]/g, "").length;
const isPhrase = (w) => /\s/.test(w.trim());
function morphTier(c, word) {
  // 返回 [tier, 是否允许 skip];tier: seed | root | judge | drop
  if (c.morphSeed) return ["seed", false];
  if (isPhrase(word)) return ["drop", false];
  if (letterLen(word) <= 8) return ["drop", false];
  if (c.root) return ["root", false];
  return ["judge", true]; // >8 双无证据:LLM 自判,skip 合法
}

// 批量模式(--book=17):按 D7 选出任务词表,打印分档统计
async function buildBatchList(bookId) {
  const { default: Database } = await import("better-sqlite3");
  const db = new Database("./data/app.db", { readonly: true });
  const rows = db
    .prepare(
      `SELECT w.id, w.word, w.phonetic_uk, w.content_json FROM words w
       JOIN book_word_relation r ON r.word_id = w.id WHERE r.book_id = ?`,
    )
    .all(bookId);
  db.close();
  const tasks = { morph: [], syl: [] };
  const stats = { morph: { seed: 0, root: 0, judge: 0, drop: 0 }, syl: { run: 0, skipNoIpa: 0, skipPhrase: 0, have: 0 } };
  for (const r of rows) {
    let c;
    try { c = JSON.parse(r.content_json ?? "{}"); } catch { c = {}; }
    c = c ?? {};
    const word = r.word;
    if (FIELDS.includes("morph") && !c.morph) {
      const [tier] = morphTier(c, word);
      if (tier === "drop") stats.morph.drop++;
      else tasks.morph.push({ word, tier, c });
      if (tier !== "drop") stats.morph[tier]++;
      else stats.morph.drop = stats.morph.drop; // keep shape
    }
    if (FIELDS.includes("syl") && !c.syl) {
      if (isPhrase(word)) stats.syl.skipPhrase++;
      else if (!r.phonetic_uk) stats.syl.skipNoIpa++;
      else { tasks.syl.push({ word, tier: "syl", c }); stats.syl.run++; }
    }
    if (c.morph) stats.morph.have = (stats.morph.have ?? 0) + 1;
    if (c.syl) stats.syl.have = (stats.syl.have ?? 0) + 1;
  }
  // 试点抽样:morph 三档分层(45/10/20=75)+ syl 抽 25,合计 pilot
  if (PILOT) {
    const quota = { seed: Math.round(PILOT * 0.45), root: Math.round(PILOT * 0.1), judge: Math.round(PILOT * 0.2), syl: Math.round(PILOT * 0.25) };
    const pick = (arr, n) => arr.filter((_, i) => i % Math.ceil(arr.length / Math.min(n, arr.length)) === 0).slice(0, n);
    tasks.morph = [...pick(tasks.morph.filter((t) => t.tier === "seed"), quota.seed),
      ...pick(tasks.morph.filter((t) => t.tier === "root"), quota.root),
      ...pick(tasks.morph.filter((t) => t.tier === "judge"), quota.judge)];
    tasks.syl = pick(tasks.syl, quota.syl);
  }
  if (LIMIT) tasks.morph = tasks.morph.slice(0, LIMIT);
  return { tasks, stats };
}

if (!WORDS.length && !BOOK) {
  console.error("用法: node scripts/gen-mnemonic.mjs --word=literature[,abandon] [--fields=...] [--rebuild] [--dry-run]\n      node scripts/gen-mnemonic.mjs --book=17 [--fields=morph,syl] [--pilot=100] [--limit=200]");
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
if (!LLM?.glmApiKey) { console.error("config.json 缺 llm.glmApiKey(GLM coding plan key)"); process.exit(1); }
const MODEL = "glm-5.3";
const BASE_URL = "https://open.bigmodel.cn/api/coding/paas/v4";
const API_KEY = LLM.glmApiKey;
const TIMEOUT_MS = 180000; // GLM 思考模式延迟更高,放宽到 180s(bench 实测)

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

// ===== LLM(GLM-5.3,OpenAI 协议;glm-5.3 为常开思考模型:thinking 必须 enabled,
//      思考强度用顶层 reasoning_effort 控制;错误码 1113=该端点无额度,1210=参数错) =====
async function llmJson(userPrompt) {
  const body = {
    model: MODEL,
    messages: [
      { role: "system", content: "你只输出一个 JSON 对象——不要 markdown 围栏、不要解释文字。中文一律简体。" },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 4096,
    temperature: 0.6,
    thinking: { type: "enabled" },
    reasoning_effort: "low",
  };
  const resp = await fetch(`${BASE_URL.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${API_KEY}` },
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
 *  反身代词特殊规则:coll 用 oneself/themselves 时,en 中任意 -self/-selves 词(himself 等)即算命中;
 *  占位词规则:词典式搭配常带占位/虚词(one's、sth、the ability to do sth),这些词不参与定位,
 *  只要求实义词命中——占位词强匹配会误杀真实例句(ability 批量生成实测教训) */
const COLL_PLACEHOLDERS = new Set([
  "sth", "sb", "one", "s", "someone", "something", "somebody", "oneself",
  "the", "a", "an", "to", "of", "do", "be", "doing", "b", "x", "y",
]);
function stemHits(sentence, phrase) {
  const norm = (s) => s.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
  const sent = norm(sentence);
  const reflexive = (w) => /(?:self|selves)$/.test(w);
  const hit = (w, n) => sent.some((s) => s.startsWith(w.slice(0, n)));
  return norm(phrase)
    .filter((w) => !COLL_PLACEHOLDERS.has(w))
    .every((w) => {
      if (reflexive(w)) return sent.some(reflexive);
      // 两级前缀:先 4 字符,未中回退 3 字符(兼容 make→making / become→became 等屈折)
      return hit(w, 4) || (w.length > 3 && hit(w, 3));
    });
}

// ===== 四路 prompt(设计文档 §5 定稿模板) =====
const COMMON = "只输出一个 JSON 对象——不要 markdown 围栏、不要解释文字;字段名与嵌套结构严格按模板,不得增删字段;中文一律简体。";

const PROMPTS = {
  // seedText: morphSeed(百词斩 remMethod 原文)/ECDICT root,作词源依据注入;双无时为 null(开放 skip)
  morph: (w, ipa, meaningZh, seedText) => [
    seedText
      ? `你是英语构词分析专家。分析单词 ${w}(音标 ${ipa},释义:${meaningZh})的构词方式。`
      : `你是英语构词分析专家。分析单词 ${w}(音标 ${ipa},释义:${meaningZh})的构词方式。若你确知其真实词源(词典可查的标准构词)则分析;若不确定,直接输出 {"skip":true,"reason":"..."}。`,
    seedText ? `**词源依据(权威,必须严格遵循,不得增删改动词素)**:\n${seedText}` : "",
    COMMON,
    seedText
      ? `输出模板:\n{ "morph": { "type": "derived", "literal": "un- 否定 + believ 相信 + -able 能…的", "pieces": [ { "piece": "un-", "kind": "prefix", "meaningZh": "否定" } ] } }`
      : `输出模板(确有词源依据时):\n{ "morph": { "type": "compound", "pieces": [ { "piece": "easy", "kind": "word", "fromWord": "easy", "meaningZh": "轻松" }, { "piece": "going", "kind": "word", "fromWord": "going", "meaningZh": "行事" } ] } }\n无依据时**必须且只能**输出:\n{ "skip": true, "reason": "具体原因" }\nskip 时禁止附带 morph 字段;有依据时禁止 skip`,
    `规则:`,
    seedText ? `- 拆分必须与词源依据完全一致:piece 拼写与词素划分照搬依据,你只负责给出准确的中文含义与 type 判定,禁止改动、增删或重新切分词素` : `- 词源真实性是硬约束:piece 只能是有词典依据的真实词根词缀(源自拉丁/希腊词素的标准构词分析),禁止把单词切成无词源意义的碎片来凑拆分`,
    `- type ∈ derived(派生) | compound(合成) | blend(截搭混合);不强求 compound/blend——明确是派生就给 derived`,
    `- derived: piece 的 kind ∈ prefix|root|suffix,不填 fromWord;前/后缀 piece 含连字符(如 un- / -able)`,
    `- compound: kind 一律 "word",每个 piece 填 fromWord=来源真词(如 outbreak = out + break)`,
    `- blend: kind ∈ blend-head|blend-tail,fromWord=被截取真词(如 brunch = breakfast 截头 + lunch 截尾)`,
    `- pieces 依序拼合必须覆盖整词拼写(去连字符后逐字符 === ${w})`,
    `输出前自查:把各 piece 依序拼接、去掉连字符和括号,必须与 ${w} 逐字符完全相同——不得多写、漏写或改写任何字母(如 ${w} 不能拼成别的拼写)。`,
    `- piece 写实际参与拼写的字符,禁止括号注记或变体写法(如写 facil 而非 "facil(e)");词源形式接后缀时省音的(如 facile→facil-、able→abil-),按省音后的实际拼写写`,
    seedText ? `- 词源依据中的括号注记(如 "ac(=to)")表示词素含义:piece 写括号外的拼写(ac),含义写入 meaningZh(=to 的中文);依据里已给中文含义的直接沿用,不得与整词释义矛盾` : `- 碰到不认识的词源、或该词是整体不可分析的基础词(如 cat、run 这类简单词),宁可给 type=derived + 单 piece(kind=root、meaningZh 写整词词源含义),也不要杜撰拆分`,
    `- root 的 meaningZh 写词素的真实含义,不得与整词释义矛盾;同形前缀要按本词词源取义(如 con- 在 consequence 中= together「共同」,不是「反对」)。`,
    seedText ? `- 本词已提供权威词源,输出 {"skip":true,...} 视为失败——禁止 skip` : `- 确无可查词源时 skip 是合法输出;宁可 skip 也不编造。skip 后不要输出 morph 字段`,
  ].filter(Boolean).join("\n"),

  syl: (w, ipa) => [
    `你是英语发音教学专家。为单词 ${w} 生成「音节+音素」双层读音解析。`,
    `参考音标(库内):${ipa}。若你确信的标准读音与该音标是不同变体(如 /ˈlɪtərətʃə/ 与 /ˈlɪtrətʃər/ 同为词典合法变体),以你确信的读音为准——但输出内部必须完全自洽。`,
    COMMON,
    `输出模板:\n{ "syl": { "parts": ["lit","e","ra","ture"], "ipa": ["lɪt","ə","rə","tʃə"], "stress": 0, "secondary": [], "phonemes": [ { "p": "l", "syl": 0, "type": "consonant", "desc": "边音:舌尖抵上齿龈,气流从舌两侧通过" } ], "combos": [ { "letters": "ture", "sound": "/tʃə/", "desc": "字母组合读音规律" } ], "notes": ["发音要点,1-3 条"] } }`,
    `规则:`,
    `- parts=字母分段(依序拼合覆盖整词拼写);ipa=每段读音,重音符号 ˈ(主)/ˌ(次)放在对应音节段的 ipa 串开头`,
    `- stress=主重音音节下标(0 起);secondary=次重音下标数组(可省略则 [])`,
    `- 音节划分按真实发音,每个音节必须含至少一个元音音素;成音节辅音 /l/ /n/ /m/ 可作弱音节核心(如 little 的 /l̩/)`,
    `- phonemes: p=纯音素(**不含重音符号/斜杠**),依序拼合必须 === ipa 拼合去掉重音符号后(逐字符);syl=归属音节下标;type ∈ vowel|consonant;desc=一句发音要领,重复音素(如多次 schwa)desc 允许 ""`,
    `- 双元音(/aɪ/ /eɪ/ /ɔɪ/ /aʊ/ /əʊ/)是**单个音素**,禁止拆成两个;单音素如 /dʒ/ /tʃ/ /θ/ /ð/ /ŋ/ 同理不可再分`,
    `- **内部自洽是硬约束**:ipa 拼合、phonemes 拼合、parts 拼合三者在去重音符号后必须两两一致对应,不得自行增删音素`,
    `- combos/notes 可省略;combos 记字母组合读音规律(如 ture→/tʃə/ 同 nature/future)`,
  ].join("\n"),

  derives: (w, meaningZh) => [
    `你是英语词汇教学专家。列出单词 ${w}(释义:${meaningZh})的同族派生词(可含近义词)。`,
    COMMON,
    `输出模板:\n{ "derives": [ { "word": "belief", "pos": "n.", "meaningZh": "相信;信念" } ] }`,
    `规则:`,
    `- 2-5 条,优先高频、与 ${w} 形近/同根清晰的派生`,
    `- 派生词必须与 ${w} 同根(真实构词派生,如 believe→belief)或词典公认的近义词;禁止把包含 ${w} 字母串但词源无关的词当派生(如 invest 不是 investigate 的派生词)`,
    `- 不重复主词本身;pos 用标准缩写(n. / v. / adj. / adv. / phr.,词性组合写 n./v.);meaningZh 简洁准确`,
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
    `- coll 须能在 en 中按词形(含屈折,如 do→did/done)定位;搭配在例句中的用法须符合 ${w} 的实际语义`,
    `注:例句音频由 TTS 管线另行合成,本调用不生成音频。`,
  ].join("\n"),
};

// ===== 单路校验(不过=拒收该路,计入重试) =====
// syl 规范化:去斜杠/重音符号/分隔点/空格(重音符号归 ipa 段,phonemes 只存纯音素)
const normIpa = (x) => x.replace(/[/ˈˌ.\s]/g, "");
// 词素串解析:morphSeed "ac(=to) + celer(快速的) + ate(使…) → 加速" → ["ac","celer","ate"];
// ECDICT root "tend, tent, tens = stretch (Latin)" → ["tend","tent","tens"]
// 判别:morphSeed 含 "→"(箭头)——注意 "ac(=to)" 括号内的 = 不能当 ECDICT 判据(实测踩坑)
function parseSeedMorphemes(seedText) {
  if (!seedText) return null;
  if (seedText.includes("→") || (!seedText.includes("=") && seedText.includes("+"))) {
    // morphSeed:按 + 分段,取每段第一个括号前的字母串
    return seedText.split("+").map((s) => {
      const m = s.trim().match(/^([a-zA-Z]+)/);
      return m ? m[1].toLowerCase() : "";
    }).filter(Boolean);
  }
  if (seedText.includes("=")) {
    // ECDICT root:取 = 左侧词根列表
    const lhs = seedText.split("=")[0] ?? "";
    return lhs.split(/[,，]/).map((s) => s.trim().replace(/^[-\s]+|[-\s]+$/g, "").toLowerCase()).filter((s) => /^[a-z]+$/.test(s));
  }
  return null;
}
function validate(field, parsed, word, ipaInput, seedText) {
  const errs = [];
  if (field === "morph") {
    // skip 通道:双无证据词 LLM 自判弃答,合法终态
    if (parsed.skip === true) {
      if (seedText) return [`有词源依据却输出 skip——禁止`];
      return []; // 调用方识别 parsed.skip 走 skip 分支
    }
    const m = parsed.morph;
    if (!m || typeof m !== "object") return ["morph 缺失"];
    // 模板偏离容错:模型偶发把 piece 写成 text(内容正确、仅键名偏离),归一化后重查而非浪费重试
    if (Array.isArray(m.pieces)) {
      for (const p of m.pieces) {
        if (!p.piece && p.text) { p.piece = p.text; delete p.text; }
      }
    }
    if (!["derived", "compound", "blend"].includes(m.type)) errs.push(`type=${m.type} 非法`);
    if (!Array.isArray(m.pieces) || m.pieces.length === 0) errs.push("pieces 空");
    else {
      const joined = m.pieces.map((p) => (p.piece ?? "")).join("").replace(/[-\s]/g, "").toLowerCase();
      // 连字符词两侧都归一化(pieces 拼合无连字符,word 原文有,直接比对必败,如 easy-going)
      if (joined !== word.replace(/[-\s]/g, "").toLowerCase()) errs.push(`pieces 拼合「${joined}」≠ ${word}`);
      // piece 级交叉校验(2026-09-07 新增):生成结果必须落在种子词素边界上
      if (seedText) {
        const seedMorphs = parseSeedMorphemes(seedText);
        if (seedMorphs?.length) {
          if (seedText.includes("=")) {
            // ECDICT root:≥1 个 piece 命中词根集合(词根常带屈折/连接元音变体,如 -ial vs -al,四向容忍)
            const hit = m.pieces.some((p) => {
              const pc = (p.piece ?? "").replace(/[-\s]/g, "").toLowerCase();
              return seedMorphs.some((r) => pc === r || pc.startsWith(r) || r.startsWith(pc) || pc.endsWith(r) || r.endsWith(pc));
            });
            if (!hit) errs.push(`pieces 均未命中 ECDICT 词根 [${seedMorphs.join(",")}]——疑似杜撰`);
          } else {
            // morphSeed:双向集合一致(忽略连字符;允许模型把词素写成带前/后缀连字符的形式)
            const norm = (s) => s.replace(/[-\s]/g, "").toLowerCase();
            const genSet = new Set(m.pieces.map((p) => norm(p.piece ?? "")).filter(Boolean));
            const seedSet = new Set(seedMorphs);
            const same = genSet.size === seedSet.size && [...genSet].every((g) => seedSet.has(g) || [...seedSet].some((s) => g.endsWith(s) || s.endsWith(g)));
            if (!same) errs.push(`pieces [${[...genSet].join(",")}] 与词源依据 [${seedMorphs.join(",")}] 不一致——禁止改动词素划分`);
          }
        }
      }
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
    // 重音标记硬校验(100词审查发现的盲区):主重音段首必须 ˈ;ˌ 段必须在 secondary;孤立辅音不成音节
    const mainSeg = s.ipa?.[s.stress] ?? "";
    if (mainSeg && !String(mainSeg).startsWith("ˈ")) errs.push(`主重音段 ipa[${s.stress}]「${mainSeg}」缺 ˈ 前缀`);
    (s.ipa ?? []).forEach((seg, i) => {
      if (i === s.stress) return;
      if (String(seg).includes("ˌ") && !(s.secondary ?? []).includes(i)) errs.push(`段${i}「${seg}」带 ˌ 但 secondary 未含`);
    });
    (s.parts ?? []).forEach((p, i) => {
      if (/^[a-z]$/i.test(p) && !/[aeiouy]/i.test(p)) errs.push(`段${i}「${p}」为孤立辅音,不成音节`);
    });
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
    const posOk = /^(n|v|adj|adv|phr)\.((\/|\s*)(n|v|adj|adv|phr)\.)*$/;
    for (const it of d) {
      if (!it.word || !it.pos || !it.meaningZh) errs.push(`derives 缺字段: ${JSON.stringify(it).slice(0, 80)}`);
      if (it.word?.toLowerCase() === word.toLowerCase()) errs.push(`派生词与主词相同: ${it.word}`);
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
const CONC = args.conc ? parseInt(args.conc, 10) : 1;
const batchSummary = { skip: [], fail: [] };

async function runWord(word, opts = {}) {
  const fields = opts.fields ?? FIELDS;
  console.log(`\n========== ${word} ==========`);
  const row = getWord.get(word);
  if (!row) { console.error(`  ✗ 词库中不存在: ${word}`); return; }
  const content = JSON.parse(row.content_json ?? "{}");
  const ipa = row.phonetic_uk || "";
  const meaningZh = (content.translation ?? []).join("; ") || "(暂无释义)";

  // --tts-only:只补已存在 contexts 的缺失音频(幂等;不调 LLM、不重合成已有音频)
  if (TTS_ONLY) {
    if (!Array.isArray(content.contexts) || !content.contexts.length) {
      console.log("  ↷ 无 contexts,跳过");
      return;
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
    return;
  }

  if (REBUILD) for (const k of ["morph", "syl", "derives", "contexts"]) delete content[k];

  const generated = {};   // 成功字段
  const failures = {};    // 失败字段 → 原因

  for (const field of fields) {
    const dbKey = field === "context" ? "contexts" : field;
    if (!REBUILD && content[dbKey] !== undefined) {
      console.log(`  ↷ ${field}: 已存在(跳过;--rebuild 可重建)`);
      continue;
    }
    // morph 种子注入(D7):seed=必跑不开放 skip;root=次级依据不开放 skip;judge=双无,LLM 自判
    let seedText = null;
    let judgeSkipAllowed = false;
    if (field === "morph") {
      const [tier, skipOk] = morphTier(content, word);
      judgeSkipAllowed = skipOk;
      if (tier === "seed") seedText = `词根拆分记忆法(权威):${content.morphSeed}`;
      else if (tier === "root") seedText = `词典词根(权威):${content.root}`;
    }
    // 种子/判词素材每次 try 保持一致(重试是格式问题,不是素材问题)
    let done = false;
    for (let n = 1; n <= TRIES_PER_FIELD && !done; n++) {
      const t0 = Date.now();
      try {
        const prompt = PROMPTS[field](word, ipa, meaningZh, field === "morph" ? seedText : undefined);
        const { parsed, usage, rawContent } = await llmJson(prompt);
        // skip 通道:仅双无证据词合法;拿到即终态,不重试
        if (field === "morph" && parsed.skip === true) {
          const errs = validate(field, parsed, word, undefined, seedText);
          await dumpDebug(word, field, n, { status: "skip", latencyMs: Date.now() - t0, tokens: usage, rawContent, reason: parsed.reason ?? "", validation: errs });
          if (errs.length) { console.warn(`  ✗ ${field} try${n} skip 被拒: ${errs.join("; ")}`); continue; }
          if (!judgeSkipAllowed) { console.warn(`  ✗ ${field} try${n} skip 被拒: 有词源依据不允许 skip`); continue; }
          console.log(`  ⊘ ${field} try${n} LLM 自判 skip: ${String(parsed.reason ?? "").slice(0, 80)}(不入库)`);
          batchSummary.skip.push({ word, reason: String(parsed.reason ?? "").slice(0, 120) });
          done = true;
          continue;
        }
        const errs = validate(field, parsed, word, field === "syl" ? ipa : undefined, field === "morph" ? seedText : undefined);
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
    if (!done) {
      failures[field] = `${TRIES_PER_FIELD} 次尝试均失败(详见 data/mnemonic-debug/${word}/)`;
      batchSummary.fail.push({ word, field });
    }
  }

  // TTS:成功生成的 contexts 逐句合成音频(--dry-run 跳过:防止按未入库的新例句覆盖线上音频文件)
  if (DRY_RUN) {
    console.log("  (dry-run) 跳过 TTS");
  } else if (generated.contexts?.length) {
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

  // 写回(幂等 merge;--dry-run 只打印)。LLM 输出英文域可能带弯引号,merge 前归一化
  if (!DRY_RUN && Object.keys(generated).length) {
    walkEnPunct(generated);
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

// ===== 批量模式(--book):D7 选词 + worker 并发池 =====
if (BOOK) {
  const { tasks, stats } = await buildBatchList(BOOK);
  console.log(`[D7 选词] book=${BOOK} fields=${FIELDS.join(",")}`);
  console.log(`  morph 任务: ${tasks.morph.length}(seed ${stats.morph.seed} / root ${stats.morph.root} / judge ${stats.morph.judge}), D7 放弃 ${stats.morph.drop}, 已有 ${stats.morph.have ?? 0}`);
  console.log(`  syl 任务: ${tasks.syl.length}(可生成 ${stats.syl.run}, 缺音标跳过 ${stats.syl.skipNoIpa}, 短语跳过 ${stats.syl.skipPhrase}), 已有 ${stats.syl.have ?? 0}`);
  const all = [
    ...tasks.morph.map((t) => ({ word: t.word, fields: ["morph"] })),
    ...tasks.syl.map((t) => ({ word: t.word, fields: ["syl"] })),
  ];
  let idx = 0;
  let done = 0;
  const worker = async () => {
    while (idx < all.length) {
      const t = all[idx++];
      await runWord(t.word, { fields: t.fields });
      done++;
      if (done % 10 === 0 || done === all.length) {
        console.log(`\n[进度] ${done}/${all.length}(skip ${batchSummary.skip.length}, fail ${batchSummary.fail.length})`);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONC, all.length) || 1 }, worker));
  console.log(`\n[gen-mnemonic 批量完成] 共 ${all.length} 词 | skip ${batchSummary.skip.length} | fail ${batchSummary.fail.length}`);
  if (batchSummary.skip.length) {
    console.log("[skip 明细]");
    for (const s of batchSummary.skip) console.log(`  ${s.word}: ${s.reason}`);
  }
  if (batchSummary.fail.length) {
    console.log("[fail 明细]");
    for (const f of batchSummary.fail) console.log(`  ${f.word}: ${f.field}`);
  }
  sqlite.close();
  process.exit(0);
}

for (const word of WORDS) {
  await runWord(word);
}
sqlite.close();
console.log("\n[gen-mnemonic] done");
