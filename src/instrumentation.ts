/**
 * src/instrumentation.ts — Next 启动钩子(M1 步骤 2 建库 / 步骤 5 心跳看门狗)
 *
 * register() 在每个 Next server 实例启动时执行一次(dev / standalone 双态)。
 *
 * 1) 自动建库链:ensureDataDir → 连接(含 pragma)→ migrate()(journal 幂等)。
 *    「文件夹即应用」:无人会手动建库,库与应用同生。
 *
 * 2) 心跳看门狗(仅打包模式:启动.command 注入 env IELTS_HEARTBEAT_EXIT=1;
 *    next dev 不设 → 永不退出,防开发中被误杀):
 *    每 10s 检查,>90s 无心跳(90s > Chrome 后台标签 ≥60s 节流)且已收到过首跳
 *    → 二次确认(连续两个检查周期)→ process.exit(0),实现「浏览器关闭=退出」。
 *
 * NEXT_RUNTIME 守卫:better-sqlite3 是原生模块,只进 nodejs 运行时;
 * 动态 import 防止被打进 edge bundle。
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { ensureDataDir } = await import("@/lib/paths");
  const { runMigrations } = await import("@/db/migrate");
  ensureDataDir();
  const info = runMigrations();
  console.log(
    `[db] data/app.db 就绪 · 已应用迁移 ${info.applied} 条(幂等) · ${info.folder}`,
  );

  if (process.env.IELTS_HEARTBEAT_EXIT === "1") {
    const { lastBeat } = await import("@/lib/heartbeat-state");
    const CHECK_MS = 10_000;
    const DEAD_MS = 90_000;
    let confirmed = false;
    setInterval(() => {
      const last = lastBeat();
      if (last === null) return; // 未收到首跳:浏览器还没打开,不判死
      if (Date.now() - last <= DEAD_MS) {
        confirmed = false;
        return;
      }
      if (!confirmed) {
        confirmed = true;
        console.log(
          `[watchdog] >${DEAD_MS / 1000}s 无心跳,10s 后二次确认…`,
        );
        return;
      }
      console.log(
        `[watchdog] 确认浏览器已关闭(最后心跳 ${new Date(last).toISOString()}),进程退出`,
      );
      process.exit(0);
    }, CHECK_MS);
    console.log("[watchdog] 心跳看门狗已武装(90s 超时 · 二次确认退出)");
  }
}
