/**
 * src/lib/grading/service.ts — 写作 AI 四维批改服务(P5)
 *
 * 流程(PRD §3.6):
 *   交卷触发 → 逐 task 置 RUNNING → 调 LLM 批改 → 解析校验 → 置 DONE/FAILED
 *   → 两 task 都完成后按官方权重算综合 band → 回写 exam_records.band_score
 *   → 重算 exam_sessions.overall_band(P4 结算时写作是 0 分占位,不重算总分就停在旧值)
 *
 * 三处防重复烧 token:
 *   1. 内存锁:同一 record 并发触发(自动批改 + 用户手点重跑)只跑一份
 *   2. 缓存:已 DONE 的 task 默认跳过(force=true 才重跑)
 *   3. RUNNING 中的 task 不重复进入
 *
 * 落库位置:exam_records.answer_sheet_json[T1|T2].ai —— 数据模型设计 §4.4 定好的
 * 契约(含 status/重试次数/token 消耗/原始报错),无需新增表。
 */
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  examRecords,
  papers,
  type AiGrading,
  type AnswerSheetJson,
  type FlaggedIssue,
  type GradingDimension,
  type GradingDimensionName,
  type WritingSheetEntry,
} from "@/db/schema";
import { chatComplete } from "@/lib/llm/chat";
import { readConfig } from "@/lib/config";
import { computeSessionOverall, refreshSessionOverall, roundToHalf } from "@/lib/session";
import { buildGradingMessages, extractJson } from "./prompt";

/** 单个 task 的最多重试次数(网络抖动 / 模型返回不可解析 JSON) */
const MAX_RETRY = 2;
/** 官方权重:Task 2 占 2/3,Task 1 占 1/3(雅思考官手册公开口径) */
const T1_WEIGHT = 1 / 3;
const T2_WEIGHT = 2 / 3;
const DIM_NAMES: readonly GradingDimensionName[] = ["TR", "CC", "LR", "GRA"] as const;

/** 内存锁:recordId → 进行中的 promise,防并发重复批改 */
const inFlight = new Map<number, Promise<GradeOutcome>>();

export interface GradeOutcome {
  ok: boolean;
  recordId: number;
  /** 综合 band(两 task 都成功后才有值) */
  band?: number;
  /** 每个 task 的状态,供 API 直接返回 */
  tasks: Record<string, AiGrading["status"] | undefined>;
  error?: string;
}

/** band 归一化到 0.5 进制;非法值返回 null */
function toBand(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 9) return null;
  return roundToHalf(n);
}

function strArray(v: unknown, max = 8): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x ?? "").trim()).filter(Boolean).slice(0, max);
}

interface ParsedResult {
  overall: number;
  bands: Record<GradingDimensionName, number>;
  dimensions: GradingDimension[];
  strengths: string[];
  weaknesses: string[];
  rewrittenSample: string | null;
  wordCount: number;
  flaggedIssues: FlaggedIssue[];
}

/**
 * 校验并规范化模型输出。
 * 四维 band 缺任一即判失败 —— 宁可重试,也不要落半份结果。
 */
function parseResult(raw: unknown): ParsedResult | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  const dimsRaw = Array.isArray(o.dimensions) ? (o.dimensions as Record<string, unknown>[]) : [];
  const bands = {} as Record<GradingDimensionName, number>;
  const dimensions: GradingDimension[] = [];

  for (const name of DIM_NAMES) {
    const d = dimsRaw.find((x) => String(x?.name ?? "").toUpperCase() === name);
    const band = toBand(d?.band);
    if (band == null) return null; // 任一维度缺失或非法 → 整体失败,触发重试
    bands[name] = band;
    dimensions.push({
      name,
      band,
      comment: String(d?.comment ?? "").trim(),
      evidence: strArray(d?.evidence, 2),
      improvement: String(d?.improvement ?? "").trim(),
    });
  }

  // overall:优先用模型给的,非法则按四维平均自算
  const avg = DIM_NAMES.reduce((a, n) => a + bands[n], 0) / DIM_NAMES.length;
  const overall = toBand(o.overallBand) ?? roundToHalf(avg);

  const wordCount = Number(o.wordCount);
  const allowedTypes = new Set(["grammar", "vocabulary", "cohesion", "task", "other"]);
  const flaggedIssues: FlaggedIssue[] = Array.isArray(o.flaggedIssues)
    ? (o.flaggedIssues as Record<string, unknown>[])
        .slice(0, 12)
        .map((f) => {
          const t = String(f?.type ?? "other");
          return {
            type: (allowedTypes.has(t) ? t : "other") as FlaggedIssue["type"],
            quote: String(f?.quote ?? "").trim(),
            suggestion: String(f?.suggestion ?? "").trim(),
          };
        })
        .filter((f) => f.quote || f.suggestion)
    : [];

  return {
    overall,
    bands,
    dimensions,
    strengths: strArray(o.strengths),
    weaknesses: strArray(o.weaknesses),
    rewrittenSample:
      typeof o.rewrittenSample === "string" && o.rewrittenSample.trim()
        ? o.rewrittenSample.trim()
        : null,
    wordCount: Number.isFinite(wordCount) && wordCount >= 0 ? Math.round(wordCount) : 0,
    flaggedIssues,
  };
}

