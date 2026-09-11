#!/usr/bin/env node
/**
 * scripts/fix-syl-parts.mjs — 2026-09-11 审查真伤批量修复: syl.parts 假拼写/双写吞掉(51 词)
 *
 * 伤情(审查报告 docs/词库配图与助记审查报告-20260911.md §3.2):
 *   - 39 词 parts 拼出发音拼写而非真实字母(environment→in/vi/ron/ment 等),前端音节色块显示错字母
 *   - 12 词双写辅音被吞(immigrant→im/i/grant 等)
 *   - 顺带: geology/phenomenon 两处 combos 的 letters 引用旧切分,同步拨正
 *
 * 手术约束(写前逐词校验,任一不过即拒收):
 *   ① parts.join("") 逐字符 === word
 *   ② parts.length === ipa.length(音节-音标段一一对应契约)
 *   ③ stress 下标 < parts.length
 *   ④ 只动 parts(+指定 combos),其余 syl 字段与 contentJson 其余字段原样保留
 *
 * 用法: NODE_PATH=<managed workspace node_modules> node scripts/fix-syl-parts.mjs [--dry-run]
 */
import Database from "better-sqlite3";

const DRY_RUN = process.argv.includes("--dry-run");

/** 51 词补丁表: 新 parts(ipa 段数与重音下标均已核对) */
const FIXES = {
  accomplish: { parts: ["ac", "com", "plish"] },
  desirable: { parts: ["de", "si", "ra", "ble"] },
  merely: { parts: ["mere", "ly"] },
  inspiring: { parts: ["in", "spir", "ing"] },
  judgment: { parts: ["judg", "ment"] },
  environment: { parts: ["en", "vi", "ron", "ment"] },
  suppression: { parts: ["sup", "pres", "sion"] },
  acclaim: { parts: ["ac", "claim"] },
  curative: { parts: ["cu", "ra", "ti", "ve"] },
  carousel: { parts: ["car", "ou", "sel"] },
  rarity: { parts: ["rar", "i", "ty"] },
  incident: { parts: ["in", "ci", "dent"] },
  rudimentary: { parts: ["ru", "di", "men", "tary"] },
  stationary: { parts: ["sta", "tion", "ary"] },
  visual: { parts: ["vis", "u", "al"] },
  hypnotic: { parts: ["hyp", "no", "tic"] },
  accreditation: { parts: ["ac", "cre", "di", "ta", "tion"] },
  elucidate: { parts: ["e", "lu", "ci", "date"] },
  adjacent: { parts: ["ad", "ja", "cent"] },
  embed: { parts: ["em", "bed"] },
  tranquility: { parts: ["tran", "quil", "i", "ty"] },
  indifferent: { parts: ["in", "dif", "ferent"] },
  assistantship: { parts: ["as", "sist", "ant", "ship"] },
  postpone: { parts: ["post", "pone"] },
  numerous: { parts: ["nu", "mer", "ous"] },
  disintegrate: { parts: ["dis", "in", "teg", "rate"] },
  dissertation: { parts: ["dis", "ser", "ta", "tion"] },
  noticeable: { parts: ["no", "ti", "cea", "ble"] },
  accountant: { parts: ["ac", "count", "ant"] },
  spectacular: { parts: ["spec", "tac", "u", "lar"] },
  phenomenon: {
    parts: ["phe", "no", "me", "non"],
    comboFixes: [{ letters: "mi", lettersNew: "me" }], // 旧切分 mi 已不存在于拼写
  },
  accommodation: { parts: ["ac", "commo", "da", "tion"] },
  independence: { parts: ["in", "de", "pen", "dence"] },
  accustom: { parts: ["ac", "cus", "tom"] },
  deficiency: { parts: ["de", "fi", "cien", "cy"] },
  incongruity: { parts: ["in", "con", "gru", "i", "ty"] },
  discriminate: { parts: ["dis", "crim", "i", "na", "te"] },
  precedent: { parts: ["prec", "e", "dent"] },
  unsanitary: { parts: ["un", "sa", "ni", "tary"] },
  approve: { parts: ["ap", "prove"] },
  opponent: { parts: ["op", "po", "nent"] },
  immigrant: { parts: ["im", "mi", "grant"] },
  disappointing: { parts: ["dis", "ap", "point", "ing"] },
  pollutant: { parts: ["po", "llu", "tant"] },
  attach: { parts: ["at", "tach"] },
  terrestrial: { parts: ["te", "rres", "tri", "al"] },
  appliance: { parts: ["ap", "pli", "ance"] },
  appoint: { parts: ["ap", "point"] },
  gullibly: { parts: ["gul", "li", "bly"] },
  irrational: { parts: ["ir", "ra", "tion", "al"] },
  geology: {
    parts: ["ge", "o", "lo", "gy"],
    comboFixes: [{ letters: "geo", descNew: "geo 开头常读 /dʒiˈɒ/(如 geography),按音节切分为 ge+o" }],
  },
};

