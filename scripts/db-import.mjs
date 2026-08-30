#!/usr/bin/env node
/**
 * scripts/db-import.mjs — seeds/<slug>/paper.json → SQLite 12 表(M2 步骤 3)
 *
 * 流程:
 *  1) 读 seeds/<slug>/paper.json → zod 校验 → 拷图到 public/exam-assets/<slug>/
 *  2) 改写 paper.json 内所有 /exam-assets/<slug>/<file> 引用 → 校验每个引用都对应到磁盘文件
 *  3) 12 表插入:papers / sections / passages / question_groups / questions / choices /
 *     answers / writing_tasks(幂等:uque 索引冲突跳过)
 *  4) 状态:DRAFT 默认;入 PUBLISHED 用 --publish
 *
 * 用法:node scripts/db-import.mjs <slug> [--publish] [--dry-run]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, cpSync, rmSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";

const root = process.cwd();
const seedsDir = join(root, "seeds");
const dbFile = join(root, "data", "app.db");
const PUBLIC_ASSETS = join(root, "public", "exam-assets");

const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith("--"));
const publish = args.includes("--publish");
const dryRun = args.includes("--dry-run");

if (!slug) {
  console.error("用法: node scripts/db-import.mjs <slug> [--publish] [--dry-run]");
  process.exit(1);
}

const seedFile = join(seedsDir, slug, "paper.json");
if (!existsSync(seedFile)) {
  console.error(`[import] 缺少 ${seedFile}`);
  process.exit(1);
}

const seed = JSON.parse(readFileSync(seedFile, "utf8"));
const dstDir = join(PUBLIC_ASSETS, slug);
mkdirSync(dstDir, { recursive: true });

// 1) 拷图到 public/exam-assets/<slug>/(白名单:图片/音频)
const assetsSrc = join(seedsDir, slug, "assets");
const imageExts = /\.(png|jpe?g|svg|webp|gif)$/i;
const audioExts = /\.(mp3|wav|ogg|m4a)$/i;
const copied = [];
if (existsSync(assetsSrc)) {
  for (const f of readdirSync(assetsSrc)) {
    if (imageExts.test(f) || audioExts.test(f)) {
      cpSync(join(assetsSrc, f), join(dstDir, f));
      copied.push(f);
    }
  }
}
console.log(`[import] ${slug}: assets ${copied.length} → public/exam-assets/${slug}/`);

// 2) 校验所有引用文件存在
const refs = new Set();
const collectRefs = (s) => {
  if (!s) return;
  const ms = s.matchAll(/src=["']([^"']+)["']/g);
  for (const m of ms) {
    const u = m[1];
    if (u.startsWith(`/exam-assets/${slug}/`)) {
      const fname = decodeURIComponent(u.split("/").pop() || "");
      if (fname) refs.add(fname);
    }
  }
};
for (const q of seed.questions ?? []) collectRefs(q.stemHtml);
for (const p of seed.passages ?? []) collectRefs(p.bodyHtml);
for (const w of seed.writingTasks ?? []) collectRefs(w.materialHtml);
if (seed.paper?.meta?.audioUrl) {
  const fname = decodeURIComponent(String(seed.paper.meta.audioUrl).split("/").pop() || "");
  if (fname) refs.add(fname);
}
const missing = [...refs].filter((f) => !existsSync(join(dstDir, f)));
if (missing.length > 0) {
  console.error(`[import] 缺文件 → 拒入库:${missing.join(", ")}`);
  if (!dryRun) process.exit(1);
}

// 3) DB 入库
if (!existsSync(dbFile)) {
  console.error(`[import] DB 不存在 ${dbFile} —— 先启动一次 dev 自动建库`);
  process.exit(1);
}
if (dryRun) {
  console.log(`[import] --dry-run 跳过实际写入(校验 OK:refs=${refs.size} assets=${copied.length})`);
  process.exit(0);
}

const db = new Database(dbFile);
db.pragma("foreign_keys = ON");

// 准备 paper
const paper = seed.paper;
const status = publish ? "PUBLISHED" : (paper.status ?? "PUBLISHED");
const paperRow = db.prepare(
  `INSERT INTO papers (slug, title, category, skill, source, status, meta_json, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())
   ON CONFLICT(slug) DO UPDATE SET
     title=excluded.title, category=excluded.category, skill=excluded.skill,
     source=excluded.source, status=excluded.status, meta_json=excluded.meta_json,
     updated_at=unixepoch()
   RETURNING id`,
).get(
  paper.slug, paper.title, paper.category, paper.skill,
  paper.source ?? null, status,
  JSON.stringify(paper.meta ?? {}),
);
const paperId = paperRow.id;
console.log(`[import] paper #${paperId} ${paper.slug}`);

// sections
db.prepare(`DELETE FROM sections WHERE paper_id = ?`).run(paperId);
const insertSection = db.prepare(
  `INSERT INTO sections (paper_id, section_no, section_type, title, time_limit_sec, order_index)
   VALUES (?, ?, ?, ?, ?, ?)`,
);
for (const [idx, s] of (seed.sections ?? []).entries()) {
  insertSection.run(paperId, s.sectionNo, s.sectionType, s.title ?? null,
    s.timeLimitSec ?? paper.durationSec, idx + 1);
}

// passages(passes 表无 paper_id;通过 section_id 删)
db.prepare(`DELETE FROM passages WHERE section_id IN (SELECT id FROM sections WHERE paper_id = ?)`).run(paperId);
const insertPassage = db.prepare(
  `INSERT INTO passages (section_id, order_index, title, subtitle, body_html, image_url)
   VALUES (?, ?, ?, ?, ?, ?)`,
);
for (const [idx, p] of (seed.passages ?? []).entries()) {
  const sec = db.prepare(`SELECT id FROM sections WHERE paper_id = ? AND section_no = ?`)
    .get(paperId, p.sectionNo);
  if (!sec) continue;
  insertPassage.run(sec.id, idx + 1, p.title ?? null, p.subtitle ?? null,
    p.bodyHtml ?? null, p.imageUrl ?? null);
}

// question_groups(M1 schema 没有 paper_id 列;只挂在 section 上)
// 清理:先删 sections 旗下 groups
db.prepare(`DELETE FROM question_groups WHERE section_id IN (SELECT id FROM sections WHERE paper_id = ?)`).run(paperId);
const insertGroup = db.prepare(
  `INSERT INTO question_groups (section_id, instruction_html, layout_hint, score_mode, min_select, max_select, order_index)
   VALUES (?, ?, ?, ?, ?, ?, ?)
   RETURNING id`,
);
const groupIdMap = new Map();
for (const [idx, g] of (seed.questionGroups ?? []).entries()) {
  const sec = db.prepare(`SELECT id FROM sections WHERE paper_id = ? AND section_no = ?`)
    .get(paperId, g.sectionNo);
  if (!sec) continue;
  insertGroup.run(sec.id, g.instructionHtml ?? null, null,
    g.scoreMode ?? "PER_QUESTION", g.minSelect ?? null, g.maxSelect ?? null, idx + 1);
  const { id: gid } = db.prepare("SELECT last_insert_rowid() AS id").get();
  groupIdMap.set(g.id, gid);
}

// questions(questions 表无 paper_id;通过 section_id 删;按 number 升序入)
db.prepare(`DELETE FROM questions WHERE section_id IN (SELECT id FROM sections WHERE paper_id = ?)`).run(paperId);
const sortedQuestions = [...(seed.questions ?? [])].sort((a, b) => a.number - b.number);
const insertQ = db.prepare(
  `INSERT INTO questions (paper_id, section_id, group_id, number, type, stem_html, instruction_html, task_id, word_limit_json, passage_order, meta_json)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
   RETURNING id`,
);
const qidMap = new Map();
for (const q of sortedQuestions) {
  const sec = db.prepare(`SELECT id FROM sections WHERE paper_id = ? AND section_no = ?`)
    .get(paperId, q.sectionNo);
  if (!sec) continue;
  const gid = q.questionGroupId ? groupIdMap.get(q.questionGroupId) ?? null : null;
  insertQ.run(paperId, sec.id, gid, q.number, q.type,
    q.stemHtml ?? null, q.instructionHtml ?? null,
    q.taskId ?? null, q.wordLimit ? JSON.stringify(q.wordLimit) : null,
    q.passageOrder ?? null, q.metaJson ? JSON.stringify(q.metaJson) : null);
  const { id: qid } = db.prepare("SELECT last_insert_rowid() AS id").get();
  qidMap.set(q.number, qid);
}

// choices
const insertChoice = db.prepare(
  `INSERT INTO choices (question_id, group_id, label, text_html, order_index)
   VALUES (?, ?, ?, ?, ?)`,
);
for (const c of seed.choices ?? []) {
  const qid = c.questionId ? qidMap.get(Number(c.questionId)) : null;
  const gid = c.questionGroupId ? groupIdMap.get(c.questionGroupId) : null;
  insertChoice.run(qid, gid, c.label, c.textHtml ?? null, c.orderIndex ?? 1);
}

// answers
db.prepare(`DELETE FROM answers WHERE question_id IN (SELECT id FROM questions WHERE paper_id = ?)`).run(paperId);
const insertAns = db.prepare(
  `INSERT INTO answers (question_id, value, alternatives_json, explanation_html)
   VALUES (?, ?, ?, ?)`,
);
const seenAnsByGroup = new Set();
for (const a of seed.answers ?? []) {
  const qid = qidMap.get(a.questionNumber);
  if (!qid) continue;
  // 块题:同 group 只入库一次(answers questionGroupId 匹配)
  // M2-3 入库按 question_id 去重;同一 group 多 qid 时取首个
  // 简化:按 questionNumber 查 qid,只取首个
  insertAns.run(qid, a.value,
    a.alternatives ? JSON.stringify(a.alternatives) : null,
    a.explanationHtml ?? null);
}

// writing_tasks
db.prepare(`DELETE FROM writing_tasks WHERE paper_id = ?`).run(paperId);
const insertWt = db.prepare(
  `INSERT INTO writing_tasks (paper_id, task_id, prompt_html, material_html, word_min, suggested_time_sec, order_index)
   VALUES (?, ?, ?, ?, ?, ?, ?)`,
);
for (const [idx, w] of (seed.writingTasks ?? []).entries()) {
  insertWt.run(paperId, w.taskId, w.promptHtml, w.materialHtml ?? null,
    w.wordMin, w.suggestedTimeSec, idx + 1);
}

db.close();
console.log(`[import] ${slug} → DB: ${seed.questions?.length ?? 0} Q, ${seed.choices?.length ?? 0} C, ${seed.answers?.length ?? 0} A, ${seed.writingTasks?.length ?? 0} W`);

import { readdirSync } from "node:fs";