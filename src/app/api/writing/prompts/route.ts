/**
 * /api/writing/prompts — 写作题库(P11,docs/写作仿真数据模型与交互设计.md v1.1 §4)
 *
 * GET:一期固定 category=A 且 taskNo=2(2026-09-12 用户拍板:G 类先不做、A 类 Task 1 列 P2;
 *     G 类与 A-T1 数据已入库,加参数即可启用,零迁移)。
 *   返回 current(随机抽题,未练过的优先) + list(全量,未练在前、练过按最近降序,
 *   含已练次数/上次词数 —— 对齐打字练习下拉的排序经验)。
 */
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { writingPrompts, writingSessions } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const taskNo = Number(req.nextUrl.searchParams.get("taskNo") ?? 2);
  const db = getDb();

  const rows = db
    .select({
      promptId: writingPrompts.promptId,
      taskNo: writingPrompts.taskNo,
      category: writingPrompts.category,
      promptText: writingPrompts.promptText,
      minWords: writingPrompts.minWords,
      timeSuggest: writingPrompts.timeSuggest,
      imageUrl: writingPrompts.imageUrl,
      sourceRefJson: writingPrompts.sourceRefJson,
    })
    .from(writingPrompts)
    .where(eq(writingPrompts.category, "A"))
    .all()
    .filter((r) => r.taskNo === taskNo);

  // 练习统计在 JS 侧聚合(会话量小;关联子查询在 drizzle sql 模板里易丢关联,不玩花活)
  const statMap = new Map<string, { practiced: number; lastWords: number | null; lastAt: number | null }>();
  const sess = db
    .select({
      promptId: writingSessions.promptId,
      wordCount: writingSessions.wordCount,
      finishedAt: writingSessions.finishedAt,
    })
    .from(writingSessions)
    .orderBy(desc(writingSessions.finishedAt))
    .all();
  for (const s of sess) {
    const st = statMap.get(s.promptId) ?? { practiced: 0, lastWords: null, lastAt: null };
    st.practiced += 1;
    if (st.lastWords === null) {
      st.lastWords = s.wordCount;
      st.lastAt = s.finishedAt ? new Date(s.finishedAt).getTime() : null;
    }
    statMap.set(s.promptId, st);
  }

  const list = rows.map((r) => ({
    ...r,
    practiced: statMap.get(r.promptId)?.practiced ?? 0,
    lastWords: statMap.get(r.promptId)?.lastWords ?? null,
    lastAt: statMap.get(r.promptId)?.lastAt ?? null,
  }));

  // 排序:练过在前(按最近练习时间降序),未练在后(保持导入序)——2026-09-12 用户定:练过的排前面
  list.sort((a, b) => {
    if (!a.practiced !== !b.practiced) return a.practiced ? -1 : 1;
    if (a.practiced && b.practiced) return (b.lastAt ?? 0) - (a.lastAt ?? 0);
    return 0;
  });

  // 随机抽题:未练过的优先,全练过则全量随机
  const fresh = list.filter((r) => !r.practiced);
  const pool = fresh.length > 0 ? fresh : list;
  const current = pool[Math.floor(Math.random() * pool.length)] ?? null;

  return NextResponse.json({ current, list });
}
