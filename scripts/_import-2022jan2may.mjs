/**
 * 2022 年 1-5 月听力批量导入(每月 2 套,共 5 月 × 2 = 10 papers)。
 *
 * 站方事实(2026-09-10 实测 collection/test202201..test202205):2022 年 1-10 月
 * 每月仅提供 2 套听力(2022XXlisten01/02),阅读/写作/口语从不存在,无可导。
 * 源卷 2026-09-08 已全部抓好,本脚本仅驱动 import 管线入库。
 *
 * 用法:node scripts/_import-2022jan2may.mjs [--only=jan1,jan2,...]
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import Database from "better-sqlite3";

const ROOT = "/Users/fanyunxu/Desktop/myproject/ielts-copilot";
const NODE = "/Users/fanyunxu/.workbuddy/binaries/node/versions/22.22.2-2/bin/node";
const IMPORT = `${ROOT}/scripts/import-iot-paper.mjs`;

const MONTHS = [
  { key: "jan", num: "01" },
  { key: "feb", num: "02" },
  { key: "mar", num: "03" },
  { key: "apr", num: "04" },
  { key: "may", num: "05" },
];

const only = process.argv.find((a) => a.startsWith("--only="));
const onlySet = only ? new Set(only.slice("--only=".length).split(",")) : null;

const BATCH = [];
for (const mo of MONTHS) {
  for (const t of [1, 2]) {
    const id = `${mo.key}${t}`;
    if (onlySet && !onlySet.has(id)) continue;
    const setId = `a-2022${mo.key}-test${t}`;
    const dir = `questions/听力/2022/2022${mo.num}listen0${t}`;
    if (!existsSync(`${ROOT}/${dir}/test.html`)) {
      console.error(`[skip] ${setId} 缺源卷: ${dir}`);
      continue;
    }
    BATCH.push({
      id, setId, t, num: mo.num,
      title: `A类 · 2022年${parseInt(mo.num, 10)}月真题 Test ${t}`,
      dir,
    });
  }
}
console.log(`[batch] ${BATCH.length} 套: ${BATCH.map((b) => b.setId).join(", ")}`);
if (BATCH.length !== (onlySet ? onlySet.size : 10)) {
  console.error("套数与期望不符,拒绝执行");
  process.exit(1);
}

const IMPORT_SRC = readFileSync(IMPORT, "utf8");
const SET_BLOCK_RE = /const\s\s*SET\s\s*=\s\s*\{[\s\S]*?^\}\;/m;
if (!SET_BLOCK_RE.test(IMPORT_SRC)) { console.error("无法匹配 SET 块"); process.exit(1); }

const results = [];
for (const item of BATCH) {
  const setJs = `const SET = {
  examSetId: "${item.setId}",
  setId: "${item.setId}",
  testNo: ${item.t},
  title: "${item.title}",
  category: "A",
  testPeriod: "2022-${item.num}",
  papers: [
    { subject: "listening", dir: "${item.dir}", bandTableSrc: "answers-a-2025jan-listening-test1.js", audioDst: "listening-${item.setId}-listening-test${item.t}.mp3" },
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

const db = new Database(`${ROOT}/data/app.db`, { readonly: true });
const rows = db.prepare("SELECT exam_id, title FROM papers WHERE exam_id LIKE 'a-2022%test%' AND exam_id NOT LIKE '%-test3%' AND exam_id NOT LIKE '%-test4%' AND (exam_id LIKE 'a-2022jan%' OR exam_id LIKE 'a-2022feb%' OR exam_id LIKE 'a-2022mar%' OR exam_id LIKE 'a-2022apr%' OR exam_id LIKE 'a-2022may%') ORDER BY exam_id").all();
console.log(`\n=== DB 验证 ===`);
console.log(`2022 jan-may papers: ${rows.length} (期望 10)`);
for (const r of rows) console.log(`  ${r.exam_id} | ${r.title}`);
const bad = results.filter((r) => !r.ok);
if (rows.length !== BATCH.length || bad.length) {
  console.error(`FAIL: 失败套 ${bad.map((b) => b.id).join(",") || "无"}, DB 行数异常`);
  process.exit(1);
}
console.log("PASS");
