#!/usr/bin/env node
// P1 补跑:每 20 分钟探测一次 MiniMax 额度(2056=日额度耗尽),恢复后自动续跑缺图清单
// 用法: node scripts/p1-images-retry.mjs [最大探测次数,默认 18]
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const MAX_PROBES = parseInt(process.argv[2] || "18", 10);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function readKey() {
  const raw = readFileSync(join(ROOT, "config.json"), "utf8");
  const cfg = JSON.parse(raw.split("\n").map((l) => l.replace(/(^|\s)\/\/.*$/, "$1")).join("\n"));
  return cfg.llm.apiKey;
}

async function probeQuota() {
  const res = await fetch("https://api.minimaxi.com/v1/image_generation", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${readKey()}` },
    body: JSON.stringify({ model: "image-01", prompt: "a red apple, warm light", aspect_ratio: "1:1", response_format: "url", n: 1, prompt_optimizer: false }),
  });
  const j = await res.json().catch(() => ({}));
  return j?.base_resp?.status_code ?? -1;
}

function missingWords() {
  const words = readFileSync(join(ROOT, "data", "mnemonic-debug", "p1-image-words.txt"), "utf8").split("\n").filter(Boolean);
  return words.filter((w) => {
    const f = join(ROOT, "public", "images", "words", `${w}.png`);
    return !existsSync(f) || statSync(f).size <= 1000;
  });
}

for (let i = 1; i <= MAX_PROBES; i++) {
  const code = await probeQuota();
  const n = missingWords().length;
  console.log(`[retry ${new Date().toISOString().slice(11, 5)}] 探测 ${i}/${MAX_PROBES}: status=${code} | 缺图 ${n}`);
  if (code === 0 && n > 0) {
    console.log("[retry] 额度恢复,启动续跑");
    const listFile = join(ROOT, "tmp", "p1-img-retry.txt");
    writeFileSync(listFile, missingWords().join("\n") + "\n");
    try {
      execFileSync(process.execPath, [join(ROOT, "scripts", "gen-images-xdf.mjs"), `--list=${listFile}`], {
        stdio: "inherit", timeout: 3 * 60 * 60_000, cwd: ROOT,
      });
    } catch (e) {
      console.log(`[retry] 续跑异常: ${String(e.message).slice(0, 120)}`);
    }
    const left = missingWords().length;
    console.log(`[retry] 续跑结束,剩缺图 ${left}`);
    if (left === 0) { console.log("[retry] 全部收口"); break; }
  }
  if (n === 0) { console.log("[retry] 已无缺图,退出"); break; }
  // 2056=日额度,等 20 分钟再探;其余状态码等 5 分钟(可能是瞬时限速)
  await sleep(code === 2056 ? 20 * 60_000 : 5 * 60_000);
}
console.log("[retry] 调度结束");
