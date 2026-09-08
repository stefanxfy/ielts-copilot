#!/usr/bin/env node
/**
 * 硬性校验:syl 拆分拼合 vs 标称音标一致性
 *
 * 背景(2026-09-07 ability 案例):syl 内部自洽(phonemes 拼合 = ipa 拼合)
 * 但整体与 phonetic_uk 冲突(库内 əˈbɪləti vs 拆分 əˈbɪlɪti)——
 * 既有全库自检只查 syl 内部一致性,查不出"生成时就抄错音标"这类伤。
 *
 * 校验三条硬性断言(对有 syl 的词):
 *   A. ipa 段拼合(去重音符号外的格式符) === phonetic_uk(剥 //)
 *      ——phonetic_uk 含多变体(逗号/分号分隔)时任一匹配即过
 *   B. phonemes 拼合 === ipa 拼合(内部自洽,原自检已有)
 *   C. phonetic_uk 非空(没音标却写了 syl = 结构残缺)
 *
 * 归一化规则 norm():剥 / 空格 . ˌ ' ’ **与 ˈ ˌ**;与 gen-mnemonic.normIpa 对齐(2026-09-08 修复:
 *   单音节库内无 ˈ + syl.ipa 首段加 ˈ 等价于库内无 ˈ,应判过;旧版保留 ˈ 比对把单音节全误杀)。
 *   重音位置错位由 gen-mnemonic 的 stress 自动纠偏兜底,本校验器只负责「字符级一致」。
 * 用法:node scripts/check-phonetic-consistency.mjs [--book=10] [--quiet]
 * 退出码:有伤=1,全过=0(可挂 CI / 生成管线尾部)
 */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");
import { join } from "node:path";

const DB = process.env.DB_PATH || join(process.cwd(), "data", "app.db");
const args = process.argv.slice(2);
const bookArg = args.find((a) => a.startsWith("--book="));
const quiet = args.includes("--quiet");
const bookId = bookArg ? Number(bookArg.split("=")[1]) : null;

const norm = (s) =>
  String(s ?? "")
    .replace(/[/\s.'ˈˌ]/g, "")
    .trim();

/** B 断言用:phonemes 天然不含重音符号(只标在 ipa 段),比对时两侧都剥 */
const normNoStress = (s) => norm(s).replace(/[ˈˌ]/g, "");

/** A 断言用:ɛ/e 为同音异符(词典混用),映射后比对 */
const normUk = (s) => norm(s).replace(/ɛ/g, "e");

/** phonetic_uk 可能是多变体("/x/ 或 /y/")→ 拆成候选串列表 */
const variants = (uk) =>
  String(uk ?? "")
    .replace(/^\/|\/$/g, "")
    .split(/[,;、]/)
    .map((s) => s.trim())
    .filter(Boolean);

const db = new Database(DB, { readonly: true });
const rows = bookId
  ? db
      .prepare(
        `SELECT w.id, w.word, w.phonetic_uk, w.content_json FROM words w
         JOIN book_word_relation r ON r.word_id = w.id WHERE r.book_id = ? ORDER BY w.word`,
      )
      .all(bookId)
  : db
      .prepare(
        `SELECT id, word, phonetic_uk, content_json FROM words WHERE content_json LIKE '%"syl"%' ORDER BY word`,
      )
      .all();

const bad = [];
let checked = 0;

for (const { id, word, phonetic_uk, content_json } of rows) {
  let c;
  try {
    c = JSON.parse(content_json);
  } catch {
    bad.push({ word, id, errs: ["content_json 解析失败"] });
    continue;
  }
  const s = c.syl;
  if (!s) continue;
  checked += 1;
  const errs = [];

  const ipaJoin = norm((s.ipa ?? []).join(""));
  const phJoin = norm((s.phonemes ?? []).map((p) => p.p).join(""));

  // C. phonetic_uk 必须存在
  if (!phonetic_uk) {
    errs.push("phonetic_uk 为空,但 contentJson.syl 存在");
  } else {
    const cands = variants(phonetic_uk).map(normUk);
    if (!cands.includes(normUk(ipaJoin)))
      errs.push(
        `ipa 拼合「${ipaJoin}」≠ phonetic_uk「${norm(phonetic_uk)}」(候选:${cands.join(" / ") || "无"})`,
      );
  }

  // B. phonemes 与 ipa 内部一致(剥重音符号后比对)
  if (phJoin && ipaJoin && normNoStress(phJoin) !== normNoStress(ipaJoin))
    errs.push(`phonemes 拼合「${phJoin}」≠ ipa 拼合「${ipaJoin}」`);

  if (errs.length) bad.push({ word, id, errs });
}

if (!quiet) {
  console.log(`\n[check-phonetic-consistency] 范围=${bookId ? `book ${bookId}` : "全库"} 有 syl 词数=${checked}`);
  if (bad.length === 0) {
    console.log(`✓ 全部通过(${checked} 词)`);
  } else {
    console.log(`✗ ${bad.length}/${checked} 词不一致:`);
    for (const b of bad) for (const e of b.errs) console.log(`  ✗ ${b.word}(id=${b.id}): ${e}`);
  }
}
db.close();
process.exit(bad.length ? 1 : 0);
