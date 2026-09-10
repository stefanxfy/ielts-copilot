/** 一次性扫 2023 年源目录命名(不做存在性判断,只列清单)
 *
 * 不依赖站方 collection 页(直接看本地源目录 slug 命名),对每月份每科目每个 slug,
 * 统计出现频次,以便定位命名规律(类似 test-1/2/3/4 vs 变体 -0/-1/-3)。
 */
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = "/Users/fanyunxu/Desktop/myproject/ielts-copilot";
const SRC = join(ROOT, "questions");

const SUBJ = { 听力: "listening", 阅读: "reading", 写作: "writing", 口语: "speaking" };
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const MONTH_NAME_CN = { january: "1月", february: "2月", march: "3月", april: "4月", may: "5月", june: "6月", july: "7月", august: "8月", september: "9月", october: "10月", november: "11月", december: "12月" };

// 月份×科目 → 源目录列表 + slug 集合
const cells = {}; // key: month-subj → [{dir, slug}, ...]
for (const [zh, en] of Object.entries(SUBJ)) {
  const base = join(SRC, zh, "2023");
  if (!existsSync(base)) continue;
  for (const e of readdirSync(base, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const m = e.name.match(/ielts-mock-test-2023-([a-z]+)-([a-z]+)-practice-(test-\d+(?:-\d+)?)$/);
    if (!m) {
      console.log(`? 非标: ${zh}/${e.name}`);
      continue;
    }
    if (m[2] !== en) {
      console.log(`? 科目不匹配: ${zh}/${e.name}`);
      continue;
    }
    const k = `${m[1]}`;
    if (!cells[k]) cells[k] = {};
    if (!cells[k][zh]) cells[k][zh] = [];
    cells[k][zh].push({ dir: e.name, slug: m[3] });
  }
}

// 列出每月份各科目的 slug
console.log("=== 2023 年各月×科目 源目录 slug 清单 ===");
for (const mo of MONTHS) {
  console.log(`\n  ${MONTH_NAME_CN[mo]} (${mo}):`);
  const c = cells[mo];
  if (!c) { console.log("    (无源)"); continue; }
  for (const zh of ["听力", "阅读", "写作", "口语"]) {
    const list = c[zh] ?? [];
    const slugs = list.map((x) => x.slug).sort();
    console.log(`    ${zh.padEnd(2)} (${list.length}卷): ${slugs.join(", ")}`);
  }
}

// 月份×T 拼图(根据 slug 末尾数字归并)
console.log("\n\n=== 月×T 拼图矩阵(按 slug 数字归并) ===");
const tSets = new Map();
for (const mo of MONTHS) {
  const c = cells[mo];
  if (!c) continue;
  for (const zh of ["听力", "阅读", "写作", "口语"]) {
    for (const { slug } of c[zh] ?? []) {
      // 提取最后一段数字作为 T
      const m = slug.match(/-(\d+)$/);
      if (!m) continue;
      const t = Number(m[1]);
      // 去重: 同一月份同 T 多卷并存(看是否同一 slug 名, 数字变体-0/-1 是变体)
      const k = `${mo}-T${t}`;
      if (!tSets.has(k)) tSets.set(k, { mo, t, subs: new Set() });
      tSets.get(k).subs.add(zh);
    }
  }
}
// 注意 -0/-1 等也归并入 T0/T1,但实际是变体.需在矩阵上标注.
console.log("\n  月份×T 拼图(最后一位数字归并):");
const fullCnt = {};
for (const mo of MONTHS) {
  let line = `  ${MONTH_NAME_CN[mo].padEnd(4)}`;
  const tnList = [0, 1, 2, 3, 4];
  for (const tn of tnList) {
    const key = `${mo}-T${tn}`;
    const e = tSets.get(key);
    line += ` | T${tn}:${e ? "✅" + "(" + e.subs.size + ")" : "—"}`;
    if (e) fullCnt[mo] = (fullCnt[mo] ?? 0) + 1;
  }
  console.log(line);
}

// 命名风格分类
console.log("\n\n=== 命名风格统计(按 slug 类型) ===");
const clean = new Map(); // clean test-N
const variant = new Map(); // test-N-M
const weird = new Map(); // 其它(test-0/test-3 等不在 1-4 内的)
for (const mo of MONTHS) {
  const c = cells[mo];
  if (!c) continue;
  for (const zh of Object.keys(c)) {
    for (const { slug } of c[zh]) {
      if (/^test-[1-4]$/.test(slug)) clean.set(`${mo}-${zh}`, (clean.get(`${mo}-${zh}`) ?? []).concat(slug));
      else if (/^test-\d+-\d+$/.test(slug)) variant.set(`${mo}-${zh}`, (variant.get(`${mo}-${zh}`) ?? []).concat(slug));
      else weird.set(`${mo}-${zh}`, (weird.get(`${mo}-${zh}`) ?? []).concat(slug));
    }
  }
}
console.log(`  clean (test-1/2/3/4) 月×科目数: ${clean.size}`);
console.log(`  变体 (test-N-M) 月×科目数: ${variant.size}`);
console.log(`  异常 (其它) 月×科目数: ${weird.size}`);
if (weird.size > 0) {
  console.log("\n  === 异常命名清单 ===");
  for (const [k, slugs] of [...weird.entries()].sort()) {
    console.log(`    ${k}: ${[...new Set(slugs)].join(", ")}`);
  }
}
console.log("\n  === 变体命名清单(test-N-M) ===");
for (const [k, slugs] of [...variant.entries()].sort()) {
  const u = [...new Set(slugs)];
  if (u.length) console.log(`    ${k}: ${u.join(", ")}`);
}