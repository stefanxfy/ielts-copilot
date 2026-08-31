/**
 * POST /api/papers/[slug]/submit — 交卷判分(M4-6)
 *
 *  Body: { attemptId, responses: {qNum: string|string[]}, writingTexts: {taskId: string} }
 *  行为:
 *    - 写 attempts.status = SUBMITTED, finished_at = now
 *    - 听/阅题:逐题比对 answers.value(支持 alternatives_json / 分隔),正确写 is_correct=1/0 + points 1/0
 *    - 写作题:写 responses(writing_task_id),is_correct=null,M4 不评
 *    - 计算 rawScore + band(papers.band_table 是 [[min, band], ...])
 *  返回: { bandScore, correctCount, totalCount, writingPending }
 */
import { NextResponse } from "next/server";
import { getSqlite } from "@/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SubmitBody {
  attemptId: number;
  responses: Record<number, string | string[]>;
  writingTexts: Record<string, string>;
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

function normalize(v: string): string {
  return v.trim();
}

function matchAnswer(userValue: string, correctValue: string, alternativesJson: string | null): boolean {
  const u = normalize(userValue);
  if (!u) return false;
  // 主答案
  const main = normalize(correctValue);
  if (main.toLowerCase() === u.toLowerCase()) return true;
  // alternatives_json 数组
  if (alternativesJson) {
    try {
      const alts = JSON.parse(alternativesJson);
      if (Array.isArray(alts)) {
        for (const a of alts) {
          if (typeof a === "string" && normalize(a).toLowerCase() === u.toLowerCase()) return true;
        }
      }
    } catch {
      // 旧数据用 / 拼
      if (correctValue.includes("/")) {
        for (const part of correctValue.split("/")) {
          if (normalize(part).toLowerCase() === u.toLowerCase()) return true;
        }
      }
    }
  }
  return false;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const body = (await req.json()) as SubmitBody;
  if (!body?.attemptId) {
    return NextResponse.json({ message: "attemptId 必填" }, { status: 400 });
  }
  const db = getSqlite();

  const paper = db
    .prepare(`SELECT id, band_table, skill FROM papers WHERE slug = ?`)
    .get(slug) as { id: number; band_table: string | null; skill: string } | undefined;
  if (!paper) {
    return NextResponse.json({ message: "卷不存在" }, { status: 404 });
  }

  // 更新 attempts 状态(M4 不算 used_sec / raw_score,留 M5 评分时算)
  db.prepare(
    `UPDATE attempts SET status = 'SUBMITTED', submitted_at = unixepoch() WHERE id = ? AND paper_id = ?`,
  ).run(body.attemptId, paper.id);

  // 听/阅判分
  let correctCount = 0;
  let totalCount = 0;
  let writingPending = false;

  const qMap = db
    .prepare(`SELECT q.id, q.number, a.value, a.alternatives_json
              FROM questions q
              LEFT JOIN answers a ON a.question_id = q.id
              WHERE q.section_id IN (SELECT id FROM sections WHERE paper_id = ?)`)
    .all(paper.id) as Array<{ id: number; number: number; value: string | null; alternatives_json: string | null }>;
  const qByNumber = new Map(qMap.map((q) => [q.number, q]));

  const insertResp = db.prepare(
    `INSERT INTO responses (attempt_id, question_id, value_json, is_correct, points)
     VALUES (?, ?, ?, ?, ?)`,
  );
  const tx = db.transaction(() => {
    for (const [qNumStr, userVal] of Object.entries(body.responses ?? {})) {
      const qNum = Number(qNumStr);
      const q = qByNumber.get(qNum);
      if (!q) continue;
      totalCount++;
      const valueJson = JSON.stringify(userVal);
      let isCorrect: number | null = 0;
      let points = 0;
      if (q.value === null) continue; // 该题没标准答案(理论上不应入库)
      if (Array.isArray(userVal)) {
        // 多选:全部命中且无多余
        const arr = userVal.map(normalize);
        const correct = normalize(q.value);
        // 单答案 + alternatives 也按 multi 处理(把 alternatives 拼起来)
        const allCorrect = [correct];
        if (q.alternatives_json) {
          try {
            const alts = JSON.parse(q.alternatives_json);
            if (Array.isArray(alts)) allCorrect.push(...alts.filter((a: unknown) => typeof a === "string") as string[]);
          } catch {}
        }
        const matched = arr.every((u) => allCorrect.some((c) => normalize(c).toLowerCase() === u.toLowerCase()));
        // 数组模式比较简化为顺序无关集合比对
        const setMatch = arr.length === allCorrect.length && arraysEqual(arr.map((x) => x.toLowerCase()), allCorrect.map((x) => x.toLowerCase()));
        if (matched && setMatch) {
          isCorrect = 1; points = 1; correctCount++;
        }
      } else {
        if (matchAnswer(String(userVal), q.value, q.alternatives_json)) {
          isCorrect = 1; points = 1; correctCount++;
        }
      }
      insertResp.run(body.attemptId, q.id, valueJson, isCorrect, points);
    }
  });
  tx();

  // 写作题落库(M4 不评)
  if (body.writingTexts && Object.keys(body.writingTexts).length > 0) {
    const taskRows = db
      .prepare(`SELECT id, task_id FROM writing_tasks WHERE paper_id = ?`)
      .all(paper.id) as Array<{ id: number; task_id: string }>;
    const taskByTaskId = new Map(taskRows.map((t) => [t.task_id, t]));
    const insertWriting = db.prepare(
      `INSERT INTO responses (attempt_id, writing_task_id, value_json, is_correct, points)
       VALUES (?, ?, ?, NULL, NULL)`,
    );
    for (const [taskId, text] of Object.entries(body.writingTexts)) {
      const t = taskByTaskId.get(taskId);
      if (!t) continue;
      insertWriting.run(body.attemptId, t.id, JSON.stringify(text));
    }
    writingPending = true;
  }

  // band 换算
  let bandScore = 0;
  try {
    const table = paper.band_table ? (JSON.parse(paper.band_table) as Array<[number, number]>) : [];
    // 找最低原始分门槛 ≤ correctCount 的最大 band
    let best = 0;
    for (const [min, band] of table) {
      if (correctCount >= min && band > best) best = band;
    }
    bandScore = best;
  } catch {
    bandScore = 0;
  }

  return NextResponse.json({
    bandScore,
    correctCount,
    totalCount,
    writingPending,
  });
}