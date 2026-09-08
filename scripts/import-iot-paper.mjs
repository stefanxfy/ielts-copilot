#!/usr/bin/env node
/**
 * scripts/import-iot-paper.mjs — IOT 批量抓取卷导入(单套:听力+阅读+写作,幂等)
 *
 * 数据源:questions/<科>/<年>/<slug>/(scripts/iot-fetch.mjs 产物)
 *   test.html(IOT 原生 DOM) + answers.json({num:ans}) + audio.mp3(听力)
 * 产物对齐 import-papers.mjs 的工程版五表体系:
 *   - 静态托管 public/exams/<exam_id>/,共享资源 public/exams/shared/exam-assets/
 *     ⚠️ 共享目录含手工补丁(scoring/exam-guard/exam-note/audio-lock),只增不删,严禁 rmSync
 *   - 注入 scoring.js(听/阅)/exam-note.js(写)+ answers js + clock-sec + exam-guard
 *   - DB:exam_sets + papers upsert(questions_json 自 data-num/q_type/part 分区生成)
 *
 * 与 prototype 管线的差异:
 *   - 答案来自 answers.json(扁平 num→ans),blocks 留空(本套无 checkbox 块题;
 *     若引入含块题的卷,需在 HTML 中解析 checkbox name="q-a-b" 生成 blocks)
 *   - bandTable/duration 沿用 prototype answers js 的同科目值(官方口径不变)
 */
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

const ROOT = process.cwd();
const EXAMS_OUT = join(ROOT, "public", "exams");
const SHARED_ASSETS = join(EXAMS_OUT, "shared", "exam-assets");
const IOT_ASSETS = join(ROOT, "questions", "exam-assets");
const PROTO = join(ROOT, "prototype", "exam");
const DB_FILE = join(ROOT, "data", "app.db");
const MIGRATIONS = join(ROOT, "src", "db", "migrations");

/* ---------- 本次导入的卷(换卷改这里) ---------- */

const SET = {
  examSetId: "a-2025mar",
  title: "A类 · 2025年3月真题 Test 1",
  category: "A",
  testPeriod: "2025-03",
  papers: [
    {
      subject: "listening",
      dir: "questions/听力/2025/ielts-mock-test-2025-march-listening-practice-test-1",
      bandTableSrc: "answers-a-2025jan-listening-test1.js",
      audioDst: "listening-a-2025mar-test1.mp3",
    },
    {
      subject: "reading",
      dir: "questions/阅读/2025/ielts-mock-test-2025-march-reading-practice-test-1",
      bandTableSrc: "answers-a-2025jan-test1.js",
    },
    {
      subject: "writing",
      dir: "questions/写作/2025/ielts-mock-test-2025-march-writing-practice-test-1",
    },
  ],
};

const SUBJECT_TITLE = { reading: "阅读", listening: "听力", writing: "写作" };
const examIdOf = (p) => `${SET.examSetId}-${p.subject}-test1`;

/* ---------- 工具 ---------- */

/** prototype answers js → IELTS_EXAM(bandTable/duration 口径沿用) */
function loadProtoExam(file) {
  const code = readFileSync(join(PROTO, "exam-assets", file), "utf8");
  const fakeWindow = {};
  new Function("window", code)(fakeWindow);
  if (!fakeWindow.IELTS_EXAM) throw new Error(`${file} 未定义 window.IELTS_EXAM`);
  return fakeWindow.IELTS_EXAM;
}

/** IOT 卷页 HTML → {qTypeByNum, partOf, totalQ}(同 import-papers.parsePaperHtml) */
function parsePaperHtml(testHtml) {
  const qTypeByNum = new Map();
  for (const [, num, code] of testHtml.matchAll(/data-num="(\d+)"[^>]*data-q_type="(\d+)"/g)) {
    qTypeByNum.set(Number(num), Number(code));
  }
  const partCounts = [...testHtml.matchAll(/data-part="\d+"[^>]*data-questions="(\d+)"/g)].map((m) => Number(m[1]));
  if (!partCounts.length) throw new Error("卷页未找到 part 分区(data-part/data-questions)");
  const partOf = new Map();
  let n = 1;
  partCounts.forEach((count, i) => {
    for (let k = 0; k < count; k++) partOf.set(n++, i + 1);
  });
  return { qTypeByNum, partOf, totalQ: n - 1 };
}

