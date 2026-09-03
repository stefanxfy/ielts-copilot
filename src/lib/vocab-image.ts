/**
 * src/lib/vocab-image.ts — 背单词配图生成核心库(§6.1 定稿实现)
 *
 * 职责:拼提示词(v1 直译拼装) → MiniMax image-01 生图 → 下载落盘
 *       public/images/words/<word>.png → 回写 words.contentJson.image
 *
 * 设计要点(docs/背单词数据模型设计.md §6.1):
 *   - API 凭据复用 config.json 的 llm.apiKey(MiniMax 同账号,不新增配置项)
 *   - 提示词四要素:word + translation + definition + examples[0].en,原样拼装
 *     (缺例句退化为三要素、缺英释退化为两要素,不调 LLM 中间步骤)
 *   - 风格池 5 选(S1 默认/S6/S8/S10/S11),用户选择存 app_settings.vocab_image_style
 *   - 图上不带文字锁死:no text, no letters(配图是视觉默写卡刺激,出现拼写=剧透)
 *   - 落盘惯例同音频 mp3:图片文件进 public/,库内只存路径 contentJson.image
 *   - 单词级重生成只影响该词:覆盖 png + 回写该词 contentJson.image
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { words } from "@/db/schema";
import type { WordContent } from "@/db/schema";
import { readConfig } from "@/lib/config";
import { getSetting, setSetting } from "@/lib/study/settings";
import { publicDir } from "@/lib/paths";

/* ---------- 风格池(§6.1 定稿 5 选;前缀与调试脚本逐字一致,便于对比复现) ---------- */

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

/** 供设置页下拉/选择器渲染的风格列表 */
export function vocabImageStyleOptions() {
  return Object.entries(VOCAB_IMAGE_STYLES).map(([id, s]) => ({
    id: id as VocabImageStyleId,
    label: s.label,
    desc: s.desc,
  }));
}

export function isVocabImageStyleId(v: unknown): v is VocabImageStyleId {
  return typeof v === "string" && v in VOCAB_IMAGE_STYLES;
}

/* ---------- 风格偏好(app_settings.vocab_image_style) ---------- */

const STYLE_KEY = "vocab_image_style";

export function readVocabImageStyle(): VocabImageStyleId {
  const raw = getSetting<{ style?: unknown }>(STYLE_KEY);
  const style = raw?.style;
  return isVocabImageStyleId(style) ? style : DEFAULT_VOCAB_IMAGE_STYLE;
}

export function writeVocabImageStyle(style: VocabImageStyleId): void {
  setSetting(STYLE_KEY, { style });
}

/* ---------- 提示词:v1 直译拼装(§6.1 定稿,无 LLM 中间步骤) ---------- */

/** 单词行(demo 页/列表)渲染用:图 URL 或 null */
export function wordImageUrl(c: WordContent): string | null {
  return typeof c.image === "string" && c.image ? c.image : null;
}

/**
 * 拼 v1 直译提示词。四要素全取自 contentJson:
 *   word + translation + definition + examples[0].en
 * 缺例句 → 三要素;缺英释 → 两要素;全缺(只有词)仍可出图(退化兜底)。
 */
export function buildVocabImagePrompt(word: string, c: WordContent, style: VocabImageStyleId): string {
  const prefix = VOCAB_IMAGE_STYLES[style].prefix;
  const zh = c.translation?.join("; ") ?? "";
  const def = c.definition?.[0] ?? c.definition?.join("; ") ?? "";
  const ex = c.examples?.[0]?.en ?? "";
  return [
    prefix,
    `Illustrate the meaning of the English word "${word}".`,
    zh ? `Meaning: ${zh}.` : "",
    def ? `English definition: ${def}.` : "",
    ex ? `Example sentence: "${ex}"` : "",
    "The image must make the word's meaning instantly recognizable without any text.",
  ]
    .filter(Boolean)
    .join(" ");
}

/* ---------- MiniMax image-01 调用 + 落盘 ---------- */

const MINIMAX_ENDPOINT = "https://api.minimaxi.com/v1/image_generation";

