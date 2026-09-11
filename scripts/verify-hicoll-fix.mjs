#!/usr/bin/env node
/**
 * scripts/verify-hicoll-fix.mjs — 用前端修复后的 hiColl 新逻辑全量回放 contexts(只读)
 * 新逻辑 = coll 通配路径 + headword 屈折感知兜底(headwordInflectionPattern 同款)
 * 预期: ctxHighlightFail 226 → ~60(剩余为英式词头/不规则变形,数据侧 P2)
 */
import Database from "better-sqlite3";

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}
function escRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function headwordInflectionPattern(headword) {
  const w = headword.toLowerCase();
  const alts = [escRe(esc(w))];
  if (w.endsWith("y") && w.length > 1) {
    const stem = escRe(esc(w.slice(0, -1)));
    alts.push(`${stem}ies`, `${stem}ied`, `${stem}ier`, `${stem}iest`, `${stem}i`);
  }
  if (w.endsWith("e") && w.length > 1) {
    const stem = escRe(esc(w.slice(0, -1)));
    alts.push(`${stem}ing`, `${stem}ed`);
  }
  alts.push(escRe(esc(w)) + "s", escRe(esc(w)) + "ed", escRe(esc(w)) + "ing", escRe(esc(w)) + "es");
  return "(?:" + alts.join("|") + ")\\w*";
}
function hiCollMatchNew(sentence, coll, headword) {
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
  if (headword) {
    if (s.match(new RegExp("\\b" + headwordInflectionPattern(headword), "gi"))) return true;
  }
  return false;
}

const db = new Database("./data/app.db", { readonly: true });
const rows = db.prepare("SELECT word, content_json FROM words").all();
db.close();

let total = 0, pass = 0, fail = 0;
const fails = [];
for (const r of rows) {
  let c;
  try { c = JSON.parse(r.content_json || "{}") || {}; } catch { continue; }
  if (!Array.isArray(c.contexts)) continue;
  for (let i = 0; i < c.contexts.length; i++) {
    const ctx = c.contexts[i];
    if (!ctx?.en) continue;
    total++;
    if (hiCollMatchNew(ctx.en, ctx.coll || "", r.word)) pass++;
    else {
      fail++;
      fails.push({ word: r.word, idx: i, en: String(ctx.en).slice(0, 70) });
    }
  }
}
console.log(`总 ${total} / 可高亮 ${pass} / 仍失败 ${fail}`);
console.log("\n仍失败全清单(数据侧变体问题,P2 修):");
for (const f of fails) console.log(` ${f.word} #${f.idx} ${f.en}`);
