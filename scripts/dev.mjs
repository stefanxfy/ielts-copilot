#!/usr/bin/env node
/**
 * scripts/dev.mjs — dev 启动入口(M1 步骤 1 最小版)
 *
 * 职责:读 config.json 端口(有则用,无则 3000 兜底)→ next dev -H 127.0.0.1
 *
 * intentionally stubbed: config.json 的完整读取(JSONC 解析/zod 校验/mtime 缓存)
 * 属于 M1 步骤 3 的 config 模块;届时本脚本改为 import src/lib/config.ts 的逻辑。
 * 当前只做「文件存在则尝试裸 JSON.parse」,够 dev 用。
 */
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const DEFAULT_PORT = 3000;

async function readPort() {
  try {
    const raw = await readFile(new URL('../config.json', import.meta.url), 'utf8');
    const cfg = JSON.parse(raw); // 步骤 3 换 config 模块(容注释/尾逗号)
    const p = Number(cfg?.server?.port);
    if (Number.isInteger(p) && p >= 1 && p <= 65535) return p;
    console.warn(`[dev] config.json 端口非法(${cfg?.server?.port}),回退 ${DEFAULT_PORT}`);
  } catch {
    // 无 config.json 或解析失败 → 默认端口(正常路径,不刷屏)
  }
  return DEFAULT_PORT;
}

const port = await readPort();
console.log(`[dev] IELTS Copilot dev → http://127.0.0.1:${port}`);

const child = spawn('npx', ['next', 'dev', '-H', '127.0.0.1', '-p', String(port)], {
  stdio: 'inherit',
  shell: true,
});
child.on('exit', (code) => process.exit(code ?? 0));
