/**
 * 补抓源卷 img/ 缺失的「内容图」(批量导入前置 mop-up)。
 *
 * 背景:iot-fetch 抓卷时把站方内容图本地化为 src="img/<name>" 并留
 * data-iot-orig="/sites/..." 站内绝对路径 + onerror 兜底;个别图(如
 * 2025-10/11 月听力 Gemini 生成图)当时下载失败,img/ 缺文件 →
 * import-iot-paper verifyImages 判本地缺失 exit 1。
 *
 * 排则(与导入铁律③同口径):页脚二维码/logo/banner/图标等装饰件以及
 * /styles/ 派生缩略图一律不补——transformPage 会清洗其引用,补抓反而会
 * 随 copyStatic 混入卷目录。老书(2017-2020)站方死链拉取失败仅警告。
 * 幂等:文件已存在即跳过。
 *
 * 用法:node scripts/mopup-source-images.mjs [--dry]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC_BASE = join(ROOT, "questions");
const MAIN_HOST = "https://www.ieltsonlinetests.com";
const DRY = process.argv.includes("--dry");

/** 装饰件排则:站内绝对路径或文件名命中即跳过(与 DECORATIVE_IMG_RE 同精神) */
const DECORATIVE_RE = /\/styles\/|qr[-_]?code|logo|footer|banner|share-|flag|icon|thumb|avatar|landing/i;

/** 收集 questions/ 下全部卷目录(含 test.html) */
function walkVolumes(dir, out = []) {
  if (existsSync(join(dir, "test.html"))) out.push(dir);
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    if (["img", "audio", "css", "js"].includes(e.name)) continue;
    walkVolumes(join(dir, e.name), out);
  }
  return out;
}

const volumes = walkVolumes(SRC_BASE);

// 缺失内容图:volume → [{ name, orig }]
const missing = new Map();
let decorativeSkipped = 0;
for (const vol of volumes) {
  const html = readFileSync(join(vol, "test.html"), "utf8");
  for (const m of html.matchAll(/<img\b[^>]*>/g)) {
    const tag = m[0];
    const src = tag.match(/\bsrc="(img\/[^"]+\.(?:png|jpe?g|gif|webp|svg))"/i)?.[1];
    if (!src) continue;
    const orig = tag.match(/data-iot-orig="(\/[^"]+)"/)?.[1];
    if (existsSync(join(vol, src))) continue;
    if (!orig || DECORATIVE_RE.test(orig)) {
      decorativeSkipped++;
      continue;
    }
    if (!missing.has(vol)) missing.set(vol, []);
    const list = missing.get(vol);
    if (!list.some((x) => x.name === src)) list.push({ name: src, orig });
  }
}

const total = [...missing.values()].reduce((n, l) => n + l.length, 0);
console.log(`[mop-up] 卷目录 ${volumes.length} · 缺失内容图 ${total} 张(装饰件跳过 ${decorativeSkipped})`);
if (!total) {
  console.log("[mop-up] 无需补抓");
  process.exit(0);
}

let ok = 0;
const fails = [];
for (const [vol, list] of missing) {
  for (const { name, orig } of list) {
    const rel = vol.replace(ROOT + "/", "");
    if (DRY) {
      console.log(`[mop-up][dry] ${rel} ${name} ← ${orig}`);
      continue;
    }
    try {
      const r = await fetch(MAIN_HOST + orig, {
        headers: { "User-Agent": "Mozilla/5.0 (Macintosh) IELTS-Copilot-import" },
        signal: AbortSignal.timeout(30000),
      });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 100) throw new Error(`响应过小(${buf.length}B)`);
      mkdirSync(dirname(join(vol, name)), { recursive: true });
      writeFileSync(join(vol, name), buf);
      console.log(`[mop-up] ✓ ${rel} ${name}(${buf.length}B)`);
      ok++;
    } catch (e) {
      fails.push(`${rel} ${name} ← ${orig} (${e.message})`);
    }
  }
}

console.log(`[mop-up] 完成:补抓 ${ok} 张,拉取失败 ${fails.length}(老书站方死链属预期,onerror 兜底)`);
if (fails.length) for (const f of fails) console.log("  [miss] " + f);
process.exit(0);
