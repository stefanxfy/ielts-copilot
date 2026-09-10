/**
 * 批次3:8/9/10/11/12 月各 Test 1+Test 2 共 10 套 × 4 科 = 40 papers
 *
 * 站方错标补丁:
 *  - 10月口语 T2 源=test-1-0(站方错挂另一份卷,内容是 "Describe an unusual meal")
 *  - 11月听力 T1 源=november-reading-passage-1(站方错标成阅读,实为听力 Part1-4)
 *  - 8/9/10/11/12 月写作目录用 writting 拼写(管线兼容)
 */
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import Database from "better-sqlite3";

const ROOT = "/Users/fanyunxu/Desktop/myproject/ielts-copilot";
const NODE = "/Users/fanyunxu/.workbuddy/binaries/node/versions/22.22.2-2/bin/node";
const IMPORT = `${ROOT}/scripts/import-iot-paper.mjs`;

const MONTHS = {
  aug: { en: "august", num: "08", title: "8月", setTitle: "A类 · 2025年8月真题" },
  sep: { en: "september", num: "09", title: "9月", setTitle: "A类 · 2025年9月真题" },
  oct: { en: "october", num: "10", title: "10月", setTitle: "A类 · 2025年10月真题" },
  nov: { en: "november", num: "11", title: "11月", setTitle: "A类 · 2025年11月真题" },
  dec: { en: "december", num: "12", title: "12月", setTitle: "A类 · 2025年12月真题" },
};

/** 站方拼写混杂:8/9 月用 "practice" + "writing",10/11/12 月用 "practise" + "writting"。
 *  显式枚举所有源目录名(读盘再校验)。口语 T2 缺料时用 test-1-0 顶替。
 *  11月听力 T1 站方 slug 是 reading-passage-1(实为听力 Part1-4)。 */
const SOURCE = {
  aug: {
    listening: ["ielts-mock-test-2025-august-listening-practice-test-1", "ielts-mock-test-2025-august-listening-practice-test-2"],
    reading: ["ielts-mock-test-2025-august-reading-practice-test-1", "ielts-mock-test-2025-august-reading-practice-test-2"],
    writing: ["ielts-mock-test-2025-august-writing-practice-test-1", "ielts-mock-test-2025-august-writing-practice-test-2"],
    speaking: ["ielts-mock-test-2025-august-speaking-practice-test-1", "ielts-mock-test-2025-august-speaking-practice-test-2"],
  },
  sep: {
    listening: ["ielts-mock-test-2025-september-listening-practice-test-1", "ielts-mock-test-2025-september-listening-practice-test-2"],
    reading: ["ielts-mock-test-2025-september-reading-practice-test-1", "ielts-mock-test-2025-september-reading-practice-test-2"],
    writing: ["ielts-mock-test-2025-september-writing-practice-test-1", "ielts-mock-test-2025-september-writing-practice-test-2"],
    speaking: ["ielts-mock-test-2025-september-speaking-practice-test-1", "ielts-mock-test-2025-september-speaking-practice-test-2"],
  },
  oct: {
    listening: ["ielts-mock-test-2025-october-listening-practise-test-1", "ielts-mock-test-2025-october-listening-practise-test-2"],
    reading: ["ielts-mock-test-2025-october-reading-practise-test-1", "ielts-mock-test-2025-october-reading-practise-test-2"],
    writing: ["ielts-mock-test-2025-october-writting-practise-test-1", "ielts-mock-test-2025-october-writting-practise-test-2"],
    // 口语 T2 站方未提供 test-2,用 test-1-0 顶替(另一份卷,内容是 "unusual meal")
    speaking: ["ielts-mock-test-2025-october-speaking-practise-test-1", "ielts-mock-test-2025-october-speaking-practise-test-1-0"],
  },
  nov: {
    // 听力 T1 站方用 reading-passage-1 slug 错挂,实为听力 Part1-4
    listening: ["ielts-mock-test-2025-november-reading-passage-1", "ielts-mock-test-2025-november-listening-practise-test-2"],
    reading: ["ielts-mock-test-2025-november-reading-practise-test-1", "ielts-mock-test-2025-november-reading-practise-test-2"],
    writing: ["ielts-mock-test-2025-november-writting-practise-test-1", "ielts-mock-test-2025-november-writting-practise-test-2"],
    speaking: ["ielts-mock-test-2025-november-speaking-practise-test-1", "ielts-mock-test-2025-november-speaking-practise-test-2"],
  },
  dec: {
    listening: ["ielts-mock-test-2025-december-listening-practise-test-1", "ielts-mock-test-2025-december-listening-practise-test-1-0"],
    reading: ["ielts-mock-test-2025-december-reading-practise-test-1", "ielts-mock-test-2025-december-reading-practise-test-2"],
    writing: ["ielts-mock-test-2025-december-writting-practise-test-1", "ielts-mock-test-2025-december-writting-practise-test-2"],
    speaking: ["ielts-mock-test-2025-december-speaking-practise-test-1", "ielts-mock-test-2025-december-speaking-practise-test-2"],
  },
};

const SUBJECT_TITLE = {
  listening: "听力",
  reading: "阅读",
  writing: "写作",
  speaking: "口语",
};

