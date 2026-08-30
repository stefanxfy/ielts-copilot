/**
 * src/lib/heartbeat-state.ts — 心跳时间戳的进程级共享状态(M1 步骤 5)
 *
 * globalThis 承载:route handler 与 instrumentation 看门狗要读到**同一个**实例
 * (Next 按路由分包,普通模块导出可能被实例化两份)。
 * firstBeatAt 用于看门狗武装:收到第一跳之前不判超时(浏览器还没打开不算死)。
 */
const g = globalThis as unknown as {
  __ieltsLastBeat?: number;
  __ieltsFirstBeatAt?: number;
};

export function beat(): void {
  const now = Date.now();
  g.__ieltsFirstBeatAt ??= now;
  g.__ieltsLastBeat = now;
}

export function lastBeat(): number | null {
  return g.__ieltsLastBeat ?? null;
}

export function firstBeatAt(): number | null {
  return g.__ieltsFirstBeatAt ?? null;
}
