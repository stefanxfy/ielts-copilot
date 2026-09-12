/**
 * /api/typing/stats — 打字累计汇总(P10 复盘面板「累计」视角 + 文章下拉排序状态数据源)
 *
 * GET:全部 sessions 聚合 —— 场数/平均 WPM/平均准确率/累计错误数/最高连击/错键频次;
 *   另附 perArticle(每篇:次数/最佳 WPM/最近时间)与 inProgress(有中途进度的文章),
 *   供 /typing 文章下拉「练过排前 + 状态标注」。错键热力零新表(先简后繁)。
 */
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { typingProgress, typingSessions } from "@/db/schema";

export interface PerArticleStatus {
  count: number;
  best: number;
  last: number;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const db = getDb();
  const rows = db
    .select({
      articleId: typingSessions.articleId,
      wpm: typingSessions.wpm,
      accuracy: typingSessions.accuracy,
      maxCombo: typingSessions.maxCombo,
      startedAt: typingSessions.startedAt,
      errorChars: typingSessions.errorCharsJson,
      typos: typingSessions.typosJson,
    })
    .from(typingSessions)
    .all();

  const n = rows.length;
  const perArticle: Record<string, PerArticleStatus> = {};
  for (const r of rows) {
    if (!r.articleId) continue;
    const p = (perArticle[r.articleId] ??= { count: 0, best: 0, last: 0 });
    p.count++;
    p.best = Math.max(p.best, Math.round(r.wpm));
    p.last = Math.max(p.last, r.startedAt.getTime());
  }
  const inProgress = db
    .select({ articleId: typingProgress.articleId })
    .from(typingProgress)
    .all()
    .map((r) => r.articleId);

  if (n === 0) {
    return NextResponse.json({
      n: 0, avgWpm: 0, avgAcc: 0, totalErr: 0, maxCombo: 0, keyFreq: {}, perArticle, inProgress,
    });
  }

  const wpmSum = rows.reduce((s, r) => s + r.wpm, 0);
  const accSum = rows.reduce((s, r) => s + r.accuracy, 0);
  const maxCombo = rows.reduce((m, r) => Math.max(m, r.maxCombo), 0);
  const keyFreq: Record<string, number> = {};
  let totalErr = 0;
  for (const r of rows) {
    totalErr += (r.errorChars ?? []).length;
    // 热力/TOP 错字口径 =「曾经打错」(含已改对);旧数据无 typosJson 回落最终错字
    const src = r.typos ?? Object.fromEntries((r.errorChars ?? []).map((e) => [e.expected.toLowerCase(), 1]));
    for (const [ch, n] of Object.entries(src)) {
      keyFreq[ch] = (keyFreq[ch] ?? 0) + n;
    }
  }

  return NextResponse.json({
    n,
    avgWpm: Math.round(wpmSum / n),
    avgAcc: Math.round((accSum / n) * 10_000) / 10_000,
    totalErr,
    maxCombo,
    keyFreq,
    perArticle,
    inProgress,
  });
}
