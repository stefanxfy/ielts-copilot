/**
 * src/lib/vocab-regen.ts — 单词级物料重生成(S2 词表浏览页「重新生成」能力)
 *
 * 三种物料,全部单词级、覆盖式:
 *   - image     : regenerateVocabImage(选风格,覆盖旧 png + 回写 contentJson.image)
 *   - audio-word: edge-tts 重合成单词读音(选音色,覆盖 /audio/words/<word>.mp3)
 *   - audio-sent: edge-tts 重合成第 idx 条例句(选音色,统一 SENT_RATE=-8%)
 *
 * 设计:
 *   - 与批量管线(并发 2/4、任务态轮询)不同,这里全部同步 await —— 单物料
 *     5~15s(图)/1~3s(音频),弹窗内转圈等待可接受,不必引入任务态复杂度
 *   - 音频重合成前先删旧文件:synthOne 对 >1KB 的已有文件直接幂等跳过,
 *     不删旧文件会永远合成不出新音色
 *   - 合成/生成成功才回写 contentJson,失败不动库(原字段保留)
 */
import { rmSync } from "node:fs";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { words } from "@/db/schema";
import type { WordContent } from "@/db/schema";
import { publicDir } from "@/lib/paths";
import { synthOne } from "@/lib/vocab-import";
import { SENT_RATE } from "@/lib/vocab-tts-voices";
import {
  regenerateVocabImage,
  type VocabImageStyleId,
} from "@/lib/vocab-image";

export type RegenKind = "image" | "audio-word" | "audio-sent";

export class VocabRegenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VocabRegenError";
  }
}

/** 读入单词行(不存在报错) */
function loadWord(word: string): { id: number; contentJson: WordContent } {
  const db = getDb();
  const row = db
    .select({ id: words.id, contentJson: words.contentJson })
    .from(words)
    .where(eq(words.word, word))
    .get();
  if (!row) throw new VocabRegenError(`词不存在: ${word}`);
  return row;
}

/** 回写 contentJson(浅合并保留其他字段) */
function saveContent(word: string, c: WordContent): void {
  getDb()
    .update(words)
    .set({ contentJson: c, updatedAt: new Date() })
    .where(eq(words.word, word))
    .run();
}

/* ---------- 音频路径惯例(与 vocab-import.ts 一致) ---------- */

export function wordAudioWebPath(word: string): string {
  return `/audio/words/${word}.mp3`;
}

export function sentAudioWebPath(word: string, idx: number): string {
  return `/audio/sentences/${word}_${idx}.mp3`;
}

/* ---------- 三种重生成 ---------- */

/** 配图重生成/首次生成(选风格;覆盖旧图) */
export async function regenWordImage(
  word: string,
  style: VocabImageStyleId,
): Promise<{ webPath: string; bytes: number }> {
  return regenerateVocabImage(word, style);
}

/**
 * 单词读音重合成(选音色)。
 * 先删旧 mp3 再合成 —— synthOne 对 >1KB 旧文件幂等跳过,不删永远出不了新音色。
 */
export async function regenWordAudio(
  word: string,
  voice: string,
): Promise<{ webPath: string }> {
  const row = loadWord(word);
  const out = join(publicDir(), "audio", "words", `${word}.mp3`);
  rmSync(out, { force: true });

  const ok = await synthOne(word, out, voice, null, 3);
  if (!ok) throw new VocabRegenError(`单词读音合成失败(edge-tts 连续重试后仍失败): ${word}`);

  const c = row.contentJson;
  saveContent(word, { ...c, audio: { ...(c.audio ?? {}), word: wordAudioWebPath(word) } });
  return { webPath: wordAudioWebPath(word) };
}

/**
 * 例句重合成(选音色,统一 -8% 慢速率)。
 */
export async function regenSentAudio(
  word: string,
  idx: number,
  voice: string,
): Promise<{ webPath: string; en: string }> {
  const row = loadWord(word);
  const ex = row.contentJson.examples?.[idx];
  if (!ex?.en) throw new VocabRegenError(`例句不存在: ${word}[${idx}]`);

  const out = join(publicDir(), "audio", "sentences", `${word}_${idx}.mp3`);
  rmSync(out, { force: true });

  const ok = await synthOne(ex.en, out, voice, SENT_RATE, 3);
  if (!ok) throw new VocabRegenError(`例句合成失败(edge-tts 连续重试后仍失败): ${word}[${idx}]`);

  const c = row.contentJson;
  const examples = c.examples.map((e, i) =>
    i === idx ? { ...e, audio: sentAudioWebPath(word, idx) } : e,
  );
  saveContent(word, { ...c, examples });
  return { webPath: sentAudioWebPath(word, idx), en: ex.en };
}
