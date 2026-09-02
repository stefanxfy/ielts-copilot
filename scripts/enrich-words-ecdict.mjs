#!/usr/bin/env node
/**
 * scripts/enrich-words-ecdict.mjs — 用 ECDICT 补全 words.contentJson 富字段
 *
 * 数据源:
 *  - /tmp/ecdict-100.csv (100 行,脚本运行时由 awk 抽取自 ECDICT 完整 csv)
 *  - /tmp/wordroot.txt (370KB, 词根库)
 *
 * 字段映射:
 *   ECDICT.phonetic → words.phonetic_us(美式参考;UK 仍来自百词斩 accent)
 *   ECDICT.bnc      → contentJson.bncRank
 *   ECDICT.frq      → contentJson.frqRank
 *   ECDICT.collins  → contentJson.collins(1-5)
 *   ECDICT.tag      → contentJson.tags (字符串数组)
 *   ECDICT.exchange → contentJson.exchange (词形变化)
 *   wordroot.txt    → contentJson.root(找该词属于哪个词根)
 *
 * 幂等:已存在的字段不被覆盖(用户手动改的优先)。
 *
 * 准备数据:
 *   curl --http1.1 https://codeload.github.com/skywind3000/ECDICT/zip/refs/heads/master -o /tmp/ecdict.zip
 *   cd /tmp && unzip -o ecdict.zip ECDICT-master/ecdict.csv -d /tmp/ecdict-extract/
 *   awk -F, 'NR==FNR{want[$1]=1; next} ($1 in want)' seeds/ielts-100.txt \
 *     /tmp/ecdict-extract/ECDICT-master/ecdict.csv > /tmp/ecdict-100.csv
 *   curl -s -o /tmp/wordroot.txt https://cdn.jsdelivr.net/gh/skywind3000/ECDICT@master/wordroot.txt
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import { words } from "../src/db/schema.ts";
import { existsSync, readFileSync } from "node:fs";

const ECDICT_TSV = "/tmp/ecdict-100.csv";
const WORDROOT_JSON = "/tmp/wordroot.txt";

for (const f of [ECDICT_TSV, WORDROOT_JSON]) {
  if (!existsSync(f)) {
    console.error(`[enrich] 缺依赖文件: ${f}`);
    console.error("先下 ECDICT:见脚本顶部「准备数据」注释");
    process.exit(1);
  }
}

const sqlite = new Database("./data/app.db");
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite, { schema: { words } });
const log = (...a) => console.log("[enrich]", ...a);

/** ECDICT csv 13 字段;csv.reader 自动处理引号嵌套/换行 */
function loadEcdict() {
  const raw = readFileSync(ECDICT_TSV, "utf-8");
  const hits = new Map();
  const lines = raw.split("\n");
  for (const line of lines) {
    if (!line) continue;
    const parts = parseCsvLine(line);
    if (!parts || parts.length < 11) continue;
    const word = parts[0].toLowerCase().replace(/^'|'$/g, "");
    if (!word || hits.has(word)) continue;
    hits.set(word, {
      phonetic: parts[1] || undefined,
      collins: parts[5] ? parseInt(parts[5], 10) : undefined,
      tag: parts[7] || undefined,
      bnc: parts[8] ? parseInt(parts[8], 10) : undefined,
      frq: parts[9] ? parseInt(parts[9], 10) : undefined,
      exchange: parts[10] || undefined,
    });
  }
  return hits;
}

function parseCsvLine(line) {
  const parts = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQ = !inQ;
      }
    } else if (ch === "," && !inQ) {
      parts.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  parts.push(cur);
  return parts;
}

/** 词根反索引: word → [{root, meaning, origin}, ...] */
function loadWordroot() {
  const raw = JSON.parse(readFileSync(WORDROOT_JSON, "utf-8"));
  const word2roots = new Map();
  for (const [rootKey, info] of Object.entries(raw)) {
    const examples = info.example || [];
    const origin = info.origin || "";
    const meaning = info.meaning || "";
    for (const ex of examples) {
      const w = ex.toLowerCase().replace(/[^a-z'-]/g, "");
      if (!w) continue;
      if (!word2roots.has(w)) word2roots.set(w, []);
      word2roots.get(w).push({ root: rootKey, meaning, origin });
    }
  }
  return word2roots;
}

// ===== 主流程 =====
log("step 1: 加载 ECDICT + wordroot ...");
const ecdict = loadEcdict();
const word2roots = loadWordroot();
log(`ECDICT ${ecdict.size} 行,wordroot 反索引 ${word2roots.size} 词`);

log("step 2: 收集 DB 中 baicizhan 词...");
const rows = db
  .select({ id: words.id, word: words.word, phoneticUs: words.phoneticUs, contentJson: words.contentJson })
  .from(words)
  .where(eq(words.origin, "baicizhan"))
  .all();
log(`DB 命中 ${rows.length} 词`);

log("step 3: merge 字段 ...");
let updated = 0;
let phoneticUsFilled = 0;
let bncFilled = 0, frqFilled = 0, collinsFilled = 0, tagFilled = 0, exchangeFilled = 0, rootFilled = 0;

for (const row of rows) {
  const cj = row.contentJson || {};
  const e = ecdict.get(row.word);
  let touched = false;

  if (e) {
    if (e.phonetic && !row.phoneticUs) {
      db.update(words).set({ phoneticUs: e.phonetic, updatedAt: new Date() }).where(eq(words.id, row.id)).run();
      phoneticUsFilled++;
      touched = true;
    }
    if (e.bnc && !cj.bncRank) {
      cj.bncRank = e.bnc; bncFilled++; touched = true;
    }
    if (e.frq && !cj.frqRank) {
      cj.frqRank = e.frq; frqFilled++; touched = true;
    }
    if (e.collins && !cj.collins) {
      cj.collins = e.collins; collinsFilled++; touched = true;
    }
    if (e.tag && (!cj.tags || cj.tags.length === 0)) {
      cj.tags = e.tag.split(/\s+/).filter(Boolean);
      tagFilled++; touched = true;
    }
    if (e.exchange && !cj.exchange) {
      cj.exchange = e.exchange; exchangeFilled++; touched = true;
    }
  }

  const roots = word2roots.get(row.word);
  if (roots && !cj.root) {
    const best = roots[0];
    cj.root = `${best.root} = ${best.meaning}${best.origin ? ` (${best.origin})` : ""}`;
    rootFilled++; touched = true;
  }

  if (touched) {
    db.update(words).set({ contentJson: cj, updatedAt: new Date() }).where(eq(words.id, row.id)).run();
    updated++;
  }
}
log(`=== DONE === 更新 ${updated} 词`);
log(`字段填充: phoneticUs=${phoneticUsFilled} bncRank=${bncFilled} frqRank=${frqFilled} collins=${collinsFilled} tags=${tagFilled} exchange=${exchangeFilled} root=${rootFilled}`);

// 抽样
const sample = db.select().from(words).where(eq(words.word, "abandon")).get();
log(`--- abandon 抽样 ---`);
log(`phoneticUk=${sample.phoneticUk} phoneticUs=${sample.phoneticUs}`);
log(`contentJson=`, JSON.stringify(sample.contentJson, null, 2));

sqlite.close();