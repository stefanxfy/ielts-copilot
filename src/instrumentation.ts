/**
 * src/instrumentation.ts — Next 启动钩子(M1 步骤 2)
 *
 * register() 在每个 Next server 实例启动时执行一次(dev / standalone 双态)。
 * 职责 = 自动建库链:ensureDataDir → 连接(含 pragma)→ migrate()(journal 幂等)。
 * 「文件夹即应用」:无人会手动建库,库与应用同生。
 *
 * NEXT_RUNTIME 守卫:migration 依赖 better-sqlite3 原生模块,只进 nodejs 运行时;
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
}
