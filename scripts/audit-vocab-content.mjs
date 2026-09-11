#!/usr/bin/env node
/**
 * scripts/audit-vocab-content.mjs — 词库内容审查(只读,不写库)
 *
 * 口径说明(2026-09-11 审查定稿):
 *   - morph 拼合: piece 内连字符(-)是形态边界标注,字母口径比对(去非字母)
 *   - syl 拼合: 字母口径;双写辅音折叠后相等 → 单列"双写吞掉"桶(系统性小伤,视觉色块少一块但拼写可见)
 *   - syl 音标比对: ɛ→e 智能归一;仍不等的多为"词典多变体取其一",单列信息桶不算错
 *   - contexts 高亮: 完全复刻前端 hiColl(mnemonic-radial.tsx)验证可达性
 * 输出: data/mnemonic-debug/audit-result.json + stdout 摘要
 */
import Database from "better-sqlite3";
import { existsSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const db = new Database("./data/app.db", { readonly: true });

/* ---------- 工具 ---------- */
const letterLen = (w) => w.replace(/[^a-zA-Z]/g, "").length;
const isPhrase = (w) => /\s/.test(w.trim());
const letters = (s) => String(s).toLowerCase().replace(/[^a-z]/g, "");
const normIpaSmart = (s) =>
  String(s ?? "").replace(/[/ˈˌ.\s]/g, "").toLowerCase().replace(/ɛ/g, "e");

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}
function escRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
/** 与 src/components/vocab/mnemonic-radial.tsx hiColl 逐行一致;返回是否可高亮。
 *  注意前端真实语义: coll 路径 out!==s 才 return,匹配失败会继续落 headword 兜底 */
function hiCollMatch(sentence, coll, headword) {
  const s = esc(sentence);
  const c = (coll || "").trim();
  if (c) {
    const pat =
      "\\b" +
      c.split(/\s*\.\.\.\s*/).map((p) => escRe(esc(p)).replace(/\s+/g, "\\s+")).join("\\w*[^,;.!?]*?\\s+") +
      "\\w*";
    try {
      if (s.match(new RegExp(pat, "gi"))) return true;
    } catch { /* fallthrough */ }
  }
  // coll 匹配失败(或无 coll)继续走 headword 兜底——与前端一致
  if (headword) {
    if (s.match(new RegExp("\\b" + escRe(esc(headword)) + "\\w*", "gi"))) return true;
  }
  return false;
}

/* ---------- 拉数据 ---------- */
const rows = db.prepare("SELECT w.id, w.word, w.phonetic_uk, w.origin, w.content_json FROM words w").all();

const report = {
  image: { have: 0, missEligible: [], missShort: 0, missPhrase: 0, badFile: [] },
  mnemonic: {
    total: 0,
    have: { morph: 0, syl: 0, derives: 0, contexts: 0 },
    allFourMissing: [],
    missSylRepairable: [], // 非短语且有音标
    missContextsRepairable: [],
  },
  selfCheck: {
    morphJoin: [],      // pieces 字母拼合 !== word(真伤)
    morphDup: [],       // piece 重复
    sylJoinWord: [],    // parts 拼发音拼写(真伤: 前端色块显示错拼写)
    sylJoinDupSwallow: [], // 双写辅音吞掉(轻伤)
    sylJoinIpaVariant: [], // 音标多变体差异(信息,不算错)
    ctxHighlightFail: [],  // 前端 hiColl 不可高亮
    ctxJunkSentence: [],   // 例句为词典残片(真伤)
    ctxNoCn: [],           // 例句无中文
    derivesDup: [],        // derives 内词重复
    derivesBadPos: [],     // 词性标注非法
    derivesSelfRef: [],    // derives 含主词自身
    suspiciousHeadwords: [], // 无音标非短语词头(疑似源数据错拼/截断)
  },
};

const POS = new Set(["n.", "v.", "vt.", "vi.", "adj.", "adv.", "prep.", "conj.", "pron.", "interj.", "art.", "num.", "phr."]);

