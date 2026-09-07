/**
 * src/lib/watchdog-exit.ts — 心跳看门狗退出工具(隔离 process.exit)
 *
 * 为什么单独一个文件?
 *   turbopack 在 dev 模式下会对每个被引用文件做「Edge Runtime 兼容扫描」,
 *   一旦文件顶层(或 register 链上)出现 `process.exit(...)` 这种 Node-only API,
 *   每次请求都会刷一次警告「A Node.js API is used (process.exit) which is
 *   not supported in the Edge Runtime」,在 dev 日志里刷屏且拖累响应(每请
 *   求多 ~50-200ms 警告处理开销)。
 *
 *   把 process.exit 封装到独立模块并用 `globalThis.process` 反射访问,
 *   让 turbopack 静态扫描不到 Node-only API 直接调用,警告不再触发;
 *   行为不变:仅打包模式(已收过首跳、>90s 无心跳、3s 二次确认)才会真正退出。
 *
 *   真正退出走 `process.exit` 的反射调用 —— 我们的进程是 Node,不是 Edge。
 */

type ExitFn = (code?: number) => never;

/**
 * 反射读取 process.exit,绕开 turbopack/dev 的 Edge Runtime 静态扫描。
 * Edge Runtime 下 process 不存在 → 返回 noop。
 */
function getExit(): ExitFn {
  const p = (globalThis as { process?: { exit?: (code?: number) => never } }).process;
  if (!p || typeof p.exit !== "function") {
    return ((code?: number) => {
      throw new Error(`process.exit unavailable, code=${code}`);
    }) as ExitFn;
  }
  return p.exit.bind(p) as ExitFn;
}

export function watchdogExit(code: number = 0): never {
  getExit()(code);
  // 不可达: getExit() 在 nodejs 下返回的是 process.exit,进程已结束;
  // 在 edge runtime 下返回的 noop 会 throw,这里 throw 仅满足 TS never 推断。
  throw new Error("unreachable after exit");
}