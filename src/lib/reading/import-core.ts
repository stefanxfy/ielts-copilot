/**
 * src/lib/reading/import-core.ts — 阅读文章导入核心(供 /api/reading/import 使用)
 *
 * 与 scripts/reading-import-paper.mjs 同源的解析/翻译逻辑的 TS 移植:
 *   - 容器切分:平衡 div 取第 n 个 field--name-field-passage 容器
 *   - 标题:subtitle 区块直取(2026-09-11 修复) + h2.subtitle 变体
 *   - 段落:剥标签/剔字母标记 strong/实体解码/纯符号段剔除
 *   - 翻译:走 src/lib/llm/chatComplete(MiniMax-M3, thinking disabled),
 *     每批 4 段 + max_tokens 16384(防 JSON 截断),3 次重试,失败段 zh=null
 */
import { chatComplete } from "@/lib/llm/chat";

/** 平衡 div 切出全部 field--name-field-passage 容器的 [start,end) */
export function splitPassageContainers(html: string): Array<{ start: number; end: number }> {
  const out: Array<{ start: number; end: number }> = [];
  let pos = 0;
  while (true) {
    const i = html.indexOf("field--name-field-passage ", pos);
    if (i < 0) break;
    const dopen = html.lastIndexOf("<div", i);
    let depth = 0;
    let j = dopen;
    while (true) {
      const m = /<div\b|<\/div>/.exec(html.slice(j));
      if (!m) {
        j = html.length;
        break;
      }
      j += m.index + m[0].length;
      depth += m[0] === "<div" ? 1 : -1;
      if (depth === 0) break;
    }
    out.push({ start: dopen, end: j });
    pos = j;
  }
  return out;
}

/** passage 之前最近的标题:subtitle 区块(直取) → h2.subtitle 变体 → null */
export function extractSubtitle(html: string, beforePos: number): string | null {
  const i = html.lastIndexOf("field--name-field-subtitle-section", beforePos);
  if (i >= 0) {
    const seg = html.slice(i, i + 400);
    const m = /field--item">([^<]*)</.exec(seg);
    const t = m?.[1]?.trim();
    if (t) return t;
  }
  const h2re = /<h2 class="subtitle"[^>]*>([\s\S]{0,200}?)<\/h2>/g;
  let m: RegExpExecArray | null;
  let best: string | null = null;
  while ((m = h2re.exec(html)) !== null) {
    if (m.index > beforePos) break;
    const t = m[1]
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (t) best = t;
  }
  return best;
}

/** 段落纯文本化:剔空/字母标记 strong → 剥标签 → 实体解码 → 空白规整 */
export function cleanPara(fragment: string): string {
  let x = fragment
    .replace(/<strong[^>]*>\s*([A-Z]?|\d+)?\s*[.、]?\s*<\/strong>/gi, "")
    .replace(/<[^>]+>/g, " ");
  x = x
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(+n))
    .replace(/&rsquo;/gi, "’")
    .replace(/&lsquo;/gi, "‘")
    .replace(/&rdquo;/gi, "”")
    .replace(/&ldquo;/gi, "“")
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–")
    .replace(/&hellip;/gi, "…");
  return x.replace(/\s+/g, " ").trim();
}

export interface ParsedPassage {
  title: string;
  paras: string[];
  wordCount: number;
}

/** 解析真题 HTML 的第 passageNo(1 起)篇 passage;无该容器返回 null */
export function parsePaperPassage(html: string, passageNo: number, fallbackTitle: string): ParsedPassage | null {
  const containers = splitPassageContainers(html);
  if (passageNo < 1 || passageNo > containers.length) return null;
  const { start, end } = containers[passageNo - 1];
  const c = html.slice(start, end);
  const paras = [...c.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)]
    .map((m) => cleanPara(m[1]))
    .filter((x) => x && /[A-Za-z0-9]/.test(x));
  if (paras.length < 3) return null;
  return {
    title: extractSubtitle(html, start) ?? fallbackTitle,
    paras,
    wordCount: paras.reduce((s, x) => s + x.split(/\s+/).filter(Boolean).length, 0),
  };
}

/** 粘贴文本 → 段落数组(按空行分段,剔除纯符号段) */
export function parsePastedText(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((x) => x.replace(/\s+/g, " ").trim())
    .filter((x) => x && /[A-Za-z0-9]/.test(x));
}

