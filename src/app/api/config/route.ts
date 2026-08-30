/**
 * GET/PUT /api/config — 配置读写 API(M1 步骤 3)
 *
 * GET :脱敏视图(apiKey 永不下发,只给 apiKeySet/apiKeyMasked)+ fileMtime
 * PUT :乐观并发 —— body.baseMtime 与当前文件 mtime 不符 → 409 + 最新脱敏配置
 *       (设置页「已被外部修改,一键重载」的数据面,PRD §11-4/风险#3)
 *       apiKey 缺省/空串 = 保持现值;其余字段部分更新
 * 校验失败 → 400 + zod 字段级错误(不崩溃)
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { readConfig, writeConfig, maskedView } from "@/lib/config";
import { configSchema, type AppConfig } from "@/lib/config-schema";

export const runtime = "nodejs";

/** PUT body:全部字段可选;apiKey 空串=保持现值;baseMtime 乐观并发 */
const putBodySchema = z.object({
  server: z
    .object({
      port: z.number().int().min(1).max(65535).optional(),
      host: z.enum(["127.0.0.1", "localhost", "::1"]).optional(),
    })
    .optional(),
  llm: z
    .object({
      provider: z.enum(["openai", "anthropic", "openai-compatible"]).optional(),
      baseUrl: z.url().optional(),
      apiKey: z.string().optional(),
      gradingModel: z.string().min(1).optional(),
      timeoutSec: z.number().int().min(5).max(600).optional(),
    })
    .optional(),
  baseMtime: z.number().nullable().optional(),
});

export async function GET() {
  const { config, mtimeMs, error } = readConfig();
  return NextResponse.json({
    config: maskedView(config),
    fileMtime: mtimeMs,
    ...(error ? { fileError: error } : {}),
  });
}

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "请求体不是合法 JSON" }, { status: 400 });
  }

  const parsed = putBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "字段校验失败", issues: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  const current = readConfig();

  // 乐观并发:baseMtime 带了且与当前不符 → 409 + 最新脱敏配置
  if (
    parsed.data.baseMtime !== undefined &&
    parsed.data.baseMtime !== null &&
    parsed.data.baseMtime !== current.mtimeMs
  ) {
    return NextResponse.json(
      {
        message: "config.json 已被外部修改,请重载后再保存",
        config: maskedView(current.config),
        fileMtime: current.mtimeMs,
      },
      { status: 409 },
    );
  }

  // 合并:当前值为基础,body 覆盖;apiKey 空/缺省 = 保持现值
  const next: AppConfig = {
    server: {
      port: parsed.data.server?.port ?? current.config.server.port,
      host: parsed.data.server?.host ?? current.config.server.host,
    },
    llm: {
      provider: parsed.data.llm?.provider ?? current.config.llm.provider,
      baseUrl: parsed.data.llm?.baseUrl ?? current.config.llm.baseUrl,
      apiKey:
        parsed.data.llm?.apiKey && parsed.data.llm.apiKey.length > 0
          ? parsed.data.llm.apiKey
          : current.config.llm.apiKey,
      gradingModel: parsed.data.llm?.gradingModel ?? current.config.llm.gradingModel,
      timeoutSec: parsed.data.llm?.timeoutSec ?? current.config.llm.timeoutSec,
    },
  };

  const valid = configSchema.safeParse(next);
  if (!valid.success) {
    return NextResponse.json(
      { message: "合并后配置校验失败", issues: z.treeifyError(valid.error) },
      { status: 400 },
    );
  }

  const mtimeMs = writeConfig(valid.data);
  return NextResponse.json({ config: maskedView(valid.data), fileMtime: mtimeMs });
}
