/**
 * 重解析 2023 阅读 answers.json —— 修复原 parseAnswers 的「区间不展开」缺陷
 *  - 原正则对 <span class="number">1-3</span> 只抽出 [1,3]，漏掉 2
 *  - 新版:识别 "a-b" 区间并展开为连续整数；其余按单行号处理
 * 用法: node scripts/_regen-reading-answers.mjs
 */
import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = "/Users/fanyunxu/Desktop/myproject/ielts-copilot";
const readRoot = join(ROOT, "questions/阅读/2023");

function parseAnswers(html) {
  const out = {};
  // 主答案键: <span class="number">N</span> <span class="sys-answer">ANS</span>
  const re = /<span class="number">([\s\S]*?)<\/span>\s*<span class="sys-answer[^"]*">([\s\S]*?)<\/span>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const numRaw = m[1].replace(/\s+/g, " ").trim();
    const ans = m[2]
      .replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
    // 区间展开: "1-3" => 1,2,3 ; "7" => 7
    const range = numRaw.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      const lo = parseInt(range[1], 10), hi = parseInt(range[2], 10);
      for (let n = lo; n <= hi; n++) if (!(n in out)) out[n] = ans;
    } else {
      const nums = (numRaw.match(/\d+/g) || []).map(Number).filter((n) => n >= 1 && n <= 60);
      for (const num of nums) if (!(num in out)) out[num] = ans;
    }
  }
  // 兜底:部分卷用 <li class="answer"><b>N</b> Answer: <span class="b-r">ANS</span>
  const re2 = /<li class="answer"><b>(\d+)<\/b>\s*Answer:\s*<span class="b-r">([\s\S]*?)<\/span>/g;
  while ((m = re2.exec(html)) !== null) {
    const num = Number(m[1]);
    if (!(num >= 1 && num <= 60) || num in out) continue;
    out[num] = m[2].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
  }
  return out;
}

const targets = process.argv.slice(2).length ? process.argv.slice(2) : readdirSync(readRoot);
let fixed = 0;
for (const slug of targets) {
  const dir = join(readRoot, slug);
  if (!statSync(dir).isDirectory()) continue;
  const solFile = join(dir, "solution.html");
  const ansFile = join(dir, "answers.json");
  if (!existsSync(solFile)) continue;
  const answers = parseAnswers(readFileSync(solFile, "utf8"));
  // 写入时键转字符串、按数字排序
  const sorted = {};
  Object.keys(answers).map(Number).sort((a, b) => a - b).forEach((k) => { sorted[k] = answers[k]; });
  writeFileSync(ansFile, JSON.stringify(sorted, null, 2));
  console.log(`  [ans] ✓ ${slug} (${Object.keys(sorted).length} 条) -> ${JSON.stringify(sorted)}`);
  fixed++;
}
console.log(`\n重解析完成: ${fixed} 个目录`);
