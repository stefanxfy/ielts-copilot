#!/usr/bin/env node
/**
 * scripts/iot-fetch.mjs — IELTS Online Tests 真题批量抓取
 *
 * 数据源清单: data/iot/academic-<skill>.json (ielts-exam-library 卡片, 含 href+nid)
 * 每卷产物: questions/<听力|阅读|写作|口语>/<年份>/<slug>/
 *   - test.html      卷面原始 HTML(data-num/data-q_type 结构化标记, 与 import-papers.mjs 对齐)
 *   - solution.html  官方答案页(登录态)
 *   - answers.json   从 solution.html 解析的 {题号: 官方答案}
 *   - audio.mp3      听力卷专属(OSS 直链, 公开)
 *
 * 幂等: 已存在且非空的产物跳过, 可断点续传。
 * 登录态: data/iot/cookies.txt (裸 Cookie 头字符串, 不入库不提交 git)。
 *
 * 用法:
 *   node scripts/iot-fetch.mjs --skill=listening --limit=10   # 验收
 *   node scripts/iot-fetch.mjs                                # 全量(听/阅/写/口语)
 *   node scripts/iot-fetch.mjs --skill=listening              # 单科全量
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, appendFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_ROOT = join(ROOT, "questions");
const LIST_DIR = join(ROOT, "data", "iot");
const COOKIE_FILE = join(LIST_DIR, "cookies.txt");
const FAIL_LOG = join(LIST_DIR, "failures.log");

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const SKILL_DIR = { listening: "听力", reading: "阅读", writing: "写作", speaking: "口语" };

/* ---------- args ---------- */
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([a-z]+)=(.*)$/);
    return m ? [m[1], m[2]] : [a.replace(/^--/, ""), true];
  }),
);
const SKILLS = args.skill ? args.skill.split(",") : ["listening", "reading", "writing", "speaking"];
const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity;

/* ---------- helpers ---------- */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cookie = existsSync(COOKIE_FILE) ? readFileSync(COOKIE_FILE, "utf8").trim() : "";
if (!cookie) console.error("⚠ 无登录 cookie(data/iot/cookies.txt), solution 页将 302 失败");

async function fetchPage(url, { binary = false } = {}) {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, ...(cookie ? { Cookie: cookie } : {}) },
        redirect: "follow",
        signal: AbortSignal.timeout(binary ? 600_000 : 60_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      return buf;
    } catch (e) {
      if (i === 2) throw e;
      await sleep(2000 * (i + 1));
    }
  }
}

/** solution.html → {num: answer}；list-answer-item: <span class="number"> N </span><span class="sys-answer">ANS</span>
 *  多选共享: <span class="number"> 11 <em></em> 12 </span><span class="sys-answer">D,E</span> → 11/12 同答案 */
function parseAnswers(html) {
  const out = {};
  const re = /<span class="number">([\s\S]*?)<\/span>\s*(?:<span class="sys-answer[^"]*">([\s\S]*?)<\/span>)?/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const nums = (m[1].match(/\d+/g) || []).map(Number).filter((n) => n >= 1 && n <= 60);
    if (nums.length === 0) continue;
    const ans = (m[2] ?? "")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim();
    for (const num of nums) if (!(num in out)) out[num] = ans;
  }
  return out;
}

function audioUrl(html) {
  const m = html.match(/https:\/\/ieltsonlinetests\.oss[^"'\s)]+\.mp3/);
  return m ? m[0] : null;
}

const slugYear = (slug) => (slug.match(/ielts-mock-test-(\d{4})-/) || [])[1] ?? "unknown";

/* ---------- main ---------- */
let done = 0, failed = 0;
for (const skill of SKILLS) {
  const listFile = join(LIST_DIR, `academic-${skill}.json`);
  if (!existsSync(listFile)) { console.error(`✗ 清单缺失: ${listFile}`); continue; }
  let list = JSON.parse(readFileSync(listFile, "utf8"));
  if (typeof list === "string") list = JSON.parse(list);
  const tests = (list.tests || []).filter((t) => t.href && t.nid).slice(0, LIMIT);
  console.log(`\n== ${skill}: ${tests.length} 卷`);

  for (const t of tests) {
    const slug = t.href.split("/").pop();
    const dir = join(OUT_ROOT, SKILL_DIR[skill], slugYear(slug), slug);
    mkdirSync(dir, { recursive: true });
    const localCount = done + failed;

    try {
      // 1. 题面 HTML
      const testFile = join(dir, "test.html");
      if (!existsSync(testFile) || statSync(testFile).size < 10_000) {
        const buf = await fetchPage(t.href);
        if (!buf.toString("utf8").includes("data-num")) throw new Error("test.html 无 data-num(可能被风控/未登录)");
        writeFileSync(testFile, buf);
      }
      await sleep(400);

      // 2. 答案页
      const solFile = join(dir, "solution.html");
      if (!existsSync(solFile) || statSync(solFile).size < 50_000) {
        const buf = await fetchPage(t.href + "/solution");
        writeFileSync(solFile, buf);
      }
      await sleep(400);

      // 3. answers.json
      const ansFile = join(dir, "answers.json");
      if (!existsSync(ansFile)) {
        const answers = parseAnswers(readFileSync(solFile, "utf8"));
        if (Object.keys(answers).length === 0) throw new Error("solution.html 解析出 0 条答案");
        writeFileSync(ansFile, JSON.stringify(answers, null, 2));
      }

      // 4. 听力音频
      if (skill === "listening") {
        const mp3File = join(dir, "audio.mp3");
        if (!existsSync(mp3File) || statSync(mp3File).size < 1_000_000) {
          const url = audioUrl(readFileSync(testFile, "utf8"));
          if (!url) throw new Error("test.html 无音频直链");
          const buf = await fetchPage(url, { binary: true });
          writeFileSync(mp3File, buf);
        }
      }
      done++;
      process.stdout.write(`✓ [${done}] ${SKILL_DIR[skill]}/${slugYear(slug)}/${slug}\n`);
    } catch (e) {
      failed++;
      appendFileSync(FAIL_LOG, `${new Date().toISOString()} ${skill} ${slug} :: ${e.message}\n`);
      console.error(`✗ ${slug} :: ${e.message}`);
    }
    if (localCount > 0 && localCount % 20 === 0) await sleep(3000); // 温和限速
  }
}
console.log(`\n完成: ${done} 成功, ${failed} 失败${failed ? "(详见 data/iot/failures.log)" : ""}`);
