/** 一次性扫描 2024 年源卷清单(按月×Test 归并),不入库 */
import { readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "/Users/fanyunxu/Desktop/myproject/ielts-copilot";
const SRC_BASE = join(ROOT, "questions");

function walk(dir, out) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    if (["img", "audio", "css", "js"].includes(e.name)) continue;
    walk(join(dir, e.name), out);
  }
  if (existsSync(join(dir, "test.html"))) out.push(dir);
}

const all = [];
for (const subject of ["听力", "阅读", "写作", "口语"]) {
  walk(join(SRC_BASE, subject, "2024"), all);
}
console.log("=== 2024 年源卷目录清单 ===");
for (const p of all) console.log(" ", p.replace(SRC_BASE + "/", ""));

const bySet = new Map(); // key: month-Tn, val: subjects set + paths
for (const p of all) {
  const rel = p.replace(SRC_BASE + "/", "");
  const m = rel.match(/^([^/]+)\/2024\/[^/]*?2024-([a-z]+)-([a-z]+)-(?:practice|practise)-test-(\d+)(?:-\d+)?$/);
  if (!m) {
    console.log("  ? 非标路径:", rel);
    continue;
  }
  const [, subj, month, , tno] = m;
  const key = `${month}-T${tno}`;
  if (!bySet.has(key)) bySet.set(key, { month, tno, subjects: new Map() });
  const entry = bySet.get(key).subjects.get(subj) ?? { dirs: [] };
  entry.dirs.push(rel);
  bySet.get(key).subjects.set(subj, entry);
}

console.log("\n=== 按月×Test 归并(已存在即跳过) ===");
const sortedKeys = [...bySet.keys()].sort((a, b) => {
  const mo = (k) => ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"].indexOf(k.split("-")[0]);
  return mo(a) - mo(b) || Number(a.split("-T")[1]) - Number(b.split("-T")[1]);
});
for (const k of sortedKeys) {
  const { subjects } = bySet.get(k);
  const parts = [];
  for (const subj of ["听力", "阅读", "写作", "口语"]) {
    if (subjects.has(subj)) {
      const cnt = subjects.get(subj).dirs.length;
      parts.push(`${subj}${cnt > 1 ? "×" + cnt : ""}`);
    } else {
      parts.push(`${subj}❌`);
    }
  }
  console.log(" ", k.padEnd(12), parts.join(" | "));
}
console.log("\n合计月×Test 套数:", bySet.size);