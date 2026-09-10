/**
 * 2022 年 1 月隐藏卷导入(变体 + 真题3/4,全科无听力)
 *
 * 甄别结论(2026-09-10):1 月站方实际有 6 套阅/写/口。同号变体经答案键
 * 比对(阅读 1-0 vs 1-1 答案 36/40 处不同且题型不同)确认为独立卷,非重复上传。
 * test1/test2 已导入(听力+合集页口径卷),本脚本补 test3-test6:
 *   test3 = R1-0 + W1-0 + S1-1   test4 = R2-1 + W2-1 + S2-0
 *   test5 = R3 + W3 + S3         test6 = R4 + W4 + S4
 *
 * 用法:node scripts/_import-2022jan-hidden.mjs [--only=3,4,5,6]
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import Database from "better-sqlite3";

const ROOT = "/Users/fanyunxu/Desktop/myproject/ielts-copilot";
const NODE = "/Users/fanyunxu/.workbuddy/binaries/node/versions/22.22.2-2/bin/node";
const IMPORT = `${ROOT}/scripts/import-iot-paper.mjs`;

const PROTO_BAND = {
  reading: "answers-a-2025jan-test1.js",
  writing: "answers-a-2025jan-test1.js", // 写作不查,占位
  speaking: "answers-a-2025jan-test1.js", // 口语不查,占位
};
const SUBJECT_TITLE = { reading: "阅读", writing: "写作", speaking: "口语" };

// 每套的科目 → 源卷 slug 后缀
const TESTS = {
  3: { reading: "1-0", writing: "1-0", speaking: "1-1" },
  4: { reading: "2-1", writing: "2-1", speaking: "2-0" },
  5: { reading: "3", writing: "3", speaking: "3" },
  6: { reading: "4", writing: "4", speaking: "4" },
};

const only = process.argv.find((a) => a.startsWith("--only="));
const onlySet = only ? new Set(only.slice("--only=".length).split(",")) : null;

const BATCH = [];
for (const [n, suffix] of Object.entries(TESTS)) {
  const setId = `a-2022jan-test${n}`;
  if (onlySet && !onlySet.has(n)) continue;
  const papers = [];
  for (const subject of ["reading", "writing", "speaking"]) {
    const slug = `雅思真题试卷-一月-雅思${SUBJECT_TITLE[subject]}真题-${suffix[subject]}`;
    const dir = `questions/${SUBJECT_TITLE[subject]}/2022/${slug}`;
    if (!existsSync(`${ROOT}/${dir}/test.html`)) {
      console.error(`[skip] ${setId} 缺源卷: ${dir}`);
      papers.length = 0;
      break;
    }
    papers.push({ subject, dir, bandTableSrc: PROTO_BAND[subject] });
  }
  if (papers.length === 3) {
    BATCH.push({ setId, testNo: Number(n), papers });
  }
}
console.log(`[batch] ${BATCH.length} 套: ${BATCH.map((b) => b.setId).join(", ")}`);
const expect = onlySet ? onlySet.size : 4;
if (BATCH.length !== expect) {
  console.error(`源卷不齐(期望 ${expect} 套,实际 ${BATCH.length}),拒绝执行`);
  process.exit(1);
}

const IMPORT_SRC = readFileSync(IMPORT, "utf8");
const SET_BLOCK_RE = /const\s\s*SET\s\s*=\s\s*\{[\s\S]*?^\}\;/m;
if (!SET_BLOCK_RE.test(IMPORT_SRC)) { console.error("无法匹配 SET 块"); process.exit(1); }

const results = [];
for (const item of BATCH) {
  const papers = item.papers.map((p) =>
    `    { subject: "${p.subject}", dir: "${p.dir}", bandTableSrc: "${p.bandTableSrc}" },`).join("\n");
  const setJs = `const SET = {
  examSetId: "${item.setId}",
  setId: "${item.setId}",
  testNo: ${item.testNo},
  title: "A类 · 2022年1月真题 Test ${item.testNo}",
  category: "A",
  testPeriod: "2022-01",
  papers: [
${papers}
  ],
};
`;
  const patched = IMPORT_SRC.replace(SET_BLOCK_RE, setJs + "\n");
  if (patched === IMPORT_SRC) { console.error(`[fail] ${item.setId} SET 未变`); process.exit(1); }
  writeFileSync(IMPORT, patched);
  console.log(`\n=== ${item.setId} ===`);
  const out = spawnSync(NODE, [IMPORT], { cwd: ROOT, encoding: "utf8", timeout: 180_000 });
  const ok = out.status === 0;
  console.log((out.stdout || "").split("\n").slice(-12).join("\n"));
  if (!ok) console.error(`[stderr] ${(out.stderr || "").slice(-1200)}`);
  results.push({ id: item.setId, ok });
}

// 恢复 SET 块为本次最后一张(供溯源),DB 终验
const db = new Database(`${ROOT}/data/app.db`, { readonly: true });
const rows = db.prepare("SELECT exam_id, subject, title FROM papers WHERE exam_id LIKE 'a-2022jan-test3%' OR exam_id LIKE 'a-2022jan-test4%' OR exam_id LIKE 'a-2022jan-test5%' OR exam_id LIKE 'a-2022jan-test6%' ORDER BY exam_id").all();
console.log(`\n=== DB 验证 ===`);
console.log(`1月隐藏卷 papers: ${rows.length} (期望 ${BATCH.length * 3})`);
for (const r of rows) console.log(`  ${r.exam_id} | ${r.subject} | ${r.title}`);
const bad = results.filter((r) => !r.ok);
if (rows.length !== BATCH.length * 3 || bad.length) {
  console.error(`FAIL: 失败套 ${bad.map((b) => b.id).join(",") || "无"}, DB 行数异常`);
  process.exit(1);
}
console.log("PASS");
