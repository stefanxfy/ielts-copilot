/**
 * src/lib/llm/chat.ts — 通用对话补全(P5 写作批改的 LLM 调用层)
 *
 * 范围:只实现 OpenAI 协议(openai 与 openai-compatible 两个分支)。
 * 当前接 MiniMax,后续接 GLM,两者同为 OpenAI 协议;anthropic 不在本轮范围,
 * 命中时返回明确的不支持错误,而不是静默走错分支发出畸形请求。
 *
 * 与 providers.ts 的分工:
 *   - providers.ts 的 testLlmConnectivity = 8 token 连通探测(设置页用,超时上限 30s)
 *   - 本文件的 chatComplete      = 真实业务调用(写作批改用,走用户配的完整 timeoutSec)
 *
 * JSON 输出的兼容处理:原生 OpenAI 支持 response_format:{type:'json_object'},
 * 但 MiniMax / 各类中转网关普遍不认该字段(返回 400 或直接忽略)。策略是「先带后降」:
 * 首次请求带 response_format,网关明确报错时去掉重试一次;同时 prompt 里约束输出格式
 * (见 grading/prompt.ts),双保险确保能拿到可解析的 JSON。
 */
import { readConfig } from "@/lib/config";
import {
  classifyHttpStatus,
  humanMessage,
  type ErrorCategory,
} from "./providers";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  /** 默认取 config.llm.gradingModel */
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** 要求模型输出严格 JSON(先带 response_format,网关不支持则降级靠 prompt 约束) */
  jsonMode?: boolean;
  /**
   * 关闭推理模型的 thinking(MiniMax-M3 支持 thinking:{type:'disabled'})。
   *
   * 批改必须关:思考内容里常复述输出结构、带花括号,既污染 JSON 解析,
   * 又让单次调用从 ~60s 涨到 180s+(T2 长作文实测直接超时)。
   * 网关不认该字段(返回 400)时自动降级为不带该参数重试,GLM 等后续接入同样安全。
   */
  disableThinking?: boolean;
  /** 默认取 config.llm.timeoutSec */
  timeoutSec?: number;
}

