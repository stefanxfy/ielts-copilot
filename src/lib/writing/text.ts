/**
 * src/lib/writing/text.ts — 写作仿真统计口径(服务端唯一权威,客户端同款仅作实时预览)
 *
 * 词数口径:连续字母串(内联撇号)计 1 词 —— "don't" 1 词、"well-being" 2 词。
 * 与机考界面 Words Count 的宽松口径一致;连字符/数字不计,争论空间最小。
 */

/** 词数统计(服务端重算交卷成绩用,不信任客户端) */
export function countWords(s: string): number {
  const m = s.match(/[A-Za-z']+/g);
  return m ? m.length : 0;
}

/** 段落数(非空行) */
export function countParagraphs(s: string): number {
  return s.split(/\n+/).filter((x) => x.trim()).length;
}

/** Task 2 超写警示线(琥珀提示「考场上这是时间风险」) */
export const TASK2_MAX_WORDS = 350;
