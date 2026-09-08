// 一次性修复 5 词 phonetic_uk 脏数据(2026-09-08):
//   judgment/minimise: ASCII 直引号 ' → 标准主重音符 ˈ (U+02C8)
//   pervasive: 半角逗号 , → 标准次重音符 ˌ (U+02CC)
//   separate: 剥 "(for v.)/(for adj.)" 词性注释,动词读音为权威候选
//   underground: əu 非标准双元音写法 → aʊ (LLM 三次均本能改写,库内是错的)
// 幂等:WHERE 子句按旧值精确匹配,重跑零写入。
import Database from "better-sqlite3";

const db = new Database("data/app.db");

const FIXES = [
  { word: "judgment", from: "/'dʒʌdʒmənt/", to: "/ˈdʒʌdʒmənt/" },
  { word: "minimise", from: "/'mɪnɪmaɪz/", to: "/ˈmɪnɪmaɪz/" },
  { word: "pervasive", from: "/,pəˈveɪsɪv/", to: "/ˌpəˈveɪsɪv/" },
  { word: "separate", from: "/(for v.) ˈsepəreɪt; (for adj.) ˈseprət/", to: "/ˈsepəreɪt; ˈseprət/" },
  { word: "underground", from: "/ˈʌndəgrəund/", to: "/ˈʌndəgraʊnd/" },
];

const upd = db.prepare("UPDATE words SET phonetic_uk = ? WHERE word = ? AND phonetic_uk = ?");
for (const f of FIXES) {
  const r = upd.run(f.to, f.word, f.from);
  if (r.changes) console.log(`✓ ${f.word}: ${f.from} → ${f.to}`);
  else {
    // 已修过或值不同:报告现状,不盲写
    const cur = db.prepare("SELECT phonetic_uk FROM words WHERE word = ?").get(f.word);
    const status = cur?.phonetic_uk === f.to ? "已是目标值(跳过)" : `值不符现值=${cur?.phonetic_uk}(人工核对)`;
    console.log(`⊘ ${f.word}: ${status}`);
  }
}
