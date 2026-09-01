/**
 * src/lib/study/summary.ts — AI 昨日总结(P7)
 *
 * 数据 = 昨日 activities + 昨日 daily journal(心得);
 * system 段经 getPrompt("prompt_daily_summary") 取可配置文本;
 * 成功回写昨日 daily journal 的 ai_summary_json(已有则跳过,幂等);
 * 失败返回 reason 由前端 toast 展示 + 「重跑」按钮(手动重试不受幂等限制)。
 */
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { studyActivities, studyJournals } from "@/db/schema";
import type { AiSummary } from "@/db/schema";
import { chatComplete } from "@/lib/llm/chat";
import { extractJson } from "@/lib/grading/prompt";
import { fillPrompt, getPrompt } from "@/lib/prompts/defaults";
import { addDays, todayStr } from "@/lib/study/date";

export type { AiSummary };

export interface SummaryResult {
  ok: boolean;
  reason?: string;
  skipped?: boolean;
  summary?: AiSummary;
}

export async function generateYesterdaySummary(force = false): Promise<SummaryResult> {
  const yesterday = addDays(todayStr(), -1);
  const db = getDb();

  const journal = db
    .select()
    .from(studyJournals)
    .where(and(eq(studyJournals.journalDate, yesterday), eq(studyJournals.period, "daily")))
    .get();

  // 幂等:已成功生成过则跳过(手动重跑 force=true 不受限)
  if (journal?.aiSummaryJson && !force) {
    return { ok: true, skipped: true, summary: journal.aiSummaryJson };
  }

  const activity = db
    .select()
    .from(studyActivities)
    .where(eq(studyActivities.activityDate, yesterday))
    .get();

  const submissions = activity
    ? activity.listeningSubmissionCount +
      activity.readingSubmissionCount +
      activity.writingSubmissionCount +
      activity.speakingSubmissionCount +
      activity.examSetCompletionCount
    : 0;
  const words = activity?.memorizedWordCount ?? 0;

  // 昨日完全无数据:不烧 token
  if (submissions === 0 && words === 0 && !journal?.content?.trim()) {
    return { ok: false, reason: "昨日没有任何学习数据与心得,无可总结的内容" };
  }

  const activityBlock = activity
    ? [
        `- 听力交卷:${activity.listeningSubmissionCount} 次`,
        `- 阅读交卷:${activity.readingSubmissionCount} 次`,
        `- 写作交卷:${activity.writingSubmissionCount} 次`,
        `- 完整套卷:${activity.examSetCompletionCount} 套`,
        `- 背词:${words} 个`,
      ].join("\n")
    : "- 昨日无交卷与背词记录";

  const journalBlock = journal?.content?.trim()
    ? journal.content.trim().slice(0, 1000)
    : "(考生昨日未写心得)";

  // 占位符可选内联注入:自定义模板里写了 {activityBlock}/{journalBlock} 就近注入;
  // 没写则保留原文,数据照常在 user 段注入(fillPrompt 对缺失值原样保留)
  const system = fillPrompt(getPrompt("prompt_daily_summary"), {
    activityBlock,
    journalBlock,
  });
  const user = `【昨日】${yesterday}

## 昨日学习数据
${activityBlock}

## 昨日备考心得
${journalBlock}

请按系统指令输出严格 JSON 总结。`;

  const result = await chatComplete(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { jsonMode: true, disableThinking: true, temperature: 0.5, maxTokens: 2048 },
  );
  if (!result.ok) {
    return { ok: false, reason: result.message };
  }

  const parsed = extractJson(result.content) as
    | { summary?: unknown; suggestions?: unknown }
    | null;
  if (
    !parsed ||
    typeof parsed.summary !== "string" ||
    !Array.isArray(parsed.suggestions) ||
    !parsed.suggestions.every((s) => typeof s === "string")
  ) {
    return { ok: false, reason: "模型输出不符合约定 JSON 结构" };
  }

  const summary: AiSummary = {
    summary: parsed.summary,
    suggestions: parsed.suggestions as string[],
    basedOn: {
      submissions,
      words,
      journalExcerpt: Boolean(journal?.content?.trim()),
    },
    model: "daily-summary",
    generatedAt: new Date().toISOString(),
  };

  // 回写到昨日 daily journal(无行则建空行;content 保持原样)
  const now = new Date();
  db.insert(studyJournals)
    .values({
      journalDate: yesterday,
      period: "daily",
      content: journal?.content ?? "",
      aiSummaryJson: summary,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [studyJournals.journalDate, studyJournals.period],
      set: { aiSummaryJson: summary, updatedAt: now },
    })
    .run();

  return { ok: true, summary };
}
