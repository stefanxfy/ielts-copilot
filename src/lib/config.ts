/**
 * src/lib/config.ts — config.json 读写模块(M1 步骤 3)
 *
 * 读:strip-json-comments(容注释+尾逗号)→ zod 校验(字段级报错不崩溃,坏文件回退默认值)
 *    → mtime 缓存:每次 statSync 核对,文件变了才重读(PRD §11-4「以文件 mtime 为准」)
 * 写:tmp 文件 + renameSync 原子写;重新生成固定注释版式
 *    (不保留用户自定义注释 —— config.example.json 承载完整文档,README 写明)
 */
import { readFileSync, writeFileSync, renameSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import stripJsonComments from "strip-json-comments";
import {
  configSchema,
  DEFAULT_CONFIG,
  type AppConfig,
} from "./config-schema";
import { appRoot } from "./paths";

export function configFilePath(): string {
  return join(appRoot(), "config.json");
}

export interface ConfigRead {
  config: AppConfig;
  /** 文件 mtime(ms);无文件为 null */
  mtimeMs: number | null;
  /** 文件存在但校验失败时的字段级错误(不崩溃,回退默认值) */
  error: string | null;
}

let cache: { mtimeMs: number | null; read: ConfigRead } | null = null;

export function readConfig(): ConfigRead {
  const file = configFilePath();
  let mtimeMs: number | null = null;
  try {
    mtimeMs = statSync(file).mtimeMs;
  } catch {
    mtimeMs = null; // 无文件 → 默认值
  }
  if (cache && cache.mtimeMs === mtimeMs) return cache.read;

  let read: ConfigRead;
  if (mtimeMs === null) {
    read = { config: DEFAULT_CONFIG, mtimeMs: null, error: null };
  } else {
    try {
      const raw = readFileSync(file, "utf8");
      const json = JSON.parse(stripJsonComments(raw, { trailingCommas: true }));
      read = { config: configSchema.parse(json), mtimeMs, error: null };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[config] ${file} 解析/校验失败,回退默认值:${msg}`);
      read = { config: DEFAULT_CONFIG, mtimeMs, error: msg };
    }
  }
  cache = { mtimeMs, read };
  return read;
}

/** 固定注释版式序列化(与 config.example.json 同款;写回即此格式) */
export function serializeConfig(c: AppConfig): string {
  return `{
  // 服务:只监听本机回环(host 白名单 127.0.0.1 / localhost / ::1,PRD §7)
  "server": {
    "port": ${c.server.port}, // 1-65535;被占用时启动脚本自动 +1 递增(不写回本文件)
    "host": "${c.server.host}"
  },

  // 写作批改 AI:所有 LLM 调用走此处,不写死进代码(PRD §3.2)
  // apiKey 明文存储仅限本机自用 —— 勿把整个文件夹分享出去
  "llm": {
    "provider": "${c.llm.provider}", // openai | anthropic | openai-compatible
    "baseUrl": "${c.llm.baseUrl}",
    "apiKey": "${c.llm.apiKey}",
    "gradingModel": "${c.llm.gradingModel}", // 写作批改用(质量优先)
    "timeoutSec": ${c.llm.timeoutSec} // 5-600
  }
}
`;
}

/** 原子写:tmp → rename(半写的文件永远不会以 config.json 面目出现) */
export function writeConfig(next: AppConfig): number {
  const file = configFilePath();
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, serializeConfig(next), "utf8");
  renameSync(tmp, file);
  cache = null; // 失效缓存,下次 readConfig 重读
  return statSync(file).mtimeMs;
}

/** apiKey 脱敏:前4 + … + 后4;短 key 全遮 */
export function maskApiKey(key: string): string {
  if (!key) return "";
  if (key.length <= 8) return "****";
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

/** GET/PUT 共用的脱敏视图:完整 key 永不出 API(PRD §7) */
export function maskedView(c: AppConfig) {
  return {
    server: { ...c.server },
    llm: {
      provider: c.llm.provider,
      baseUrl: c.llm.baseUrl,
      gradingModel: c.llm.gradingModel,
      timeoutSec: c.llm.timeoutSec,
      apiKeySet: c.llm.apiKey.length > 0,
      apiKeyMasked: maskApiKey(c.llm.apiKey),
    },
  };
}

export function configFileExists(): boolean {
  return existsSync(configFilePath());
}
