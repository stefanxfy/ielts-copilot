/**
 * src/lib/vocab-core-word.ts — 核心词判据(单一来源)
 *
 * 从 vocab-import.ts 抽出:批量补图(vocab-batch-image)与设置页阈值路由都要用,
 * 不该为判一个词拖入整个导入管线(TTS spawn/百词斩 fetch 等重依赖)。
 * 判据:collins ≥ collinsMin 或 bncRank ≤ bncMax(阈值存 app_settings.vocab_core_thresholds)。
 */
import { getSetting } from "@/lib/study/settings";

export interface CoreThresholds {
  collinsMin: number;
  bncMax: number;
}

const DEFAULT_THRESHOLDS: CoreThresholds = { collinsMin: 3, bncMax: 2000 };

/** 阈值读 app_settings.vocab_core_thresholds(设置页可改;非法/缺省回退 3/2000) */
export function readCoreThresholds(): CoreThresholds {
  const raw = getSetting<Partial<CoreThresholds>>("vocab_core_thresholds");
  if (!raw || typeof raw !== "object") return { ...DEFAULT_THRESHOLDS };
  const r = raw as Partial<CoreThresholds>;
  return {
    collinsMin: typeof r.collinsMin === "number" && r.collinsMin >= 1 && r.collinsMin <= 5 ? r.collinsMin : DEFAULT_THRESHOLDS.collinsMin,
    bncMax: typeof r.bncMax === "number" && r.bncMax >= 100 && r.bncMax <= 50000 ? r.bncMax : DEFAULT_THRESHOLDS.bncMax,
  };
}

/** 核心词:柯林斯星级达标 或 BNC 高频达标(满足其一即可) */
export function isCoreWord(
  c: { collins?: number; bncRank?: number } | null | undefined,
  t: CoreThresholds,
): boolean {
  return (c?.collins !== undefined && c.collins >= t.collinsMin) || (c?.bncRank !== undefined && c.bncRank <= t.bncMax);
}
