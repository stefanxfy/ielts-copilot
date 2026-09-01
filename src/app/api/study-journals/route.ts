/**
 * /api/study-journals — 备考日记(P7)
 *
 * POST:upsert(journal_date + period 唯一)
 * GET :?date=&period= 单篇;?from=&to= 范围(打卡日历月视图心得标记)
 */
import { NextResponse } from "next/server";
import { and, between, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { studyJournals } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PERIODS = ["daily", "weekly", "monthly"] as const;
type Period = (typeof PERIODS)[number];
const YYYYMMDD = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const journalDate = typeof b.journalDate === "string" ? b.journalDate : "";
  const period = b.period as Period;
  const content = typeof b.content === "string" ? b.content : "";

  if (!YYYYMMDD.test(journalDate)) {
    return NextResponse.json({ error: "journalDate 格式应为 YYYY-MM-DD" }, { status: 400 });
  }
  if (!PERIODS.includes(period)) {
    return NextResponse.json({ error: "period 应为 daily | weekly | monthly" }, { status: 400 });
  }
  if (content.length > 5000) {
    return NextResponse.json({ error: "心得内容过长(≤5000 字符)" }, { status: 400 });
  }

  const db = getDb();
  const now = new Date();
  db.insert(studyJournals)
    .values({ journalDate, period, content, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: [studyJournals.journalDate, studyJournals.period],
      set: { content, updatedAt: now },
      // ai_summary_json 不在 set 里:写心得不覆盖 AI 总结
    })
    .run();

  const row = db
    .select()
    .from(studyJournals)
    .where(and(eq(studyJournals.journalDate, journalDate), eq(studyJournals.period, period)))
    .get();
  return NextResponse.json({ ok: true, journal: row });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  const period = url.searchParams.get("period");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const db = getDb();

  if (date) {
    const conds = [eq(studyJournals.journalDate, date)];
    if (period && (PERIODS as readonly string[]).includes(period)) {
      conds.push(eq(studyJournals.period, period as Period));
    }
    const rows = db
      .select()
      .from(studyJournals)
      .where(and(...conds))
      .all();
    return NextResponse.json({ journals: rows });
  }
  if (from && to && YYYYMMDD.test(from) && YYYYMMDD.test(to)) {
    const rows = db
      .select()
      .from(studyJournals)
      .where(between(studyJournals.journalDate, from, to))
      .all();
    return NextResponse.json({ journals: rows });
  }
  return NextResponse.json({ error: "缺少 date 或 from/to 参数" }, { status: 400 });
}
