/**
 * 整库快照的统一「备份 + 清理」。
 *
 * 背景：多个脚本都会在 --apply 前拷一份整库当保险，每份 ≈21MB。历史上各脚本
 * 只拷不删，实测 gen-images-xdf 在 10 小时内堆了 17 份 / 342MB（2026-09-13 清理）。
 *
 * 约定：DB 快照一律命名为 `<dbFileName>.bak-<tag>-<Date.now()>`，
 * 创建后立即调用 snapshotDb()，只保留最近 keep 份。
 *
 * ⚠ tag 必须每个脚本唯一：清理按 tag 前缀匹配，两个脚本复用同一 tag 会互相误删。
 */
import { copyFileSync, readdirSync, unlinkSync } from "node:fs";
import { basename, dirname, join } from "node:path";

/** 默认保留份数（够回退排查，又不至于堆积） */
export const KEEP_DB_BAKS = 3;

/**
 * 删除同一 tag 的过期快照，只保留最近 keep 份。
 * @param {string} dbPath 活库路径，如 /repo/data/app.db
 * @param {string} tag 该脚本专属标签，如 "imgxdf"
 * @param {number} [keep=KEEP_DB_BAKS] 保留份数（下限 1，避免把刚做的备份也删掉）
 * @returns {string[]} 已删除的文件路径
 */
export function pruneDbBackups(dbPath, tag, keep = KEEP_DB_BAKS) {
  const dir = dirname(dbPath);
  const prefix = `${basename(dbPath)}.bak-${tag}-`;
  /** @type {string[]} */
  let names;
  try {
    names = readdirSync(dir);
  } catch {
    return []; // 目录不可读：清理属附加动作，失败不阻断主流程
  }
  // 只认 <prefix><纯数字>，且 Date.now() 定长 13 位 → 数值排序即时间序
  const olds = names
    .filter((f) => f.startsWith(prefix) && /^\d+$/.test(f.slice(prefix.length)))
    .sort((a, b) => Number(a.slice(prefix.length)) - Number(b.slice(prefix.length)));

  const removed = [];
  for (const f of olds.slice(0, Math.max(0, olds.length - Math.max(1, keep)))) {
    const p = join(dir, f);
    try {
      unlinkSync(p);
      removed.push(p);
    } catch {
      /* 单个删除失败不阻断 */
    }
  }
  return removed;
}

/**
 * 拷一份整库快照并顺手清理历史快照。
 * @param {string} dbPath 活库路径
 * @param {string} tag 该脚本专属标签
 * @param {{ keep?: number }} [opts]
 * @returns {{ path: string, removed: string[] }}
 */
export function snapshotDb(dbPath, tag, { keep = KEEP_DB_BAKS } = {}) {
  const path = `${dbPath}.bak-${tag}-${Date.now()}`;
  copyFileSync(dbPath, path);
  return { path, removed: pruneDbBackups(dbPath, tag, keep) };
}
