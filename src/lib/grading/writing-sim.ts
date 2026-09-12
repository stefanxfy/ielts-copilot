/**
 * src/lib/grading/writing-sim.ts — 写作仿真单篇 AI 批改(W4)
 *
 * 与 service.ts(整卷模拟考批改)的关系:
 *   复用同一条成熟链路 —— buildGradingMessages(四维官方评分标准)/ extractJson(JSON 容错)
 *   / parseResult(结构校验)/ chatComplete(变体降级)。差异只在落库位置:
 *   整卷批改写 exam_records.answer_sheet_json[T1|T2].ai,仿真单篇写 writing_sessions.ai_json。
 *
 * 三处防重复烧 token,与 service.ts 同口径:
 *   1. 内存锁:同一 sessionId 并发触发只跑一份
 *   2. 缓存:已 DONE 默认跳过(force=true 才重跑)
 *   3. RUNNING 中的不重复进入
 *
 * Task 1 图表说明:图表图(imageUrl)不传给模型(chat.ts 仅文本协议),
 *   批改 prompt 中注明「图不可见」,请模型基于题干文字与考生描述评估数据选取与趋势表述,
 *   不苛求具体数值核对 —— 语言/结构/衔接三维不受影响。
 */
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { writingPrompts, writingSessions, type AiGrading } from "@/db/schema";
import { chatComplete } from "@/lib/llm/chat";
import { readConfig } from "@/lib/config";
import { buildGradingMessages, extractJson } from "./prompt";
import { parseResult } from "./service";

/** 单篇最多重试次数(网络抖动 / 模型返回不可解析 JSON),与 service.ts 对齐 */
const MAX_RETRY = 2;

/** 内存锁:sessionId → 进行中的 promise,防并发重复批改 */
const inFlight = new Map<number, Promise<AiGrading>>();

/** 把批改状态写回 writing_sessions.ai_json(每次流转都落库,供前端轮询看进度) */
function saveStatus(sessionId: number, ai: AiGrading) {
  getDb()
    .update(writingSessions)
    .set({ aiJson: ai })
    .where(eq(writingSessions.id, sessionId))
    .run();
}

async function doGrade(sessionId: number, force: boolean): Promise<AiGrading> {
  const db = getDb();
  const row = db
    .select({
      content: writingSessions.content,
      aiJson: writingSessions.aiJson,
      promptText: writingPrompts.promptText,
      imageUrl: writingPrompts.imageUrl,
      category: writingPrompts.category,
      taskNo: writingPrompts.taskNo,
      minWords: writingPrompts.minWords,
    })
    .from(writingSessions)
    .innerJoin(writingPrompts, eq(writingSessions.promptId, writingPrompts.promptId))
    .where(eq(writingSessions.id, sessionId))
    .get();
  if (!row) {
    return { status: "FAILED", error: "记录不存在", gradedAt: new Date().toISOString() };
  }

  const prev = row.aiJson ?? null;
  // 缓存:已成功且不强制重跑 → 直接复用,不烧 token
  if (!force && prev?.status === "DONE" && prev.bands) return prev;
  // 已在跑:不重复进入
  if (prev?.status === "RUNNING") return prev;

  const retryFrom = force ? 0 : (prev?.retryCount ?? 0);
  let lastError = "";

  // T1 图表图不传模型,prompt 里注明按题干文字评估(见文件头说明)
  const promptForGrading =
    row.taskNo === 1 && row.imageUrl
      ? `${row.promptText}\n\n[批改说明] 本题为图表描述题,图表以图片在考生端单独展示,批改时不可见。请基于题干文字与考生对数据的描述,评估主要特征选取、概述与趋势表述的合理性;除非明显与题干矛盾,不苛求具体数值核对。`
      : row.promptText;

  for (let attempt = retryFrom; attempt <= MAX_RETRY; attempt++) {
    saveStatus(sessionId, {
      status: "RUNNING",
      retryCount: attempt,
      error: attempt > 0 ? lastError : null,
    });

    const res = await chatComplete(
      buildGradingMessages({
        task: row.taskNo === 1 ? "T1" : "T2",
        category: row.category === "G" ? "G" : "A",
        prompt: promptForGrading,
        wordMin: row.minWords,
        essay: row.content,
      }),
      {
        jsonMode: true,
        temperature: 0.2,
        // 与 service.ts 同参:输出含四维中文评语 + 整篇英文改写范文,16k 才不会被截断
        maxTokens: 16384,
        // 批改必须关 thinking:既污染 JSON 解析,又让单次调用涨到 180s+
        disableThinking: true,
        timeoutSec: Math.max(readConfig().config.llm.timeoutSec, 180),
      },
    );

    if (!res.ok) {
      lastError = `${res.message}${res.detail ? ` · ${res.detail}` : ""}`;
      continue;
    }

    const parsed = parseResult(extractJson(res.content));
    if (!parsed) {
      const head = String(res.content ?? "").trim().slice(0, 160);
      lastError = `模型返回的内容不是合法批改结果(缺四维 band): ${head}`;
      continue;
    }

    const done: AiGrading = {
      status: "DONE",
      // 记录实际使用的模型:批改结果要能复现
      model: readConfig().config.llm.gradingModel,
      tokens: res.tokens,
      latencyMs: res.latencyMs,
      retryCount: attempt,
      error: null,
      gradedAt: new Date().toISOString(),
      bands: parsed.bands,
      overall: parsed.overall,
      dimensions: parsed.dimensions,
      strengths: parsed.strengths,
      weaknesses: parsed.weaknesses,
      rewrittenSample: parsed.rewrittenSample,
      wordCount: parsed.wordCount,
      flaggedIssues: parsed.flaggedIssues,
    };
    saveStatus(sessionId, done);
    return done;
  }

  const failed: AiGrading = {
    status: "FAILED",
    retryCount: MAX_RETRY,
    error: lastError || "批改失败(原因未知)",
    gradedAt: new Date().toISOString(),
  };
  saveStatus(sessionId, failed);
  return failed;
}

/** 对外入口:批改一条仿真写作记录(带并发去重) */
export function gradeWritingSession(
  sessionId: number,
  opts: { force?: boolean } = {},
): Promise<AiGrading> {
  const running = inFlight.get(sessionId);
  if (running) return running;

  const p = doGrade(sessionId, opts.force === true).finally(() => {
    inFlight.delete(sessionId);
  });
  inFlight.set(sessionId, p);
  return p;
}

/** 供 API 查询进度:轻量,不触发批改 */
export function getWritingReviewStatus(sessionId: number) {
  const row = getDb()
    .select({ aiJson: writingSessions.aiJson })
    .from(writingSessions)
    .where(eq(writingSessions.id, sessionId))
    .get();
  if (!row) return null;
  const ai = row.aiJson ?? null;
  return {
    sessionId,
    ai,
    /** 是否正在跑(前端据此继续轮询) */
    running: ai?.status === "RUNNING",
  };
}
