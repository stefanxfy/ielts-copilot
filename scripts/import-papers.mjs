#!/usr/bin/env node
/**
 * scripts/import-papers.mjs — 真题导入(P1:静态托管 + 五表入库,幂等可重复执行)
 *
 * 对齐 docs/数据模型设计.md v3.1 §5 数据流「导入」:
 *   1. 静态托管:换皮产物零改造拷入 public/exams/<exam_id>/,
 *      共享资源(含 31MB 音频)只放一份 public/exams/shared/exam-assets/,
 *      页面引用 exam-assets/ 重写为 ../shared/exam-assets/;
 *      answers-*.js 的 answersUrl 统一改指 answers.html(与拷贝后的页面同目录)。
 *   2. DB 导入:answers-*.js 直导 → exam_sets + papers
 *      (questions_json 由 HTML 的 data-num/data-q_type + 分区 data-questions 生成,
 *       answers_json 存官方原串,band_table_json/时长取自答案文件;exam_id 幂等 upsert)。
 *
 * 题型归一规则(与 scoring.js 判分语义对齐——判分实际按答案串形状选策略):
 *   BLOCK(在 blocks 数组) > TFNG(data-q_type=11) > 答案为 1-2 个字母 → SINGLE/MULTI > 其余 FILL
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

const ROOT = process.cwd();
const PROTO = join(ROOT, "prototype");
const EXAMS_OUT = join(ROOT, "public", "exams");
const SHARED_ASSETS = join(EXAMS_OUT, "shared", "exam-assets");
const DB_FILE = join(ROOT, "data", "app.db");
const MIGRATIONS = join(ROOT, "src", "db", "migrations");

/* ---------- 卷源清单(数据源 = prototype/,新增卷在这里登记) ---------- */

const EXAM_SETS = [
  {
    examSetId: "a-2025jan",
    title: "A类 · 2025年1月真题 Test 1",
    category: "A",
    testPeriod: "2025-01",
    papers: [
      { subject: "reading", src: "a-reading-test", answersSrc: "a-reading-answers", answersJs: "answers-a-2025jan-test1.js" },
      { subject: "listening", src: "a-listening-test", answersSrc: "a-listening-answers", answersJs: "answers-a-2025jan-listening-test1.js", audio: "listening-a-2025jan-test1.mp3" },
      { subject: "writing", src: "a-writing-test" },
    ],
  },
  {
    examSetId: "gt-vol1",
    title: "G类 · 一月真题 Test 1",
    category: "G",
    testPeriod: "2025-01",
    papers: [
      { subject: "reading", src: "gt-reading-test", answersSrc: "gt-reading-answers", answersJs: "answers-gt-vol1-test1.js" },
      { subject: "listening", src: "gt-listening-test", answersSrc: "gt-listening-answers", answersJs: "answers-gt-vol1-listening-test1.js", audio: "listening-gt-vol1-test1.mp3" },
      { subject: "writing", src: "gt-writing-test" },
    ],
  },
];

const SUBJECT_TITLE = { reading: "阅读", listening: "听力", writing: "写作" };

/* ---------- 工具 ---------- */

/** 执行 answers-*.js(本地可信文件):window.IELTS_EXAM = {...} → 对象 */
function loadAnswers(file) {
  const code = readFileSync(join(PROTO, "exam-assets", file), "utf8");
  const fakeWindow = {};
  new Function("window", code)(fakeWindow);
  if (!fakeWindow.IELTS_EXAM) throw new Error(`${file} 未定义 window.IELTS_EXAM`);
  return fakeWindow.IELTS_EXAM;
}

/** 从卷页 HTML 提取:题号→q_type 码 + part 连续题号区间 */
function parsePaperHtml(srcName) {
  const html = readFileSync(join(PROTO, `${srcName}.html`), "utf8");
  const qTypeByNum = new Map();
  for (const [, num, code] of html.matchAll(/data-num="(\d+)"[^>]*data-q_type="(\d+)"/g)) {
    qTypeByNum.set(Number(num), Number(code));
  }
  const partCounts = [...html.matchAll(/data-part="\d+"[^>]*data-questions="(\d+)"/g)]
    .map((m) => Number(m[1]));
  if (!partCounts.length) throw new Error(`${srcName}.html 未找到 part 分区`);
  const partOf = new Map(); // 题号 → part
  let n = 1;
  partCounts.forEach((count, i) => {
    for (let k = 0; k < count; k++) partOf.set(n++, i + 1);
  });
  return { qTypeByNum, partOf, totalQ: n - 1 };
}

