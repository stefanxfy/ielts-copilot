/**
 * 批次5:2023 年真题批量导入(共 12 月 × 4 套 = 48 套 × 4 科 = 192 papers)
 *
 * 命名规则(clean, 与 2024/2025 风格一致):
 *  - setId: a-2023{monthKey} (T1) / a-2023{monthKey}-test{n} (T2-T4)
 *  - examId: a-2023{monthKey}-{subject}-test{n}
 *  - testPeriod: 2023-{monthNum}
 *
 * 2023 命名极度混乱(每卷独立 slug,中文/英文/简写混合),SOURCE 表复用 _patch-2023.mjs
 * 的逐月映射(从站方 collection 页核对)。null = 站方该月该套该科未提供,跳过。
 *
 * 用法:node scripts/_batch5.mjs [--months=jan,feb,...]
 */
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import Database from "better-sqlite3";

const ROOT = "/Users/fanyunxu/Desktop/myproject/ielts-copilot";
const NODE = "/Users/fanyunxu/.workbuddy/binaries/node/versions/22.22.2-2/bin/node";
const IMPORT = `${ROOT}/scripts/import-iot-paper.mjs`;

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
  { key: "dec", en: "december",  num: "12" },
];

const SUBJECT_TITLE = { listening: "听力", reading: "阅读", writing: "写作", speaking: "口语" };
const SUBJECT_EN = { 听力: "listening", 阅读: "reading", 写作: "writing", 口语: "speaking" };

const PROTO_BAND = {
  listening: "answers-a-2025jan-listening-test1.js",
  reading: "answers-a-2025jan-test1.js",
  writing: "answers-a-2025jan-test1.js", // 写作不查,占位
  speaking: "answers-a-2025jan-test1.js", // 口语不查,占位
};

