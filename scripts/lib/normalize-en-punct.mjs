/**
 * normalize-en-punct — 英文文本域标点归一化(共享模块)
 *
 * 背景:上游词库(百词斩/新东方 JSONL)及 LLM 生成内容用弯引号 U+2018–U+201D,
 * 而 Noto Sans SC 将这四个字符按中文标点风格渲染(全角、字形靠左、右侧留白),
 * 导致 I'm 显示成 I' m。英文域统一归一化为 ASCII 排版字符;中文域(cn/translation/morphSeed)不动。
 *
 * 归一化映射(仅处理 EN_KEYS 键名下的英文文本):
 *   U+2018 U+2019 → '     弯单引号(缩写/所有格)
 *   U+201C U+201D → "     弯双引号
 *   U+00A0        → 空格   不换行空格
 *   U+00AD        → 删除   软连字符(不可见)
 *   U+02DA        → °     上环符误用(12˚ east → 12° east)
 *   U+FF01 → !  U+FF08 → (  U+FF09 → )
 *   U+FF0C → ,  U+FF1A → :  U+FF1B → ;  U+FF1F → ?   全角标点防引入
 *
 * 保留不动(渲染正常/语义正确):
 *   U+2013 en-dash、U+2014 em-dash、U+2026 省略号(Noto 下宽度正常)
 *   U+00A3 £、U+00E7 ç、U+00E9 é 等合法西文字符
 *
 * 2026-09-07 v2:EN_KEYS 增加 coll;walkEnPunct 支持 EN_KEYS 键下的字符串数组
 * (修复 definition 为数组时元素漏归一化的盲区,存量 80 处)。
 */

/** 键名为这些的字符串/字符串数组视为英文文本域 */
export const EN_KEYS = new Set(["en", "phrase", "definition", "coll"]);

export const EN_PUNCT_MAP = {
  "\u2018": "'",
  "\u2019": "'",
  "\u201C": '"',
  "\u201D": '"',
  "\u00A0": " ",
  "\u00AD": "",
  "\u02DA": "\u00B0",
  "\uFF01": "!",
  "\uFF08": "(",
  "\uFF09": ")",
  "\uFF0C": ",",
  "\uFF1A": ":",
  "\uFF1B": ";",
  "\uFF1F": "?",
};

/** 字符串级归一化;无变化返回 null(避免无谓写库) */
export function normEnPunct(s) {
  let out = "";
  let changed = false;
  for (const ch of s) {
    const m = EN_PUNCT_MAP[ch];
    if (m !== undefined) {
      out += m;
      changed = true;
    } else {
      out += ch;
    }
  }
  return changed ? out : null;
}

/**
 * 就地递归归一化任意 contentJson 片段:
 * - 键名 ∈ EN_KEYS 的字符串值 → 归一化
 * - 键名 ∈ EN_KEYS 的数组 → 字符串元素归一化;对象元素继续递归
 * - 其余对象/数组 → 继续递归
 * 返回是否有变更。
 */
export function walkEnPunct(node) {
  let changed = false;
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      const el = node[i];
      if (typeof el === "string") {
        const n = normEnPunct(el);
        if (n !== null) {
          node[i] = n;
          changed = true;
        }
      } else if (el && typeof el === "object") {
        if (walkEnPunct(el)) changed = true;
      }
    }
    return changed;
  }
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      if (!EN_KEYS.has(k)) {
        if (v && typeof v === "object") {
          if (walkEnPunct(v)) changed = true;
        }
        continue;
      }
      // 键 ∈ EN_KEYS:字符串直接归一化;数组逐元素处理
      if (typeof v === "string") {
        const n = normEnPunct(v);
        if (n !== null) {
          node[k] = n;
          changed = true;
        }
      } else if (Array.isArray(v)) {
        for (let i = 0; i < v.length; i++) {
          const el = v[i];
          if (typeof el === "string") {
            const n = normEnPunct(el);
            if (n !== null) {
              v[i] = n;
              changed = true;
            }
          } else if (el && typeof el === "object") {
            if (walkEnPunct(el)) changed = true;
          }
        }
      } else if (v && typeof v === "object") {
        if (walkEnPunct(v)) changed = true;
      }
    }
  }
  return changed;
}
