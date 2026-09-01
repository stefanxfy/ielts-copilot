/**
 * src/lib/writing-sheet.ts — 写作答题卡的服务端小工具
 *
 * 注意:不能放在 grading-card.tsx(带 "use client")里,
 * 服务端组件调用客户端模块导出的函数会直接 500。
 */
import type { WritingSheetEntry } from "@/db/schema";

/** 从答题卡条目判断两篇作文是否有实际内容(≥10 字符,与自动批改触发阈值一致) */
export function extractEssayPresence(
  tasks: WritingSheetEntry[],
): { T1: boolean; T2: boolean } {
  const get = (t: "T1" | "T2") =>
    (tasks.find((e) => e.task === t)?.value ?? "").trim().length >= 10;
  return { T1: get("T1"), T2: get("T2") };
}
