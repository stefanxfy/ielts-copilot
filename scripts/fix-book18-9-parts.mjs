import Database from "better-sqlite3";
const db = new Database("/Users/fanyunxu/Desktop/myproject/ielts-copilot/data/app.db");
// 补丁表:parts 按字母拼写切,段数=ipa 段数;逐词人工核对
// ipa 字段仅作对照参考,实际只改 parts(库内 ipa 段保留原样,次重音符号位置不动)
const FIXES = {
  disperse:       { parts: ["dis", "perse"] },
  sporadic:       { parts: ["spo", "rad", "ic"] },
  terrific:       { parts: ["ter", "rif", "ic"] },
  paraphernalia:  { parts: ["par", "a", "pher", "na", "lia"] },
  tweezers:       { parts: ["twee", "zers"] },
  territorial:    { parts: ["ter", "ri", "to", "ri", "al"] },
  liability:      { parts: ["li", "a", "bi", "li", "ty"] },
  phonetic:       { parts: ["pho", "net", "ic"] },
  marvelous:      { parts: ["mar", "vel", "ous"] },
};
let fixed = 0;
for (const [word, fx] of Object.entries(FIXES)) {
  const row = db.prepare("SELECT id, content_json FROM words WHERE word = ?").get(word);
  if (!row) { console.error("缺词:", word); process.exit(1); }
  const c = JSON.parse(row.content_json ?? "{}");
  if (!c.syl) { console.error("无 syl:", word); process.exit(1); }
  // 三重校验(与 fix-syl-parts 同款)
  const newJoin = fx.parts.join("").replace(/[^a-z]/gi, "").toLowerCase();
  const wordClean = word.replace(/[^a-z]/gi, "").toLowerCase();
  if (newJoin !== wordClean) { console.error(`parts 拼合≠单词: ${word} ${fx.parts.join("|")}`); process.exit(1); }
  if (fx.parts.length !== c.syl.ipa.length) { console.error(`段数不一致: ${word} parts=${fx.parts.length} ipa=${c.syl.ipa.length}`); process.exit(1); }
  if (typeof c.syl.stress !== "number" || c.syl.stress < 0 || c.syl.stress >= fx.parts.length) { console.error(`stress 越界: ${word} stress=${c.syl.stress}`); process.exit(1); }
  c.syl.parts = fx.parts;
  db.prepare("UPDATE words SET content_json = ?, updated_at = ? WHERE id = ?")
    .run(JSON.stringify(c), new Date().toISOString(), row.id);
  fixed++;
  console.log("✓", word, "→", fx.parts.join("|"));
}
console.log(`\n${fixed}/9 修复完成`);
db.close();