// === 2023 SOURCE(同 _patch-2023.mjs) ===
const SOURCE = {
  january: {
    1: { listening: "202301listen01", reading: "雅思真题试卷-一月-雅思阅读真题-1-0", writing: "雅思真题试卷-一月-雅思写作真题-1-0", speaking: "雅思真题试卷-一月-雅思口语真题-1-1" },
    2: { listening: "雅思真题试卷-一月-雅思听力真题-2-0", reading: "雅思真题试卷-一月-雅思阅读真题-2-1", writing: "雅思真题试卷-一月-雅思写作真题-2-1", speaking: "雅思真题试卷-一月-雅思口语真题-2-0" },
    3: { listening: "雅思真题试卷-一月-雅思听力真题-3", reading: "雅思真题试卷-一月-雅思阅读真题-3", writing: "雅思真题试卷-一月-雅思写作真题-3", speaking: "雅思真题试卷-一月-雅思口语真题-3" },
    4: { listening: "202301listen04", reading: "雅思真题试卷-一月-雅思阅读真题-4", writing: "雅思真题试卷-一月-雅思写作真题-4", speaking: "雅思真题试卷-一月-雅思口语真题-4" },
  },
  february: {
    1: { listening: "雅思真题试卷-二月-雅思听力真题-1-1", reading: "雅思真题试卷-二月-雅思阅读真题-1-1", writing: "ielts-mock-test-2023-february-雅思写作真题-1", speaking: "ielts-mock-test-2023-february-雅思口语真题-1" },
    2: { listening: "雅思真题试卷-二月-雅思听力真题-2-1", reading: "雅思真题试卷-二月-雅思阅读真题-2-1", writing: "ielts-mock-test-2023-february-雅思写作真题-2", speaking: "ielts-mock-test-2023-february-雅思口语真题-2" },
    3: { listening: "202302listen03", reading: "雅思真题试卷-二月-雅思阅读真题-3", writing: "ielts-mock-test-2023-february-雅思写作真题-3", speaking: "ielts-mock-test-2023-february-雅思口语真题-3" },
    4: { listening: "202302listen04", reading: "雅思真题试卷-二月-雅思阅读真题-4", writing: "ielts-mock-test-2023-february-雅思写作真题-4", speaking: "ielts-mock-test-2023-february-雅思口语真题-4" },
  },
  march: {
    1: { listening: "ielts-mock-test-2023-march-雅思听力真题-1", reading: "雅思真题试卷-三月-雅思阅读真题-1-1", writing: "ielts-mock-test-2023-march-雅思写作真题-1", speaking: "ielts-mock-test-2023-march-雅思口语真题-1" },
    2: { listening: "ielts-mock-test-2023-march-雅思听力真题-2", reading: "雅思真题试卷-三月-雅思阅读真题-2-1", writing: "ielts-mock-test-2023-march-雅思写作真题-2", speaking: "ielts-mock-test-2023-march-雅思口语真题-2" },
    3: { listening: "202303listen03", reading: "雅思真题试卷-三月-雅思阅读真题-3", writing: "ielts-mock-test-2023-march-雅思写作真题-3", speaking: "ielts-mock-test-2023-march-雅思口语真题-3" },
    4: { listening: "202303listen04", reading: "雅思真题试卷-三月-雅思阅读真题-4", writing: "ielts-mock-test-2023-march-雅思写作真题-4", speaking: "ielts-mock-test-2023-march-雅思口语真题-4" },
  },
  april: {
    1: { listening: "ielts-mock-test-2023-april-雅思听力真题-1", reading: "雅思真题试卷-四月-雅思阅读真题-1-1", writing: "ielts-mock-test-2023-april-writing-practice-test-1", speaking: "ielts-mock-test-2023-april-雅思口语真题-1" },
    2: { listening: "ielts-mock-test-2023-april-listening-practice-test-2", reading: "ielts-mock-test-2023-april-reading-practice-test-2", writing: "ielts-mock-test-2023-april-writing-practice-test-2", speaking: "ielts-mock-test-2023-april-speaking-practice-test-2" },
    3: { listening: "ielts-mock-test-2023-april-listening-practice-test-1", reading: "ielts-mock-test-2023-april-reading-practice-test-1-0", writing: "ielts-mock-test-2023-april-writing-practice-test-1-0", speaking: "ielts-mock-test-2023-april-speaking-practice-test-1" },
    4: { listening: "雅思真题试卷-四月-雅思听力真题-4", reading: "ielts-mock-test-2023-april-reading-practice-test-2-0", writing: "ielts-mock-test-2023-april-writing-practice-test-2-0", speaking: "ielts-mock-test-2023-april-speaking-practice-test-2-0" },
  },
  may: {
    1: { listening: "雅思真题试卷-五月-雅思听力真题-1-1", reading: "雅思真题试卷-五月-雅思阅读真题-1-1", writing: "ielts-mock-test-2023-may-writing-practice-test-1", speaking: "ielts-mock-test-2023-may-speaking-practice-test-1" },
    2: { listening: "202305listen02", reading: "ielts-mock-test-2023-may-reading-practice-test-2", writing: "ielts-mock-test-2023-may-writing-practice-test-2", speaking: "ielts-mock-test-2023-may-speaking-practice-test-2" },
    3: { listening: "202305listen03", reading: "ielts-mock-test-2023-may-reading-practice-test-1-0", writing: "雅思真题试卷-五月-雅思写作真题3", speaking: "雅思真题试卷-五月-雅思口语真题-3" },
    4: { listening: "202305listen04", reading: "ielts-mock-test-2023-may-reading-practice-test-2-0", writing: null, speaking: null },
  },
  june: {
    1: { listening: "202306listen01", reading: "ielts-mock-test-2023-june-reading-practice-test-1", writing: "ielts-mock-test-2023-june-writing-practice-test-1", speaking: "ielts-mock-test-2023-june-speaking-practice-test-1" },
    2: { listening: "ielts-mock-test-2023-june-雅思听力真题-2", reading: "ielts-mock-test-2023-june-reading-practice-test-2", writing: "ielts-mock-test-2023-june-writing-practice-test-2", speaking: "ielts-mock-test-2023-june-speaking-practice-test-2" },
    3: { listening: "202306listen03", reading: "ielts-mock-test-2023-june-reading-practice-test-1-0", writing: "ielts-mock-test-2023-june-writing-practice-test-1-0", speaking: "ielts-mock-test-2023-june-speaking-practice-test-1-0" },
    4: { listening: "202306listen04", reading: "ielts-mock-test-2023-june-reading-practice-test-2-0", writing: "ielts-mock-test-2023-june-writing-practice-test-2-0", speaking: null },
  },
  july: {
    1: { listening: "ielts-mock-test-2023-july-listening-practice-test-1", reading: "ielts-mock-test-2023-july-reading-practice-test-1", writing: "ielts-mock-test-2023-july-writing-practice-test-1", speaking: "ielts-mock-test-2023-july-speaking-practice-test-1" },
    2: { listening: "ielts-mock-test-2023-july-listening-practice-test-2", reading: "ielts-mock-test-2023-july-reading-practice-test-2", writing: "ielts-mock-test-2023-july-writing-practice-test-2", speaking: "ielts-mock-test-2023-july-speaking-practice-test-2" },
    3: { listening: "202307listen03", reading: "ielts-mock-test-2023-july-reading-practice-test-1-0", writing: "ielts-mock-test-2023-july-writing-practice-test-1-0", speaking: "ielts-mock-test-2023-july-speaking-practice-test-1-0" },
    4: { listening: "202307listen04", reading: "ielts-mock-test-2023-july-reading-practice-test-2-0", writing: "ielts-mock-test-2023-july-writing-practice-test-2-0", speaking: "ielts-mock-test-2023-july-speaking-practice-test-2-0" },
  },
  august: {
    1: { listening: "ielts-mock-test-2023-august-listening-practice-test-1", reading: "ielts-mock-test-2023-august-reading-practice-test-1", writing: "ielts-mock-test-2023-august-writing-practice-test-1", speaking: "ielts-mock-test-2023-august-speaking-practice-test-1" },
    2: { listening: "ielts-mock-test-2023-august-listening-practice-test-2", reading: "ielts-mock-test-2023-august-reading-practice-test-2", writing: "ielts-mock-test-2023-august-writing-practice-test-2", speaking: "ielts-mock-test-2023-august-speaking-practice-test-2" },
    3: { listening: "ielts-mock-test-2023-august-listening-practice-test-1-0", reading: "ielts-mock-test-2023-august-reading-practice-test-1-0", writing: "ielts-mock-test-2023-august-writing-practice-test-1-0", speaking: "ielts-mock-test-2023-august-speaking-practice-test-1-0" },
    4: { listening: "ielts-mock-test-2023-august-listening-practice-test-2-0", reading: "ielts-mock-test-2023-august-reading-practice-test-2-0", writing: "ielts-mock-test-2023-august-writing-practice-test-2-0", speaking: "ielts-mock-test-2023-august-speaking-practice-test-2-0" },
  },
  september: {
    1: { listening: "ielts-mock-test-2023-september-listening-practice-test-1", reading: "ielts-mock-test-2023-september-reading-practice-test-1", writing: "ielts-mock-test-2023-september-writing-practice-test-1", speaking: "ielts-mock-test-2023-september-speaking-practice-test-1" },
    2: { listening: "ielts-mock-test-2023-september-listening-practice-test-2", reading: "ielts-mock-test-2023-september-reading-practice-test-2", writing: "ielts-mock-test-2023-september-writing-practice-test-2", speaking: "ielts-mock-test-2023-september-speaking-practice-test-2" },
    3: { listening: "ielts-mock-test-2023-september-listening-practice-test-1-0", reading: "雅思真题试卷-九月-reading-practice-test-3", writing: "雅思真题试卷-九月-writing-practice-test-3", speaking: "ielts-mock-test-2023-september-speaking-practice-test-1-0" },
    4: { listening: "ielts-mock-test-2023-september-listening-practice-test-2-0", reading: "雅思真题试卷-九月-reading-practice-test-4", writing: "ielts-mock-test-2023-september-writing-practice-test-2-0", speaking: "ielts-mock-test-2023-september-speaking-practice-test-2-0" },
  },
  october: {
    1: { listening: "ielts-mock-test-2023-october-listening-practice-test-1", reading: "ielts-mock-test-2023-october-reading-practice-test-1", writing: "ielts-mock-test-2023-october-writing-practice-test-1", speaking: "ielts-mock-test-2023-october-speaking-practice-test-1" },
    2: { listening: "ielts-mock-test-2023-october-listening-practice-test-2", reading: "ielts-mock-test-2023-october-reading-practice-test-2", writing: "ielts-mock-test-2023-october-writing-practice-test-2", speaking: "ielts-mock-test-2023-october-speaking-practice-test-2" },
    3: { listening: "ielts-mock-test-2023-october-listening-practice-test-1-0", reading: "ielts-mock-test-2023-october-reading-practice-test-1-0", writing: "ielts-mock-test-2023-october-writing-practice-test-1-0", speaking: "ielts-mock-test-2023-october-speaking-practice-test-1-0" },
    4: { listening: "ielts-mock-test-2023-october-listening-practice-test-2-0", reading: "ielts-mock-test-2023-october-reading-practice-test-2-0", writing: "ielts-mock-test-2023-october-writing-practice-test-2-0", speaking: "ielts-mock-test-2023-october-speaking-practice-test-2-0" },
  },
  november: {
    1: { listening: "ielts-mock-test-2023-november-listening-practice-test-1", reading: "ielts-mock-test-2023-november-reading-practice-test-1", writing: "ielts-mock-test-2023-november-writing-practice-test-1", speaking: "ielts-mock-test-2023-november-speaking-practice-test-1" },
    2: { listening: "ielts-mock-test-2023-november-listening-practice-test-2", reading: "ielts-mock-test-2023-november-reading-practice-test-2", writing: "ielts-mock-test-2023-november-雅思写作真题-2", speaking: "ielts-mock-test-2023-november-speaking-practice-test-2" },
    3: { listening: "ielts-mock-test-2023-november-listening-practice-test-1-0", reading: "ielts-mock-test-2023-november-reading-practice-test-1-0", writing: "ielts-mock-test-2023-november-writing-practice-test-1-0", speaking: "ielts-mock-test-2023-november-speaking-practice-test-1-0" },
    4: { listening: "ielts-mock-test-2023-november-listening-practice-test-2-0", reading: "ielts-mock-test-2023-november-reading-practice-test-2-0", writing: "ielts-mock-test-2023-november-writing-practice-test-2-0", speaking: "ielts-mock-test-2023-november-speaking-practice-test-2-0" },
  },
  december: {
    1: { listening: "ielts-mock-test-2023-december-listening-practice-test-1", reading: "ielts-mock-test-2023-december-reading-practice-test-1", writing: "ielts-mock-test-2023-december-writing-practice-test-1", speaking: "ielts-mock-test-2023-december-speaking-practice-test-1" },
    2: { listening: "ielts-mock-test-2023-december-listening-practice-test-2", reading: "ielts-mock-test-2023-december-reading-practice-test-2", writing: "ielts-mock-test-2023-december-writing-practice-test-2", speaking: "ielts-mock-test-2023-december-speaking-practice-test-2" },
    3: { listening: "ielts-mock-test-2023-december-listening-practice-test-1-0", reading: "ielts-mock-test-2023-december-reading-practice-test-1-0", writing: "ielts-mock-test-2023-december-writing-practice-test-1-0", speaking: "ielts-mock-test-2023-december-雅思口语真题-3" },
    4: { listening: "ielts-mock-test-2023-december-listening-practice-test-2-0", reading: "ielts-mock-test-2023-december-reading-practice-test-2-0", writing: "ielts-mock-test-2023-december-雅思写作真题-2", speaking: "ielts-mock-test-2023-december-speaking-practice-test-2-0" },
  },
};

