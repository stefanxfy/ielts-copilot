/**
 * src/lib/vocab-card-policy.ts — 背单词卡型可用性判定(缺图词调度联动,#64)
 *
 * 设计(docs/背单词词库导入与词库中心设计.md §4):
 *   生图策略为 core/失败不阻塞导入 ⇒ 部分词天然无配图。无图词出题时跳过
 *   「视觉默写」型(认词卡自动落到无图变体),把名额重配到听觉/语境,保三型总量。
 *
 * 单一判定入口:卡型调度层与词书页提示共用此口径,避免各处各写一套 image 非空判断。
 * 判定基于文件系统而非仅 contentJson.image 非空——0 字节/已删除的残留路径不算有图。
 */
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { publicDir } from "@/lib/paths";
import type { WordContent } from "@/db/schema";

/** 词是否有可用配图(contentJson.image 非空且对应 png 落盘 >1KB) */
export function hasVocabImage(content: WordContent | null | undefined): boolean {
  const p = content?.image;
  if (!p) return false;
  try {
    const abs = join(publicDir(), p.replace(/^\//, ""));
    return existsSync(abs) && statSync(abs).size > 1000;
  } catch {
    return false;
  }
}

/**
 * 词可用的默写卡型(视觉型已按配图可用性过滤)。
 * ratio 为原型定稿比例(视觉40/听觉30/语境30);无图词把视觉名额归零,
 * 调度层按剩余 ratio 归一化抽卡,保三型总量不失衡。
 */
export function availableSpellCardTypes(
  content: WordContent | null | undefined,
): { id: "visual" | "audio" | "ctx"; ratio: number }[] {
  const types: { id: "visual" | "audio" | "ctx"; ratio: number }[] = [
    { id: "visual", ratio: 40 },
    { id: "audio", ratio: 30 },
    { id: "ctx", ratio: 30 },
  ];
  return hasVocabImage(content) ? types : types.filter((t) => t.id !== "visual");
}
