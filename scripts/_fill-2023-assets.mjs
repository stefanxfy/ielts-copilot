/**
 * 2023 资产补齐:为 _patch-2023.mjs 只抓了 test+solution 的目录补 audio.mp3 + answers.json。
 *  - 听力:从 test.html 提取 OSS 直链下载 audio.mp3
 *  - 阅读:从 solution.html 解析 {题号:答案} 写 answers.json
 * 幂等:已存在的件跳过。仅处理 questions/{听力,阅读}/2023 下缺失件的目录。
 */
import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const ROOT = "/Users/fanyunxu/Desktop/myproject/ielts-copilot";
const COOKIE = existsSync(join(ROOT, "data/iot/cookies.txt"))
  ? readFileSync(join(ROOT, "data/iot/cookies.txt"), "utf8").trim()
  : "";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

function parseAnswers(html) {
  const out = {};
  const re = /<span class="number">([\s\S]*?)<\/span>\s*(?:<span class="sys-answer[^"]*">([\s\S]*?)<\/span>)?/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const nums = (m[1].match(/\d+/g) || []).map(Number).filter((n) => n >= 1 && n <= 60);
    if (nums.length === 0) continue;
    const ans = (m[2] ?? "")
      .replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
    for (const num of nums) if (!(num in out)) out[num] = ans;
  }
  const re2 = /<li class="answer"><b>(\d+)<\/b>\s*Answer:\s*<span class="b-r">([\s\S]*?)<\/span>/g;
  while ((m = re2.exec(html)) !== null) {
    const num = Number(m[1]);
    if (!(num >= 1 && num <= 60) || num in out) continue;
    out[num] = m[2].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
  }
  return out;
}
function audioUrl(html) {
  let m = html.match(/https:\/\/ieltsonlinetests\.oss[^"'\s)]+\.mp3/);
  if (m) return m[0];
  m = html.match(/https?:\/\/media\.intergreat\.com\/[^"'\s)]+\.mp3/);
  if (m) return m[0];
  m = html.match(/https?:\/\/test4kynang\.oss[^"'\s)]+\.mp3/);
  return m ? m[0] : null;
}
function curlDownload(url, dst, timeoutSec = 120) {
  const args = ["-sL", "-A", UA, "-o", dst, "--max-time", String(timeoutSec)];
  if (COOKIE) args.push("-H", `Cookie: ${COOKIE}`);
  args.push("-H", "Referer: https://www.ieltsonlinetests.com/zh-hans");
  execFileSync("curl", args.concat(url), { stdio: "pipe" });
}

let audioFixed = 0, ansFixed = 0, audioSkip = 0, ansSkip = 0, audioFail = 0, ansFail = 0;

// 听力:补 audio.mp3
const listenRoot = join(ROOT, "questions/听力/2023");
for (const slug of readdirSync(listenRoot)) {
  const dir = join(listenRoot, slug);
  if (!statSync(dir).isDirectory()) continue;
  const testFile = join(dir, "test.html");
  const mp3 = join(dir, "audio.mp3");
  if (!existsSync(testFile)) continue;
  if (existsSync(mp3) && statSync(mp3).size >= 1_000_000) { audioSkip++; continue; }
  const url = audioUrl(readFileSync(testFile, "utf8"));
  if (!url) { console.log(`  [audio] 跳过(无直链): ${slug}`); audioFail++; continue; }
  try {
    curlDownload(url, mp3);
    if (!existsSync(mp3) || statSync(mp3).size < 1_000_000) throw new Error("empty/too-small");
    console.log(`  [audio] ✓ ${slug} (${(statSync(mp3).size / 1e6).toFixed(1)}MB)`);
    audioFixed++;
  } catch (e) {
    console.log(`  [audio] ✗ ${slug}: ${e.message}`);
    if (existsSync(mp3)) execFileSync("rm", ["-f", mp3]);
    audioFail++;
  }
}

// 阅读:补 answers.json
const readRoot = join(ROOT, "questions/阅读/2023");
for (const slug of readdirSync(readRoot)) {
  const dir = join(readRoot, slug);
  if (!statSync(dir).isDirectory()) continue;
  const solFile = join(dir, "solution.html");
  const ansFile = join(dir, "answers.json");
  if (!existsSync(solFile)) continue;
  if (existsSync(ansFile) && statSync(ansFile).size > 0) { ansSkip++; continue; }
  try {
    const answers = parseAnswers(readFileSync(solFile, "utf8"));
    if (Object.keys(answers).length === 0) throw new Error("解析 0 条");
    writeFileSync(ansFile, JSON.stringify(answers, null, 2));
    console.log(`  [ans] ✓ ${slug} (${Object.keys(answers).length} 条)`);
    ansFixed++;
  } catch (e) {
    console.log(`  [ans] ✗ ${slug}: ${e.message}`);
    ansFail++;
  }
}

console.log(`\n完成: audio 补 ${audioFixed}(跳过${audioSkip}/失败${audioFail}), answers 补 ${ansFixed}(跳过${ansSkip}/失败${ansFail})`);
