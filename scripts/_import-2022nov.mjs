/**
 * 2022 年 11 月 4 套批量导入(仿 _batch5.mjs 精简版)
 *
 * 源卷:听 T1/T2 = 202211listen01/02(2026-09-08 已抓),其余 14 张 = 2026-09-10
 * iot-fetch --href-has=十一月 新抓,目录由"旧版"归位到 2022/。
 *
 * 12 月教训已内置:裸 URL 抓取(iot-fetch 默认)、SET.enLabel 派生校验、
 * verifyImages + validateQuizProduct 硬校验、transformPage 清洗规则
 * (CSS/JS 绝对路径 + onerror 兜底 + 裸 select wrapper 均已在管线)。
 *
 * 用法:node scripts/_import-2022nov.mjs [--only=1,2,3,4]
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import Database from "better-sqlite3";

const ROOT = "/Users/fanyunxu/Desktop/myproject/ielts-copilot";
const NODE = "/Users/fanyunxu/.workbuddy/binaries/node/versions/22.22.2-2/bin/node";
const IMPORT = `${ROOT}/scripts/import-iot-paper.mjs`;

const PROTO_BAND = {
  listening: "answers-a-2025jan-listening-test1.js",
  reading: "answers-a-2025jan-test1.js",
  writing: "answers-a-2025jan-test1.js", // 写作不查,占位
  speaking: "answers-a-2025jan-test1.js", // 口语不查,占位
};
const SUBJECT_TITLE = { listening: "听力", reading: "阅读", writing: "写作", speaking: "口语" };

const SLUG = (n, subject) => `雅思真题试卷-十一月-雅思${SUBJECT_TITLE[subject]}真题-${n}`;
const LISTEN = { 1: "202211listen01", 2: "202211listen02", 3: SLUG(3, "listening"), 4: SLUG(4, "listening") };

const only = process.argv.find((a) => a.startsWith("--only="));
const onlySet = only ? new Set(only.slice("--only=".length).split(",")) : null;

const BATCH = [];
for (let n = 1; n <= 4; n++) {
  if (onlySet && !onlySet.has(String(n))) continue;
  const setId = `a-2022nov-test${n}`;
  const papers = [];
  for (const subject of ["listening", "reading", "writing", "speaking"]) {
    const slug = subject === "listening" ? LISTEN[n] : SLUG(n, subject);
    const dir = `questions/${SUBJECT_TITLE[subject]}/2022/${slug}`;
    if (!existsSync(`${ROOT}/${dir}/test.html`)) {
      console.error(`[skip] ${setId} 缺源卷: ${dir}`);
      papers.length = 0;
      break;
    }
    const paper = { subject, dir, bandTableSrc: PROTO_BAND[subject] };
    if (subject === "listening") paper.audioDst = `listening-${setId}-${subject}-test${n}.mp3`;
    papers.push(paper);
  }
  if (papers.length === 4) {
    BATCH.push({ n, setId, title: `A类 · 2022年11月真题 Test ${n}`, papers });
  }
}
console.log(`[batch] ${BATCH.length} 套: ${BATCH.map((b) => b.setId).join(", ")}`);
if (BATCH.length !== (onlySet ? onlySet.size : 4)) {
  console.error("源卷不齐,拒绝执行(先跑 iot-fetch / 归位目录)");
  process.exit(1);
}

const IMPORT_SRC = readFileSync(IMPORT, "utf8");
const SET_BLOCK_RE = /const\s\s*SET\s\s*=\s\s*\{[\s\S]*?^\}\;/m;
if (!SET_BLOCK_RE.test(IMPORT_SRC)) { console.error("无法匹配 SET 块"); process.exit(1); }

const results = [];
for (const item of BATCH) {
  const papers = item.papers.map((p) =>
    `    { subject: "${p.subject}", dir: "${p.dir}", bandTableSrc: "${p.bandTableSrc}"${p.audioDst ? `, audioDst: "${p.audioDst}"` : ""} },`).join("\n");
  const setJs = `const SET = {
  examSetId: "${item.setId}",
  setId: "${item.setId}",
  testNo: ${item.n},
  title: "${item.title}",
  category: "A",
  testPeriod: "2022-11",
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
const rows = db.prepare("SELECT exam_id, subject, title FROM papers WHERE exam_id LIKE 'a-2022nov-%' ORDER BY exam_id").all();
console.log(`\n=== DB 验证 ===`);
console.log(`a-2022nov papers: ${rows.length} (期望 ${BATCH.length * 4})`);
for (const r of rows) console.log(`  ${r.exam_id} | ${r.title}`);
const bad = results.filter((r) => !r.ok);
if (rows.length !== BATCH.length * 4 || bad.length) {
  console.error(`FAIL: 失败套 ${bad.map((b) => b.id).join(",") || "无"}, DB 行数异常`);
  process.exit(1);
}
console.log("PASS");
