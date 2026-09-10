/**
 * 2022 年 2-5 月隐藏卷导入(变体 + 真题3/4,均为单/双科套,无听力)
 *
 * 甄别结论(2026-09-10):6 对同号变体阅读经答案键比对全部为独立卷
 * (答案不同 36-40 处/公共 37-40 题);写作 2-5 月无隐藏卷;口语仅五月有 3/4。
 * 挂号(参照 1 月惯例):
 *   feb: test3=R1-1  test4=R2-1  test5=R3  test6=R4
 *   mar: test3=R1-1  test4=R2-1  test5=R3  test6=R4
 *   apr: test3=R1-1
 *   may: test3=R1-1  test5=S3  test6=S4
 *
 * 用法:node scripts/_import-2022feb2may-hidden.mjs
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

// [月cn, 月num, setId, papers: [subject, slugSuffix]]
const BATCH_DEF = [
  ["二月", 2, "a-2022feb-test3", [["reading", "1-1"]]],
  ["二月", 2, "a-2022feb-test4", [["reading", "2-1"]]],
  ["二月", 2, "a-2022feb-test5", [["reading", "3"]]],
  ["二月", 2, "a-2022feb-test6", [["reading", "4"]]],
  ["三月", 3, "a-2022mar-test3", [["reading", "1-1"]]],
  ["三月", 3, "a-2022mar-test4", [["reading", "2-1"]]],
  ["三月", 3, "a-2022mar-test5", [["reading", "3"]]],
  ["三月", 3, "a-2022mar-test6", [["reading", "4"]]],
  ["四月", 4, "a-2022apr-test3", [["reading", "1-1"]]],
  ["五月", 5, "a-2022may-test3", [["reading", "1-1"]]],
  ["五月", 5, "a-2022may-test5", [["speaking", "3"]]],
  ["五月", 5, "a-2022may-test6", [["speaking", "4"]]],
];

const BATCH = [];
for (const [cn, num, setId, paperDefs] of BATCH_DEF) {
  const papers = [];
  for (const [subject, suffix] of paperDefs) {
    const slug = `雅思真题试卷-${cn}-雅思${SUBJECT_TITLE[subject]}真题-${suffix}`;
    const dir = `questions/${SUBJECT_TITLE[subject]}/2022/${slug}`;
    if (!existsSync(`${ROOT}/${dir}/test.html`)) {
      console.error(`[skip] ${setId} 缺源卷: ${dir}`);
      papers.length = 0;
      break;
    }
    papers.push({ subject, dir });
  }
  if (papers.length) BATCH.push({ setId, testNo: Number(setId.slice(-1)), cn, num, papers });
}
console.log(`[batch] ${BATCH.length} 套: ${BATCH.map((b) => b.setId).join(", ")}`);
if (BATCH.length !== BATCH_DEF.length) {
  console.error("源卷不齐,拒绝执行");
  process.exit(1);
}

const IMPORT_SRC = readFileSync(IMPORT, "utf8");
const SET_BLOCK_RE = /const\s\s*SET\s\s*=\s\s*\{[\s\S]*?^\}\;/m;
if (!SET_BLOCK_RE.test(IMPORT_SRC)) { console.error("无法匹配 SET 块"); process.exit(1); }

const results = [];
for (const item of BATCH) {
  const papers = item.papers.map((p) =>
    `    { subject: "${p.subject}", dir: "${p.dir}", bandTableSrc: "${PROTO_BAND[p.subject]}" },`).join("\n");
  const setJs = `const SET = {
  examSetId: "${item.setId}",
  setId: "${item.setId}",
  testNo: ${item.testNo},
  title: "A类 · 2022年${item.num}月真题 Test ${item.testNo}",
  category: "A",
  testPeriod: "2022-0${item.num}",
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
  console.log((out.stdout || "").split("\n").slice(-10).join("\n"));
  if (!ok) console.error(`[stderr] ${(out.stderr || "").slice(-1200)}`);
  results.push({ id: item.setId, ok });
}

// 恢复 SET 块为本次最后一张(供溯源),DB 终验
const db = new Database(`${ROOT}/data/app.db`, { readonly: true });
const rows = db.prepare("SELECT exam_id, subject, title FROM papers WHERE exam_id LIKE 'a-2022%_test3-%' OR exam_id LIKE 'a-2022%_test4-%' OR exam_id LIKE 'a-2022%_test5-%' OR exam_id LIKE 'a-2022%_test6-%' ORDER BY exam_id").all();
const expectRows = BATCH.reduce((s, b) => s + b.papers.length, 0);
console.log(`\n=== DB 验证(test3-6 全部月份) ===`);
console.log(`papers: ${rows.length} (期望 ${expectRows})`);
for (const r of rows) console.log(`  ${r.exam_id} | ${r.subject} | ${r.title}`);
const bad = results.filter((r) => !r.ok);
if (rows.length !== expectRows || bad.length) {
  console.error(`FAIL: 失败套 ${bad.map((b) => b.id).join(",") || "无"}`);
  process.exit(1);
}
console.log("PASS");