/** 写作卷:DOM .test-question 面板 → T1/T2 题干。
 *  新 IOT 卷的题干不在 drupal-settings-json(wot 仅是库名子串),在正文面板里:
 *  <div class="panel panel-default test-question"><h4>…Writing Task N…</h4>
 *    <div class="test-question__question">题干 HTML(含 "You should spend about 20 minutes")</div> */
function loadWritingTasks(testHtml, srcLabel) {
  const panels = [...testHtml.matchAll(/<div class="panel panel-default test-question">[\s\S]*?<div class="panel-body">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g)];
  const stripHtml = (s) => String(s ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const out = {};
  let idx = 0;
  for (const m of testHtml.matchAll(/Writing Task ([12])<\/span>[\s\S]*?<div class="test-question__question">([\s\S]*?)<\/div>/g)) {
    const key = m[1] === "1" ? "T1" : "T2";
    if (out[key]) continue;
    const body = m[2];
    const minutes = Number((body.match(/about <strong>(\d+) minutes<\/strong>/) || [])[1]);
    const isT1 = key === "T1";
    out[key] = {
      part: null,
      type: "WRITING_TASK",
      anchor: null,
      max: null,
      prompt: stripHtml(body),
      wordMin: isT1 ? 150 : 250,
      suggestedSec: (minutes || (isT1 ? 20 : 40)) * 60,
    };
    idx++;
  }
  if (idx < 2) throw new Error(`${srcLabel} 写作题干解析不足 2 条(得到 ${idx})`);
  return out;
}

const LETTER_ANS = /^[A-D](\s*,\s*[A-D])?$/;

function classify(num, answers, qTypeByNum) {
  const ans = String(answers[String(num)] ?? "");
  if (qTypeByNum.get(num) === 11) return { type: "TFNG", anchor: `q-${num}`, max: 1 };
  if (LETTER_ANS.test(ans)) return { type: ans.includes(",") ? "MULTI" : "SINGLE", anchor: `q-${num}`, max: 1 };
  return { type: "FILL", anchor: `q-${num}`, max: 1 };
}

/** IOT 页面通用改写:相对资源 → 共享目录,去掉 data-iot-orig,页尾注入脚本 */
function transformPage(html, extraScripts) {
  let out = html
    .replace(/(\.\/|\.\.\/\.\.\/\.\.\/)exam-assets\//g, "../shared/exam-assets/")
    // 装饰图(页脚二维码/封面缩略图等 inline-images/styles/themes)本地从未下载,还原原站外链
    .replace(/(src)="img\/[^"]*"([^>]*)data-iot-orig="([^"]*(?:\/inline-images\/|\/styles\/|\/themes\/)[^"]*)"/gi, "$1=\"$3\"$2")
    .replace(/ data-iot-orig="[^"]*"/g, "");
  if (extraScripts?.length) {
    const inject = extraScripts.map((s) => `<script src="../shared/exam-assets/${s}"></script>`).join("\n");
    out = out.replace(/<\/body>/i, `${inject}\n</body>`);
  }
  return out;
}

/* ---------- 步骤 1:静态托管 ---------- */

function copyStatic() {
  // 共享资源只增不删(保护手工补丁:scoring/exam-guard/exam-note/audio-lock/clock-sec 等)
  mkdirSync(SHARED_ASSETS, { recursive: true });
  let added = 0;
  for (const f of readdirSync(IOT_ASSETS)) {
    const dst = join(SHARED_ASSETS, f);
    if (!existsSync(dst)) {
      cpSync(join(IOT_ASSETS, f), dst);
      added++;
    }
  }
  console.log(`[import] 共享资源补齐:${added} 个新文件(其余沿用已打补丁版本)`);

  for (const p of SET.papers) {
    const examId = examIdOf(p);
    const dir = join(EXAMS_OUT, examId);
    mkdirSync(dir, { recursive: true });
    const testHtml = readFileSync(join(ROOT, p.dir, "test.html"), "utf8");
    // 卷内题目图片目录(写作 T1 图/阅读配图/听力题卡图)
    const imgDir = join(ROOT, p.dir, "img");
    if (existsSync(imgDir)) {
      const dstImg = join(dir, "img");
      mkdirSync(dstImg, { recursive: true });
      for (const f of readdirSync(imgDir)) copyFileSync(join(imgDir, f), join(dstImg, f));
    }

    if (p.subject === "listening") {
      // 音频入共享(对齐 prototype 命名:listening-<examSetId>-test1.mp3)
      copyFileSync(join(ROOT, p.dir, "audio.mp3"), join(SHARED_ASSETS, p.audioDst));
      // 原站播放器 → 本地真考模式隐藏 audio(autoplay+muted 绕自动播放策略,audio-lock 接管)
      const html = transformPage(testHtml).replace(
        /<audio id="listening-practice-player"[^>]*>[\s\S]*?<\/audio>/,
        `<audio id="ielts-local-audio" preload="auto" autoplay muted class="ielts-local-audio" style="display:none" title="IELTS 本地机考 · 听力音频（本地 · 真考模式：仅播一次）"><source src="../shared/exam-assets/${p.audioDst}" type="audio/mp3"></audio>`,
      );
      writeFileSync(
        join(dir, "listening.html"),
        transformPage(html, [
          `answers-${examId}.js`,
          "clock-sec.js",
          "scoring.js",
          "exam-guard.js",
          "audio-lock.js",
        ]).replace(/<script src="(\.\.\/shared\/exam-assets\/exam-guard\.js)"><\/script>/, '<script src="$1" defer></script>'),
      );
      // 进入链路:试音 → 须知(同 import-papers,副标题/跳转目标逐卷改写)
      const sub = `${SET.category}类 听力 · ${SET.title.split("·")[1]?.trim() ?? SET.title}`;
      let ts = transformPage(readFileSync(join(PROTO, "test-sound.html"), "utf8"));
      ts = ts
        .replace(/(<div class="ts-sub">)[^<]*(<\/div>)/, `$1${sub} · Test sound$2`)
        .replace(/var target = 'instructions\.html\?clockdefer=1'[^;]*;/, "var target = 'instructions.html?clockdefer=1';");
      writeFileSync(join(dir, "test-sound.html"), ts);
      let ins = transformPage(readFileSync(join(PROTO, "instructions.html"), "utf8"));
      ins = ins
        .replace(/(<div class="ts-sub">)[^<]*(<\/div>)/, `$1${sub} · Instructions$2`)
        .replace(/var targetTest = [^;]*;/, "var targetTest = 'listening.html';");
      writeFileSync(join(dir, "instructions.html"), ins);
    } else if (p.subject === "reading") {
      writeFileSync(
        join(dir, "reading.html"),
        transformPage(testHtml, [`answers-${examId}.js`, "clock-sec.js", "scoring.js", "exam-guard.js"]).replace(
          /<script src="(\.\.\/shared\/exam-assets\/exam-guard\.js)"><\/script>/,
          '<script src="$1" defer></script>',
        ),
      );
    } else {
      // 写作:无判分,exam-note 上报 + 离开防护
      writeFileSync(
        join(dir, "writing.html"),
        transformPage(testHtml, ["clock-sec.js", "exam-note.js", "exam-guard.js"]).replace(
          /<script src="(\.\.\/shared\/exam-assets\/exam-guard\.js)"><\/script>/,
          '<script src="$1" defer></script>',
        ),
      );
    }
    console.log(`[import] 静态托管 ${examId} → public/exams/${examId}/`);
  }
}

/* ---------- 步骤 2:answers-<examId>.js 生成(听/阅,scoring.js 依赖) ---------- */

function writeAnswersJs() {
  for (const p of SET.papers) {
    if (p.subject === "writing") continue;
    const examId = examIdOf(p);
    const answers = JSON.parse(readFileSync(join(ROOT, p.dir, "answers.json"), "utf8"));
    const proto = loadProtoExam(p.bandTableSrc);
    const total = Object.keys(answers).length;
    const js = `/* ${SET.title} · ${SUBJECT_TITLE[p.subject]} · 判分数据(由 scripts/import-iot-paper.mjs 生成)
 * 来源:${p.dir}/answers.json(IOT /solution 页 sys-answer 解析)
 * bandTable/duration 沿用 prototype 同科目口径(${p.bandTableSrc})
 */
window.IELTS_EXAM = {
  id: '${examId}',
  total: ${total},
  duration: ${proto.duration ?? (p.subject === "listening" ? 30 : 60)},
  bandTable: ${JSON.stringify(proto.bandTable ?? [])},
  blocks: [],
  answers: ${JSON.stringify(answers, null, 2)},
};
`;
    writeFileSync(join(SHARED_ASSETS, `answers-${examId}.js`), js);
    console.log(`[import] answers-${examId}.js(${total} 题)`);
  }
}

/* ---------- 步骤 3:DB 导入 ---------- */

function ensureSchema(sqlite) {
  const has = sqlite.prepare("select name from sqlite_master where type='table' and name='papers'").get();
  if (!has) migrate(drizzle(sqlite), { migrationsFolder: MIGRATIONS });
}

function importDb() {
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
    upSet.run({ examSetId: SET.examSetId, title: SET.title, category: SET.category, testPeriod: SET.testPeriod });
    for (const p of SET.papers) {
      const examId = examIdOf(p);
      const entryFile = p.subject === "listening" ? "test-sound.html" : `${p.subject}.html`;
      const assets = { entry: `/exams/${examId}/${entryFile}` };
      if (p.subject === "listening") assets.audio = `/exams/shared/exam-assets/${p.audioDst}`;

      let questionsJson, answersJson = null, bandTable = [], durationSec = 3600;
      const testHtml = readFileSync(join(ROOT, p.dir, "test.html"), "utf8");
      if (p.subject === "writing") {
        questionsJson = loadWritingTasks(testHtml, examId);
      } else {
        const answers = JSON.parse(readFileSync(join(ROOT, p.dir, "answers.json"), "utf8"));
        const { qTypeByNum, partOf, totalQ } = parsePaperHtml(testHtml);
        const total = Object.keys(answers).length;
        if (totalQ !== total) throw new Error(`${examId}: 页面题数 ${totalQ} ≠ answers.json ${total} 条`);
        const proto = loadProtoExam(p.bandTableSrc);
        questionsJson = {};
        answersJson = {};
        for (let n = 1; n <= total; n++) {
          const c = classify(n, answers, qTypeByNum);
          questionsJson[String(n)] = { part: partOf.get(n) ?? null, type: c.type, anchor: c.anchor, max: c.max };
          answersJson[c.anchor] = String(answers[String(n)]);
        }
        bandTable = proto.bandTable ?? [];
        durationSec = (proto.duration ?? (p.subject === "listening" ? 30 : 60)) * 60;
      }

      upPaper.run({
        examId,
        examSetId: SET.examSetId,
        subject: p.subject,
        title: `${SET.category}类 ${SUBJECT_TITLE[p.subject]} · ${SET.title.split("·")[1]?.trim() ?? SET.title}`,
        category: SET.category,
        testPeriod: SET.testPeriod,
        durationSec,
        bandTableJson: JSON.stringify(bandTable),
        assetsJson: JSON.stringify(assets),
        questionsJson: JSON.stringify(questionsJson),
        answersJson: answersJson ? JSON.stringify(answersJson) : null,
      });
    }
  });
  tx();

  const rows = sqlite
    .prepare("select exam_id, subject, duration_sec, json_array_length(questions_json) qs from papers where exam_set_id = ?")
    .all(SET.examSetId);
  console.log(`[import] DB 导入完成:exam_sets +${1} · papers ${rows.length} 行`);
  for (const r of rows) console.log(`  - ${r.exam_id}(${r.subject})时长 ${r.duration_sec}s · 档案 ${r.qs} 条`);
  sqlite.close();
}

/* ---------- 主流程 ---------- */

for (const p of SET.papers) {
  const d = join(ROOT, p.dir);
  if (!existsSync(d) || !existsSync(join(d, "test.html"))) {
    console.error(`[import] 卷源缺失:${d}`);
    process.exit(1);
  }
}

copyStatic();
writeAnswersJs();
importDb();
