#!/usr/bin/env node
/**
 * scripts/dev.mjs — dev 启动入口(M1 步骤 3 升级:JSONC 容错读)
 *
 * 读 config.json 端口(容注释+尾逗号,与 src/lib/config.ts 读路径同款;
 * 纯 node 无法直接 import TS 模块,故用同一依赖 strip-json-comments 复刻)
 * → next dev -H 127.0.0.1 -p PORT
 *
 * intentionally stubbed: zod 校验/host 白名单在 src/lib/config-schema.ts,
 * dev 只关心端口;完整校验由应用侧 API 承担。
 */
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import stripJsonComments from "strip-json-comments";

const DEFAULT_PORT = 3000; // dev 态默认;config.json 的生产默认是 3177

async function readPort() {
  try {
    const raw = await readFile(new URL("../config.json", import.meta.url), "utf8");
    const cfg = JSON.parse(stripJsonComments(raw, { trailingCommas: true }));
    const p = Number(cfg?.server?.port);
    if (Number.isInteger(p) && p >= 1 && p <= 65535) return p;
    console.warn(`[dev] config.json 端口非法(${cfg?.server?.port}),回退 ${DEFAULT_PORT}`);
  } catch {
    // 无 config.json 或解析失败 → dev 默认端口(正常路径,不刷屏)
  }
  return DEFAULT_PORT;
}

const port = await readPort();
console.log(`[dev] IELTS Copilot dev → http://127.0.0.1:${port}`);

const child = spawn("npx", ["next", "dev", "-H", "127.0.0.1", "-p", String(port)], {
  stdio: "inherit",
  shell: true,
});
child.on("exit", (code) => process.exit(code ?? 0));