const monthsArg = process.argv.find((a) => a.startsWith("--months="));
const monthFilter = monthsArg
  ? new Set(monthsArg.slice("--months=".length).split(",").map((s) => s.trim()))
  : null;

/** 构造 BATCH:仅含 4 科齐全的套 */
const BATCH = [];
for (const meta of MONTHS) {
  if (monthFilter && !monthFilter.has(meta.key)) continue;
  for (let tNo = 1; tNo <= 4; tNo++) {
    const row = SOURCE[meta.en]?.[tNo];
    if (!row) continue;
    if (Object.values(row).every((v) => !v)) continue; // 全空(如 may-T4)
    const setId = tNo === 1 ? `a-2023${meta.key}` : `a-2023${meta.key}-test${tNo}`;
    const examIdOf = (sub) => `${setId}-${sub}-test${tNo}`;
    const papers = [];
    let allOk = true;
    for (let i = 0; i < 4; i++) {
      const subject = ["listening", "reading", "writing", "speaking"][i];
      const slug = row[subject];
      if (!slug) { allOk = false; break; }
      const dir = `questions/${SUBJECT_TITLE[subject]}/2023/${slug}`;
      if (!existsSync(`${ROOT}/${dir}/test.html`)) { allOk = false; break; }
      const paper = { subject, dir, bandTableSrc: PROTO_BAND[subject] };
      if (subject === "listening") paper.audioDst = `listening-${examIdOf(subject)}.mp3`;
      papers.push(paper);
    }
    if (!allOk) continue;
    BATCH.push({
      meta, tNo, setId,
      examSetId: setId,
      title: `A类 · 2023年${meta.num}月真题 Test ${tNo}`,
      enLabel: `2023 ${meta.en.charAt(0).toUpperCase() + meta.en.slice(1)} Test ${tNo}`,
      papers,
    });
  }
}
console.log(`[batch5] 共 ${BATCH.length} 套 × 4 科 = ${BATCH.length * 4} papers`);
for (const b of BATCH) console.log(`  ${b.setId}`);

