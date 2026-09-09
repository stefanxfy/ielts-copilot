/** 一次性补抓:questions/写作/2024/ielts-mock-test-2024-january-writing-practice-test-4
 * iot-fetch 是清单驱动, 不接单卷 URL — 这里直接 curl 拉 test/solution + 复用答案解析
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const ROOT = "/Users/fanyunxu/Desktop/myproject/ielts-copilot";
const SLUG = "ielts-mock-test-2024-january-writing-practice-test-4";
const SLUG_ZH = "%E9%9B%85%E6%80%9D%E7%9C%9F%E9%A2%98%E8%AF%95%E5%8D%B7-%E4%B8%80%E6%9C%88-writing-practice-test-4"; // 雅思真题试卷-一月-writing-practice-test-4
const YEAR = "2024";
const DIR = join(ROOT, "questions", "写作", YEAR, SLUG);
const COOKIE_FILE = join(ROOT, "data", "iot", "cookies.txt");
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const BASE = "https://www.ieltsonlinetests.com";

const cookie = existsSync(COOKIE_FILE) ? readFileSync(COOKIE_FILE, "utf8").trim() : "";
if (!cookie) { console.error("✗ 无 cookie"); process.exit(1); }

mkdirSync(DIR, { recursive: true });

function curlUrl(url, binary = false) {
  const maxT = binary ? 600 : 90;
  const args = ["-sL", "-A", UA, "--max-time", String(maxT), "-H", `Cookie: ${cookie}`];
  return execFileSync("curl", args.concat(url), { maxBuffer: 300 * 1024 * 1024 });
}

/** 同 iot-fetch.parseAnswers:多选共享一行 */
function parseAnswers(html) {
  const out = {};
  const re = /<span class="number">([\s\S]*?)<\/span>\s*(?:<span class="sys-answer[^"]*">([\s\S]*?)<\/span>)?/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const nums = (m[1].match(/\d+/g) || []).map(Number).filter((n) => n >= 1 && n <= 60);
    if (!nums.length) continue;
    const ans = (m[2] ?? "").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
    for (const num of nums) if (!(num in out)) out[num] = ans;
  }
  return out;
}

async function main() {
  // 站方此卷无英文 slug(英文 slug 404), 走中文 /zh-hans/雅思真题试卷-.../test?mode=simulation_test
  const testPath = `/zh-hans/${SLUG_ZH}/test`;
  const solPath = `/zh-hans/${SLUG_ZH}/test/solution`;
  const url = BASE + testPath;

  // 1. test.html
  const testFile = join(DIR, "test.html");
  if (!existsSync(testFile) || statSync(testFile).size < 10_000) {
    console.log("拉 test.html ...", url);
    const buf = curlUrl(url);
    writeFileSync(testFile, buf);
    console.log("  ✓", buf.length, "B");
  } else console.log("test.html 已存在");

  // 2. solution.html
  const solFile = join(DIR, "solution.html");
  if (!existsSync(solFile) || statSync(solFile).size < 10_000) {
    console.log("拉 solution.html ...");
    const buf = curlUrl(BASE + solPath);
    writeFileSync(solFile, buf);
    console.log("  ✓", buf.length, "B");
  } else console.log("solution.html 已存在");

  // 3. 写作无 answers.json(站方无答案键), 跳过
  console.log("写作卷无 answers.json, 跳过答案解析");
  console.log("✓ 补抓完成:", DIR);
}
main().catch((e) => { console.error(e); process.exit(1); });