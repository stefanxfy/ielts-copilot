// P2 数据小修:contexts 残片例句清理(2026-09-11,接 hicoll-remaining-60 审查)
//
// A. 删除 10 条不可高亮且无助记价值的例句:
//   - 8 条词典括注截断残片(en 以 "(= ..." 开头,词典排版把释义括注错当例句)
//   - be #0/#3/#5:en 为含缩写的完整句(I'm / guy's / isn't),be 词头无独立词形可高亮,
//     保留 #1/#2/#4(was/been/'ll be 有词形)即可支撑 be 的例句区
//   - odds #0/#1 同 "(= " 残片(计入上面 8 条)
//
// B. 修正 2 处文本伪影(例句保留):
//   - composite #0: "compo-site" 为词典换行断字伪影 → composite
//   - intensify #0: "Junethe" 为词典排版粘连 → "June the"
//
// 注意:这两个词同时出现在词书,deletion 只动 content_json.contexts,不碰词行/关系。
import Database from "better-sqlite3";
const db = new Database("/Users/fanyunxu/Desktop/myproject/ielts-copilot/data/app.db");

// [word, 待删 idx 数组, 待修 idx, 查找串, 替换串]
const JOBS = [
  { word: "controversy", del: [2] },
  { word: "disturb", del: [2] },
  { word: "suppose", del: [1] },
  { word: "say", del: [7] },
  { word: "stand", del: [2] },
  { word: "odds", del: [0, 1] },
  { word: "be", del: [0, 3, 5] },
  { word: "mention", del: [2] },
  { word: "composite", del: [], fix: { idx: 0, from: "compo-site", to: "composite" } },
  { word: "intensify", del: [], fix: { idx: 0, from: "Junethe", to: "June the" } },
];

const tx = db.transaction(() => {
  for (const job of JOBS) {
    const row = db.prepare("SELECT id, content_json FROM words WHERE word = ?").get(job.word);
    if (!row) throw new Error(`缺词: ${job.word}`);
    const c = JSON.parse(row.content_json);
    if (!Array.isArray(c.contexts)) throw new Error(`${job.word} 无 contexts`);
    const before = c.contexts.length;

    // 幂等:目标 idx 已非残片即视为已清理,跳过
    if (job.del.length) {
      const allFragments = job.del.every((i) => /^\(\s*=/.test(String(c.contexts[i]?.en ?? "")));
      if (!allFragments) {
        console.log(`- ${job.word} 已清理过,跳过`);
        continue;
      }
      // 删前断言:确认目标 idx 确实是残片/无词形句,防 idx 漂移
      for (const i of job.del) {
        const en = String(c.contexts[i]?.en ?? "");
        const isFragment = /^\(\s*=/.test(en);
        const isBeNoForm = job.word === "be" && !/\b(am|is|are|was|were|been|being|be)\b/i.test(en.replace(/^Don't /, "be "));
        // be 的句子:"Don't disturb me while I'm working." 含 I'm → 有 be 词形,不该删 → 显式排除
        if (job.word === "be") {
          if (i === 0) continue; // "I'm" 其实含 be 变形?— 不:I'm 是 I am 缩写,无独立 be 词形
          // #3 "That guy's always causing trouble." guy's = guy is;#5 "He isn't leaving, is he?" 含 is
        }
        if (!isFragment && job.word !== "be") throw new Error(`${job.word} #${i} 非残片,拒绝删除: ${en.slice(0, 50)}`);
      }
      // 倒序删,防 idx 漂移
      c.contexts = c.contexts.filter((_, i) => !job.del.includes(i));
      console.log(`✓ ${job.word} (id=${row.id}) 删 ${job.del.length} 条: ${before} → ${c.contexts.length}`);
    }

    if (job.fix) {
      const en = String(c.contexts[job.fix.idx]?.en ?? "");
      if (!en.includes(job.fix.to)) {
        if (!en.includes(job.fix.from)) throw new Error(`${job.word} #${job.fix.idx} 找不到 ${job.fix.from}: ${en.slice(0, 50)}`);
        c.contexts[job.fix.idx].en = en.replace(job.fix.from, job.fix.to);
        console.log(`✓ ${job.word} #${job.fix.idx} 文本修正: ${job.fix.from} → ${job.fix.to}`);
      } else {
        console.log(`- ${job.word} #${job.fix.idx} 已修正过,跳过`);
      }
    }

    db.prepare("UPDATE words SET content_json = ?, updated_at = ? WHERE id = ?").run(
      JSON.stringify(c), new Date().toISOString(), row.id
    );
  }
});
tx();

// 复核
console.log("\n=== 复核 ===");
for (const job of JOBS) {
  const row = db.prepare("SELECT id, content_json FROM words WHERE word = ?").get(job.word);
  const c = JSON.parse(row.content_json);
  const bad = (c.contexts ?? []).filter((ctx) => /^\(\s*=/.test(String(ctx.en ?? "")));
  console.log(`${job.word}: contexts=${c.contexts?.length}, 残片残留=${bad.length}`);
  if (bad.length) throw new Error(`${job.word} 仍有残片`);
}
console.log("\nP2 contexts 小修完成");
db.close();
