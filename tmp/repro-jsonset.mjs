import Database from "better-sqlite3";
const db = new Database(":memory:");
db.exec(`CREATE TABLE t (id INTEGER, content_json TEXT)`);
db.prepare(`INSERT INTO t VALUES (1, ?)`).run(JSON.stringify({ a: 1 }));
try {
  db.prepare(`UPDATE t SET content_json = json_set(COALESCE(content_json,'{}'), '$.image', json(?)) WHERE id = 1`).run("/images/words/x.png");
  console.log("json(?) 形式:", db.prepare("SELECT content_json FROM t").get().content_json);
} catch (e) { console.log("json(?) 形式报错:", e.message.slice(0, 100)); }
try {
  db.prepare(`UPDATE t SET content_json = json_set(COALESCE(content_json,'{}'), '$.image', ?) WHERE id = 1`).run("/images/words/y.png");
  console.log("裸 ? 形式:", db.prepare("SELECT content_json FROM t").get().content_json);
} catch (e) { console.log("裸 ? 形式报错:", e.message.slice(0, 100)); }
db.close();