const IMPORT_SRC = readFileSync(IMPORT, "utf8");
const SET_BLOCK_RE = /const\s\s*SET\s\s*=\s\s*\{[\s\S]*?^\}\;/m;
if (!SET_BLOCK_RE.test(IMPORT_SRC)) { console.error("无法匹配 SET 块"); process.exit(1); }

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
  testPeriod: "2023-${item.meta.num}",
  papers: [
${papers}
  ],
};
`;
  const patched = IMPORT_SRC.replace(SET_BLOCK_RE, setJs + "\n");
  if (patched === IMPORT_SRC) { console.error(`[fail] ${item.setId} SET 未变`); process.exit(1); }
  writeFileSync(IMPORT, patched);
  console.log(`\n=== ${item.setId} (${item.meta.en} Test ${item.tNo}) ===`);
  const out = spawnSync(NODE, [IMPORT], { cwd: ROOT, encoding: "utf8", timeout: 180_000 });
  const ok = out.status === 0;
  const tail = (out.stdout || "").split("\n").slice(-15).join("\n");
  console.log(tail);
  if (!ok) console.error(`[stderr] ${(out.stderr || "").slice(0, 800)}`);
  results.push({ id: item.setId, ok });
}

const db = new Database(`${ROOT}/data/app.db`, { readonly: true });
const paperRows = db.prepare("SELECT exam_id, subject FROM papers WHERE exam_id LIKE ? ORDER BY exam_id").all("a-2023%");
console.log(`\n=== DB 验证 ===`);
console.log(`2023 papers 总行数: ${paperRows.length} (期望 ${BATCH.length * 4})`);
let allOk = true;
for (const item of BATCH) {
  for (const sub of ["listening", "reading", "writing", "speaking"]) {
    const eid = `${item.setId}-${sub}-test${item.tNo}`;
    const has = paperRows.some(r => r.exam_id === eid);
    const dirOk = existsSync(`${ROOT}/public/exams/${eid}/${sub === "listening" ? "test-sound.html" : sub + ".html"}`);
    if (!has || !dirOk) { console.error(`  ❌ ${eid}: db=${has} static=${dirOk}`); allOk = false; }
  }
}
console.log(allOk ? "✅ 所有套 4 科齐全" : "❌ 部分缺失");

console.log("\n=== summary ===");
for (const r of results) console.log(`${r.ok ? "✅" : "❌"} ${r.id}`);
process.exit(allOk ? 0 : 1);