/**
 * src/lib/config-schema.ts — config.json 的 zod 校验(M1 步骤 3)
 *
 * 对齐 PRD §3.2 字段结构 + M1 计划校验规则:
 *   host 白名单 127.0.0.1|localhost|::1(PRD §7 强制:只监听本机回环)
 *   port 1-65535(默认 3177);provider 三值;timeoutSec 5-600;baseUrl 合法 URL
 */
import { z } from "zod";

export const PROVIDERS = ["openai", "anthropic", "openai-compatible"] as const;
export type Provider = (typeof PROVIDERS)[number];

/** PRD §7:服务只允许绑定本机回环,杜绝局域网暴露 */
export const HOST_WHITELIST = ["127.0.0.1", "localhost", "::1"] as const;

const serverSchema = z.object({
  port: z.number().int().min(1).max(65535).default(3177),
  host: z.enum(HOST_WHITELIST).default("127.0.0.1"),
});

const llmSchema = z.object({
  provider: z.enum(PROVIDERS).default("openai"),
  baseUrl: z.url().default("https://api.openai.com/v1"),
  /** 明文仅本机自用(PRD §3.2 安全口径:README 注明勿分享整个文件夹) */
  apiKey: z.string().default(""),
  gradingModel: z.string().min(1).default("gpt-4o"),
  timeoutSec: z.number().int().min(5).max(600).default(120),
});

export const configSchema = z.object({
  server: serverSchema.default(() => serverSchema.parse({})),
  llm: llmSchema.default(() => llmSchema.parse({})),
});

export type AppConfig = z.infer<typeof configSchema>;

export const DEFAULT_CONFIG: AppConfig = configSchema.parse({});
