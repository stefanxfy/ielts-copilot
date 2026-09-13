/**
 * /api/typing/drills — 错词重练稿生成(P10/T3 闭环)
 *
 * GET:聚合 article 模式成绩里的高频错词(错字所在词,取 TOP 5)→
 *   从阅读库段落里检索含触发词的句子,拼成一份 drill 稿(一次性生成物,不入库)。
 *   检索不到含触发词的句子 → 回落纯词序列稿(触发词逐词成句片段)。
 * 无错词积累 → { triggerWords: [], text: null },前端显示引导提示。
 *
 * drillMetaJson.triggerWords 即由此产出 —— 重练成绩的血缘记录。
 */
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { readingArticles, typingSessions } from "@/db/schema";
import { normTypingText } from "@/lib/typing/text";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TRIGGER_WORDS = 5;
const DRILL_TARGET_CHARS = 520;

export async function GET() {
  const db = getDb();

  // 1. 错词聚合:article 模式所有 errorChars[].word 计数
  const sessions = db
    .select({ errorChars: typingSessions.errorCharsJson })
    .from(typingSessions)
    .where(eq(typingSessions.mode, "article"))
    .all();
  const wordCount = new Map<string, number>();
  for (const s of sessions) {
    for (const e of s.errorChars ?? []) {
      if (e.word && /^[a-z]+$/.test(e.word)) {
        wordCount.set(e.word, (wordCount.get(e.word) ?? 0) + 1);
      }
    }
  }
  const triggers = [...wordCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_TRIGGER_WORDS)
    .map(([word, count]) => ({ word, count }));

  if (triggers.length === 0) {
    return NextResponse.json({ triggerWords: [], text: null });
  }
  const triggerSet = new Set(triggers.map((t) => t.word));

  // 2. 从阅读库检索含触发词的句子(按命中词数降序,凑够目标字符数)
  const articles = db
    .select({ paragraphs: readingArticles.paragraphsJson })
    .from(readingArticles)
    .all();

  interface Cand { text: string; hits: number }
  const sentences: Cand[] = [];
  for (const a of articles) {
    for (const p of a.paragraphs) {
      const normed = normTypingText(p.en);
      for (const raw of normed.split(/(?<=[.!?])\s+/)) {
        const s = raw.trim();
        if (s.length < 40 || s.length > 240) continue;
        let hits = 0;
        for (const w of s.toLowerCase().match(/[a-z]+/g) ?? []) {
          if (triggerSet.has(w)) hits++;
        }
        if (hits > 0) sentences.push({ text: s, hits });
      }
    }
  }
  sentences.sort((x, y) => y.hits - x.hits);

  const picked: string[] = [];
  let total = 0;
  for (const s of sentences) {
    if (total >= DRILL_TARGET_CHARS) break;
    picked.push(s.text);
    total += s.text.length + 1;
  }

  // 3. 回落:检索不到句子 → 纯词序列稿(触发词在简单句式里反复出现)
  let text: string;
  if (picked.length === 0) {
    const words = triggers.map((t) => t.word);
    text = [
      `The most important words are ${words.join(", ")}.`,
      ...words.flatMap((w) => [`People often ask which ${w} matters most.`, `We must understand the ${w} because of the ${w}.`]),
      `Practice makes the ${words.join(" and the ")} easier to type.`,
    ].join(" ");
  } else {
    text = picked.join(" ");
  }

  return NextResponse.json({ triggerWords: triggers, text });
}
