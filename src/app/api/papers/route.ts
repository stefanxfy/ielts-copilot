/**
 * GET /api/papers — 已发布卷列表(M2 步骤 4)
 * 仅 status=PUBLISHED 的卷;按 category + skill 排序;每卷附 questionCount / writingTaskCount。
 * 注:为简单起见,本步不复用 responses,直接 SQL 计数(已在 plan 范围)。
 */
import { NextResponse } from "next/server";
import { getSqlite } from "@/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const db = getSqlite();
  const papers = db
    .prepare(
      `SELECT
         p.id, p.slug, p.title, p.category, p.skill, p.status,
         (SELECT COUNT(*) FROM questions q
          JOIN sections s ON q.section_id = s.id WHERE s.paper_id = p.id) AS questionCount,
         (SELECT COUNT(*) FROM writing_tasks WHERE paper_id = p.id) AS writingTaskCount
       FROM papers p
       WHERE p.status = 'PUBLISHED'
       ORDER BY p.category ASC, p.skill ASC, p.id ASC`,
    )
    .all();
  return NextResponse.json({ papers });
}