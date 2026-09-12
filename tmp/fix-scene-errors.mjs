// 修复被污染的场景文件:ERROR→删除(可重生成),SKIP→核实是否误判
import { readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
const files = readdirSync("data/image-scenes");
let errFixed = 0, skipWords = [];
for (const f of files) {
  const c = readFileSync("data/image-scenes/" + f, "utf8").trim();
  if (c.startsWith("ERROR")) { unlinkSync("data/image-scenes/" + f); errFixed++; }
  if (c === "SKIP") skipWords.push(f.replace(".txt", ""));
}
console.log("删除 ERROR 场景文件:", errFixed, "(下次跑场景调度器会重新生成)");
console.log("SKIP 词:", skipWords.join(", "));
// 全库 ERROR 场景重建清单
const missing = readFileSync("data/mnemonic-debug/p1-image-missing.txt", "utf8").split("\n").filter(Boolean);
const needsScene = missing.filter(w => !existsSync("data/image-scenes/" + w + ".txt"));
writeFileSync("tmp/p1-scene-retry.txt", needsScene.join("\n") + "\n");
console.log("需重建场景:", needsScene.length, needsScene.slice(0, 8).join(","));
import { existsSync } from "node:fs";
