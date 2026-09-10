/** 扫描 2023 全部源目录(包括非标格式) */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = "/Users/fanyunxu/Desktop/myproject/ielts-copilot";
const SRC = join(ROOT, "questions");

const SUBJ = { 听力: "listening", 阅读: "reading", 写作: "writing", 口语: "speaking" };
const MONTH_NUM = { "01": "january", "02": "february", "03": "march", "04": "april", "05": "may", "06": "june", "07": "july", "08": "august", "09": "september", "10": "october", "11": "november", "12": "december" };
const MONTH_NAME_CN = { january: "1月", february: "2月", march: "3月", april: "4月", may: "5月", june: "6月", july: "7月", august: "8月", september: "9月", october: "10月", november: "11月", december: "12月" };
const ZH_MONTH = { january: "一月", february: "二月", march: "三月", april: "四月", may: "五月", june: "六月", july: "七月", august: "八月", september: "九月", october: "十月", november: "十一月", december: "十二月" };
const ZH_SUBJ = { listening: "听力", reading: "阅读", writing: "写作", speaking: "口语" };

// 收集所有源目录(支持三种格式)
function classifyDir(name) {
  // 格式 A: ielts-mock-test-2023-{month}-{subj}-practice-test-{n} 或 test-{n}-{m}
  let m = name.match(/^ielts-mock-test-2023-([a-z]+)-([a-z]+)-practice-(test-\d+(?:-\d+)?)$/);
  if (m) return { month: m[1], subj: m[2], slug: m[3], format: "A" };
  // 格式 B: 简写 2023{mon}{subj}{num}, e.g. 202301listen01
  m = name.match(/^2023(\d{2})([a-z]+)(\d{2})$/);
  if (m) return { month: MONTH_NUM[m[1]] ?? m[1], subj: m[2], slug: `test-${Number(m[3])}`, format: "B" };
  // 格式 C: 中文 slug, e.g. ielts-mock-test-2023-april-雅思听力真题-1
  m = name.match(/^ielts-mock-test-2023-([a-z]+)-雅思(听力|阅读|写作|口语)真题-(\d+)$/);
  if (m) return { month: m[1], subj: ({ 听力: "listening", 阅读: "reading", 写作: "writing", 口语: "speaking" })[m[2]], slug: `test-${m[3]}`, format: "C" };
  return null;
}

const allDirs = [];
for (const [zh, en] of Object.entries(SUBJ)) {
  const base = join(SRC, zh, "2023");
  if (!existsSync(base)) continue;
  for (const e of readdirSync(base, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const info = classifyDir(e.name);
    if (!info) {
      console.log(`? 真·非标: ${zh}/${e.name}`);
      continue;
    }
    if (info.subj !== en) continue;
    allDirs.push({ zh, dir: e.name, ...info });
  }
}

console.log("\n=== 全部源目录(按格式) ===");
const byFmt = { A: 0, B: 0, C: 0 };
for (const d of allDirs) byFmt[d.format]++;
console.log("格式 A (practice-test-N):", byFmt.A);
console.log("格式 B (202301listen01):", byFmt.B);
console.log("格式 C (中文 slug):", byFmt.C);

// 按月份×T 拼图(slug 末尾数字)
const matrix = {}; // month → T → subjects
for (const d of allDirs) {
  const tn = Number(d.slug.match(/(\d+)$/)[1]);
  if (!matrix[d.month]) matrix[d.month] = {};
  if (!matrix[d.month][tn]) matrix[d.month][tn] = new Set();
  matrix[d.month][tn].add(d.zh);
}

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
console.log("\n=== 月份×T 拼图(全部格式) ===");
console.log("  " + "月份".padEnd(10) + " | T1 | T2 | T3 | T4 | T-1-0 | T-2-0 | T-1-1 等");
let fullSets = 0;
let totalSubs = 0;
for (const mo of MONTHS) {
  let row = `  ${MONTH_NAME_CN[mo].padEnd(4)}(${mo.slice(0,3)})`;
  let completeCount = 0;
  for (const tn of [1, 2, 3, 4]) {
    const c = matrix[mo]?.[tn];
    const ok = c && c.size === 4;
    row += ` | ${ok ? "✅" : c ? "○" : "—"}`;
    if (ok) completeCount++;
  }
  // 算变体 T(test-1-0 = T0 等)的完整度
  for (const tn of [0, -1, -2]) {
    const c = matrix[mo]?.[tn];
    row += ` | ${c ? `T${tn}:` + c.size : "—"}`;
  }
  fullSets += completeCount;
  totalSubs += completeCount * 4;
  console.log(row);
}
console.log(`\n完整套(T1-T4 都四科齐全): ${fullSets} 套 × 4 = ${totalSubs} papers`);

// 完整套的命名映射(展平用于写 _batch5)
console.log("\n=== 完整套的 slug 映射(每月×T×subj) ===");
for (const mo of MONTHS) {
  for (const tn of [1, 2, 3, 4]) {
    const c = matrix[mo]?.[tn];
    if (!c || c.size !== 4) continue;
    const matched = allDirs.filter((d) => d.month === mo && Number(d.slug.match(/(\d+)$/)[1]) === tn);
    if (matched.length === 4) {
      const bySubj = {};
      for (const m of matched) bySubj[m.subj] = m.dir;
      console.log(`  ${MONTH_NAME_CN[mo]}-T${tn}:`);
      for (const [zh, en] of Object.entries(SUBJ)) {
        if (!bySubj[en]) console.log(`    缺 ${zh}`);
        else console.log(`    ${zh} ← ${bySubj[en]}`);
      }
    }
  }
}

// 看 4 月变体(test-1-0/test-2-0)的内容类型 — 是不是 T2/T3?
console.log("\n=== 4 月 源目录内容类型核对 ===");
for (const d of allDirs.filter((d) => d.month === "april")) {
  const fp = join(SRC, d.zh, "2023", d.dir, "test.html");
  if (!existsSync(fp)) { console.log(d.dir, "(no test.html)"); continue; }
  const html = readFileSync(fp, "utf8");
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  // 题目特征
  const writingHints = ["task 1", "task 2", "write at least"].reduce((n, w) => n + (text.toLowerCase().includes(w) ? 1 : 0), 0);
  const speakingHints = ["describe", "part 1", "part 2", "part 3", "you should say"].reduce((n, w) => n + (text.toLowerCase().includes(w) ? 1 : 0), 0);
  const tfng = ["true", "false", "not given"].reduce((n, w) => n + (text.toLowerCase().includes(w) ? 1 : 0), 0);
  console.log(`  ${d.dir} (${d.zh}) → W:${writingHints} S:${speakingHints} TFNG:${tfng}`);
}