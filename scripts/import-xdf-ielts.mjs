#!/usr/bin/env node
/**
 * scripts/import-xdf-ielts.mjs — 新东方雅思词汇 3575 导入(P0)
 * 对齐:docs/新东方雅思词汇3575入库计划.md §3 转换规则(决策点 D1-D6 已拍板)
 *
 * 转换规则:
 *   - headWord → words.word(小写);与存量查重,重叠词主内容一律不动(origin=baicizhan 先到)
 *   - ukphone/usphone → phonetic_uk/phonetic_us(' → ˈ,外包 /…/;§2 坑 1)
 *   - trans → translation[](首段 pos.段1,清洗中文标点后空格)+ definition[](tranOther 合并去重)
 *   - sentence.sentences 例句全取(D3) → contexts[] {en,cn,src:"example"},词组命中条带 coll/collZh;
 *     首条另存 examples[0](语境默写卡判分唯一来源);音频 P2 合成后回写
 *   - phrase.phrases → collocations[] {phrase,cn}(v2.8 规则:去空格/词组=词头剔除/lower 去重)
 *   - relWord.rels → derives[] 直转(D2):hwd→word, tran→meaningZh, pos→标准缩写,上限 5 条
 *   - remMethod.val → morphSeed 整存(D1);存量重叠词按 §7 分桶做 morph 确定性修复(split 格式解析直出)
 *   - wordRank → book_word_relation.order(0 起 = wordRank-1)
 *
 * 存量 633 词 morph 修复(§7):分段一致 55(不动)/不一致 22+整词 2(重生成)/
 * 有 remMethod 无 morph 339(补生成)/无 remMethod 22(不动)/affix 词(保护跳过)。
 * 解析规则:remMethod `片段(意思) + 片段 → 字面 → 释义` 确定性拆分;片段无括号意思时查
 * 词缀兜底表;查不到或拼合 ≠ 词头 → 放弃 morph(只留 morphSeed),宁可少生成不生成垃圾。
 *
 * 幂等:重复运行不重复插词;重叠词 morphSeed/morph 已存在跳过;bwr 清旧重挂。
 * 用法:node scripts/import-xdf-ielts.mjs [--apply] [jsonPath]
 *   默认 dry-run 只打印报告;--apply 写库前自动备份 data/app.db
 */