const LETTER_ANS = /^[A-D](\s*,\s*[A-D])?$/;

/** 题型归一(scoring.js 语义:判分策略由答案形状 + blocks 决定,见文件头注释) */
function classify(num, ex, qTypeByNum, blockOf) {
  if (blockOf.has(num)) return { type: "BLOCK", anchor: blockOf.get(num).name, max: blockOf.get(num).to - blockOf.get(num).from + 1 };
  const ans = String(ex.answers[String(num)] ?? "");
  if (qTypeByNum.get(num) === 11) return { type: "TFNG", anchor: `q-${num}`, max: 1 };
  if (LETTER_ANS.test(ans)) return { type: ans.includes(",") ? "MULTI" : "SINGLE", anchor: `q-${num}`, max: 1 };
  return { type: "FILL", anchor: `q-${num}`, max: 1 };
}

/* ---------- 步骤 1:静态托管 ---------- */

function copyStatic() {
  // 共享资源整目录刷新(含 mp3/图片/判定引擎,一次拷贝全卷复用)
  rmSync(SHARED_ASSETS, { recursive: true, force: true });
  mkdirSync(SHARED_ASSETS, { recursive: true });
  for (const f of readdirSync(join(PROTO, "exam-assets"))) {
    cpSync(join(PROTO, "exam-assets", f), join(SHARED_ASSETS, f));
  }
  // answers-*.js 的答案速查链接统一指向同目录 answers.html
  for (const f of readdirSync(SHARED_ASSETS)) {
    if (!f.startsWith("answers-") || !f.endsWith(".js")) continue;
    const p = join(SHARED_ASSETS, f);
    writeFileSync(p, readFileSync(p, "utf8").replace(/answersUrl:\s*'[^']*'/, "answersUrl: 'answers.html'"));
  }
  // 各卷页面:exam-assets/ → ../shared/exam-assets/
  const rewrite = (html) => html.replace(/(\.\/)?exam-assets\//g, "../shared/exam-assets/");
  for (const set of EXAM_SETS) {
    for (const p of set.papers) {
      const dir = join(EXAMS_OUT, `${set.examSetId}-${p.subject}-test1`);
      mkdirSync(dir, { recursive: true });
      const srcHtml = readFileSync(join(PROTO, `${p.src}.html`), "utf8");
      writeFileSync(join(dir, `${p.subject}.html`), rewrite(srcHtml));
      if (p.answersSrc) {
        writeFileSync(join(dir, "answers.html"), rewrite(readFileSync(join(PROTO, `${p.answersSrc}.html`), "utf8")));
      }
    }
  }
  console.log(`[import] 静态托管完成:${EXAMS_OUT.replace(ROOT + "/", "")}/(共享资源 ${(readdirSync(SHARED_ASSETS)).length} 个文件)`);
}

/* ---------- 步骤 2:DB 导入 ---------- */

function ensureSchema(sqlite) {
  const has = sqlite.prepare("select name from sqlite_master where type='table' and name='papers'").get();
  if (has) return;
  migrate(drizzle(sqlite), { migrationsFolder: MIGRATIONS });
}

function importDb() {
  mkdirSync(join(ROOT, "data"), { recursive: true });
  const sqlite = new Database(DB_FILE);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  ensureSchema(sqlite);

  const upSet = sqlite.prepare(`
    INSERT INTO exam_sets (exam_set_id, title, category, test_period)
    VALUES (@examSetId, @title, @category, @testPeriod)
    ON CONFLICT(exam_set_id) DO UPDATE SET
      title = excluded.title, category = excluded.category, test_period = excluded.test_period
  `);
  const upPaper = sqlite.prepare(`
    INSERT INTO papers (exam_id, exam_set_id, subject, title, category, test_period,
                        duration_sec, band_table_json, assets_json, questions_json, answers_json, updated_at)
    VALUES (@examId, @examSetId, @subject, @title, @category, @testPeriod,
            @durationSec, @bandTableJson, @assetsJson, @questionsJson, @answersJson, unixepoch())
    ON CONFLICT(exam_id) DO UPDATE SET
      exam_set_id = excluded.exam_set_id, subject = excluded.subject, title = excluded.title,
      category = excluded.category, test_period = excluded.test_period, duration_sec = excluded.duration_sec,
      band_table_json = excluded.band_table_json, assets_json = excluded.assets_json,
      questions_json = excluded.questions_json, answers_json = excluded.answers_json,
      updated_at = unixepoch()
  `);

  const tx = sqlite.transaction(() => {
    for (const set of EXAM_SETS) {
      upSet.run({ examSetId: set.examSetId, title: set.title, category: set.category, testPeriod: set.testPeriod });
      for (const p of set.papers) {
        const examId = `${set.examSetId}-${p.subject}-test1`;
        const assets = { entry: `/exams/${examId}/${p.subject}.html` };
        if (p.audio) assets.audio = `/exams/shared/exam-assets/${p.audio}`;
        if (p.answersSrc) assets.answersPage = `/exams/${examId}/answers.html`;

        let questionsJson, answersJson = null, bandTable = [], durationSec = 3600;
        if (p.subject === "writing") {
          questionsJson = {
            T1: { part: null, type: "WRITING_TASK", anchor: null, max: null },
            T2: { part: null, type: "WRITING_TASK", anchor: null, max: null },
          };
        } else {
          const ex = loadAnswers(p.answersJs);
          const { qTypeByNum, partOf, totalQ } = parsePaperHtml(p.src);
          if (totalQ !== ex.total) throw new Error(`${examId}: 页面题数 ${totalQ} ≠ 答案文件 total ${ex.total}`);
          const blockOf = new Map(); // 块内题号 → block 定义
          for (const b of ex.blocks ?? []) {
            for (let n = b.from; n <= b.to; n++) blockOf.set(n, b);
          }
          questionsJson = {};
          answersJson = {};
          for (let n = 1; n <= ex.total; n++) {
            const b = blockOf.get(n);
            if (b && n !== b.from) continue; // 块内其余题号由块首一条档案覆盖,不重复计
            const c = classify(n, ex, qTypeByNum, blockOf);
            questionsJson[String(n)] = { part: partOf.get(n) ?? null, type: c.type, anchor: c.anchor, max: c.max };
            if (!blockOf.has(n)) answersJson[c.anchor] = String(ex.answers[String(n)]);
          }
          for (const b of ex.blocks ?? []) answersJson[b.name] = b.answer;
          bandTable = ex.bandTable ?? [];
          durationSec = (ex.duration ?? 60) * 60;
        }

        upPaper.run({
          examId,
          examSetId: set.examSetId,
          subject: p.subject,
          title: `${set.category}类 ${SUBJECT_TITLE[p.subject]} · ${set.title.split("·")[1]?.trim() ?? set.title}`,
          category: set.category,
          testPeriod: set.testPeriod,
          durationSec,
          bandTableJson: JSON.stringify(bandTable),
          assetsJson: JSON.stringify(assets),
          questionsJson: JSON.stringify(questionsJson),
          answersJson: answersJson ? JSON.stringify(answersJson) : null,
        });
      }
    }
  });
  tx();

  const sets = sqlite.prepare("select count(*) n from exam_sets").get().n;
  const papers = sqlite.prepare("select count(*) n from papers").get().n;
  const one = sqlite.prepare("select exam_id, subject, duration_sec, json_array_length(questions_json) qs from papers order by exam_id").all();
  console.log(`[import] DB 导入完成:exam_sets ${sets} 行 · papers ${papers} 行`);
  for (const r of one) console.log(`  - ${r.exam_id}(${r.subject})时长 ${r.duration_sec}s · 档案 ${r.qs} 条`);
  sqlite.close();
}

/* ---------- 主流程 ---------- */

if (!existsSync(PROTO)) {
  console.error(`[import] 找不到 ${PROTO} —— 请在仓库根目录执行`);
  process.exit(1);
}
copyStatic();
importDb();
