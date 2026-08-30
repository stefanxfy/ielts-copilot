/**
 * POST /api/config/test-llm — LLM 连通性测试(M1 步骤 4,PRD §7)
 *
 * body 字段全部可选:缺省回退 config.json 现值(apiKey 缺省用已存 key,
 * 设置页「用当前表单值测试,未保存也可测」由此实现 —— key 只在内存中过一趟,
 * 不写盘)。返回六分类错误 + latencyMs,设置页出人话提示。
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { readConfig } from "@/lib/config";
import { testLlmConnectivity } from "@/lib/llm/providers";

export const runtime = "nodejs";

const bodySchema = z.object({
  provider: z.enum(["openai", "anthropic", "openai-compatible"]).optional(),
  baseUrl: z.url().optional(),
  apiKey: z.string().optional(),
  gradingModel: z.string().min(1).optional(),
  timeoutSec: z.number().int().min(5).max(600).optional(),
});

export async function POST(request: Request) {
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {}; // 空 body = 测已保存配置
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "参数校验失败", issues: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  const saved = readConfig().config;
  const b = parsed.data;
  const provider = b.provider ?? saved.llm.provider;
  const apiKey = b.apiKey && b.apiKey.length > 0 ? b.apiKey : saved.llm.apiKey;
  const baseUrl = b.baseUrl ?? saved.llm.baseUrl;
  const model = b.gradingModel ?? saved.llm.gradingModel;
  const timeoutSec = b.timeoutSec ?? saved.llm.timeoutSec;

  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        category: "AUTH",
        message: "尚未配置 API Key(body 未带且 config.json 里也没有)",
      },
      { status: 400 },
    );
  }

  const result = await testLlmConnectivity({
    provider,
    baseUrl,
    apiKey,
    model,
    timeoutSec,
  });
  return NextResponse.json(result);
}
