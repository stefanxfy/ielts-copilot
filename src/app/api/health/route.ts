/**
 * GET /api/health — 健康检查(M1 步骤 5)
 *
 * 返回 {ok, db, papers, llmConfigured, actualPort}(plan 工程结构约定):
 * 仪表盘三状态卡的数据源,同时是 M1 端到端验收面(启动脚本 curl 它轮询就绪)。
 * actualPort:打包模式由启动脚本注入 env PORT;dev 态为 null(客户端自知端口)。
 */
import { NextResponse } from "next/server";
import { getSqlite } from "@/db";
import { readConfig } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let db = false;
  let papers = 0;
  try {
    const row = getSqlite()
      .prepare("select count(*) as n from papers")
      .get() as { n: number };
    papers = row.n;
    db = true;
  } catch (e) {
    console.error("[health] db 不可用:", e);
  }

  const { config, error } = readConfig();
  const port = Number(process.env.PORT ?? 0);

  return NextResponse.json({
    ok: db,
    db,
    papers,
    /** config 已加载 = 文件可读且校验通过(有 error 说明文件坏了,已回退默认) */
    configLoaded: error === null,
    llmConfigured: config.llm.apiKey.length > 0,
    ...(error ? { configError: error } : {}),
    actualPort: port > 0 ? port : null,
  });
}