const letters = (s) => String(s).toLowerCase().replace(/[^a-z]/g, "");
const sqlite = new Database("./data/app.db");
sqlite.pragma("foreign_keys = ON");

let applied = 0, skippedIdempotent = 0, rejected = 0;
const rejects = [];

for (const [word, fix] of Object.entries(FIXES)) {
  const row = sqlite.prepare("SELECT id, content_json FROM words WHERE word = ?").get(word);
  if (!row) {
    rejected++;
    rejects.push({ word, why: "词不存在" });
    continue;
  }
  const c = JSON.parse(row.content_json ?? "{}");
  if (!c?.syl) {
    rejected++;
    rejects.push({ word, why: "无 syl 字段" });
    continue;
  }
  const { parts, ipa, stress } = c.syl;

  // 幂等: 已是目标值
  if (JSON.stringify(parts) === JSON.stringify(fix.parts)) {
    skippedIdempotent++;
    continue;
  }

  // 校验 ①: 字母拼合 === 整词
  const joined = letters(fix.parts.join(""));
  if (joined !== letters(word)) {
    rejected++;
    rejects.push({ word, why: `拼合不等: ${fix.parts.join("+")} -> ${joined}` });
    continue;
  }
  // 校验 ②: parts 数 === ipa 段数
  if (Array.isArray(ipa) && ipa.length !== fix.parts.length) {
    rejected++;
    rejects.push({ word, why: `parts 数 ${fix.parts.length} != ipa 数 ${ipa.length}` });
    continue;
  }
  // 校验 ③: stress 下标合法
  if (typeof stress === "number" && stress >= fix.parts.length) {
    rejected++;
    rejects.push({ word, why: `stress=${stress} 越界(parts ${fix.parts.length})` });
    continue;
  }

  c.syl.parts = fix.parts;
  // combos 拨正(可选)
  if (fix.comboFixes && Array.isArray(c.syl.combos)) {
    for (const cf of fix.comboFixes) {
      const combo = c.syl.combos.find((x) => x.letters === cf.letters);
      if (!combo) continue;
      if (cf.lettersNew) combo.letters = cf.lettersNew;
      if (cf.descNew) combo.desc = cf.descNew;
    }
  }

  if (!DRY_RUN) {
    sqlite
      .prepare("UPDATE words SET content_json = ?, updated_at = unixepoch() WHERE id = ?")
      .run(JSON.stringify(c), row.id);
  }
  applied++;
  console.log(`${DRY_RUN ? "[dry]" : "[fix]"} ${word}: ${parts?.join("+")} → ${fix.parts.join("+")}`);
}

sqlite.close();
console.log(`\n合计: 应用 ${applied}, 幂等跳过 ${skippedIdempotent}, 拒收 ${rejected}`);
if (rejects.length) {
  console.log("拒收清单:");
  for (const r of rejects) console.log(`  ${r.word}: ${r.why}`);
  process.exit(1);
}
