/**
 * POST /api/papers/[slug]/start — 开考(M3-3)
 *
 * 一次性返回开考 payload(决策 C:不含 answers)。
 * payload 含:卷元 + sections + passages + questionGroups + questions(含 groupId 引用)+
 *   choices(全部 + text_html);writingTasks(T1/T2)
 *
 * 写入 attempts 表(IN_PROGRESS) + responses 占位(M3-5 提交时再落 isCorrect/points)。
 * listening 卷额外把 meta.audioUrl 暴露(/exam-assets/<slug>/<mp3>)。
 */
import { NextResponse } from "next/server";
import { getSqlite } from "@/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const db = getSqlite();

  const paper = db
    .prepare(
      `SELECT id, slug, title, category, skill, duration_sec, meta_json
       FROM papers WHERE slug = ? AND status = 'PUBLISHED'`,
    )
    .get(slug) as
    | {
        id: number;
        slug: string;
        title: string;
        category: string;
        skill: string;
        duration_sec: number;
        meta_json: string;
      }
    | undefined;
  if (!paper) {
    return NextResponse.json({ message: "卷不存在或未发布" }, { status: 404 });
  }

  // sections
  const sections = db
    .prepare(
      `SELECT s.id, s.section_no, s.section_type, s.title, s.time_limit_sec,
              (SELECT COUNT(*) FROM questions q WHERE q.section_id = s.id) AS question_count
       FROM sections s WHERE s.paper_id = ? ORDER BY s.section_no`,
    )
    .all(paper.id);

  // passages
  const passages = db
    .prepare(
      `SELECT section_id, order_index, title, subtitle, body_html, image_url
       FROM passages WHERE section_id IN (SELECT id FROM sections WHERE paper_id = ?)
       ORDER BY section_id, order_index`,
    )
    .all(paper.id);

  // question_groups
  const groups = db
    .prepare(
      `SELECT g.id, g.section_id, g.score_mode, g.min_select, g.max_select, g.order_index, g.instruction_html
       FROM question_groups g
       JOIN sections s ON g.section_id = s.id
       WHERE s.paper_id = ?
       ORDER BY g.section_id, g.order_index`,
    )
    .all(paper.id) as Array<{
      id: number; section_id: number; score_mode: string;
      min_select: number | null; max_select: number | null;
      order_index: number; instruction_html: string | null;
    }>;
  const groupMap = new Map<number, (typeof groups)[number]>();
  for (const g of groups) groupMap.set(g.id, g);

  // questions
  const questions = db
    .prepare(
      `SELECT q.id, q.number, q.type, q.section_id, q.group_id, q.stem_html,
              q.instruction_html, q.passage_order
       FROM questions q
       JOIN sections s ON q.section_id = s.id
       WHERE s.paper_id = ?
       ORDER BY q.section_id, q.number`,
    )
    .all(paper.id) as Array<{
      id: number; number: number; type: string; section_id: number;
      group_id: number | null; stem_html: string | null;
      instruction_html: string | null; passage_order: number | null;
    }>;

  // choices(普通挂 question_id;块题挂 group_id)
  type ChoiceRow = { question_id: number | null; group_id: number | null; label: string; text_html: string | null; order_index: number };
  const choicesByQ = new Map<number, Array<{ label: string; text_html: string | null }>>();
  const choicesByG = new Map<number, Array<{ label: string; text_html: string | null }>>();
  const choiceRows = db
    .prepare(
      `SELECT question_id, group_id, label, text_html, order_index
       FROM choices
       WHERE (question_id IN (SELECT q.id FROM questions q JOIN sections s ON q.section_id=s.id WHERE s.paper_id = ?))
          OR (group_id IN (SELECT g.id FROM question_groups g JOIN sections s ON g.section_id=s.id WHERE s.paper_id = ?))
       ORDER BY COALESCE(question_id, group_id), order_index`,
    )
    .all(paper.id, paper.id) as ChoiceRow[];
  for (const c of choiceRows) {
    if (c.question_id !== null) {
      const arr = choicesByQ.get(c.question_id) ?? [];
      arr.push({ label: c.label, text_html: c.text_html });
      choicesByQ.set(c.question_id, arr);
    } else if (c.group_id !== null) {
      const arr = choicesByG.get(c.group_id) ?? [];
      arr.push({ label: c.label, text_html: c.text_html });
      choicesByG.set(c.group_id, arr);
    }
  }

  // 组装 questions + 各自的 choices(groupId 共享 → block 题同组共用 choices)
  const questionsView = (questions as Array<{
    id: number; number: number; type: string; section_id: number;
    group_id: number | null; stem_html: string | null; instruction_html: string | null;
  }>).map((q) => {
    const choices = q.group_id
      ? (choicesByG.get(q.group_id) ?? [])
      : (choicesByQ.get(q.id) ?? []);
    return {
      number: q.number,
      type: q.type,
      sectionId: q.section_id,
      groupId: q.group_id ? `g${q.group_id}` : null,
      stemHtml: q.stem_html,
      instructionHtml: q.instruction_html,
      choices,
    };
  });

  // writing tasks
  const writingTasks = db
    .prepare(
      `SELECT task_id, prompt_html, material_html, word_min, suggested_time_sec
       FROM writing_tasks WHERE paper_id = ? ORDER BY order_index`,
    )
    .all(paper.id);

  // 开考:写 attempts(IN_PROGRESS)+ 给 attemptsId 回来
  const attempt = db
    .prepare(
      `INSERT INTO attempts (paper_id, status, started_at)
       VALUES (?, 'IN_PROGRESS', unixepoch())
       RETURNING id`,
    )
    .get(paper.id) as { id: number };

  // 暴露 audioUrl 让听力页能找到 mp3
  const meta = JSON.parse(paper.meta_json ?? "{}");
  const audioUrl = meta.audioUrl ?? (paper.skill === "LISTENING" ? `/exam-assets/${paper.slug}/listening-${paper.slug.split("-")[0] === "a" ? "a-2025jan" : "gt-vol1"}-test1.mp3` : null);

  return NextResponse.json({
    attemptId: attempt.id,
    paper: {
      id: paper.id,
      slug: paper.slug,
      title: paper.title,
      category: paper.category,
      skill: paper.skill,
      durationSec: paper.duration_sec,
      audioUrl,
    },
    sections,
    passages,
    questions: questionsView,
    writingTasks,
  });
}