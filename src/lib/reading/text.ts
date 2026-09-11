/**
 * src/lib/reading/text.ts — 阅读文本工具(前后端共用,纯函数零依赖)
 *
 * tokenize 是「词库命中波浪线」的对齐基准:
 *   服务端 word-hits 用它对全文分词查 words 表,
 *   前端阅读器用它对段落分词做命中渲染 —— 两侧必须同一正则,否则波浪线错位。
 * 词形规则:纯英文字母,允许内部撇号(' / ’)与连字符连接(如 don't / well-known)。
 */

/** 单词 token 正则(全局匹配用) */
export const WORD_TOKEN_RE = /[a-zA-Z]+(?:[''\u2019-][a-zA-Z]+)*/g;

/** 文本 → 单词 token 数组(保留原文大小写,查词/比对前再 lower) */
export function tokenize(text: string): string[] {
  return text.match(WORD_TOKEN_RE) ?? [];
}

/** 词形归一:小写(与 words.word 小写归一存储一致) */
export function normalizeWord(raw: string): string {
  return raw.toLowerCase();
}

/** 合法词条校验(加生词本入参兜底) */
export function isWordLike(raw: string): boolean {
  return /^[a-zA-Z]+(?:[''\u2019-][a-zA-Z]+)*$/.test(raw);
}
