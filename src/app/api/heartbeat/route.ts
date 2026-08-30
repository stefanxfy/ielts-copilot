/**
 * POST /api/heartbeat — 浏览器心跳(M1 步骤 5)
 *
 * 「浏览器关闭 = 退出」机制的服务端半边:客户端 heartbeat.tsx 每 5s 打一跳,
 * 本路由只更新 lastBeat;由 instrumentation.ts 的看门狗(env IELTS_HEARTBEAT_EXIT=1,
 * 仅打包模式)判定超时退出。dev 不设 env → 永不退出。
 */
import { NextResponse } from "next/server";
import { beat, lastBeat, firstBeatAt } from "@/lib/heartbeat-state";

export const runtime = "nodejs";

export async function POST() {
  beat();
  return NextResponse.json({ ok: true });
}

/** 调试/健康观测用 */
export async function GET() {
  const last = lastBeat();
  return NextResponse.json({
    ok: true,
    lastBeat: last,
    sinceMs: last === null ? null : Date.now() - last,
    firstBeatAt: firstBeatAt(),
  });
}
