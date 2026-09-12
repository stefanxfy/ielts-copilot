#!/usr/bin/env node
/**
 * scripts/compare-appdb.mjs — 对比两个 app.db(全程只读)
 *
 * 用途:双机各自提交 app.db 后,合并前盘点——逐表输出 [行数, 对方独有行数,
 *      最新时间戳],判断哪边有对方缺的数据,为 SQLite 级并集合并提供依据。
 *
 * 用法: node scripts/compare-appdb.mjs <本机Db> <对方Db>
 * 口径:PK 列取 PRAGMA table_info 的 pk 标记;双方表结构一致才做独有行差集,
 *      结构不一致只报行数与列差。时间列探测常见命名,取 max。
 */
import Database from "better-sqlite3";

const [masterPath, otherPath] = process.argv.slice(2);
if (!masterPath || !otherPath) {
  console.error("用法: node scripts/compare-appdb.mjs <本机Db> <对方Db>");
  process.exit(1);
}

const m = new Database(masterPath, { readonly: true });
const o = new Database(otherPath, { readonly: true });
// ATTACH 对方库到本机连接:差集用 main.x / cmp.x 跨库比(各自自比恒为 0,无意义)
m.exec(`ATTACH DATABASE '${otherPath.replace(/\\/g, "/").replace(/'/g, "''")}' AS cmp`);
const TIME_COLS = ["finished_at", "updated_at", "created_at", "start_time", "started_at", "last_at", "added_at"];

const tablesOf = (db) =>
  db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    )
    .all()
    .map((r) => r.name);

const mt = tablesOf(m);
const ot = tablesOf(o);
const all = [...new Set([...mt, ...ot])].sort();

console.log(
  `表结构: 本机 ${mt.length} 表 / 对方 ${ot.length} 表(并集 ${all.length} 表)\n`,
);
console.log(
  ["表名", "本机行数", "对方行数", "本机独有", "对方独有", "本机最新时间", "对方最新时间"].join("\t"),
);
console.log("-".repeat(100));

const q = (t) => `"${t.replace(/"/g, '""')}"`;

for (const t of all) {
  const inM = mt.includes(t);
  const inO = ot.includes(t);
  const row = [t, "-", "-", "-", "-", "-", "-"];

  if (!inM || !inO) {
    const c = inM ? m.prepare(`SELECT COUNT(*) n FROM ${q(t)}`).get().n : o.prepare(`SELECT COUNT(*) n FROM ${q(t)}`).get().n;
    row[inM ? 1 : 2] = c;
    row[inM ? 3 : 4] = c;
    console.log(row.join("\t") + (inM ? "  ← 仅本机有此表" : "  ← 仅对方有此表"));
    continue;
  }

  const cntM = m.prepare(`SELECT COUNT(*) n FROM ${q(t)}`).get().n;
  const cntO = o.prepare(`SELECT COUNT(*) n FROM ${q(t)}`).get().n;
  row[1] = cntM;
  row[2] = cntO;

  // 结构一致性(列名序列相同)才做差集
  const colsM = m.prepare(`PRAGMA table_info(${q(t)})`).all().map((c) => c.name);
  const colsO = o.prepare(`PRAGMA table_info(${q(t)})`).all().map((c) => c.name);
  const sameSchema = JSON.stringify(colsM) === JSON.stringify(colsO);

  if (sameSchema) {
    const pks = m
      .prepare(`PRAGMA table_info(${q(t)})`)
      .all()
      .filter((c) => c.pk > 0)
      .sort((a, b) => a.pk - b.pk)
      .map((c) => c.name);
    const uniq = pks.length
      ? pks
      : colsM.length
        ? null // 无 PK:放弃差集,不猜
        : null;
    if (uniq) {
      const pkSel = uniq.map((c) => `${q(c)}`).join(",");
      const pkCmp = uniq.map((c) => `a.${q(c)} = b.${q(c)}`).join(" AND ");
      // 跨库差集:main=本机, cmp=对方(ATTACH)
      row[3] = m.prepare(`SELECT COUNT(*) n FROM main.${q(t)} a WHERE NOT EXISTS (SELECT 1 FROM cmp.${q(t)} b WHERE ${pkCmp})`).get().n;
      row[4] = m.prepare(`SELECT COUNT(*) n FROM cmp.${q(t)} a WHERE NOT EXISTS (SELECT 1 FROM main.${q(t)} b WHERE ${pkCmp})`).get().n;
    }
  } else {
    row[3] = "结构异";
    row[4] = "结构异";
  }

  // 最新时间戳
  const tcolM = colsM.find((c) => TIME_COLS.includes(c));
  const tcolO = colsO.find((c) => TIME_COLS.includes(c));
  if (tcolM && sameSchema)
    row[5] = m.prepare(`SELECT MAX(${q(tcolM)}) v FROM ${q(t)}`).get().v;
  if (tcolO && sameSchema)
    row[6] = o.prepare(`SELECT MAX(${q(tcolO)}) v FROM ${q(t)}`).get().v;

  console.log(row.join("\t"));
}

m.close();
o.close();
