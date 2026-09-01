/**
 * /mock 机考模拟(复刻原型 view-exam)
 * 服务端取数:exam_sets + papers + 各卷完成状态 → 传给客户端交互组件
 * searchParams.mod 支持仪表盘 tile 直达 A/G 对应题库
 */

import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { examRecords, examSets, papers } from "@/db/schema";
import { MockClient, type MockSet } from "./mock-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function MockPage({
  searchParams,
}: {
  searchParams: Promise<{ mod?: string }>;
}) {
  const { mod } = await searchParams;
  const db = getDb();

  const sets = db.select().from(examSets).all();
  const allPapers = db.select().from(papers).all();
  // 各卷考试次数(>0 即"已完成"至少一次)
  const doneRows = db
    .select({ examId: examRecords.examId, n: sql<number>`count(*)` })
    .from(examRecords)
    .groupBy(examRecords.examId)
    .all();
  const doneMap = new Map(doneRows.map((r) => [r.examId, Number(r.n)]));

  const data: MockSet[] = sets.map((s) => ({
    examSetId: s.examSetId,
    title: s.title,
    category: s.category === "G" ? "G" : "A",
    year: Number((s.testPeriod ?? "").slice(0, 4)) || 0,
    papers: allPapers
      .filter((p) => p.examSetId === s.examSetId)
      .map((p) => ({
        examId: p.examId,
        subject: p.subject,
        title: p.title,
        durationMin: Math.round(p.durationSec / 60),
        recordCount: doneMap.get(p.examId) ?? 0,
      })),
  }));

  // 题库统计(原仪表盘「题库 tile」职责并入本页页脚)
  const aCount = allPapers.filter((p) => p.category === "A").length;
  const gCount = allPapers.filter((p) => p.category === "G").length;

  return (
    <>
      <MockClient initialMod={mod === "G" ? "G" : "A"} sets={data} />
      <p className="mt-4 text-center text-[11px] text-[#b6bdc9]">
        本地题库:共 {allPapers.length} 份单科卷(A类 {aCount} · G类 {gCount}),{sets.length} 套完整真题
      </p>
    </>
  );
}
