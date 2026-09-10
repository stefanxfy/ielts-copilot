/** 检查 2024 月×T×科 拼图完整性(仅诊断,不入库) */
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = "/Users/fanyunxu/Desktop/myproject/ielts-copilot";
const SRC = join(ROOT, "questions");
const SUBJ = { 听力: "listening", 阅读: "reading", 写作: "writing", 口语: "speaking" };
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const TN = ["1", "2", "3", "4"];

const cells = {}; // key: month-Tn, value: { 听力:dir, 阅读:dir, ... }
const dangling = []; // 路径中科目与目录不一致
for (const [zh, en] of Object.entries(SUBJ)) {
  const b = join(SRC, zh, "2024");
  if (!existsSync(b)) continue;
  for (const e of readdirSync(b, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const m = e.name.match(/2024-([a-z]+)-([a-z]+)-practice-test-(\d+)(?:-\d+)?$/);
    if (!m) {
      dangling.push(`? 非标路径: ${zh}/${e.name}`);
      continue;
    }
    if (m[2] !== en) {
      dangling.push(`? 路径科目不一致: ${zh}/${e.name}(slug=${m[2]})`);
      continue;
    }
    const k = `${m[1]}-T${m[3]}`;
    if (!cells[k]) cells[k] = {};
    cells[k][zh] = e.name;
  }
}

console.log("=== 月×T 拼图矩阵(2024) ===");
const full = [];
for (const mo of MONTHS) {
  const row = [];
  for (const t of TN) {
    const k = `${mo}-T${t}`;
    const c = cells[k];
    row.push(c && c.听力 && c.阅读 && c.写作 && c.口语 ? "✅" : "—");
    if (c && c.听力 && c.阅读 && c.写作 && c.口语) full.push(k);
  }
  console.log(" ", mo.padEnd(10), row.join(" | "));
}
console.log("\n可拼完整套数:", full.length, "套 × 4 科 =", full.length * 4, "papers");

if (dangling.length) {
  console.log("\n非标路径(" + dangling.length + "):");
  for (const d of dangling) console.log(" ", d);
}

// 统计"有内容但未拼入完整套"的目录(可作补充备料)
const used = new Set();
for (const k of full) {
  const c = cells[k];
  for (const [zh, dir] of Object.entries(c)) used.add(`${zh}/${dir}`);
}
let orphan = 0;
for (const [zh] of Object.entries(SUBJ)) {
  const b = join(SRC, zh, "2024");
  for (const e of readdirSync(b, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    if (!used.has(`${zh}/${e.name}`)) {
      orphan++;
      console.log("  orphan:", `${zh}/${e.name}`);
    }
  }
}
console.log("\n未拼入完整套的 orphan 卷:", orphan);