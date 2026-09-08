// v3 → 主目录迁移脚本（幂等、可重跑）
// 原则：
// 1. 每个词的 DB 指向是唯一权威——迁的是「DB 指向 v3 的词」
// 2. 文件名冲突按 DB 权威原则：DB 指 v3 → v3 覆盖主目录；abandon(DB 指主目录) 不在迁移集合内，天然跳过
// 3. 先备份 app.db；文件 mv（同卷原子）；DB 用 json_replace 精准替换路径
// 4. 成功后 v3 目录保留不删（冷备份，人工确认后再清理）
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const V3 = path.join(ROOT, "public/images/words/v3");
const MAIN = path.join(ROOT, "public/images/words");
const DB = path.join(ROOT, "data/app.db");

// ---------- 0. 备份 DB ----------
const bak = `${DB}.bak-migrate-${Date.now()}`;
fs.copyFileSync(DB, bak);
console.log(`[备份] ${bak}`);

const db = new Database(DB);
// json_replace 的第三参要求合法 JSON 文本,路径字符串须 JSON.stringify
const upd = db.prepare(
  `UPDATE words SET content_json = json_replace(content_json, '$.image', json(?)), updated_at = ? WHERE id = ?`
);
const setImg = (id, img) => upd.run(JSON.stringify(img), new Date().toISOString(), id);

// ---------- 1. 收集 DB 指向 v3 的词（唯一权威口径） ----------
const rows = db
  .prepare(
    `SELECT id, word, json_extract(content_json,'$.image') img FROM words WHERE json_extract(content_json,'$.image') LIKE '/images/words/v3/%'`
  )
  .all();
console.log(`[口径] DB 指向 v3 的词共 ${rows.length} 个`);

let moved = 0, idempotent = 0, covered = 0;
const errors = [];

// ---------- 2. 逐词迁移 ----------
for (const r of rows) {
  const fileName = path.basename(r.img); // xxx.png
  const v3File = path.join(V3, fileName);
  const mainFile = path.join(MAIN, fileName);
  const newImg = r.img.replace("/words/v3/", "/words/");

  // DB 指向的 v3 文件必须存在且有效
  if (!fs.existsSync(v3File) || fs.statSync(v3File).size <= 1000) {
    errors.push(`${r.word}: v3 文件缺失或过小，未迁`);
    continue;
  }

  if (fs.existsSync(mainFile)) {
    const bufV3 = fs.readFileSync(v3File);
    const bufMain = fs.readFileSync(mainFile);
    if (bufV3.equals(bufMain)) {
      // 同内容：重跑幂等，仅归一 DB
      setImg(r.id, newImg);
      idempotent++;
    } else {
      // 不同内容：v3 覆盖主目录（DB 权威）
      const mainSize = bufMain.length;
      fs.renameSync(v3File, mainFile);
      setImg(r.id, newImg);
      covered++;
      console.log(`[覆盖] ${r.word}: v3(${bufV3.length}B) 覆盖 主目录(${mainSize}B)`);
    }
  } else {
    fs.renameSync(v3File, mainFile);
    setImg(r.id, newImg);
    moved++;
  }
}

console.log(`[完成] 新迁 ${moved} | 覆盖冲突 ${covered} | 幂等重跑 ${idempotent} | 错误 ${errors.length}`);
if (errors.length) console.log("错误明细:\n" + errors.join("\n"));

// ---------- 3. 校验 ----------
const remain = db
  .prepare(`SELECT COUNT(*) n FROM words WHERE json_extract(content_json,'$.image') LIKE '/images/words/v3/%'`)
  .get().n;
console.log(`[校验] DB 仍指向 v3 的词: ${remain}（应为 0 或等于错误数）`);
const noImg = db
  .prepare(
    `SELECT COUNT(*) n FROM words w JOIN book_word_relation bo ON bo.word_id=w.id WHERE bo.book_id=17 AND w.word NOT LIKE '% %' AND (w.content_json IS NULL OR json_extract(w.content_json,'$.image') IS NULL)`
  )
  .get().n;
console.log(`[校验] book17 单词无图待办: ${noImg}`);
db.close();