/** 读取记录的答题卡(JSON 列解出为对象) */
function readSheet(record: { answerSheetJson: AnswerSheetJson }): AnswerSheetJson {
  return record.answerSheetJson ?? {};
}

/** 把某 task 的 ai 状态写回 DB(每次状态流转都落库,供前端轮询看进度) */
function writeTaskState(
  recordId: number,
  sheet: AnswerSheetJson,
  task: "T1" | "T2",
  ai: AiGrading,
) {
  const entry = sheet[task] as WritingSheetEntry | undefined;
  if (!entry) return;
  (sheet[task] as WritingSheetEntry).ai = ai;
  getDb()
    .update(examRecords)
    .set({ answerSheetJson: sheet })
    .where(eq(examRecords.id, recordId))
    .run();
}

/**
 * 批改单个 task(带重试)。返回该 task 最终的 AiGrading。
 */
async function gradeOneTask(
  recordId: number,
  sheet: AnswerSheetJson,
  task: "T1" | "T2",
  input: {
    category: "A" | "G";
    prompt: string;
    wordMin: number;
    essay: string;
  },
  force: boolean,
): Promise<AiGrading> {
  const entry = sheet[task] as WritingSheetEntry | undefined;
  if (!entry) return { status: "FAILED", error: `答题卡缺少 ${task} 条目` };

  const prev = entry.ai;
  // 缓存:已成功且不强制重跑 → 直接复用,不烧 token
  if (!force && prev?.status === "DONE" && prev.bands) return prev;
  // 已在跑:不重复进入
  if (prev?.status === "RUNNING") return prev;

  const retryFrom = force ? 0 : (prev?.retryCount ?? 0);
  let lastError = "";

  for (let attempt = retryFrom; attempt <= MAX_RETRY; attempt++) {
    writeTaskState(recordId, sheet, task, {
      status: "RUNNING",
      retryCount: attempt,
      error: attempt > 0 ? lastError : null,
    });

    const res = await chatComplete(
      buildGradingMessages({
        task,
        category: input.category,
        prompt: input.prompt,
        wordMin: input.wordMin,
        essay: input.essay,
      }),
      {
        jsonMode: true,
        temperature: 0.2,
        // 输出含四维中文评语 + evidence 原文引用 + 整篇英文改写范文,
        // 实测 T2(300 词作文)输出需 4k+ tokens;推理类模型还要算 thinking,
        // 给到 16k 才不会被 max_tokens 截断(截断 → JSON 不完整 → 白白重试)。
        maxTokens: 16384,
        // 关掉推理思考:MiniMax-M3 默认开启时,思考内容既污染 JSON 解析
        // (里面常复述输出结构、带花括号),又让单次调用从 ~60s 涨到 180s+
        // ——T2 长作文实测直接超时。评分标准已内嵌在 prompt 里,不依赖模型自己想。
        // 网关不认该字段时 chat.ts 会自动降级重试,换 GLM 后同样安全。
        disableThinking: true,
        // 批改是后台异步(成绩页轮询),单次等待可比连通测试久。
        // 用户在 config 里配了更长的值时以配置为准。
        timeoutSec: Math.max(readConfig().config.llm.timeoutSec, 180),
      },
    );

    if (!res.ok) {
      lastError = `${res.message}${res.detail ? ` · ${res.detail}` : ""}`;
      continue;
    }

    const parsed = parseResult(extractJson(res.content));
    if (!parsed) {
      // 记下原始输出开头,便于区分「被截断」与「格式不对」
      const head = String(res.content ?? "").trim().slice(0, 160);
      lastError = `模型返回的内容不是合法批改结果(缺四维 band): ${head}`;
      continue;
    }

    const done: AiGrading = {
      status: "DONE",
      // 记录实际使用的模型:批改结果要能复现,模型名是关键元数据(数据模型设计 §4.4)
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
    writeTaskState(recordId, sheet, task, done);
    return done;
  }

  const failed: AiGrading = {
    status: "FAILED",
    retryCount: MAX_RETRY,
    error: lastError || "批改失败(原因未知)",
    gradedAt: new Date().toISOString(),
  };
  writeTaskState(recordId, sheet, task, failed);
  return failed;
}

/**
 * 批改一条写作记录(T1 + T2 两篇)。
 *
 * @param force true = 忽略已有成功结果强制重跑(成绩页「重新批改」用)
 */
async function doGrade(recordId: number, force: boolean): Promise<GradeOutcome> {
  const db = getDb();
  const record = db.select().from(examRecords).where(eq(examRecords.id, recordId)).get();
  if (!record) return { ok: false, recordId, tasks: {}, error: "记录不存在" };
  if (record.subject !== "writing") {
    return { ok: false, recordId, tasks: {}, error: "只有写作卷支持 AI 批改" };
  }
  if (record.status !== "SUBMITTED" && record.status !== "COMPLETED") {
    return { ok: false, recordId, tasks: {}, error: "该场次尚未交卷" };
  }

  const paper = db.select().from(papers).where(eq(papers.examId, record.examId)).get();
  if (!paper) return { ok: false, recordId, tasks: {}, error: "找不到对应试卷" };

  const sheet = readSheet(record);
  const questions = paper.questionsJson;

  const tasks: Record<string, AiGrading["status"] | undefined> = {};
  let combined: number | null = null;

  const results: Partial<Record<"T1" | "T2", AiGrading>> = {};
  for (const task of ["T1", "T2"] as const) {
    const q = questions[task];
    const entry = sheet[task] as WritingSheetEntry | undefined;
    const essay = String(entry?.value ?? "").trim();

    if (!essay) {
      // 空白作文:不烧 token,直接标记(前端据此提示"该任务未作答")
      const empty: AiGrading = {
        status: "FAILED",
        error: "该任务未作答(空白)",
        gradedAt: new Date().toISOString(),
      };
      writeTaskState(recordId, sheet, task, empty);
      results[task] = empty;
      tasks[task] = empty.status;
      continue;
    }

    const r = await gradeOneTask(recordId, sheet, task, {
      category: paper.category === "G" ? "G" : "A",
      prompt: q?.prompt ?? "",
      wordMin: q?.wordMin ?? (task === "T1" ? 150 : 250),
      essay,
    }, force);
    results[task] = r;
    tasks[task] = r.status;
  }

  const t1 = results.T1;
  const t2 = results.T2;
  if (t1?.status === "DONE" && t1.overall != null && t2?.status === "DONE" && t2.overall != null) {
    // 官方权重:T1 占 1/3,T2 占 2/3
    combined = roundToHalf(t1.overall * T1_WEIGHT + t2.overall * T2_WEIGHT);
    db.update(examRecords)
      .set({ bandScore: combined })
      .where(eq(examRecords.id, recordId))
      .run();
    // 关键:场次总分是 P4 按写作 0 分算的,这里必须重算
    if (record.sessionId) refreshSessionOverall(record.sessionId);
  }

  const ok = Boolean(combined);
  return {
    ok,
    recordId,
    band: combined ?? undefined,
    tasks,
    error: ok ? undefined : (t1?.error ?? t2?.error ?? "批改未完成"),
  };
}

/** 对外入口:批改一条写作记录(带并发去重) */
export function gradeWritingRecord(
  recordId: number,
  opts: { force?: boolean } = {},
): Promise<GradeOutcome> {
  const running = inFlight.get(recordId);
  if (running) return running;

  const p = doGrade(recordId, opts.force === true).finally(() => {
    inFlight.delete(recordId);
  });
  inFlight.set(recordId, p);
  return p;
}

/** 供 API 查询进度:返回两 task 的 ai 状态(轻量,不触发批改) */
export function getGradingStatus(recordId: number) {
  const db = getDb();
  const record = db.select().from(examRecords).where(eq(examRecords.id, recordId)).get();
  if (!record) return null;
  const sheet = readSheet(record);
  const t1 = (sheet.T1 as WritingSheetEntry | undefined)?.ai;
  const t2 = (sheet.T2 as WritingSheetEntry | undefined)?.ai;
  return {
    recordId,
    subject: record.subject,
    bandScore: record.bandScore,
    T1: t1 ?? null,
    T2: t2 ?? null,
    sessionId: record.sessionId,
    /** 是否有一项正在跑(前端据此继续轮询) */
    running: t1?.status === "RUNNING" || t2?.status === "RUNNING",
    /** 是否全部成功 */
    done: t1?.status === "DONE" && t2?.status === "DONE",
  };
}

/** 重算并返回场次总分(导出给 API 在需要时用) */
export function recomputeOverall(sessionId: string) {
  return computeSessionOverall(sessionId);
}
