/**
 * /api/study-activities — 备考活动只读(P7)
 *
 * GET ?from=&to= 日期范围(打卡日历 / 学习情况统计)。
 * POST 不开放:唯一写入口是埋点函数(src/lib/study/activities.ts)。
 */
import { NextResponse } from "next/server";
import { and, between } from "drizzle-orm";
import { getDb } from "@/db";
import { studyActivities } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const YYYYMMDD = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  if (!YYYYMMDD.test(from) || !YYYYMMDD.test(to)) {
    return NextResponse.json({ error: "from/to 格式应为 YYYY-MM-DD" }, { status: 400 });
  }
  const rows = getDb()
    .select()
    .from(studyActivities)
    .where(and(between(studyActivities.activityDate, from, to)))
    .all();
  return NextResponse.json({ activities: rows });
}
