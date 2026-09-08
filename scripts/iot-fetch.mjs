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
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, appendFileSync, readdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_ROOT = join(ROOT, "questions");
const LIST_DIR = join(ROOT, "data", "iot");
const COOKIE_FILE = join(LIST_DIR, "cookies.txt");
const FAIL_LOG = join(LIST_DIR, "failures.log");
const ASSETS_DIR = join(OUT_ROOT, "exam-assets"); // 共享 css/js, 与 prototype/exam/exam-assets 同源
const PROTO_ASSETS = join(ROOT, "prototype", "exam", "exam-assets"); // 种子(免下载)

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
  // 域名归一化: 清单里混有无 s 的镜像域 ieltsonlinetest.com, 其会话库与主域不互通
  // (登录态只在 ieltsonlinetests.com 有效, 2026-09-08 实测), 统一归一化到主域(内容同源)
  url = url.replace("//www.ieltsonlinetest.com/", "//www.ieltsonlinetests.com/");
  // node fetch 连发会触发站方限流(curl 同 URL 始终 200), 统一走 curl 子进程
  const maxT = binary ? 600 : 90;
  for (let i = 0; i < 3; i++) {
    try {
      const args = ["-sL", "-A", UA, "--max-time", String(maxT), "-w", "\n%{http_code}"];
      if (cookie) args.push("-H", `Cookie: ${cookie}`);
      args.push(url);
      const out = execFileSync("curl", args, { maxBuffer: 300 * 1024 * 1024, timeout: (maxT + 10) * 1000 });
      const idx = out.lastIndexOf(10);
      const code = out.subarray(idx + 1).toString().trim();
      if (!/^2\d\d$/.test(code)) throw new Error(`HTTP ${code}`);
      return out.subarray(0, idx);
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
  // 新版结构后备: <li class="answer"><b>N</b> Answer: <span class="b-r">ANS</span> (2025-07+ 部分 listening/reading)
  const re2 = /<li class="answer"><b>(\d+)<\/b>\s*Answer:\s*<span class="b-r">([\s\S]*?)<\/span>/g;
  while ((m = re2.exec(html)) !== null) {
    const num = Number(m[1]);
    if (!(num >= 1 && num <= 60)) continue;
    if (num in out) continue;
    const ans = m[2]
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim();
    out[num] = ans;
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

const slugYear = (slug) => {
  let s = slug;
  try { s = decodeURIComponent(slug); } catch {}
  const m = s.match(/ielts-mock-test-(\d{4})-/) || s.match(/^(\d{4})(\d{2})/);
  return m ? m[1] : "旧版";
};
const slugDirName = (slug) => {
  try { return decodeURIComponent(slug); } catch { return slug; }
};

/* ---------- 共享资产(css/js hash 同源文件) + 卷内图片 ---------- */

/** 种子: prototype/exam/exam-assets 里的 css/js 一次性拷入 questions/exam-assets(排除音频) */
function seedAssets() {
  mkdirSync(ASSETS_DIR, { recursive: true });
  if (!existsSync(PROTO_ASSETS)) return;
  for (const f of readdirSync(PROTO_ASSETS)) {
    if (/\.(mp3|mp4|html)$/i.test(f)) continue;
    const dst = join(ASSETS_DIR, f);
    if (!existsSync(dst)) writeFileSync(dst, readFileSync(join(PROTO_ASSETS, f)));
  }
}

const INNER_ASSET_RE = /(?:href|src)="(\/sites\/default\/files\/(?:css|js)\/[^"]+)"/g;
const IMAGE_RE = /(?:href|src)="(\/sites\/default\/files\/[^"]+?\.(?:png|jpe?g|gif|svg|webp)(?:\?[^"]*)?)"/gi;
const DROP_RE = /(?:href|src)="https:\/\/(?:oss\.maxcdn\.com|static\.addtoany\.com)[^"]*"/g;
const LOCAL_CDN_RE = /(?:href|src)="https:\/\/(?:cdnjs\.cloudflare\.com\/ajax\/libs\/jquery\.nicescroll[^"]*|unpkg\.com\/qr-code-styling[^"]*)"/g;

/**
 * rewritePage(html): 见上
 */
function rewritePage(html, skill) {
  const downloads = { cssjs: new Set(), images: new Map() };
  // 1) 站内 css/js → ../../../exam-assets/ (卷目录在 questions/<科>/<年>/<slug>/ 下, 三级到 questions/exam-assets)
  html = html.replace(/(href|src)="(\/sites\/default\/files\/(?:css|js)\/[^"]+)"/g, (_, attr, url) => {
    const base = decodeURIComponent(url.split("/").pop());
    downloads.cssjs.add(url);
    return `${attr}="../../../exam-assets/${base}" data-iot-orig="${url}"`;
  });
  // 2) 站内图片 → img/
  html = html.replace(/(href|src)="(\/sites\/default\/files\/[^"]+?\.(?:png|jpe?g|gif|svg|webp)(?:\?[^"]*)?)"/gi, (_, attr, url) => {
    const base = decodeURIComponent(url.split("/").pop().split("?")[0]);
    downloads.images.set(url, base);
    return `${attr}="img/${base}" data-iot-orig="${url}"`;
  });
  // 2b) 图片加载失败时回退站方原图(离线缺图仍可在线兜底)
  html = html.replace(/data-iot-orig="(\/sites\/default\/files\/[^"]+?\.(?:png|jpe?g|gif|svg|webp)(?:\?[^"]*)?)"/gi, 'data-iot-orig="$1" onerror="this.onerror=null;this.src=\'$1\'"');
  // 3) 音频(OSS + intergreat 老卷) → audio.mp3
  html = html.replace(/(src)="((?:https:\/\/ieltsonlinetests\.oss|https?:\/\/media\.intergreat\.com|https?:\/\/test4kynang\.oss)[^"']+\.mp3)[^"]*"/g, '$1="audio.mp3" data-iot-orig="$2"');
  // 4) 本地已有对应件的 CDN
  html = html.replace(/(href|src)="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/jquery\.nicescroll[^"]*"/g, '$1="../../../exam-assets/jquery.nicescroll.min.js"');
  html = html.replace(/(href|src)="https:\/\/unpkg\.com\/qr-code-styling[^"]*"/g, '$1="../../../exam-assets/qr-code-styling.js"');
  // 5) 无用外链删除
  html = html.replace(/<(?:link|script)[^>]*(?:oss\.maxcdn\.com|static\.addtoany\.com)[^>]*><\/(?:link|script)>/g, "");
  html = html.replace(/<(?:link|script)[^>]*(?:oss\.maxcdn\.com|static\.addtoany\.com)[^>]*>/g, "");
  return html;
}

/** curl 单发下载(node fetch 连发静态资源会触发站方限速 404, curl 实测稳定) */
function curlDownload(url, dst, timeoutSec = 90) {
  execFileSync("curl", ["-s", "-A", UA, "-o", dst, "--max-time", String(timeoutSec), url], { stdio: "pipe" });
}

async function ensureAsset(url) {
  const base = decodeURIComponent(url.split("/").pop());
  const dst = join(ASSETS_DIR, base);
  if (existsSync(dst) && statSync(dst).size > 0) return base;
  try {
    curlDownload("https://ieltsonlinetests.com" + url, dst);
    if (!existsSync(dst) || statSync(dst).size === 0) throw new Error("empty");
  } catch (e) {
    if (existsSync(dst)) rmSync(dst);
    throw new Error(`shared-asset ${url} :: ${e.message}`);
  }
  return base;
}

async function ensureImage(dir, url, base) {
  const imgDir = join(dir, "img");
  mkdirSync(imgDir, { recursive: true });
  const dst = join(imgDir, base);
  if (existsSync(dst) && statSync(dst).size > 0) return;
  try {
    curlDownload("https://ieltsonlinetests.com" + url, dst);
    if (!existsSync(dst) || statSync(dst).size < 100) throw new Error("not-image/too-small");
  } catch (e) {
    if (existsSync(dst)) rmSync(dst);
    throw new Error(`image ${url} :: ${e.message}`);
  }
}

/* ---------- main ---------- */
seedAssets();
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
    const dir = join(OUT_ROOT, SKILL_DIR[skill], slugYear(slug), slugDirName(slug));
    mkdirSync(dir, { recursive: true });
    const localCount = done + failed;

    try {
      // 0. 科目分型: 听/阅为客观题卷(data-num 题目网格 + sys-answer 答案键);
      //    写/口为题目卷(页面无 data-num/sys-answer, 仅校验 <title>, 且无 answers.json)
      const objective = skill === "listening" || skill === "reading";
      const pageTitle = (h) => (h.match(/<title>([^<]*)<\/title>/) || [])[1] || "";

      // 1. 题面 HTML(抓取后立即重写资源引用)
      const testFile = join(dir, "test.html");
      if (!existsSync(testFile) || statSync(testFile).size < 10_000) {
        const buf = await fetchPage(t.href);
        const html = buf.toString("utf8");
        if (objective && !html.includes("data-num")) throw new Error("test.html 无 data-num(可能被风控/未登录)");
        // 有效标题四型: "… Practice Test"(美式) / "… Practise Test"(英式, 站方口语卷实际拼写) /
        //   "雅思真题试卷 …"(站方中文系列卷, 无英文标题) /
        //   "IELTS Mock Test … 雅思(写作|口语|听力|阅读)真题 N"(站方 mock-test 中文系列卷)
        if (!objective) {
          const pt = pageTitle(html);
          if (!/Practi[cs]e? Test/i.test(pt) && !/雅思(听力|阅读|写作|口语)真题/.test(pt) && !pt.includes("雅思真题试卷")) {
            throw new Error(`test.html 页面异常(标题非 Practice Test/Practise Test/雅思真题试卷): ${pt.slice(0, 60)}`);
          }
        }
        writeFileSync(testFile, rewritePage(html, skill));
      }
      await sleep(400);

      // 2. 答案页(同样重写; 登录页=会话瞬时失效, 重试3次)
      //    写/口 solution 页无 sys-answer, 以标题含 "Solution for" 为有效标记
      const solFile = join(dir, "solution.html");
      const solMinSize = objective ? 50_000 : 30_000;
      const solOk = (h) => (objective ? h.includes("sys-answer") || h.includes('class="answer"') : /Solution for/i.test(pageTitle(h)));
      if (!existsSync(solFile) || statSync(solFile).size < solMinSize) {
        let solHtml = null;
        let lastWasLogin = false;
        for (let attempt = 0; attempt < 3; attempt++) {
          const buf = await fetchPage(t.href + "/solution");
          solHtml = buf.toString("utf8");
          if (solOk(solHtml)) { lastWasLogin = false; break; }
          if (solHtml.includes("<title>登录")) {
            lastWasLogin = true;
            solHtml = null;
            await sleep(4000 * (attempt + 1));
          } else {
            lastWasLogin = false;
          }
        }
        if (!solHtml || !solOk(solHtml)) {
          throw new Error(lastWasLogin ? "SESSION_EXPIRED: 会话失效(返回登录页)" : objective ? "solution.html 无 sys-answer" : "solution.html 校验失败(标题非 Solution for)");
        }
        writeFileSync(solFile, rewritePage(solHtml, skill));
      }
      await sleep(400);

      // 3. answers.json (仅客观题科目; 写/口站方无公开答案键, 跳过)
      const ansFile = join(dir, "answers.json");
      if (objective && !existsSync(ansFile)) {
        const answers = parseAnswers(readFileSync(solFile, "utf8"));
        if (Object.keys(answers).length === 0) throw new Error("solution.html 解析出 0 条答案");
        writeFileSync(ansFile, JSON.stringify(answers, null, 2));
      }

      // 4. 资产补齐: 共享 css/js 缺件 + 本卷图片(失败不连坐, onerror 已回退站方原图)
      const htmlAll = readFileSync(testFile, "utf8") + readFileSync(solFile, "utf8");
      const cssjsUrls = [...new Set([...htmlAll.matchAll(/data-iot-orig="(\/sites\/default\/files\/(?:css|js)\/[^"]+)"/g)].map((m) => m[1]))];
      for (const url of cssjsUrls) {
        try { await ensureAsset(url); } catch (e) { appendFileSync(FAIL_LOG, `${new Date().toISOString()} ${slug} :: ${e.message}\n`); console.error(`  ⚠ ${e.message}`); }
        await sleep(250);
      }
      const imgMatches = [...htmlAll.matchAll(/data-iot-orig="(\/sites\/default\/files\/[^"]+?\.(?:png|jpe?g|gif|svg|webp)(?:\?[^"]*)?)"/gi)];
      const seenImg = new Set();
      for (const m of imgMatches) {
        const url = m[1];
        if (seenImg.has(url)) continue;
        seenImg.add(url);
        if (/\/(styles\/|inline-images\/|themes\/)/.test(url)) continue; // 站方装饰图(封面/二维码), 不占请求
        const base = decodeURIComponent(url.split("/").pop().split("?")[0]);
        try { await ensureImage(dir, url, base); } catch (e) { appendFileSync(FAIL_LOG, `${new Date().toISOString()} ${slug} :: ${e.message}\n`); console.error(`  ⚠ ${e.message}`); }
        await sleep(250);
      }

      // 5. 听力音频
      if (skill === "listening") {
        const mp3File = join(dir, "audio.mp3");
        if (!existsSync(mp3File) || statSync(mp3File).size < 1_000_000) {
          const url = audioUrl(readFileSync(testFile, "utf8")) ?? audioUrl(htmlAll);
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
      if (String(e.message).includes("SESSION_EXPIRED")) {
        console.error("!! 会话失效，终止批跑——需更新 data/iot/cookies.txt 后重跑(幂等续传)");
        process.exit(2);
      }
    }
    if (localCount > 0 && localCount % 20 === 0) await sleep(3000); // 温和限速
  }
}
console.log(`\n完成: ${done} 成功, ${failed} 失败${failed ? "(详见 data/iot/failures.log)" : ""}`);
