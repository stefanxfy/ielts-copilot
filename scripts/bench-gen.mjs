#!/usr/bin/env node
/**
 * scripts/bench-gen.mjs — GLM-5.3(coding plan) vs MiniMax-M3 生成质量对比实验
 *
 * 目的:同一批样本词 × 同一套 prompt × 双模型各自生成四字段助记数据,
 *      再由同一审校模型盲评,量化对比两模型生成质量(根因:模型能力 vs 提示词约束)。
 *
 * 设计:
 *   - PROMPTS / validate / stemHits 全部从 gen-mnemonic.mjs 平移(保证"同一提示词约束"变量受控)
 *   - 12 个样本词 = 6 重灾词(consequence 等)+ 6 干净对照词(accelerate 等)
 *   - 双模型产物落 data/bench/{glm5|minimax}/{word}.json,原始返回留痕 data/bench/{model}/raw/
 *   - 不写词库,纯旁路实验
 *
 * 用法:
 *   node scripts/bench-gen.mjs --model=glm5      # 跑 GLM-5.3(coding plan 端点)
 *   node scripts/bench-gen.mjs --model=minimax   # 跑 MiniMax-M3(config.json 端点)
 *   node scripts/bench-gen.mjs --model=glm5 --words=hamper,challenge  # 自选词
 *   node scripts/bench-gen.mjs --model=glm5 --tools   # function calling 强制结构化(产物落 {model}-tool/)
 *   node scripts/bench-gen.mjs --judge                # 盲评纯文本模式产物
 *   node scripts/bench-gen.mjs --judge --suffix=-tool # 盲评 tool 模式产物
 */
import Database from "better-sqlite3";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";

// ===== CLI =====
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  }),
);
const MODEL_KEY = args.model; // "glm5" | "minimax"
const JUDGE_ONLY = !!args.judge;
const USE_TOOLS = !!args.tools; // function calling 结构化输出对照实验
const SUFFIX = USE_TOOLS ? "-tool" : ""; // 生成产物目录后缀
const JUDGE_SUFFIX = args.suffix ?? ""; // judge 模式读取后缀
const FIELDS = ["morph", "syl", "derives", "context"];
const TRIES_PER_FIELD = 3;

// 样本词:6 重灾(审查 error 多字段)+ 6 干净对照(零 issue)
const DEFAULT_WORDS = [
  "consequence", "consistent", "controversial", "contribute", "crucial", "convince",
  "accelerate", "accommodate", "acquire", "adapt", "adequate", "adjust",
];
const WORDS = (args.words ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const SAMPLE_WORDS = WORDS.length ? WORDS : DEFAULT_WORDS;

if (!MODEL_KEY && !JUDGE_ONLY) {
  console.error("用法: node scripts/bench-gen.mjs --model=glm5|minimax [--words=a,b] | --judge");
  process.exit(1);
}

// ===== config.json(JSONC 剥注释,与 gen-mnemonic.mjs 同款) =====
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

// ===== 双模型端点配置 =====
// GLM-5.3: coding plan 订阅走专用端点 /api/coding/paas/v4,强制开思考(reasoning_effort=low 控制耗时)
// MiniMax-M3: config.json 端点,推理模型必须关 thinking(写作批改实测教训)
const PROVIDERS = {
  glm5: {
    label: "GLM-5.3",
    baseUrl: "https://open.bigmodel.cn/api/coding/paas/v4",
    apiKey: CFG.llm.glmApiKey, // coding plan key,只存 config.json(已 gitignore),不硬编码进脚本
    model: "glm-5.3",
    bodyExtra: { thinking: { type: "enabled" }, reasoning_effort: "low" },
    timeoutMs: 180000,
  },
  minimax: {
    label: "MiniMax-M3",
    baseUrl: CFG.llm.baseUrl,
    apiKey: CFG.llm.apiKey,
    model: CFG.llm.gradingModel,
    bodyExtra: { thinking: { type: "disabled" } },
    timeoutMs: 120000,
  },
};

// ===== DB(只读,取词与音标) =====
const sqlite = new Database("./data/app.db", { readonly: true });
const getWord = sqlite.prepare("SELECT id, word, phonetic_uk, content_json FROM words WHERE word = ?");

// ===== debug 落盘 =====
const BENCH_DIR = join(process.cwd(), "data", "bench");
async function dump(outDir, name, payload) {
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, name), JSON.stringify(payload, null, 2), "utf8");
}

