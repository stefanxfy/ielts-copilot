/**
 * src/lib/vocab-image-styles.ts — 配图风格元数据(client 安全)
 *
 * 从 vocab-image.ts 拆出:设置页/词库页是 "use client" 组件,
 * 不能 import 带 node:fs / better-sqlite3 依赖的 vocab-image.ts,
 * 故风格池单独成模块(同 ui-theme.ts 拆法),vocab-image.ts 转发导出保持单一来源。
 *
 * 风格池 5 选(docs/背单词数据模型设计.md §6.1 定稿):
 * S1 默认 / S6 彩铅 / S8 胶片 / S10 古风 / S11 巨构。
 * prefix 与调试脚本 scripts/debug-image-prompt.mjs 逐字一致,便于对比复现。
 * 图上不带文字锁死在每条 prefix 里(no text, no letters)——配图是视觉默写卡刺激,
 * 出现拼写即剧透。
 */

export const VOCAB_IMAGE_STYLES = {
  s1: {
    label: "暖色扁平插画",
    desc: "pastel 绘本、扁平暖色,词义可读性最好",
    prefix:
      "Warm flat illustration, soft pastel colors, clean minimal composition, single central scene, no text, no letters, children's picture-book style",
  },
  s6: {
    label: "彩铅手绘",
    desc: "铅笔颗粒质感、绘本内页感",
    prefix:
      "Detailed colored pencil drawing, soft hand-drawn strokes, delicate pencil grain texture, warm harmonious colors, storybook illustration page, gentle lighting, no text, no letters",
  },
  s8: {
    label: "暖调胶片摄影",
    desc: "Kodak Portra 色调、胶片颗粒、怀旧氛围",
    prefix:
      "Warm analog film photography, Kodak Portra color tones, soft natural window light, subtle film grain, 35mm candid composition, nostalgic warm atmosphere, one clear subject, no text, no letters, no watermark",
  },
  s10: {
    label: "古风动漫",
    desc: "国风动画关键帧、水墨渐变、雾气氛围",
    prefix:
      "Ancient Chinese style anime illustration, guofeng donghua key visual, flowing ink-wash color gradients, misty atmosphere, traditional oriental aesthetics, delicate line art, elegant muted palette, cinematic composition, no text, no letters",
  },
  s11: {
    label: "巨构史诗",
    desc: "巨构背景、渺小主体对比、史诗构图",
    prefix:
      "Epic colossal megastructure concept art, monumental sci-fi architecture towering into the clouds in the background, tiny subjects for dramatic scale contrast, atmospheric haze, volumetric light, cinematic wide-angle matte painting, no text, no letters",
  },
} as const;

export type VocabImageStyleId = keyof typeof VOCAB_IMAGE_STYLES;

export const DEFAULT_VOCAB_IMAGE_STYLE: VocabImageStyleId = "s1";

export interface VocabImageStyleOption {
  id: VocabImageStyleId;
  label: string;
  desc: string;
}

/** 供设置页选择器渲染的风格列表 */
export function vocabImageStyleOptions(): VocabImageStyleOption[] {
  return Object.entries(VOCAB_IMAGE_STYLES).map(([id, s]) => ({
    id: id as VocabImageStyleId,
    label: s.label,
    desc: s.desc,
  }));
}

export function isVocabImageStyleId(v: unknown): v is VocabImageStyleId {
  return typeof v === "string" && v in VOCAB_IMAGE_STYLES;
}