import { createRequire } from "node:module";
import { copyFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");

const APPLY = process.argv.includes("--apply");
const jsonArg =
  process.argv.find((a) => a.endsWith(".json")) ??
  "/Users/fanyunxu/Downloads/新东方雅思词汇.json";
if (!existsSync(jsonArg)) {
  console.error(`✗ 词书 JSON 不存在: ${jsonArg}`);
  process.exit(1);
}

const BOOK_ID = "ielts-xdf-3575";
const BOOK_NAME = "新东方雅思词汇 3575";
const BOOK_DESC = "新东方雅思词汇(bookId=IELTS_3 百词斩导出),3575 词;例句全取+词组+同根直转+morphSeed。";
const DERIVES_CAP = 5;

/* ---------- 词性映射(gen-mnemonic posOk 值域一致) ---------- */
const POS_MAP = { n: "n.", v: "v.", vt: "v.", vi: "v.", adj: "adj.", adv: "adv." };
const POS_OK = /^(n|v|adj|adv|phr)\.((\/|\s*)(n|v|adj|adv|phr)\.)*$/;

/* ---------- 词缀兜底表(片段无括号意思时查;查不到放弃 morph) ---------- */
const PREFIX_SET = new Set(
  ("a ab ac ad af ag al ana anti ap ar as auto be bi co col com con contra contro de di dis dys em en ex fore " +
    "il im in inter ir mal mis mono multi non oc of op out over post pre pro re " +
    "semi sub super sur tele trans tri ultra un under uni bene circum").split(" "),
);
const PREFIX_FALLBACK = {
  a: "加强意义;否定", ab: "离开", ac: "向;加强(ad- 在 c 前)", ad: "朝向", af: "向;加强(ad- 在 f 前)",
  ag: "向;加强(ad- 在 g 前)", al: "向;加强(ad- 在 l 前)", ana: "贯穿;分开", anti: "反对;抗",
  ap: "向;加强(ad- 在 p 前)", ar: "向;加强(ad- 在 r 前)", as: "向;加强(ad- 在 s 前)", auto: "自动;自己",
  be: "使…;加强", bene: "善;好", bi: "双;二", circum: "周围", co: "共同",
  col: "共同(在 l 前)", com: "共同;加强", con: "共同;加强", contra: "相反", contro: "相反",
  de: "去除;向下;加强", di: "二;分开", dis: "消失;否定;分开",
  dys: "不良;困难", em: "使进入…(在 b/m/p 前)", en: "使进入…", ex: "向外; Former",
  fore: "前;预先", il: "否定(在 l 前)", im: "否定(在 b/m/p 前);进入", in: "进入;否定",
  inter: "在…之间;相互", ir: "否定(在 r 前)", mal: "坏;恶", mis: "错误",
  mono: "单一", multi: "多", non: "非;不", oc: "向;加强(ob- 在 c 前)", of: "向;加强(ob- 在 f 前)",
  op: "向;加强(ob- 在 p 前)", out: "超过;向外", over: "在…之上;过度",
  post: "在后", pre: "预先;在前", pro: "向前;支持", re: "再次;返回", semi: "半",
  sub: "在下;次级", super: "超越", sur: "在上;超越", tele: "远", trans: "横过;转移",
  tri: "三", ultra: "极端;超", un: "否定;解开", under: "在…之下;不足", uni: "单一",
};
const SUFFIX_FALLBACK = {
  ability: "名词后缀,表能力", able: "形容词后缀,可…的", ible: "形容词后缀,可…的",
  acy: "名词后缀,表性质状态", age: "名词后缀,表行为;总称", al: "形容词后缀,…的;亦作名词表行为",
  ance: "名词后缀,表性质状态", ence: "名词后缀,表性质状态", ent: "形容词后缀,…的;亦作名词表…的人(物)",
  ant: "形容词后缀,…的;亦作名词表…的人(物)", ary: "形容词后缀,…的;亦作名词表场所集合",
  ate: "动词后缀,使成为…", ation: "名词后缀,表行为过程", ition: "名词后缀,表行为过程",
  tion: "名词后缀,表行为;结果", sion: "名词后缀,表行为;结果", ion: "名词后缀,表行为结果",
  cy: "名词后缀,表性质状态", ee: "名词后缀,表受动者", er: "名词后缀,表…的人(物)",
  or: "名词后缀,表…的人(物)", ess: "名词后缀,表女性", ette: "名词后缀,表小",
  ful: "形容词后缀,充满…的", fy: "动词后缀,使…化", ify: "动词后缀,使…化",
  ize: "动词后缀,使…化", ise: "动词后缀,使…化", hood: "名词后缀,表身份;时期",
  ic: "形容词后缀,…的", ical: "形容词后缀,…的", ile: "形容词后缀,可…的;名词后缀表物",
  ing: "动名词/形容词后缀", ish: "形容词后缀,略…的", ism: "名词后缀,表主义;行为",
  ist: "名词后缀,表从事者", ity: "名词后缀,表性质状态", ive: "形容词后缀,…的",
  less: "形容词后缀,无…的", let: "名词后缀,表小", ly: "副词后缀,…地;形容词后缀,如…的",
  ment: "名词后缀,表行为;结果", ness: "名词后缀,表性质状态", ology: "名词后缀,表…学",
  ous: "形容词后缀,多…的", ship: "名词后缀,表身份;关系", ty: "名词后缀,表性质",
  ure: "名词后缀,表行为结果",   ward: "副词后缀,朝…方向", wise: "副词后缀,以…方式",
  y: "形容词后缀,多…的", ade: "名词后缀,表行为;产物", ude: "名词后缀,表性质状态",
  itude: "名词后缀,表性质状态", ial: "形容词后缀,…的", ual: "形容词后缀,…的",
};
/** 连接元音(remMethod 常见无实义单字母尾段,如 propose = pro + pos + e) */
const LINKING_VOWELS = new Set(["e", "o", "u", "i"]);

/* ---------- 工具 ---------- */
const log = (...a) => console.log("[xdf-import]", ...a);

function normPhon(s) {
  s = String(s ?? "").replace(/\s+/g, " ").trim();
  if (!s) return undefined;
  s = s.replace(/'/g, "ˈ"); // §2 坑 1:apostrophe 重音符 → IPA ˈ
  return s.startsWith("/") && s.endsWith("/") ? s : `/${s}/`;
}

/** 中文释义清洗:标点后多余空格 + 连续空格归一(§3:「取消， 废除」→「取消，废除」) */
function cleanZh(s) {
  return String(s ?? "")
    .replace(/，\s+/g, "，")
    .replace(/；\s+/g, "；")
    .replace(/：\s+/g, "：")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** joined 拼合(gen-mnemonic 同规则:去 - 与空格,lower) */
function piecesJoined(pieces) {
  return (pieces ?? []).map((p) => p.piece ?? "").join("").replace(/[-\s]/g, "").toLowerCase();
}

/** 逐段对比:片段文本(归一化)与 kind 序列全等才算一致(§7 分段对拍口径) */
function samePieces(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  return a.every(
    (p, i) =>
      String(p.piece ?? "").replace(/[-\s]/g, "").toLowerCase() ===
        String(b[i]?.piece ?? "").replace(/[-\s]/g, "").toLowerCase() && p.kind === b[i]?.kind,
  );
}

/** 整词误标型:pieces 仅 1 段且等于词头(「整体不可再拆分」式占位) */
function isWholeWord(morph, word) {
  const ps = morph?.pieces;
  return ps?.length === 1 && String(ps[0].piece ?? "").replace(/[-\s]/g, "").toLowerCase() === word.toLowerCase();
}

/* ---------- remMethod split 格式确定性解析(存量 morph 修复) ---------- */

/**
 * 解析 remMethod split 格式 → morph。
 * kind 判定优先级:①意思文本标注(「前缀/后缀/词根/字根」)②连字符书写③位置启发+兜底表。
 * prefix piece 补尾连字符(`contro-`)、suffix 补头连字符(`-ate`),与存量 LLM 格式一致。
 * 返回 {ok, morph, reason};全角＋/（）先归一化。
 */
function parseRemSplit(remSeed, word) {
  const norm = String(remSeed).replace(/＋/g, "+").replace(/（/g, "(").replace(/）/g, ")");
  const expr = norm.split("→")[0].trim();
  const raws = expr.split("+").map((s) => s.trim()).filter(Boolean);
  if (raws.length < 2) return { ok: false, reason: "片段<2" };
  const pieces = [];
  for (let i = 0; i < raws.length; i++) {
    const m = raws[i].match(/^([^(]+?)\s*(?:\(([^)]*)\))?$/);
    if (!m || !m[1].trim()) return { ok: false, reason: `片段无法解析:「${raws[i]}」` };
    const raw = m[1].trim();
    let meaning = (m[2] ?? "").trim();
    let kind;
    let core = raw.toLowerCase();
    // ① 意思文本标注最可信
    if (/前缀/.test(meaning)) kind = "prefix";
    else if (/后缀/.test(meaning)) kind = "suffix";
    else if (/词根|字根/.test(meaning)) kind = "root";
    // ② 书写连字符
    if (!kind && /-\s*$/.test(raw)) kind = "prefix";
    if (!kind && /^-\s*/.test(raw)) kind = "suffix";
    // ③ 位置启发 + 兜底表
    if (!kind) {
      if (i === 0 && PREFIX_SET.has(core)) kind = "prefix";
      else if (i === raws.length - 1 && SUFFIX_FALLBACK[core]) kind = "suffix";
      else if (i === raws.length - 1 && raws.length > 2 && LINKING_VOWELS.has(core)) kind = "root";
      else kind = "root";
    }
    if (!meaning) {
      meaning =
        kind === "prefix" ? PREFIX_FALLBACK[core] :
        kind === "suffix" ? SUFFIX_FALLBACK[core] :
        LINKING_VOWELS.has(core) ? "连接元音,无实义" : undefined;
    }
    if (!meaning) return { ok: false, reason: `片段「${raw}」无释义且不在兜底表` };
    // 连字符恢复(prefix 尾缀/suffix 头缀),root 原样
    let piece = raw.replace(/^-+|-+$/g, "");
    if (kind === "prefix") piece = `${piece}-`;
    else if (kind === "suffix") piece = `-${piece}`;
    // 意思标注为连接元音时归 root,不误标 suffix(兜底表命中但意思明示词根/连接)
    if (LINKING_VOWELS.has(core) && /连接/.test(meaning)) kind = "root";
    pieces.push({ piece, kind, meaningZh: meaning });
  }
  const joined = piecesJoined(pieces);
  if (joined !== word.toLowerCase()) return { ok: false, reason: `拼合「${joined}」≠ ${word}` };
  return {
    ok: true,
    morph: {
      type: "derived",
      literal: pieces.map((p) => `${p.piece} ${p.meaningZh}`).join(" + "),
      pieces,
    },
  };
}

/* ---------- 单词转换(§3 规则) ---------- */
function convertWord(o, fallbackRank) {
  const warnings = [];
  const head = String(o.headWord ?? "").trim();
  const w = head.toLowerCase();
  if (!w) return null;
  const c = o.content?.word?.content ?? {};

  // 音标
  const phoneticUk = normPhon(c.ukphone);
  const phoneticUs = normPhon(c.usphone);
  if (!phoneticUk) warnings.push("缺 ukphone");

  // translation / definition
  const translation = [];
  const defSet = new Set();
  for (const t of c.trans ?? []) {
    const pos = POS_MAP[String(t.pos ?? "").trim()];
    const cn = cleanZh(t.tranCn);
    if (cn) {
      const segs = cn.split(/[;；]/).map((s) => s.trim()).filter(Boolean);
      segs.forEach((seg, i) => translation.push(i === 0 && pos ? `${pos}${seg}` : seg));
    }
    const en = String(t.tranOther ?? "").replace(/\s+/g, " ").trim();
    if (en && !defSet.has(en)) defSet.add(en);
  }
  const definition = [...defSet];
  if (!translation.length) warnings.push("translation 为空");

  // 例句(全取)与首条
  const sentences = (c.sentence?.sentences ?? [])
    .map((s) => ({ en: String(s.sContent ?? "").trim(), cn: cleanZh(s.sCn) || undefined }))
    .filter((s) => s.en);

  // collocations(v2.8 规则)
  const collocations = [];
  const seenColl = new Set();
  for (const p of c.phrase?.phrases ?? []) {
    const phrase = String(p.pContent ?? "").replace(/\s+/g, " ").trim();
    if (!phrase || phrase.toLowerCase() === w) continue;
    const k = phrase.toLowerCase();
    if (seenColl.has(k)) continue;
    seenColl.add(k);
    const cn = cleanZh(p.pCn) || undefined;
    collocations.push({ phrase, ...(cn ? { cn } : {}) });
  }

  // contexts:例句全取,词组命中条带 coll/collZh(多命中取最长词组)
  const contexts = sentences.map((s) => {
    const low = s.en.toLowerCase();
    let hit = null;
    for (const col of collocations) {
      if (low.includes(col.phrase.toLowerCase()) && (!hit || col.phrase.length > hit.phrase.length)) hit = col;
    }
    return {
      ...(hit ? { coll: hit.phrase, ...(hit.cn ? { collZh: hit.cn } : {}) } : {}),
      en: s.en,
      ...(s.cn ? { cn: s.cn } : {}),
      src: "example",
    };
  });

  // examples[0] = 首条例句(默写卡判分唯一来源)
  const examples = sentences.length
    ? [{ en: sentences[0].en, ...(sentences[0].cn ? { cn: sentences[0].cn } : {}) }]
    : [];

  // derives 直转(D2):pos 映射不了的整组跳过;同词去重;上限 5
  const derives = [];
  const seenD = new Set();
  for (const rel of c.relWord?.rels ?? []) {
    const pos = POS_MAP[String(rel.pos ?? "").trim()];
    if (!pos) continue;
    for (const x of rel.words ?? []) {
      const dw = String(x.hwd ?? "").replace(/\s+/g, " ").trim();
      const dlow = dw.toLowerCase();
      const tran = cleanZh(x.tran);
      if (!dw || !tran || dlow === w || seenD.has(dlow)) continue;
      seenD.add(dlow);
      derives.push({ word: dw, pos, meaningZh: tran });
      if (derives.length >= DERIVES_CAP) break;
    }
    if (derives.length >= DERIVES_CAP) break;
  }

  // morphSeed(D1):remMethod 原样整存
  const remRaw = c.remMethod?.val;
  const morphSeed = remRaw && String(remRaw).trim() ? String(remRaw).trim() : undefined;

  const content = {
    translation,
    examples,
    ...(definition.length ? { definition } : {}),
    ...(collocations.length ? { collocations } : {}),
    ...(contexts.length ? { contexts } : {}),
    ...(morphSeed ? { morphSeed } : {}),
    ...(derives.length ? { derives } : {}),
  };

  const rank = Number.isFinite(o.wordRank) ? o.wordRank : fallbackRank;
  return { word: w, phoneticUk, phoneticUs, content, rank, morphSeed, warnings };
}

/* ================= 主流程 ================= */

// ① 读 JSONL 全量转换
const entries = [];
const jsonProblems = [];
const seenJsonWord = new Set();
let lineNo = 0;
for (const line of readFileSync(jsonArg, "utf8").split("\n")) {
  lineNo++;
  if (!line.trim()) continue;
  let o;
  try {
    o = JSON.parse(line);
  } catch (e) {
    jsonProblems.push(`行 ${lineNo}: JSON 解析失败 ${e.message.slice(0, 60)}`);
    continue;
  }
  const conv = convertWord(o, lineNo);
  if (!conv) {
    jsonProblems.push(`行 ${lineNo}: headWord 为空`);
    continue;
  }
  if (seenJsonWord.has(conv.word)) {
    jsonProblems.push(`行 ${lineNo}: JSON 内重复词「${conv.word}」(保留首个)`);
    continue;
  }
  seenJsonWord.add(conv.word);
  entries.push(conv);
}

// ② 读 DB 判定重叠
const db = new Database(join(process.cwd(), "data", "app.db"));
db.pragma("foreign_keys = ON");
let backupPath = null;
if (APPLY) {
  backupPath = join(process.cwd(), "data", `app.db.bak-xdf-p0-${Date.now()}`);
  copyFileSync(join(process.cwd(), "data", "app.db"), backupPath);
  log(`已备份 → ${backupPath}`);
}

const dbRows = db.prepare("SELECT id, word, content_json FROM words").all();
const dbByWord = new Map(dbRows.map((r) => [r.word.toLowerCase(), r]));

const newWords = [];
const overlapWords = [];
for (const e of entries) (dbByWord.has(e.word) ? overlapWords : newWords).push(e);

// affix 保护:重叠集合中的词根特殊词不参与任何回写(bwr 照常挂载)
const affixWords = new Set();
for (const e of overlapWords) {
  const row = dbByWord.get(e.word);
  try {
    if (JSON.parse(row.content_json)?.kind === "affix") affixWords.add(e.word);
  } catch { /* 解析失败按普通词处理 */ }
}

// ③ 存量重叠词 morph 修复分桶(§7)
const buckets = { consistent: 0, regenTry: 0, backfillTry: 0, noRem: 0, affix: 0 };
const morphWrite = []; // [{wordId, word, morph, morphSeed, tag: "regen"|"backfill"}]
const morphFail = [];  // 解析失败 [{word, reason}]
const seedOnly = [];   // 只补 morphSeed 的重叠词
for (const e of overlapWords) {
  if (affixWords.has(e.word)) {
    buckets.affix++;
    continue;
  }
  const row = dbByWord.get(e.word);
  let cj;
  try {
    cj = JSON.parse(row.content_json);
  } catch {
    morphFail.push({ word: e.word, reason: "存量 content_json 解析失败" });
    continue;
  }
  const existing = cj.morph;
  const parsed = e.morphSeed ? parseRemSplit(e.morphSeed, e.word) : { ok: false, reason: "无 remMethod" };
  // §7 口径:解析出的标准分段与存量逐段对拍;一致→不动,不一致/整词误标→重生成
  const sameSegs = parsed.ok && samePieces(existing?.pieces, parsed.morph.pieces);

  if (sameSegs) {
    buckets.consistent++;
    if (!cj.morphSeed && e.morphSeed) seedOnly.push({ wordId: row.id, word: e.word, morphSeed: e.morphSeed });
  } else if (existing) {
    buckets.regenTry++; // 分段不一致 / 整词误标 → 重生成候选
    if (parsed.ok) morphWrite.push({ wordId: row.id, word: e.word, morph: parsed.morph, morphSeed: e.morphSeed, tag: "regen" });
    else morphFail.push({ word: e.word, reason: parsed.reason });
  } else if (!e.morphSeed) {
    buckets.noRem++; // 无 morph 且无 remMethod,保持不动
  } else {
    buckets.backfillTry++; // 有 remMethod 无 morph → 补生成候选
    if (parsed.ok) morphWrite.push({ wordId: row.id, word: e.word, morph: parsed.morph, morphSeed: e.morphSeed, tag: "backfill" });
    else {
      morphFail.push({ word: e.word, reason: parsed.reason });
      seedOnly.push({ wordId: row.id, word: e.word, morphSeed: e.morphSeed }); // morph 放弃但 seed 仍补
    }
  }
  // 重生成失败(有存量 morph 但 remMethod 不可解析):存量保留,只补 seed
  if (existing && !parsed.ok && e.morphSeed) {
    seedOnly.push({ wordId: row.id, word: e.word, morphSeed: e.morphSeed });
  }
}

// ④ 统计报告
const totalCtx = newWords.reduce((n, e) => n + (e.content.contexts?.length ?? 0), 0);
const totalColl = newWords.reduce((n, e) => n + (e.content.collocations?.length ?? 0), 0);
const derivesCov = newWords.filter((e) => e.content.derives?.length).length;
const seedCovNew = newWords.filter((e) => e.morphSeed).length;
const noUk = entries.filter((e) => !e.phoneticUk);
const apostropheLeft = entries.filter(
  (e) => (e.phoneticUk ?? "").includes("'") || (e.phoneticUs ?? "").includes("'"),
);

console.log(`\n===== ${APPLY ? "已写库" : "DRY-RUN(未写库,加 --apply 执行)"} =====`);
console.log(`门禁三数: JSONL 转换 ${entries.length}(期望 3575) / 净新增 ${newWords.length}(期望 2942) / 重叠 ${overlapWords.length}(期望 633)`);
console.log(`音标: 缺 ukphone ${noUk.length} 词 / apostrophe 残留 ${apostropheLeft.length}(期望 0)`);
console.log(`素材: contexts ${totalCtx} 条 / collocations ${totalColl} 条 / derives 覆盖 ${derivesCov}/${newWords.length} / morphSeed 覆盖(新词) ${seedCovNew}/${newWords.length}`);
console.log(`存量 morph 分桶: 一致不动 ${buckets.consistent} / 重生成尝试 ${buckets.regenTry} / 补生成尝试 ${buckets.backfillTry} / 无 remMethod ${buckets.noRem} / affix 保护 ${buckets.affix}`);
console.log(`morph 确定性写入 ${morphWrite.length} 条 / 解析失败 ${morphFail.length} / 仅补 morphSeed ${seedOnly.length}`);
// 重生成样本逐词过目(存量 → 新),人工审查窗口
const regens = morphWrite.filter((m) => m.tag === "regen");
if (regens.length) {
  console.log(`\n----- 重生成样本(${regens.length} 词,存量被覆盖前请过目) -----`);
  for (const m of regens.slice(0, 40)) {
    const old = JSON.parse(dbByWord.get(m.word).content_json).morph;
    console.log(`  ${m.word}:`);
    console.log(`    旧: ${(old.pieces ?? []).map((p) => `${p.piece}(${p.kind})`).join("+")}`);
    console.log(`    新: ${m.morph.pieces.map((p) => `${p.piece}(${p.kind})`).join("+")} | ${m.morph.literal.slice(0, 70)}`);
  }
  if (regens.length > 40) console.log(`  … 其余 ${regens.length - 40} 词`);
}
if (jsonProblems.length) {
  console.log(`JSONL 异常 ${jsonProblems.length} 条:`);
  for (const p of jsonProblems.slice(0, 10)) console.log(`  ${p}`);
}
if (noUk.length) console.log(`缺 ukphone(18 预期,P1 ECDICT 补): ${noUk.map((e) => e.word).join(", ")}`);
if (morphFail.length) {
  console.log(`morph 解析失败 ${morphFail.length} 词(只留 morphSeed/保持原状):`);
  for (const f of morphFail.slice(0, 20)) console.log(`  ${f.word}: ${f.reason}`);
  if (morphFail.length > 20) console.log(`  … 其余 ${morphFail.length - 20} 词`);
}

// 抽样对拍(前 3 词完整对象 + 随机 7 词摘要)
console.log("\n----- 抽样对拍(前 3 词完整) -----");
for (const e of entries.slice(0, 3)) {
  console.log(JSON.stringify({ word: e.word, phoneticUk: e.phoneticUk, phoneticUs: e.phoneticUs, content: e.content }, null, 1).slice(0, 1600));
}
console.log("----- 抽样摘要(第 100/1000/2000/3000/3575 位) -----");
for (const idx of [99, 999, 1999, 2999, entries.length - 1]) {
  const e = entries[idx];
  if (!e) continue;
  console.log(`  ${e.word} | ${e.phoneticUk} | trans=${e.content.translation.length} ctx=${e.content.contexts?.length ?? 0} coll=${e.content.collocations?.length ?? 0} drv=${e.content.derives?.length ?? 0} seed=${e.morphSeed ? "Y" : "N"}`);
}

// ⑤ 写库
if (APPLY) {
  const insWord = db.prepare(
    "INSERT INTO words (word, phonetic_uk, phonetic_us, content_json, origin, created_at, updated_at) VALUES (?, ?, ?, ?, 'baicizhan', unixepoch(), unixepoch())",
  );
  const updWord = db.prepare("UPDATE words SET content_json = ?, updated_at = unixepoch() WHERE id = ?");
  const result = db.transaction(() => {
    let inserted = 0;
    for (const e of newWords) {
      const info = insWord.run(e.word, e.phoneticUk ?? null, e.phoneticUs ?? null, JSON.stringify(e.content));
      inserted += info.changes;
    }
    let patched = 0;
    const writeCj = (wordId, cj) => {
      updWord.run(JSON.stringify(cj), wordId);
      patched++;
    };
    for (const m of morphWrite) {
      const row = dbByWord.get(m.word);
      const cj = JSON.parse(row.content_json);
      cj.morph = m.morph;
      if (!cj.morphSeed && m.morphSeed) cj.morphSeed = m.morphSeed;
      writeCj(m.wordId, cj);
    }
    for (const s of seedOnly) {
      if (morphWrite.some((m) => m.wordId === s.wordId)) continue; // 已随 morph 写过 seed
      const row = dbRows.find((r) => r.id === s.wordId);
      const cj = JSON.parse(row.content_json);
      cj.morphSeed = s.morphSeed;
      writeCj(s.wordId, cj);
    }
    // 词书 upsert
    let book = db.prepare("SELECT id FROM word_books WHERE book_id = ?").get(BOOK_ID);
    if (!book) {
      const info = db
        .prepare("INSERT INTO word_books (book_id, name, description, source, created_at, updated_at) VALUES (?, ?, ?, 'builtin', unixepoch(), unixepoch())")
        .run(BOOK_ID, BOOK_NAME, BOOK_DESC);
      book = { id: info.lastInsertRowid };
    } else {
      db.prepare("UPDATE word_books SET name = ?, description = ?, updated_at = unixepoch() WHERE id = ?").run(BOOK_NAME, BOOK_DESC, book.id);
    }
    // bwr 清旧重挂(order = wordRank - 1,0 起)
    db.prepare("DELETE FROM book_word_relation WHERE book_id = ?").run(book.id);
    const insBwr = db.prepare('INSERT INTO book_word_relation (book_id, word_id, "order") VALUES (?, ?, ?)');
    let bwr = 0;
    for (const e of entries) {
      const row = dbByWord.get(e.word);
      let wordId;
      if (row) {
        wordId = row.id;
      } else {
        wordId = db.prepare("SELECT id FROM words WHERE word = ?").get(e.word)?.id;
      }
      if (!wordId) throw new Error(`词「${e.word}」无 wordId,bwr 挂载中止`);
      insBwr.run(book.id, wordId, Math.max(0, e.rank - 1));
      bwr++;
    }
    return { inserted, patched, bwr, bookId: book.id };
  })();

  console.log(`\n写库完成: 新词 +${result.inserted} / 重叠回写 ${result.patched} / bwr ${result.bwr} 行(book_id=${result.bookId})`);
  const wc = db.prepare("SELECT count(*) n FROM words").get().n;
  const bc = db.prepare("SELECT count(*) n FROM book_word_relation WHERE book_id = ?").get(result.bookId).n;
  console.log(`验收: words 总行数 ${wc}(期望 3589) / 本书关联 ${bc}(期望 3575)`);
}

db.close();
log(`=== ${APPLY ? "DONE" : "DRY-RUN 完成"} ===`);
