/** 2024 年真实站方命名映射矩阵(已从 collection 页核对)
 *
 * 已核对月份(按 collection 页链接尾段):
 *  - january: test-1 / test-2 / test-3 / test-4 (4 套干净命名)
 *  - march:   test-1 / test-1-0 / test-3(听阅)/test-1-1(听T3)/test-4
 *  - april:   test-1 / test-1-0 / test-1-1(听阅T3)/test-3(写口T3)/test-4
 *  - may:     test-1 / test-1-0 / test-3(口语=写作T2=test-1-0变体) / test-4
 *             实测5月: T1=test-1, T2=test-3, T3=test-2, T4=test-2-0 (极不规则!)
 *  - july:    test-1 / test-2 / test-3 / test-4
 *
 * 其他月份未核对 — 暂沿用占位 fallback(test-1/test-2/test-3/test-4)。
 * 用源目录存在性校验并填充缺口。
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = "/Users/fanyunxu/Desktop/myproject/ielts-copilot";
const SRC = join(ROOT, "questions");
const SUBJ = { 听力: "listening", 阅读: "reading", 写作: "writing", 口语: "speaking" };
const SUBJ_ORDER = ["听力", "阅读", "写作", "口语"];

// 已核对的命名表。规则:按月份索引一个 4x4 矩阵 [T1/T2/T3/T4][subj]=slug
const SITE_NAMES = {
  january: [
    { 听力: "test-1", 阅读: "test-1", 写作: "test-1", 口语: "test-1" },
    { 听力: "test-2", 阅读: "test-2", 写作: "test-2", 口语: "test-2" },
    { 听力: "test-3", 阅读: "test-3", 写作: "test-3", 口语: "test-3" },
    { 听力: "test-4", 阅读: "test-4", 写作: "test-4", 口语: "test-4" },
  ],
  february: [
    // 实际源目录: 4 套 test-1/2/3/4 clean 命名(口语写作有 test-3-0 变体)
    { 听力: "test-1", 阅读: "test-1", 写作: "test-1", 口语: "test-1" },
    { 听力: "test-2", 阅读: "test-2", 写作: "test-2", 口语: "test-2" },
    { 听力: "test-3", 阅读: "test-3", 写作: "test-3", 口语: "test-3" },
    { 听力: "test-4", 阅读: "test-4", 写作: "test-3-0", 口语: "test-4" },
  ],
  march: [
    // 实测:口语 T2 用 test-1-1(听阅写 T2=test-1-0)
    { 听力: "test-1", 阅读: "test-1", 写作: "test-1", 口语: "test-1" },
    { 听力: "test-1-0", 阅读: "test-1-0", 写作: "test-1-0", 口语: "test-1-1" },
    { 听力: "test-1-1", 阅读: "test-3", 写作: "test-3", 口语: "test-3" },
    { 听力: "test-4", 阅读: "test-4", 写作: "test-4", 口语: "test-4" },
  ],
  april: [
    { 听力: "test-1", 阅读: "test-1", 写作: "test-1", 口语: "test-1" },
    { 听力: "test-1-0", 阅读: "test-1-0", 写作: "test-1-0", 口语: "test-1-0" },
    { 听力: "test-1-1", 阅读: "test-1-1", 写作: "test-3", 口语: "test-3" },
    { 听力: "test-4", 阅读: "test-4", 写作: "test-4", 口语: "test-4" },
  ],
  may: [
    // 实测 5 月: T1=test-1, T2=test-3, T3=test-2, T4=test-2-0
    { 听力: "test-1", 阅读: "test-1-0", 写作: "test-1-2", 口语: "test-1-2" },
    { 听力: "test-3", 阅读: "test-3", 写作: "test-3", 口语: "test-3" },
    { 听力: "test-2", 阅读: "test-2-2", 写作: "test-2-2", 口语: "test-2-2" },
    { 听力: "test-2-0", 阅读: "test-4", 写作: "test-4", 口语: "test-4" },
  ],
  july: [
    // 已核对:4 套 clean 命名(口语 T2 = test-2-0)
    { 听力: "test-1", 阅读: "test-1", 写作: "test-1", 口语: "test-1" },
    { 听力: "test-2", 阅读: "test-2", 写作: "test-2", 口语: "test-2-0" },
    { 听力: "test-3", 阅读: "test-3", 写作: "test-3", 口语: "test-3" },
    { 听力: "test-4", 阅读: "test-4", 写作: "test-4", 口语: "test-4" },
  ],
  august: [
    // 已核对:T3 口语 = test-1-0(T1 的 -0 变体)
    { 听力: "test-1", 阅读: "test-1", 写作: "test-1", 口语: "test-1" },
    { 听力: "test-2", 阅读: "test-2", 写作: "test-2", 口语: "test-2" },
    { 听力: "test-3", 阅读: "test-3", 写作: "test-3", 口语: "test-1-0" },
    { 听力: "test-4", 阅读: "test-4", 写作: "test-4", 口语: "test-4" },
  ],
};

// 未核对月份(june/september/october/november/december)的占位
// 11 月仅有 T1(其他月份站方未提供),12 月全空
const MONTH_KEYS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const PLACEHOLDER = [
  { 听力: "test-1", 阅读: "test-1", 写作: "test-1", 口语: "test-1" },
  { 听力: "test-2", 阅读: "test-2", 写作: "test-2", 口语: "test-2" },
  { 听力: "test-3", 阅读: "test-3", 写作: "test-3", 口语: "test-3" },
  { 听力: "test-4", 阅读: "test-4", 写作: "test-4", 口语: "test-4" },
];

console.log("=== 2024 月×T×科 真实站方命名映射 → clean examId 推演 ===\n");

const MONTH_NAME_CN = {
  january: "1月", february: "2月", march: "3月", april: "4月", may: "5月", june: "6月",
  july: "7月", august: "8月", september: "9月", october: "10月", november: "11月", december: "12月",
};
const MONTH_KEY_SHORT = { january: "jan", february: "feb", march: "mar", april: "apr", may: "may", june: "jun", july: "jul", august: "aug", september: "sep", october: "oct", november: "nov", december: "dec" };

let totalSets = 0;
let totalSubs = 0;
const matrix = [];
for (let t = 0; t < 4; t++) {
  matrix.push({ sets: 0, subs: 0, lines: [] });
}

for (const mo of MONTH_KEYS) {
  const mapping = SITE_NAMES[mo] ?? PLACEHOLDER;
  const cells = [];
  for (let t = 0; t < 4; t++) {
    const cell = {};
    for (const [zh, en] of Object.entries(SUBJ)) {
      const slug = mapping[t][zh];
      const dir = join(SRC, zh, "2024", `ielts-mock-test-2024-${mo}-${en}-practice-${slug}`);
      cell[zh] = existsSync(dir) ? "✅" : "❌";
    }
    cells.push(cell);
  }
  // 拼图统计
  const fullSets = cells.filter((c) => SUBJ_ORDER.every((zh) => c[zh] === "✅"));
  if (fullSets.length) {
    totalSets += fullSets.length;
    totalSubs += fullSets.length * 4;
    for (let i = 0; i < fullSets.length; i++) matrix[i].sets++;
  }

  console.log(`  ${MONTH_NAME_CN[mo].padEnd(4)}(${mo})  ${cells.map((c, i) => {
    const sym = SUBJ_ORDER.every((zh) => c[zh] === "✅") ? "✅" : "—";
    return `T${i + 1}:${sym}`;
  }).join("  ")}`);
  // 缺口明细(只对未全齐的套)
  for (let t = 0; t < 4; t++) {
    const miss = SUBJ_ORDER.filter((zh) => cells[t][zh] === "❌");
    if (miss.length && miss.length < 4) {
      console.log(`      T${t + 1} 缺: ${miss.join(", ")}`);
    } else if (miss.length === 4) {
      console.log(`      T${t + 1}: 完全无源(可能站方未提供 或 fetch 未覆盖)`);
    }
  }
}

console.log(`\n=== 完整套汇总 ===`);
console.log(`  每月完整套(T1-T4 都四科齐全): ${totalSets} 套`);
console.log(`  对应 papers: ${totalSubs} (× 4 科)`);
console.log(`  按 T 分:`, matrix.map((m, i) => `T${i + 1}=${m.sets}`).join(", "));

// 输出可执行的 _batch4 源目录表(直接喂给批量驱动)
console.log("\n=== _batch4 源目录映射(完整套 → clean examId) ===");
const lines = [];
for (const mo of MONTH_KEYS) {
  const mapping = SITE_NAMES[mo] ?? PLACEHOLDER;
  for (let t = 0; t < 4; t++) {
    const cell = {};
    let ok = true;
    for (const [zh, en] of Object.entries(SUBJ)) {
      const slug = mapping[t][zh];
      const dir = join(SRC, zh, "2024", `ielts-mock-test-2024-${mo}-${en}-practice-${slug}`);
      if (!existsSync(dir)) { ok = false; break; }
      cell[zh] = `ielts-mock-test-2024-${mo}-${en}-practice-${slug}`;
    }
    if (ok) {
      const tNo = t + 1;
      const setId = tNo === 1 ? `a-2024${MONTH_KEY_SHORT[mo]}` : `a-2024${MONTH_KEY_SHORT[mo]}-test${tNo}`;
      lines.push({ setId, tNo, month: MONTH_KEY_SHORT[mo], moLong: mo, cell });
    }
  }
}
for (const ln of lines) {
  console.log(`  ${ln.setId}:`);
  for (const zh of SUBJ_ORDER) console.log(`    ${zh.padEnd(2)} ← ${ln.cell[zh]}`);
}
console.log(`\n共 ${lines.length} 套可导`);