for (const r of rows) {
  const word = String(r.word ?? "").trim();
  const lower = word.toLowerCase();
  let c;
  try { c = JSON.parse(r.content_json || "{}") || {}; } catch { continue; }
  const L = letterLen(word);

  /* ----- 配图 ----- */
  const imgField = typeof c.image === "string" && c.image ? c.image : null;
  const imgPath = imgField ?? `/images/words/${lower}.png`;
  const abs = join("public", imgPath.replace(/^\//, ""));
  const fileOk = existsSync(abs) && statSync(abs).size > 1000;
  if (imgField && fileOk) {
    report.image.have++;
  } else {
    if (isPhrase(word)) report.image.missPhrase++;
    else if (L <= 8) report.image.missShort++;
    else report.image.missEligible.push(word);
    if (imgField && !fileOk) report.image.badFile.push({ word, path: imgPath });
  }

  /* ----- 助记覆盖 ----- */
  report.mnemonic.total++;
  const hasMorph = !!c.morph;
  const hasSyl = !!c.syl;
  const hasDerives = Array.isArray(c.derives) && c.derives.length > 0;
  const hasCtx = Array.isArray(c.contexts) && c.contexts.length > 0;
  if (hasMorph) report.mnemonic.have.morph++;
  if (hasSyl) report.mnemonic.have.syl++;
  if (hasDerives) report.mnemonic.have.derives++;
  if (hasCtx) report.mnemonic.have.contexts++;
  if (!hasMorph && !hasSyl && !hasDerives && !hasCtx) {
    report.mnemonic.allFourMissing.push(word);
  }
  if (!hasSyl && !isPhrase(word) && r.phonetic_uk) report.mnemonic.missSylRepairable.push(word);
  if (!hasCtx && Array.isArray(c.examples) && c.examples.length > 0 && !isPhrase(word)) {
    report.mnemonic.missContextsRepairable.push(word);
  }

  /* ----- 自洽校验 ----- */
  if (c.morph) {
    const joined = letters((c.morph.pieces ?? []).map((p) => p.piece).join(""));
    if (joined !== letters(word)) report.selfCheck.morphJoin.push({ word, pieces: c.morph.pieces?.map((p) => p.piece) });
    const ps = (c.morph.pieces ?? []).map((p) => String(p.piece));
    if (new Set(ps).size !== ps.length) report.selfCheck.morphDup.push({ word, pieces: ps });
  }

  if (c.syl) {
    const pj = letters((c.syl.parts ?? []).join(""));
    if (pj !== letters(word)) {
      const folded = letters(word).replace(/([bdfglmnprst])\1/g, "$1");
      if (folded === pj) report.selfCheck.sylJoinDupSwallow.push(word);
      else report.selfCheck.sylJoinWord.push({ word, parts: c.syl.parts, joined: pj });
    }
    const ij = normIpaSmart((c.syl.ipa ?? []).join(""));
    const ic = normIpaSmart(r.phonetic_uk);
    if (ij && ic && ij !== ic) report.selfCheck.sylJoinIpaVariant.push({ word, sylIpa: (c.syl.ipa ?? []).join(""), colIpa: r.phonetic_uk });
  }

  if (Array.isArray(c.contexts)) {
    c.contexts.forEach((ctx, i) => {
      if (!ctx?.en) return;
      if (!hiCollMatch(ctx.en, ctx.coll || "", word)) {
        report.selfCheck.ctxHighlightFail.push({ word, idx: i, coll: ctx.coll ?? null, en: String(ctx.en).slice(0, 90) });
      }
      const en = String(ctx.en);
      // 残片判定: 词典括注开头 "(= ..." / "Junethe" 粘连 / 缺主语且以介词或标点开头
      if (/^\(\s*=?/.test(en) || /\bJunethe\b/.test(en) || /^[,;]/.test(en)) {
        report.selfCheck.ctxJunkSentence.push({ word, idx: i, en: en.slice(0, 90) });
      }
      if (!ctx.cn) report.selfCheck.ctxNoCn.push({ word, idx: i, en: en.slice(0, 60) });
    });
  }

  if (Array.isArray(c.derives) && c.derives.length) {
    const ws = c.derives.map((d) => d?.word);
    if (new Set(ws).size !== ws.length) report.selfCheck.derivesDup.push({ word, derives: ws });
    for (const d of c.derives) {
      if (!d?.word) continue;
      if (String(d.word).toLowerCase() === lower) report.selfCheck.derivesSelfRef.push({ word, d: d.word });
      if (d.pos && !POS.has(String(d.pos))) report.selfCheck.derivesBadPos.push({ word, d: d.word, pos: d.pos });
    }
  }

  if (!r.phonetic_uk && !isPhrase(word)) {
    report.selfCheck.suspiciousHeadwords.push(word);
  }
}

db.close();

/* ---------- 输出 ---------- */
mkdirSync("data/mnemonic-debug", { recursive: true });
const summary = {
  generatedAt: new Date().toISOString(),
  total: rows.length,
  image: {
    have: report.image.have,
    missEligibleCount: report.image.missEligible.length,
    missShort: report.image.missShort,
    missPhrase: report.image.missPhrase,
    badFileCount: report.image.badFile.length,
  },
  mnemonic: {
    have: report.mnemonic.have,
    allFourMissing: report.mnemonic.allFourMissing.length,
    missSylRepairable: report.mnemonic.missSylRepairable.length,
    missContextsRepairable: report.mnemonic.missContextsRepairable.length,
  },
  selfCheck: Object.fromEntries(Object.entries(report.selfCheck).map(([k, v]) => [k, v.length])),
};
writeFileSync("data/mnemonic-debug/audit-result.json", JSON.stringify({ summary, ...report }, null, 2));
console.log(JSON.stringify(summary, null, 2));