export class VocabImageError extends Error {
  constructor(
    message: string,
    /** MiniMax base_resp.status_code(HTTP 200 但业务失败时) */
    readonly statusCode?: number,
  ) {
    super(message);
    this.name = "VocabImageError";
  }
}

/** 公共图目录 public/images/words/(不存在则创建) */
export function vocabImageDir(): string {
  const dir = join(publicDir(), "images", "words");
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** 词的落盘绝对路径(public/images/words/<word>.png) */
export function vocabImageFilePath(word: string): string {
  return join(vocabImageDir(), `${word}.png`);
}

/** 词的 web 访问路径(contentJson.image 存的值) */
export function vocabImageWebPath(word: string): string {
  return `/images/words/${word}.png`;
}

interface GenerateOptions {
  /** 超时 ms,默认 60s(生图一般 5~15s) */
  timeoutMs?: number;
}

/**
 * 调 MiniMax 生成一张图并落盘(不回写库;回写由调用方决定时机)。
 * 成功返回 { webPath, bytes }。
 */
export async function generateVocabImageFile(
  word: string,
  c: WordContent,
  style: VocabImageStyleId,
  opts: GenerateOptions = {},
): Promise<{ webPath: string; bytes: number }> {
  const apiKey = readConfig().config.llm.apiKey;
  if (!apiKey) throw new VocabImageError("config.json 里没有 llm.apiKey,无法生图");

  const prompt = buildVocabImagePrompt(word, c, style);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 60_000);
  let url: string;
  try {
    const res = await fetch(MINIMAX_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "image-01",
        prompt,
        aspect_ratio: "1:1",
        response_format: "url",
        prompt_optimizer: true,
        n: 1,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new VocabImageError(`MiniMax HTTP ${res.status}: ${t.slice(0, 300)}`);
    }
    const j = (await res.json()) as {
      base_resp?: { status_code?: number; status_msg?: string };
      data?: { image_urls?: string[] };
    };
    if (j.base_resp?.status_code !== 0) {
      throw new VocabImageError(
        `MiniMax API error ${j.base_resp?.status_code}: ${j.base_resp?.status_msg}`,
        j.base_resp?.status_code,
      );
    }
    url = j.data?.image_urls?.[0] ?? "";
    if (!url) throw new VocabImageError("MiniMax 响应里没有 image_urls");
  } catch (e) {
    if (e instanceof VocabImageError) throw e;
    if (e instanceof Error && e.name === "AbortError") {
      throw new VocabImageError(`MiniMax 生图超时(${opts.timeoutMs ?? 60_000}ms)`);
    }
    throw new VocabImageError(e instanceof Error ? e.message : String(e));
  } finally {
    clearTimeout(timer);
  }

  // 二次 fetch 下载落盘(临时 URL)
  const imgRes = await fetch(url);
  if (!imgRes.ok) throw new VocabImageError(`图片下载失败 HTTP ${imgRes.status}`);
  const buf = Buffer.from(await imgRes.arrayBuffer());
  const file = vocabImageFilePath(word);
  writeFileSync(file, buf);
  return { webPath: vocabImageWebPath(word), bytes: buf.length };
}

/**
 * 生图并回写 words.contentJson.image(单词级重生成入口,只影响该词)。
 * 已有旧图会被覆盖(同路径),contentJson 其他字段原样保留。
 */
export async function regenerateVocabImage(
  word: string,
  style: VocabImageStyleId,
  opts: GenerateOptions = {},
): Promise<{ webPath: string; bytes: number }> {
  const db = getDb();
  const row = db
    .select({ contentJson: words.contentJson })
    .from(words)
    .where(eq(words.word, word))
    .get();
  if (!row) throw new VocabImageError(`词不存在: ${word}`);

  const c = row.contentJson;
  const result = await generateVocabImageFile(word, c, style, opts);

  db.update(words)
    .set({ contentJson: { ...c, image: result.webPath }, updatedAt: new Date() })
    .where(eq(words.word, word))
    .run();
  return result;
}
