/**
 * 批次4:2024 年 1–11 月真题批量导入(共 41 套 × 4 科 = 164 papers)
 *
 * 命名规则(clean, 与 2025 风格一致):
 *  - setId: a-2024{monthKey} (T1) / a-2024{monthKey}-test{n} (T2-T4)
 *  - examId: a-2024{monthKey}-{subject}-test{n}
 *  - testPeriod: 2024-{monthNum}
 *
 * 源目录 slug 命名映射:逐月从站方 collection 页核对(2024 命名混乱,不规则),
 * 详见 _scan-2024-real.mjs。特殊情况:
 *  - 1月 T4 写作:站方中文 slug(2026-09-08 iot-fetch 时清单漏收录,本次手动补抓)
 *  - 2月 T4 写作:站方 slug=test-3-0(给的是 T3 的 -0 变体)
 *  - 3月 T2 口语:源目录错挂在「写作」主题下(slug=writing),内容实为口语
 *    已在 _scan-2024-real.mjs 之前手动 rename 到正确路径
 *  - 8月 T3 口语:源目录 slug=test-1-0(T1 的 -0 变体,非独立 T3 卷)
 *  - 11月仅 T1(站方未发布 T2-T4,12 月全月未发布)
 */
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import Database from "better-sqlite3";

const ROOT = "/Users/fanyunxu/Desktop/myproject/ielts-copilot";
const NODE = "/Users/fanyunxu/.workbuddy/binaries/node/versions/22.22.2-2/bin/node";
const IMPORT = `${ROOT}/scripts/import-iot-paper.mjs`;

/** 2024 站方 11 个月,缺 12 月。每月 4 套(11 月仅 1 套) */
const MONTHS = [
  { key: "jan", en: "january",   num: "01" },
  { key: "feb", en: "february",  num: "02" },
  { key: "mar", en: "march",     num: "03" },
  { key: "apr", en: "april",     num: "04" },
  { key: "may", en: "may",       num: "05" },
  { key: "jun", en: "june",      num: "06" },
  { key: "jul", en: "july",      num: "07" },
  { key: "aug", en: "august",    num: "08" },
  { key: "sep", en: "september", num: "09" },
  { key: "oct", en: "october",   num: "10" },
  { key: "nov", en: "november",  num: "11" },
];

/**
 * 站方每月 4 套的源目录 slug(已从站方 collection 页逐月核对)
 * 行 = 月份,列 = T1/T2/T3/T4 的 [听力, 阅读, 写作, 口语] slug
 * 若某月份某套缺失则用空字符串占位(矩阵里已筛选过,此表只含完整套)
 */
