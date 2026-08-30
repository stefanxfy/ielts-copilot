/**
 * GET /api/papers/[slug] — 单卷详情(M2 步骤 4)
 * 返回:卷元 + sections(每节题目数)+ bandTable。不下发 answers(决策 C,M3 严格守住)。
 */
import { NextResponse } from "next/server";
import { getSqlite } from "@/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const db = getSqlite();
  const paper = db
    .prepare(
      `SELECT id, slug, title, category, skill, source, status,
              duration_sec, band_table
       FROM papers WHERE slug = ? AND status = 'PUBLISHED'`,
    )
    .get(slug);
  if (!paper) {
    return NextResponse.json({ message: "卷不存在或未发布" }, { status: 404 });
  }

  const sections = db
    .prepare(
      `SELECT s.section_no, s.section_type, s.title,
              COUNT(q.id) AS questionCount
       FROM sections s
       LEFT JOIN questions q ON q.section_id = s.id
       WHERE s.paper_id = ?
       GROUP BY s.id
       ORDER BY s.section_no`,
    )
    .all((paper as { id: number }).id);

  const writingTaskCount = (db
    .prepare("SELECT COUNT(*) AS n FROM writing_tasks WHERE paper_id = ?")
    .get((paper as { id: number }).id) as { n: number }).n;

  return NextResponse.json({
    paper: {
      ...paper,
      writingTaskCount,
      sections,
    },
  });
}