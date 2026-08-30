/**
 * src/lib/llm/providers.ts — 三 provider 连通性测试(M1 步骤 4)
 *
 * 原生 fetch 直连,不用 SDK(M1 计划:V1 每 provider 只碰 1 端点,控依赖体积):
 *   openai           → POST {baseUrl}/chat/completions   · max_completion_tokens(新参数)
 *   openai-compatible → 同端点                            · max_tokens(兼容网关普遍只认旧参数)
 *                       (MiniMax / DeepSeek / 各类中转网关走此分支)
 *   anthropic        → POST {baseUrl}/v1/messages        · x-api-key + anthropic-version 头
 *
 * 只测连通(最小请求几 token),真实批改 prompt 属 M4。
 * 错误六分类:AUTH / NOT_FOUND / RATE_LIMIT / TIMEOUT / NETWORK / HTTP
 * 超时 = min(timeoutSec, 30s) —— 连通性测试不该等满用户配的 120s。
 */

export type ErrorCategory =
  | "AUTH"
  | "NOT_FOUND"
  | "RATE_LIMIT"
  | "TIMEOUT"
  | "NETWORK"
  | "HTTP";

export interface TestInput {
  provider: "openai" | "anthropic" | "openai-compatible";
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutSec: number;
}

export interface TestResult {
  ok: boolean;
  latencyMs: number;
  category?: ErrorCategory;
  /** 人话提示(设置页直接展示) */
  message: string;
  /** 原始错误细节(排查用) */
  detail?: string;
}

/** 错误分类 → 人话 */
function humanMessage(cat: ErrorCategory, detail: string): string {
  switch (cat) {
    case "AUTH":
      return "API Key 无效或无权限(401/403)—— 检查 Key 是否复制完整、是否对该模型有权限";
    case "NOT_FOUND":
      return "接口或模型不存在(404)—— 检查 baseUrl 路径与模型名拼写";
    case "RATE_LIMIT":
      return "触发限流(429)—— 稍后再试";
    case "TIMEOUT":
      return `请求超时 —— 网关无响应;检查 baseUrl 是否可达、或调大 timeoutSec(当前测试上限 30s)`;
    case "NETWORK":
      return "网络错误 —— DNS 解析失败或连不上;最常见原因是 baseUrl 写错";
    case "HTTP":
      return `网关返回错误状态(见 detail)—— 通常是网关侧问题或请求参数不被接受`;
  }
}

function classifyHttpStatus(status: number): ErrorCategory {
  if (status === 401 || status === 403) return "AUTH";
  if (status === 404) return "NOT_FOUND";
  if (status === 429) return "RATE_LIMIT";
  return "HTTP";
}

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, "")}${path}`;
}

interface EndpointSpec {
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

/** 按 provider 组装最小探测请求 */
function buildRequest(input: TestInput): EndpointSpec {
  const pingMessages = [{ role: "user", content: "ping" }];
  if (input.provider === "anthropic") {
    return {
      url: joinUrl(input.baseUrl, "/v1/messages"),
      headers: {
        "content-type": "application/json",
        "x-api-key": input.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: {
        model: input.model,
        max_tokens: 8,
        messages: pingMessages,
      },
    };
  }
  const isNativeOpenai = input.provider === "openai";
  return {
    url: joinUrl(input.baseUrl, "/chat/completions"),
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${input.apiKey}`,
    },
    body: {
      model: input.model,
      messages: pingMessages,
      // openai 新参数 max_completion_tokens;兼容网关(含 MiniMax/DeepSeek 等)用 max_tokens
      ...(isNativeOpenai
        ? { max_completion_tokens: 8 }
        : { max_tokens: 8 }),
    },
  };
}

export async function testLlmConnectivity(input: TestInput): Promise<TestResult> {
  const spec = buildRequest(input);
  const timeoutMs = Math.min(input.timeoutSec, 30) * 1000;
  const startedAt = Date.now();

  let resp: Response;
  try {
    resp = await fetch(spec.url, {
      method: "POST",
      headers: spec.headers,
      body: JSON.stringify(spec.body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    const latencyMs = Date.now() - startedAt;
    const err = e instanceof Error ? e : new Error(String(e));
    const name = err.name; // AbortError/TimeoutError → 超时;TypeError → 网络
    const category: ErrorCategory =
      name === "AbortError" || name === "TimeoutError" ? "TIMEOUT" : "NETWORK";
    return {
      ok: false,
      latencyMs,
      category,
      message: humanMessage(category, err.message),
      detail: `${name}: ${err.message}`,
    };
  }

  const latencyMs = Date.now() - startedAt;

  if (!resp.ok) {
    const text = (await resp.text().catch(() => "")).slice(0, 300);
    const category = classifyHttpStatus(resp.status);
    return {
      ok: false,
      latencyMs,
      category,
      message: humanMessage(category, text),
      detail: `HTTP ${resp.status} ${text}`,
    };
  }

  // 2xx 但 body 可能是网关的伪成功/HTML —— 校验 JSON 结构里有 choices 或 content
  const json: unknown = await resp.json().catch(() => null);
  const looksRight =
    !!json &&
    typeof json === "object" &&
    ("choices" in (json as object) || "content" in (json as object));
  if (!looksRight) {
    return {
      ok: false,
      latencyMs,
      category: "HTTP",
      message: humanMessage("HTTP", "2xx 但响应结构非预期"),
      detail: `响应缺少 choices/content: ${JSON.stringify(json)?.slice(0, 300)}`,
    };
  }

  return { ok: true, latencyMs, message: `连通正常,${latencyMs}ms 收到模型响应` };
}
