/**
 * src/lib/typing/text.ts — 打字练习文本归一(P10)
 *
 * normTypingText 是客户端与服务端共用的唯一文本口径:
 *   客户端跟打器按归一后文本渲染/比对;服务端按同一函数拼接 paragraphsJson
 *   校验 charTotal、回填错字明细。弯引号/长破折号等排版字符归一为键盘可直接
 *   输入的 ASCII —— 否则键盘上的直引号永远打不过弯引号。
 */

/** 排版字符 → 键盘可输入字符 */
export function normTypingText(s: string): string {
  return s
    .replace(/[\u2018\u2019]/g, "'") // 弯单引号 → '
    .replace(/[\u201C\u201D]/g, '"') // 弯双引号 → "
    .replace(/[\u2013\u2014]/g, "-") // en/em dash → -
    .replace(/\u00A0/g, " "); // 不换行空格 → 空格
}

/** 整篇文章全文:段落按原序拼接(与跟打器渲染一致,无分隔符) */
export function buildArticleText(paragraphs: Array<{ en: string }>): string {
  return normTypingText(paragraphs.map((p) => p.en).join(""));
}

/** 单词归一(错字定位所在词;与阅读库 normalizeWord 口径一致的小写字母串) */
export function wordAt(text: string, pos: number): string | undefined {
  if (pos < 0 || pos >= text.length) return undefined;
  const isWordChar = (ch: string) => /[a-zA-Z]/.test(ch);
  if (!isWordChar(text[pos])) return undefined;
  let st = pos;
  let en = pos;
  while (st > 0 && isWordChar(text[st - 1])) st--;
  while (en < text.length - 1 && isWordChar(text[en + 1])) en++;
  return text.slice(st, en + 1).toLowerCase();
}