// bandTableSrc: 沿用范本 answers-a-2025jan-{listening|test1}.js(共享 exam-assets/answers-*.js)
// loadProtoExam 会读 PROTO/exam-assets/<file>。写作/口语无判分,bandTableSrc 不必设(管线会自动跳过)
const PROTO_BAND = {
  listening: "answers-a-2025jan-listening-test1.js",
  reading: "answers-a-2025jan-test1.js",
  writing: "answers-a-2025jan-test1.js", // 写作不查,占位
  speaking: "answers-a-2025jan-test1.js", // 口语不查,占位
};

/** 每套 examSet = SET.examSetId, papers 数组含 4 科 */
const BATCH = [];
for (const [mKey, meta] of Object.entries(MONTHS)) {
  for (const tNo of [1, 2]) {
    const setId = tNo === 1 ? `a-2025${mKey}` : `a-2025${mKey}-test2`;
    const examIdOf = (sub) => `${setId}-${sub}-test${tNo}`;
    const papers = [];
    for (const subject of ["listening", "reading", "writing", "speaking"]) {
      const dir = `questions/${SUBJECT_TITLE[subject]}/2025/${SOURCE[mKey][subject][tNo - 1]}`;
      if (!existsSync(`${ROOT}/${dir}/test.html`)) {
        console.error(`[预检] 缺源:${dir}/test.html`);
        process.exit(1);
      }
      const paper = {
        subject,
        dir,
        bandTableSrc: PROTO_BAND[subject],
      };
      // 听力需 audioDst 对齐 prototype 命名规则:listening-<examSetId>-test<n>.mp3
      if (subject === "listening") {
        const eid = examIdOf(subject);
        paper.audioDst = `listening-${eid}.mp3`;
      }
      papers.push(paper);
    }
    BATCH.push({
      mKey, mEn: meta.en, mNum: meta.num, tNo,
      setId,
      examSetId: setId,
      title: `${meta.setTitle} Test ${tNo}`,
      enLabel: `2025 ${meta.en.charAt(0).toUpperCase() + meta.en.slice(1)} Test ${tNo}`,
      papers,
    });
  }
}
console.log(`[batch3] 共 ${BATCH.length} 套 × 4 科 = ${BATCH.length * 4} papers`);
console.log(BATCH.map(b => `  ${b.setId}`).join("\n"));

/** 替换 import-iot-paper.mjs 的 SET 块(利用文件中已有的「const SET = {...」」) */
const IMPORT_SRC = readFileSync(IMPORT, "utf8");
const SET_BLOCK_RE = /const\s\s*SET\s\s*=\s\s*\{[\s\S]*?^\}\;/m;
if (!SET_BLOCK_RE.test(IMPORT_SRC)) {
  console.error("无法匹配 import-iot-paper.mjs 的 SET 块结构");
  process.exit(1);
}

const results = [];
for (const item of BATCH) {
  const papers = item.papers.map(p => `    { subject: "${p.subject}", dir: "${p.dir}", bandTableSrc: "${p.bandTableSrc}"${p.audioDst ? `, audioDst: "${p.audioDst}"` : ""} },`).join("\n");
  const setJs = `const SET = {
  examSetId: "${item.examSetId}",
  setId: "${item.setId}",
  testNo: ${item.tNo},
  title: "${item.title}",
  category: "A",
  testPeriod: "2025-${item.mNum}",
  papers: [
${papers}
  ],
};
`;
  const patched = IMPORT_SRC.replace(SET_BLOCK_RE, setJs + "\n");
  if (patched === IMPORT_SRC) {
    console.error(`[fail] ${item.setId} SET 块未变化,`);
    process.exit(1);
  }
  writeFileSync(IMPORT, patched);

  console.log(`\n=== ${item.setId} (${item.mEn} Test ${item.tNo}) ===`);
  const out = spawnSync(NODE, [IMPORT], { cwd: ROOT, encoding: "utf8", timeout: 120_000 });
  const ok = out.status === 0;
  const tail = (out.stdout || "").split("\n").slice(-15).join("\n");
  console.log(tail);
  if (!ok) {
    console.error(`[stderr] ${(out.stderr || "").slice(0, 800)}`);
  }
  results.push({ id: item.setId, ok });
}

// 验收:每套 4 papers + 静态目录目录存在
const db = new Database(`${ROOT}/data/app.db`, { readonly: true });
const paperRows = db.prepare("SELECT exam_id, subject FROM papers WHERE exam_id LIKE ? ORDER BY exam_id").all("a-2025%");
console.log(`\n=== DB 验证 ===`);
console.log(`2025 papers 总行数: ${paperRows.length} (期望 14 旧 + 40 新 = ${14 + 40})`);
let allOk = true;
for (const item of BATCH) {
  const expected = ["listening", "reading", "writing", "speaking"];
  for (const sub of expected) {
    const eid = `${item.setId}-${sub}-test${item.tNo}`;
    const has = paperRows.some(r => r.exam_id === eid);
    const dirOk = existsSync(`${ROOT}/public/exams/${eid}/${sub === "listening" ? "test-sound.html" : sub + ".html"}`);
    if (!has || !dirOk) {
      console.error(`  ❌ ${eid}: db=${has} static=${dirOk}`);
      allOk = false;
    }
  }
}
console.log(allOk ? "✅ 所有 10 套 4 科齐全" : "❌ 部分缺失");

console.log("\n=== summary ===");
for (const r of results) console.log(`${r.ok ? "✅" : "❌"} ${r.id}`);
process.exit(allOk ? 0 : 1);