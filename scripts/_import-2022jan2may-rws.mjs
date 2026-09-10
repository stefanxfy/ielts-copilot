/**
 * 2022 年 1-5 月阅/写/口批量导入(每月 2 套 × 3 papers;听力已于 5ff59c7e 入库,不动)
 *
 * 背景:此前"站方无源"结论系解析 bug(href 百分号编码未解码)。2026-09-10 重析
 * collection/test202201..202205 确认每月均有阅/写/口各 2 套(中文 slug,1 月带
 * -1-1/-2-0 等消歧后缀)。30 张源卷已由 iot-fetch 抓齐,目录"旧版"归位到 2022/。
 *
 * 用法:node scripts/_import-2022jan2may-rws.mjs [--only=jan1,feb2,...]
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

// 月份表:编号 → { 中文, period, 1/2 套的 slug 后缀 }
const MONTHS = {
  jan: { cn: "一月", period: "2022-01", suffix: { 1: { reading: "1-1", writing: "1-1", speaking: "1-0" }, 2: { reading: "2-0", writing: "2", speaking: "2-1" } } },
  feb: { cn: "二月", period: "2022-02", suffix: { 1: { reading: "1", writing: "1", speaking: "1" }, 2: { reading: "2", writing: "2", speaking: "2" } } },
  mar: { cn: "三月", period: "2022-03", suffix: { 1: { reading: "1", writing: "1", speaking: "1" }, 2: { reading: "2", writing: "2", speaking: "2" } } },
  apr: { cn: "四月", period: "2022-04", suffix: { 1: { reading: "1", writing: "1", speaking: "1" }, 2: { reading: "2", writing: "2", speaking: "2" } } },
  may: { cn: "五月", period: "2022-05", suffix: { 1: { reading: "1", writing: "1", speaking: "1" }, 2: { reading: "2", writing: "2", speaking: "2" } } },
};

const only = process.argv.find((a) => a.startsWith("--only="));
const onlySet = only ? new Set(only.slice("--only=".length).split(",")) : null;

const BATCH = [];
for (const [mon, meta] of Object.entries(MONTHS)) {
  for (const n of [1, 2]) {
    const setId = `a-2022${mon}-test${n}`;
    if (onlySet && !onlySet.has(`${mon}${n}`)) continue;
    const papers = [];
    for (const subject of ["reading", "writing", "speaking"]) {
      const slug = `雅思真题试卷-${meta.cn}-雅思${SUBJECT_TITLE[subject]}真题-${meta.suffix[n][subject]}`;
      const dir = `questions/${SUBJECT_TITLE[subject]}/2022/${slug}`;
      if (!existsSync(`${ROOT}/${dir}/test.html`)) {
        console.error(`[skip] ${setId} 缺源卷: ${dir}`);
        papers.length = 0;
        break;
      }
      papers.push({ subject, dir, bandTableSrc: PROTO_BAND[subject] });
    }
    if (papers.length === 3) {
      BATCH.push({ setId, testNo: n, title: `A类 · 2022年${MONTH_NUM[mon]}月真题 Test ${n}`, period: meta.period, papers });
    }
  }
}
console.log(`[batch] ${BATCH.length} 套: ${BATCH.map((b) => b.setId).join(", ")}`);
const expect = onlySet ? onlySet.size : 10;
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
  title: "${item.title}",
  category: "A",
  testPeriod: "${item.period}",
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
const rows = db.prepare("SELECT exam_id, subject, title FROM papers WHERE exam_id LIKE 'a-2022%test%' AND subject IN ('reading','writing','speaking') AND (exam_id LIKE '%jan-%' OR exam_id LIKE '%feb-%' OR exam_id LIKE '%mar-%' OR exam_id LIKE '%apr-%' OR exam_id LIKE '%may-%') ORDER BY exam_id").all();
console.log(`\n=== DB 验证 ===`);
console.log(`1-5月阅写口 papers: ${rows.length} (期望 ${BATCH.length * 3})`);
for (const r of rows) console.log(`  ${r.exam_id} | ${r.subject} | ${r.title}`);
const bad = results.filter((r) => !r.ok);
if (rows.length !== BATCH.length * 3 || bad.length) {
  console.error(`FAIL: 失败套 ${bad.map((b) => b.id).join(",") || "无"}, DB 行数异常`);
  process.exit(1);
}
console.log("PASS");
