/**
 * src/lib/vocab-tts-voices.ts — edge-tts 音色元数据(client 安全)
 *
 * 同 vocab-image-styles.ts 拆法:导入弹窗/设置页是 "use client" 组件,
 * 不能 import 带 node:child_process 依赖的管线模块,音色池单独成模块。
 *
 * 音色定稿(2026-09-03 用户试音拍板,prototype/vocab/tts-audition/ 8 音色对比):
 *   - 默认:单词 = Andrew(男·美音,节奏最佳),例句 = Emma(女·美音,韵律最佳)
 *   - Multilingual 系(Andrew/Ava/Brian/Emma)停顿/连读/语调显著优于经典 Neural 系
 *   - 例句合成统一 --rate=-8%(稍慢,停顿感更明显)
 *
 * 与 scripts/import-vocab-pipeline.mjs / scripts/resynth-audio.mjs 的默认值保持
 * 一致(那边是 CLI 独立常量,注释互相指向)。
 */

export interface VocabTtsVoice {
  /** edge-tts ShortName */
  id: string;
  /** 展示名(试音样音文件同名:prototype/vocab/book-list/audio/<name>.mp3) */
  name: string;
  /** 短描述(男·美音·节奏最佳) */
  tag: string;
  /** Multilingual 系新声学模型 */
  multilingual: boolean;
}

export const VOCAB_TTS_VOICES: VocabTtsVoice[] = [
  { id: "en-US-AndrewMultilingualNeural", name: "Andrew", tag: "男·美音·节奏最佳", multilingual: true },
  { id: "en-US-BrianMultilingualNeural", name: "Brian", tag: "男·美音", multilingual: true },
  { id: "en-US-AvaMultilingualNeural", name: "Ava", tag: "女·美音", multilingual: true },
  { id: "en-US-EmmaMultilingualNeural", name: "Emma", tag: "女·美音·韵律最佳", multilingual: true },
  { id: "en-GB-SoniaNeural", name: "Sonia", tag: "女·英音", multilingual: false },
  { id: "en-GB-LibbyNeural", name: "Libby", tag: "女·英音", multilingual: false },
];

export const DEFAULT_WORD_VOICE = "en-US-AndrewMultilingualNeural";
export const DEFAULT_SENT_VOICE = "en-US-EmmaMultilingualNeural";

/** 例句统一慢速率(edge-tts --rate) */
export const SENT_RATE = "-8%";

export function isVocabTtsVoiceId(v: unknown): v is string {
  return typeof v === "string" && VOCAB_TTS_VOICES.some((x) => x.id === v);
}
