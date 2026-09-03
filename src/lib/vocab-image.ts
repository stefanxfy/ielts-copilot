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
import {
  DEFAULT_VOCAB_IMAGE_STYLE,
  VOCAB_IMAGE_STYLES,
  isVocabImageStyleId,
  type VocabImageStyleId,
} from "@/lib/vocab-image-styles";

/* ---------- 风格池与风格 id:单一来源在 vocab-image-styles.ts(client 安全),此处转发 ---------- */

export {
  DEFAULT_VOCAB_IMAGE_STYLE,
  VOCAB_IMAGE_STYLES,
  isVocabImageStyleId,
  vocabImageStyleOptions,
  type VocabImageStyleId,
} from "@/lib/vocab-image-styles";

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
