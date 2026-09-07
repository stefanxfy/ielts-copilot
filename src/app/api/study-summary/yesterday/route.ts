/**
 * /api/study-summary/yesterday — AI 昨日总结(P7)
 *
 * POST:?force=1 手动重跑(失败 toast 旁「重跑」按钮,不受 lastSummaryDate 幂等限制);
 *       无参 = 自动触发路径(幂等:昨日已生成过则 skipped)。
 * 失败响应带 reason 供 toast 展示。
 */
import { NextResponse } from "next/server";
import { generateYesterdaySummary } from "@/lib/study/summary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  const force = new URL(request.url).searchParams.get("force") === "1";
  try {
    const result = await generateYesterdaySummary(force);
    if (!result.ok) {
      return NextResponse.json({ failed: true, reason: result.reason });
    }
    return NextResponse.json({
      ok: true,
      skipped: result.skipped ?? false,
      summary: result.summary,
    });
  } catch (e) {
    return NextResponse.json({
      failed: true,
      reason: e instanceof Error ? e.message : "总结生成异常",
    });
  }
}
