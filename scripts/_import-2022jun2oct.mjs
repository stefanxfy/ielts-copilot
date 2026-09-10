/**
 * 2022 年 6-10 月阅/写/口导入(补挂进已存在 test1/test2;听力 papers 已在库,upsert 幂等)
 *
 * 甄别:6-10 月无变体/隐藏卷(每科恰 2 套,无 -1-1 后缀、无真题3/4)。
 * SET 含 4 科:listening 行幂等覆盖(音频已存在跳过),阅/写/口新增。
 *
 * 用法:node scripts/_import-2022jun2oct.mjs [--only=jun1,jul2,...]
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import Database from "better-sqlite3";

const ROOT = "/Users/fanyunxu/Desktop/myproject/ielts-copilot";
const NODE = "/Users/fanyunxu/.workbuddy/binaries/node/versions/22.22.2-2/bin/node";
const IMPORT = `${ROOT}/scripts/import-iot-paper.mjs`;

const SUBJECT_TITLE = { listening: "听力", reading: "阅读", writing: "写作", speaking: "口语" };
const PROTO_BAND = {
  listening: "answers-a-2025jan-listening-test1.js",
  reading: "answers-a-2025jan-test1.js",
  writing: "answers-a-2025jan-test1.js", // 写作不查,占位
  speaking: "answers-a-2025jan-test1.js", // 口语不查,占位
};
const MONTHS = {
  jun: { cn: "六月", num: 6, listen: { 1: "202206listen01", 2: "202206listen02" } },
  jul: { cn: "七月", num: 7, listen: { 1: "202207listen01", 2: "202207listen02" } },
  aug: { cn: "八月", num: 8, listen: { 1: "雅思真题试卷-八月-雅思听力真题-1", 2: "雅思真题试卷-八月-雅思听力真题-2" } },
  sep: { cn: "九月", num: 9, listen: { 1: "202209listen01", 2: "202209listen02" } },
  oct: { cn: "十月", num: 10, listen: { 1: "202210listen01", 2: "202210listen02" } },
};

const only = process.argv.find((a) => a.startsWith("--only="));
const onlySet = only ? new Set(only.slice("--only=".length).split(",")) : null;

const BATCH = [];
for (const [mon, meta] of Object.entries(MONTHS)) {
  for (const n of [1, 2]) {
    const setId = `a-2022${mon}-test${n}`;
    if (onlySet && !onlySet.has(`${mon}${n}`)) continue;
    const papers = [];
    for (const subject of ["listening", "reading", "writing", "speaking"]) {
      const slug = subject === "listening" ? meta.listen[n] : `雅思真题试卷-${meta.cn}-雅思${SUBJECT_TITLE[subject]}真题-${n}`;
      const dir = `questions/${SUBJECT_TITLE[subject]}/2022/${slug}`;
      if (!existsSync(`${ROOT}/${dir}/test.html`)) {
        console.error(`[skip] ${setId} 缺源卷: ${dir}`);
        papers.length = 0;
        break;
      }
      const paper = { subject, dir, bandTableSrc: PROTO_BAND[subject] };
      if (subject === "listening") paper.audioDst = `listening-${setId}-listening-test${n}.mp3`;
      papers.push(paper);
    }
    if (papers.length === 4) {
      BATCH.push({ setId, testNo: n, num: meta.num, papers });
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
    `    { subject: "${p.subject}", dir: "${p.dir}", bandTableSrc: "${p.bandTableSrc}"${p.audioDst ? `, audioDst: "${p.audioDst}"` : ""} },`).join("\n");
  const setJs = `const SET = {
  examSetId: "${item.setId}",
  setId: "${item.setId}",
  testNo: ${item.testNo},
  title: "A类 · 2022年${item.num}月真题 Test ${item.testNo}",
  category: "A",
  testPeriod: "2022-${String(item.num).padStart(2, "0")}",
  papers: [
${papers}
  ],
};
`;
  const patched = IMPORT_SRC.replace(SET_BLOCK_RE, setJs + "\n");
  if (patched === IMPORT_SRC) { console.error(`[fail] ${item.setId} SET 未变`); process.exit(1); }
  writeFileSync(IMPORT, patched);
  console.log(`\n=== ${item.setId} ===`);
  const out = spawnSync(NODE, [IMPORT], { cwd: ROOT, encoding: "utf8", timeout: 300_000 });
  const ok = out.status === 0;
  console.log((out.stdout || "").split("\n").slice(-10).join("\n"));
  if (!ok) console.error(`[stderr] ${(out.stderr || "").slice(-1200)}`);
  results.push({ id: item.setId, ok });
}

// DB 终验:6-10 月 test1/test2 每套应 4 科
const db = new Database(`${ROOT}/data/app.db`, { readonly: true });
let allOk = true;
for (const item of BATCH) {
  const rows = db.prepare("SELECT subject FROM papers WHERE exam_id LIKE ? || '-%' ORDER BY subject").all(item.setId);
  const subs = rows.map((r) => r.subject).join(",");
  const ok = rows.length === 4 && results.find((r) => r.id === item.setId)?.ok;
  if (!ok) allOk = false;
  console.log(`${ok ? "OK " : "BAD"} ${item.setNo ?? item.setId} [${subs}]`);
}
const bad = results.filter((r) => !r.ok);
if (!allOk || bad.length) { console.error("FAIL"); process.exit(1); }
console.log("PASS");