const SOURCE = {
  jan: [
    ["test-1", "test-1", "test-1", "test-1"],
    ["test-2", "test-2", "test-2", "test-2"],
    ["test-3", "test-3", "test-3", "test-3"],
    ["test-4", "test-4", "test-4", "test-4"],
  ],
  feb: [
    ["test-1", "test-1", "test-1", "test-1"],
    ["test-2", "test-2", "test-2", "test-2"],
    ["test-3", "test-3", "test-3", "test-3"],
    ["test-4", "test-4", "test-3-0", "test-4"], // T4 写作站方给的是 T3 的 -0 变体
  ],
  mar: [
    ["test-1", "test-1", "test-1", "test-1"],
    ["test-1-0", "test-1-0", "test-1-0", "test-1-1"], // T2 口语=test-1-1(其他=test-1-0)
    ["test-1-1", "test-3", "test-3", "test-3"],         // T3 听=test-1-1(其他=test-3)
    ["test-4", "test-4", "test-4", "test-4"],
  ],
  apr: [
    ["test-1", "test-1", "test-1", "test-1"],
    ["test-1-0", "test-1-0", "test-1-0", "test-1-0"],
    ["test-1-1", "test-1-1", "test-3", "test-3"], // T3 写口=test-3(听阅=test-1-1)
    ["test-4", "test-4", "test-4", "test-4"],
  ],
  may: [
    ["test-1", "test-1-0", "test-1-2", "test-1-2"], // T1 月份命名特殊:听=test-1,阅=test-1-0,写口=test-1-2
    ["test-3", "test-3", "test-3", "test-3"],
    ["test-2", "test-2-2", "test-2-2", "test-2-2"], // T3 听=test-2(其他=test-2-2)
    ["test-2-0", "test-4", "test-4", "test-4"],       // T4 听=test-2-0(其他=test-4)
  ],
  jun: [
    ["test-1", "test-1", "test-1", "test-1"],
    ["test-2", "test-2", "test-2", "test-2"],
    ["test-3", "test-3", "test-3", "test-3"],
    ["test-4", "test-4", "test-4", "test-4"],
  ],
  jul: [
    ["test-1", "test-1", "test-1", "test-1"],
    ["test-2", "test-2", "test-2", "test-2-0"], // T2 口语=test-2-0(其他=test-2)
    ["test-3", "test-3", "test-3", "test-3"],
    ["test-4", "test-4", "test-4", "test-4"],
  ],
  aug: [
    ["test-1", "test-1", "test-1", "test-1"],
    ["test-2", "test-2", "test-2", "test-2"],
    ["test-3", "test-3", "test-3", "test-1-0"], // T3 口语=test-1-0(T1 的 -0 变体)
    ["test-4", "test-4", "test-4", "test-4"],
  ],
  sep: [
    ["test-1", "test-1", "test-1", "test-1"],
    ["test-2", "test-2", "test-2", "test-2"],
    ["test-3", "test-3", "test-3", "test-3"],
    ["test-4", "test-4", "test-4", "test-4"],
  ],
  oct: [
    ["test-1", "test-1", "test-1", "test-1"],
    ["test-2", "test-2", "test-2", "test-2"],
    ["test-3", "test-3", "test-3", "test-3"],
    ["test-4", "test-4", "test-4", "test-4"],
  ],
  nov: [
    // 11 月仅 T1(站方未发布 T2-T4)
    ["test-1", "test-1", "test-1", "test-1"],
    ["", "", "", ""],
    ["", "", "", ""],
    ["", "", "", ""],
  ],
};

const SUBJECT_TITLE = {
  listening: "听力",
  reading: "阅读",
  writing: "写作",
  speaking: "口语",
};

const PROTO_BAND = {
  listening: "answers-a-2025jan-listening-test1.js",
  reading: "answers-a-2025jan-test1.js",
  writing: "answers-a-2025jan-test1.js", // 写作不查,占位
  speaking: "answers-a-2025jan-test1.js", // 口语不查,占位
};

/** 构造 BATCH:仅含 4 科齐全的套 */
const BATCH = [];

/** 月份过滤:不传则全跑(1-11月);传 --months=jan,feb,... 则仅跑指定月 */
const monthsArg = process.argv.find((a) => a.startsWith("--months="));
const monthFilter = monthsArg
  ? new Set(monthsArg.slice("--months=".length).split(",").map((s) => s.trim()))
  : null;

for (const meta of MONTHS) {
  if (monthFilter && !monthFilter.has(meta.key)) continue;
  for (let tNo = 1; tNo <= 4; tNo++) {
    const row = SOURCE[meta.key][tNo - 1];
    if (!row || !row[0]) continue; // 11 月 T2-T4 跳过
    const setId = tNo === 1 ? `a-2024${meta.key}` : `a-2024${meta.key}-test${tNo}`;
    const examIdOf = (sub) => `${setId}-${sub}-test${tNo}`;
    const papers = [];
    for (let i = 0; i < 4; i++) {
      const subject = ["listening", "reading", "writing", "speaking"][i];
      const slug = row[i];
      const dir = `questions/${SUBJECT_TITLE[subject]}/2024/ielts-mock-test-2024-${meta.en}-${subject === "listening" ? "listening" : subject === "reading" ? "reading" : subject === "writing" ? "writing" : "speaking"}-practice-${slug}`;
      if (!existsSync(`${ROOT}/${dir}/test.html`)) {
        console.error(`[预检] 缺源:${dir}/test.html`);
        process.exit(1);
      }
      const paper = { subject, dir, bandTableSrc: PROTO_BAND[subject] };
      if (subject === "listening") {
        paper.audioDst = `listening-${examIdOf(subject)}.mp3`;
      }
      papers.push(paper);
    }
    BATCH.push({
      meta, tNo, setId,
      examSetId: setId,
      title: `A类 · 2024年${meta.num}月真题 Test ${tNo}`,
      enLabel: `2024 ${meta.en.charAt(0).toUpperCase() + meta.en.slice(1)} Test ${tNo}`,
      papers,
    });
  }
}
console.log(`[batch4] 共 ${BATCH.length} 套 × 4 科 = ${BATCH.length * 4} papers`);
for (const b of BATCH) console.log(`  ${b.setId}`);

