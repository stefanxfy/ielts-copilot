/**
 * src/lib/scoring.ts — 服务端判分与答题卡生成(P2)
 *
 * 与 public/exams/shared/exam-assets/scoring.js(浏览器端 inline 批改)同一套语义:
 *   - 字母答案(/^[A-D](,[A-D])?$/) → setEq 集合比对(排序后严格相等,双选全对才得分)
 *   - 文本答案 → textEq(小写化 + 按 '/' 拆备选 + 剥 '()' 可选段)
 *   - 块题(BLOCK) → 按命中计分:|用户选集 ∩ 正确集|,每命中 1 分,上限 max
 * 客户端只上报考生的原始作答值,判分/复核/答题卡组装以服务端为准
 * (docs/数据模型设计.md §5「交卷」)。
 */
import type {
  AnswersJson,
  AnswerSheetJson,
  BandTable,
  ObjectiveSheetEntry,
  QuestionsJson,
} from "@/db/schema";

function norm(s: unknown): string {
  return String(s ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** 字母集合比对:排序后严格相等(双选/多选全对才得分) */
export function setEq(user: string, correct: string): boolean {
  return (
    norm(user)
      .replace(/\s/g, "")
      .split(",")
      .filter(Boolean)
      .sort()
      .join(",") ===
    norm(correct)
      .replace(/\s/g, "")
      .split(",")
      .filter(Boolean)
      .sort()
      .join(",")
  );
}

/** 文本比对:'x/y' 任一匹配即可;'(括号)' 内容可选(两种剥法都接受,对齐 scoring.js) */
export function textEq(user: string, correct: string): boolean {
  const u = norm(user);
  if (!u) return false;
  const base = norm(correct);
  const cands = [base];
  for (const p of base.split("/")) if (p.trim()) cands.push(p);
  const all = [...cands];
  for (const c of cands) {
    all.push(c.replace(/\([^)]*\)/g, ""), c.replace(/[()]/g, ""));
  }
  return all.some((c) => c.replace(/\s+/g, " ").trim() !== "" && c.replace(/\s+/g, " ").trim() === u);
}

const LETTER_ANS = /^[A-D](\s*,\s*[A-D])?$/;

/** raw → band:bandTable [[最低原始分, band]...] 从高到低,取第一个满足档 */
export function rawToBand(raw: number, table: BandTable): number {
  for (const [min, band] of table) {
    if (raw >= min) return band;
  }
  return raw > 0 ? 1 : 0;
}

/**
 * 服务端判分 + 答题卡组装。
 * @param values 考生作答(键 = 题号,值 = 原始作答串;块题 collect 时块内每题同值)
 * @returns answer_sheet + correct_count(答对得分点合计)
 */
export function judgePaper(
  questions: QuestionsJson,
  answers: AnswersJson,
  values: Record<string, string>,
): { sheet: AnswerSheetJson; correctCount: number } {
  const sheet: AnswerSheetJson = {};
  let correctCount = 0;

  for (const [num, q] of Object.entries(questions)) {
    if (q.type === "WRITING_TASK" || !q.anchor) continue; // 写作题不在客观判分范围
    const raw = values[String(num)]?.trim() || null;
    const correctAns = answers[q.anchor] ?? "";
    let correct: boolean;
    let points: number;

    if (!raw) {
      correct = false;
      points = 0;
    } else if (q.type === "BLOCK") {
      const key = correctAns.replace(/\s/g, "").split(",").filter(Boolean);
      const picked = raw.replace(/\s/g, "").split(",").filter(Boolean);
      points = Math.min(key.filter((k) => picked.includes(k)).length, q.max ?? key.length);
      correct = points === q.max;
    } else if (LETTER_ANS.test(correctAns)) {
      correct = setEq(raw, correctAns);
      points = correct ? (q.max ?? 1) : 0;
    } else {
      correct = textEq(raw, correctAns);
      points = correct ? (q.max ?? 1) : 0;
    }

    correctCount += points;
    sheet[q.anchor] = {
      number: Number(num),
      part: q.part as number,
      type: q.type,
      value: raw,
      correct,
      points,
    } satisfies ObjectiveSheetEntry;
  }

  return { sheet, correctCount };
}