const TRANSLATE_SYSTEM =
  "你只输出一个 JSON 对象——不要 markdown 围栏、不要解释文字。中文一律简体。";

function translatePrompt(enList: string[]): string {
  return (
    "你是专业学术翻译。把下面 JSON 数组里的每个英文段落译成简体中文,返回一个 JSON 对象," +
    `形如 {"translations":["译文1","译文2",...]}。要求:\n` +
    "1. translations 数组长度、顺序与输入段落数组严格一致,不得合并/拆分段落;\n" +
    "2. 译文面向中文读者自然通读:按中文语序重组句子,长句按意群断成短句,避免翻译腔" +
    "(如连串「的」字长定语、生硬的被动句);不添油加醋、不省略任何信息;\n" +
    "3. 术语、数字、专有名词与原文一致;专有名词首次出现可保留英文括注,如「安提基特拉机械(Antikythera Mechanism)」;\n" +
    "4. 不要输出任何解释或 markdown 围栏。\n\n" +
    JSON.stringify(enList)
  );
}

async function translateBatch(
  enList: string[],
  tries = 3,
): Promise<string[] | null> {
  for (let t = 1; t <= tries; t++) {
    const r = await chatComplete(
      [
        { role: "system", content: TRANSLATE_SYSTEM },
        { role: "user", content: translatePrompt(enList) },
      ],
      { maxTokens: 16384, temperature: 0.3, disableThinking: true },
    );
    if (!r.ok) continue;
    const text = r.content
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .replace(/<think>[\s\S]*?<\/think>/g, "")
      .trim();
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end <= start) continue;
    try {
      const parsed = JSON.parse(text.slice(start, end + 1)) as { translations?: unknown };
      const arr = parsed?.translations;
      if (
        Array.isArray(arr) &&
        arr.length === enList.length &&
        arr.every((x) => typeof x === "string" && x.trim())
      ) {
        return arr as string[];
      }
    } catch {
      // JSON 解析失败 → 重试
    }
  }
  return null;
}

/**
 * 逐段翻译。返回与输入等长的 (zh|null)[];批次失败则该批全 null(留给 fill 流程补)。
 */
export async function translateParagraphs(enList: string[]): Promise<Array<string | null>> {
  const out: Array<string | null> = new Array(enList.length).fill(null);
  const CHUNK = 4;
  for (let s = 0; s < enList.length; s += CHUNK) {
    const idxs = enList.slice(s, s + CHUNK).map((_, k) => s + k);
    const batch = await translateBatch(idxs.map((i) => enList[i]));
    if (batch) {
      batch.forEach((zh, k) => {
        out[idxs[k]] = zh;
      });
    }
  }
  return out;
}

/** 话题标签自由生成,不限词表;单章 1-4 个汉字为宜(如「环境」「心理学」「古代文明」) */
export async function suggestTags(title: string, sampleText: string, tries = 3): Promise<string[]> {
  for (let t = 1; t <= tries; t++) {
    const r = await chatComplete(
      [
        { role: "system", content: TRANSLATE_SYSTEM },
        {
          role: "user",
          content:
            "根据下面的英文文章标题与正文开头,给文章打 2-3 个中文话题标签,用于学习库检索。" +
            "标签词表完全开放,按文章实际主题自由拟定(如「环境」「心理学」「古代文明」「商业」「科技史」)," +
            "每个标签 1-6 个汉字,通俗具体、互不重复。返回 JSON 对象,形如 {\"tags\":[\"标签1\",\"标签2\"]}。" +
            "不要输出任何解释或 markdown 围栏。\n\n" +
            `标题:${title}\n\n正文开头:${sampleText.slice(0, 800)}`,
        },
      ],
      { maxTokens: 1024, temperature: 0.3, disableThinking: true },
    );
    if (!r.ok) continue;
    const text = r.content
      .trim()
      .replace(/<think>[\s\S]*?<\/think>/g, "")
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "");
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end <= start) continue;
    try {
      const parsed = JSON.parse(text.slice(start, end + 1)) as { tags?: unknown };
      const arr = parsed?.tags;
      if (Array.isArray(arr)) {
        const tags = [
          ...new Set(
            arr
              .filter((x): x is string => typeof x === "string")
              .map((x) => x.replace(/\s+/g, "").slice(0, 12))
              .filter(Boolean),
          ),
        ].slice(0, 3);
        if (tags.length) return tags;
      }
    } catch {
      // 重试
    }
  }
  return [];
}