/** 替换 import-iot-paper.mjs 的 SET 块 */
const IMPORT_SRC = readFileSync(IMPORT, "utf8");
const SET_BLOCK_RE = /const\s\s*SET\s\s*=\s\s*\{[\s\S]*?^\}\;/m;
if (!SET_BLOCK_RE.test(IMPORT_SRC)) {
  console.error("无法匹配 import-iot-paper.mjs 的 SET 块结构");
  process.exit(1);
}

const results = [];
for (const item of BATCH) {
  const papers = item.papers.map(p =>
    `    { subject: "${p.subject}", dir: "${p.dir}", bandTableSrc: "${p.bandTableSrc}"${p.audioDst ? `, audioDst: "${p.audioDst}"` : ""} },`).join("\n");
  const setJs = `const SET = {
  examSetId: "${item.examSetId}",
  setId: "${item.setId}",
  testNo: ${item.tNo},
  title: "${item.title}",
  category: "A",
  testPeriod: "2024-${item.meta.num}",
  papers: [
${papers}
  ],
};
`;
  const patched = IMPORT_SRC.replace(SET_BLOCK_RE, setJs + "\n");
  if (patched === IMPORT_SRC) {
    console.error(`[fail] ${item.setId} SET 块未变化`);
    process.exit(1);
  }
  writeFileSync(IMPORT, patched);

  console.log(`\n=== ${item.setId} (${item.meta.en} Test ${item.tNo}) ===`);
  const out = spawnSync(NODE, [IMPORT], { cwd: ROOT, encoding: "utf8", timeout: 180_000 });
  const ok = out.status === 0;
  const tail = (out.stdout || "").split("\n").slice(-15).join("\n");
  console.log(tail);
  if (!ok) console.error(`[stderr] ${(out.stderr || "").slice(0, 800)}`);
  results.push({ id: item.setId, ok });
}

// 验收:DB + 静态目录
const db = new Database(`${ROOT}/data/app.db`, { readonly: true });
const paperRows = db.prepare("SELECT exam_id, subject FROM papers WHERE exam_id LIKE ? ORDER BY exam_id").all("a-2024%");
console.log(`\n=== DB 验证 ===`);
console.log(`2024 papers 总行数: ${paperRows.length} (期望 ${BATCH.length * 4})`);
let allOk = true;
for (const item of BATCH) {
  for (const sub of ["listening", "reading", "writing", "speaking"]) {
    const eid = `${item.setId}-${sub}-test${item.tNo}`;
    const has = paperRows.some(r => r.exam_id === eid);
    const dirOk = existsSync(`${ROOT}/public/exams/${eid}/${sub === "listening" ? "test-sound.html" : sub + ".html"}`);
    if (!has || !dirOk) {
      console.error(`  ❌ ${eid}: db=${has} static=${dirOk}`);
      allOk = false;
    }
  }
}
console.log(allOk ? "✅ 所有套 4 科齐全" : "❌ 部分缺失");

console.log("\n=== summary ===");
for (const r of results) console.log(`${r.ok ? "✅" : "❌"} ${r.id}`);
process.exit(allOk ? 0 : 1);