export interface ChatResult {
  ok: boolean;
  /** 模型输出的文本(失败时为空串) */
  content: string;
  latencyMs: number;
  /** 总 token 消耗(网关未返回 usage 时为 undefined) */
  tokens?: number;
  category?: ErrorCategory;
  /** 人话提示,可直接展示给用户 */
  message: string;
  /** 原始错误细节,排查用 */
  detail?: string;
}

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, "")}${path}`;
}

interface RawCallResult {
  kind: "ok" | "http" | "network";
  content?: string;
  tokens?: number;
  status?: number;
  body?: string;
  category?: ErrorCategory;
  detail?: string;
}

/** 发一次请求,不做重试(重试与降级由 chatComplete 编排) */
async function callOnce(
  url: string,
  headers: Record<string, string>,
  body: Record<string, unknown>,
  timeoutMs: number,
): Promise<RawCallResult> {
  let resp: Response;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    const name = err.name;
    const category: ErrorCategory =
      name === "AbortError" || name === "TimeoutError" ? "TIMEOUT" : "NETWORK";
    return { kind: "network", category, detail: `${name}: ${err.message}` };
  }

  if (!resp.ok) {
    return {
      kind: "http",
      status: resp.status,
      body: (await resp.text().catch(() => "")).slice(0, 500),
    };
  }

  const json = (await resp.json().catch(() => null)) as
    | {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { total_tokens?: number };
      }
    | null;
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    return {
      kind: "http",
      status: resp.status,
      body: `响应缺少 choices[0].message.content: ${JSON.stringify(json)?.slice(0, 300)}`,
    };
  }
  return {
    kind: "ok",
    content,
    tokens: json?.usage?.total_tokens,
  };
}

/**
 * 通用对话补全。provider 非 OpenAI 协议时返回 ok=false(message 说明不支持)。
 */
export async function chatComplete(
  messages: ChatMessage[],
  opts: ChatOptions = {},
): Promise<ChatResult> {
  const startedAt = Date.now();
  const { config } = readConfig();
  const llm = config.llm;

  if (llm.provider === "anthropic") {
    return {
      ok: false,
      content: "",
      latencyMs: 0,
      category: "HTTP",
      message: "当前仅支持 OpenAI 协议(OpenAI / MiniMax / GLM 等),Anthropic 接入尚未实现",
      detail: `provider=${llm.provider}`,
    };
  }

  if (!llm.apiKey) {
    return {
      ok: false,
      content: "",
      latencyMs: 0,
      category: "AUTH",
      message: "未配置 API Key —— 请到设置页填写后重试",
      detail: "config.llm.apiKey 为空",
    };
  }

  const model = opts.model ?? llm.gradingModel;
  const timeoutMs = (opts.timeoutSec ?? llm.timeoutSec) * 1000;
  const url = joinUrl(llm.baseUrl, "/chat/completions");
  const isNativeOpenai = llm.provider === "openai";

  const headers: Record<string, string> = {
    "content-type": "application/json",
    authorization: `Bearer ${llm.apiKey}`,
  };

  const baseBody: Record<string, unknown> = {
    model,
    messages,
    // 原生 OpenAI 用新参数;兼容网关(MiniMax / GLM / 中转)普遍只认旧的 max_tokens
    ...(isNativeOpenai
      ? { max_completion_tokens: opts.maxTokens ?? 4096 }
      : { max_tokens: opts.maxTokens ?? 4096 }),
  };
  if (typeof opts.temperature === "number") {
    baseBody.temperature = opts.temperature;
  }

  // 变体降级链:越靠前越理想,网关不认某个字段(400)就退到下一个变体。
  // 顺序:[response_format + 关 thinking] → [关 thinking] → [response_format] → [裸请求]
  const withThinking = opts.disableThinking
    ? { ...baseBody, thinking: { type: "disabled" } }
    : baseBody;
  const attempts: Array<{ body: Record<string, unknown>; label: string }> = [];
  const pushVariant = (body: Record<string, unknown>, label: string) => {
    const key = JSON.stringify(body);
    if (!attempts.some((a) => JSON.stringify(a.body) === key)) {
      attempts.push({ body, label });
    }
  };
  if (opts.jsonMode) {
    pushVariant({ ...withThinking, response_format: { type: "json_object" } }, "json_format+thinking_off");
  }
  pushVariant(withThinking, opts.disableThinking ? "thinking_off" : "plain");
  if (opts.disableThinking) {
    // 网关不认 thinking 字段时的兜底(后续接 GLM 等非 MiniMax 服务会走到这)
    if (opts.jsonMode) pushVariant({ ...baseBody, response_format: { type: "json_object" } }, "json_format");
    pushVariant(baseBody, "plain");
  }

  let last: RawCallResult | null = null;
  for (let i = 0; i < attempts.length; i++) {
    last = await callOnce(url, headers, attempts[i].body, timeoutMs);
    if (last.kind === "ok") break;
    // 只有 400(网关不认某个字段)才值得换变体重试;
    // 鉴权/限流/超时等错误重试无意义,直接跳出
    if (last.status !== 400) break;
    console.warn(
      `[llm-chat] 变体「${attempts[i].label}」被网关拒绝(400),降级重试 · ${last.body}`,
    );
  }

  const latencyMs = Date.now() - startedAt;
  if (!last) {
    return {
      ok: false,
      content: "",
      latencyMs,
      category: "HTTP",
      message: humanMessage("HTTP"),
      detail: "请求未发出",
    };
  }

  if (last.kind === "ok") {
    return {
      ok: true,
      content: last.content ?? "",
      latencyMs,
      tokens: last.tokens,
      message: `批改完成,${latencyMs}ms`,
    };
  }

  const category =
    last.category ?? classifyHttpStatus(last.status ?? 0);
  return {
    ok: false,
    content: "",
    latencyMs,
    category,
    message: humanMessage(category),
    detail:
      last.status != null
        ? `HTTP ${last.status} ${last.body ?? ""}`
        : (last.detail ?? ""),
  };
}