// ===== LLM 调用(OpenAI 协议,与 gen-mnemonic.mjs llmJson 同款解析;tools 模式走 tool_calls.arguments) =====
async function llmJson(provider, userPrompt, toolDef = null) {
  const body = {
    model: provider.model,
    messages: [
      { role: "system", content: "你只输出一个 JSON 对象——不要 markdown 围栏、不要解释文字。中文一律简体。" },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 4096,
    temperature: 0.6,
    ...provider.bodyExtra,
  };
  if (toolDef) {
    body.tools = [{ type: "function", function: toolDef }];
    body.tool_choice = { type: "function", function: { name: toolDef.name } };
  }
  const resp = await fetch(`${provider.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${provider.apiKey}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(provider.timeoutMs),
  });
  const rawText = await resp.text();
  const fail = (msg) => { const e = new Error(msg); e.rawText = rawText; throw e; };
  if (!resp.ok) fail(`HTTP ${resp.status} ${rawText.slice(0, 300)}`);
  let raw;
  try { raw = JSON.parse(rawText); } catch { fail(`响应非 JSON: ${rawText.slice(0, 200)}`); }
  const msg = raw?.choices?.[0]?.message;

  // tools 模式:优先 tool_calls[0].function.arguments;GLM 怪癖:偶尔仍写进 content,兜底解析 content
  if (toolDef) {
    const call = msg?.tool_calls?.[0];
    const argsStr = call?.function?.arguments;
    if (typeof argsStr === "string" && argsStr.trim()) {
      let parsed;
      try { parsed = JSON.parse(argsStr); } catch (e) { fail(`arguments JSON 解析失败: ${argsStr.slice(0, 200)}`); }
      return { parsed, usage: raw?.usage?.total_tokens, rawContent: argsStr };
    }
    // 兜底:content 里的 JSON(GLM tool_choice 不完全兼容的已知行为)
    const fallback = typeof msg?.content === "string" ? msg.content : "";
    const start = fallback.indexOf("{");
    if (start >= 0) {
      let depth = 0, end = -1, inStr = false, esc = false;
      for (let i = start; i < fallback.length; i++) {
        const ch = fallback[i];
        if (inStr) { if (esc) esc = false; else if (ch === "\\") esc = true; else if (ch === '"') inStr = false; continue; }
        if (ch === '"') inStr = true;
        else if (ch === "{") depth++;
        else if (ch === "}") { depth--; if (depth === 0) { end = i; break; } }
      }
      if (end > 0) {
        try {
          const parsed = JSON.parse(fallback.slice(start, end + 1));
          console.warn("  ℹ tool_calls 缺失,已从 content 兜底解析(GLM 协议怪癖)");
          return { parsed, usage: raw?.usage?.total_tokens, rawContent: fallback };
        } catch { /* 落到下面的 fail */ }
      }
    }
    fail(`tool_calls 缺 arguments: ${JSON.stringify(msg).slice(0, 200)}`);
  }

  // 纯文本模式:剥围栏 + 取首个 {...} 平衡块
  const content = msg?.content;
  if (typeof content !== "string" || !content.trim()) fail("响应缺少 content");
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
  try { parsed = JSON.parse(slice); } catch (e) { fail(`JSON 解析失败: ${slice.slice(0, 200)}`); }
  return { parsed, usage: raw?.usage?.total_tokens, rawContent: content };
}

// ===== 四字段 function schema(JSON Schema;语义规则仍在 prompt,Schema 只锁形状) =====
const TOOL_SCHEMAS = {
  morph: {
    name: "submit_morph",
    description: "提交构词分析结果",
    parameters: {
      type: "object",
      properties: {
        morph: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["derived", "compound", "blend"] },
            literal: { type: "string" },
            pieces: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  piece: { type: "string" },
                  kind: { type: "string", enum: ["prefix", "root", "suffix", "word", "blend-head", "blend-tail"] },
                  meaningZh: { type: "string" },
                  fromWord: { type: "string" },
                },
                required: ["piece", "kind", "meaningZh"],
              },
            },
          },
          required: ["type", "literal", "pieces"],
        },
      },
      required: ["morph"],
    },
  },
  syl: {
    name: "submit_syl",
    description: "提交音节+音素双层读音解析",
    parameters: {
      type: "object",
      properties: {
        syl: {
          type: "object",
          properties: {
            parts: { type: "array", items: { type: "string" } },
            ipa: { type: "array", items: { type: "string" } },
            stress: { type: "integer" },
            secondary: { type: "array", items: { type: "integer" } },
            phonemes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  p: { type: "string" },
                  syl: { type: "integer" },
                  type: { type: "string", enum: ["vowel", "consonant"] },
                  desc: { type: "string" },
                },
                required: ["p", "syl", "type", "desc"],
              },
            },
            combos: { type: "array", items: { type: "object", properties: { letters: { type: "string" }, sound: { type: "string" }, desc: { type: "string" } } } },
            notes: { type: "array", items: { type: "string" } },
          },
          required: ["parts", "ipa", "stress", "phonemes"],
        },
      },
      required: ["syl"],
    },
  },
  derives: {
    name: "submit_derives",
    description: "提交同族派生词列表",
    parameters: {
      type: "object",
      properties: {
        derives: {
          type: "array",
          items: {
            type: "object",
            properties: {
              word: { type: "string" },
              pos: { type: "string" },
              meaningZh: { type: "string" },
            },
            required: ["word", "pos", "meaningZh"],
          },
        },
      },
      required: ["derives"],
    },
  },
  context: {
    name: "submit_contexts",
    description: "提交真实语境例句列表",
    parameters: {
      type: "object",
      properties: {
        contexts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              coll: { type: "string" },
              collZh: { type: "string" },
              en: { type: "string" },
              cn: { type: "string" },
            },
            required: ["coll", "en"],
          },
        },
      },
      required: ["contexts"],
    },
  },
};

// ===== stemHits(与 gen-mnemonic.mjs 完全一致) =====
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
      return hit(w, 4) || (w.length > 3 && hit(w, 3));
    });
}

// ===== PROMPTS(与 gen-mnemonic.mjs 逐字一致,保证提示词变量受控) =====
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
    `输出前自查:把各 piece 依序拼接、去掉连字符和括号,必须与 ${w} 逐字符完全相同——不得多写、漏写或改写任何字母(如 ${w} 不能拼成别的拼写)。`,
    `- piece 写实际参与拼写的字符,禁止括号注记或变体写法(如写 facil 而非 "facil(e)");词源形式接后缀时省音的(如 facile→facil-、able→abil-),按省音后的实际拼写写`,
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

// ===== validate(与 gen-mnemonic.mjs 逐字一致) =====
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
      if (ipaJoined !== inputJoined) console.warn(`  ℹ syl 音标与库内不同变体(模型 ${s.ipa?.join("")} vs 库内 ${ipaInput})——内部自洽即放行`);
    }
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

// ===== 生成模式 =====
async function runGenerate(providerKey) {
  const provider = PROVIDERS[providerKey];
  const outDir = join(BENCH_DIR, providerKey + SUFFIX);
  const rawDir = join(outDir, "raw");
  await mkdir(rawDir, { recursive: true });
  console.log(`\n===== ${provider.label}${USE_TOOLS ? " [tools]" : ""} (${provider.model}) =====`);
  let structFails = 0, callFails = 0, totalCalls = 0;

  for (const word of SAMPLE_WORDS) {
    console.log(`\n--- ${word} ---`);
    const row = getWord.get(word);
    if (!row) { console.error(`  ✗ 词库中不存在: ${word}`); continue; }
    const content = JSON.parse(row.content_json ?? "{}");
    const ipa = row.phonetic_uk || "";
    const meaningZh = (content.translation ?? []).join("; ") || "(暂无释义)";

    const fieldsOut = {};
    for (const field of FIELDS) {
      let done = false;
      for (let n = 1; n <= TRIES_PER_FIELD && !done; n++) {
        const t0 = Date.now();
        totalCalls++;
        try {
          const prompt = PROMPTS[field](word, ipa, meaningZh);
          const toolDef = USE_TOOLS ? TOOL_SCHEMAS[field] : null;
          const { parsed, usage, rawContent } = await llmJson(provider, prompt, toolDef);
          const errs = validate(field, parsed, word, field === "syl" ? ipa : undefined);
          await dump(rawDir, `${word}-${field}-try${n}.json`, {
            latencyMs: Date.now() - t0, tokens: usage, rawContent, parsed, validation: errs,
          });
          if (errs.length) {
            structFails++;
            console.warn(`  ✗ ${field} try${n} 结构校验不过: ${errs.join("; ").slice(0, 120)}`);
            continue;
          }
          fieldsOut[field] = parsed[field === "context" ? "contexts" : field];
          console.log(`  ✓ ${field} try${n}(${Date.now() - t0}ms, ${usage ?? "?"} tok)`);
          done = true;
        } catch (e) {
          callFails++;
          await dump(rawDir, `${word}-${field}-try${n}.json`, { latencyMs: Date.now() - t0, error: String(e), rawText: e.rawText ?? undefined });
          console.warn(`  ✗ ${field} try${n} 调用失败: ${String(e).slice(0, 140)}`);
        }
      }
      if (!done) console.warn(`  ⚠ ${field} 3 次尝试均失败`);
    }
    await dump(outDir, `${word}.json`, { word, ipa, model: provider.model, mode: USE_TOOLS ? "tools" : "text", generatedAt: new Date().toISOString(), fields: fieldsOut });
  }
  console.log(`\n[${provider.label}] 完成:调用 ${totalCalls} 次,结构校验失败 ${structFails},调用失败 ${callFails}`);
}

// ===== 审评模式:同一审校模型盲评双模型产物 =====
// 审校用 MiniMax-M3(config.json 端点),与此前 100 词审查同款 prompt,保证尺度一致
async function runJudge() {
  const mm = PROVIDERS.minimax;
  const judgeOut = {};
  const reviewPrompt = (word, ipa, data) => [
    `你是雅思词汇教学的资深审校。以下是单词 ${word}(音标 ${ipa})的 AI 生成助记数据,请逐字段审查内容是否有误。`,
    ``,
    `审查维度(只报明确错误,不报风格偏好):`,
    `1. morph: 词根词缀含义错误、literal 直译与 pieces 语义矛盾、type 分类明显不当`,
    `2. syl: 音标拼写错误(非合法变体而是真错)、stress 主重音位置错误、phonemes 发音描述错误`,
    `3. derives: 拼写错误、与主词非同族/非近义、pos 词性错误、meaningZh 释义错误`,
    `4. contexts: en 语法错误或搭配不地道(中国式英语)、cn 翻译错误或漏译、collZh 中文不当`,
    ``,
    `注意:音标存在合法变体(英/美、弱读差异),仅当拼写本身错误才报;释义允许合理表述差异。`,
    ``,
    `输出模板(无问题输出 {"issues":[]}):`,
    `{ "issues": [ { "field": "morph|syl|derives|contexts", "severity": "error|warn", "detail": "具体哪里错、正确应是什么" } ] }`,
    ``,
    `待审查数据(JSON):`,
    JSON.stringify(data),
  ].join("\n");

  for (const word of SAMPLE_WORDS) {
    console.log(`\n--- judge ${word} ---`);
    judgeOut[word] = {};
    for (const key of Object.keys(PROVIDERS)) {
      const file = join(BENCH_DIR, key + JUDGE_SUFFIX, `${word}.json`);
      let data;
      try {
        data = JSON.parse(await readFile(file, "utf8")).fields;
      } catch { console.warn(`  ↷ ${key} 无产物,跳过`); continue; }
      const row = getWord.get(word);
      const ipa = row?.phonetic_uk || "";
      let issues = [];
      for (let t = 1; t <= 3; t++) {
        try {
          const r = await llmJson(mm, reviewPrompt(word, ipa, data));
          issues = Array.isArray(r.parsed.issues) ? r.parsed.issues : [];
          break;
        } catch (e) { console.warn(`  try${t} 失败: ${String(e).slice(0, 100)}`); }
      }
      const errors = issues.filter((x) => x.severity === "error");
      judgeOut[word][key] = { total: issues.length, errors: errors.length, issues };
      console.log(`  ${PROVIDERS[key].label}: ${issues.length} 条(${errors.length} error)`);
    }
  }
  await dump(BENCH_DIR, `judge-result${JUDGE_SUFFIX}.json`, { judgedAt: new Date().toISOString(), judgeModel: mm.model, mode: JUDGE_SUFFIX || "text", words: SAMPLE_WORDS, result: judgeOut });
  // 汇总
  console.log(`\n===== 盲评汇总${JUDGE_SUFFIX}(审校: ${mm.model}) =====`);
  for (const key of Object.keys(PROVIDERS)) {
    const entries = Object.entries(judgeOut).filter(([, v]) => v[key]);
    const total = entries.reduce((s, [, v]) => s + v[key].total, 0);
    const errors = entries.reduce((s, [, v]) => s + v[key].errors, 0);
    console.log(`${PROVIDERS[key].label}: ${entries.length} 词,issues ${total} 条,其中 error ${errors} 条`);
  }
}

// ===== 入口 =====
if (JUDGE_ONLY) {
  await runJudge();
} else {
  await runGenerate(MODEL_KEY);
}
console.log("\n[bench-gen] done");
