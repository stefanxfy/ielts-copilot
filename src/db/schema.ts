/**
 * src/db/schema.ts — 全量表定义(v3.1 · 5 表,推倒旧 12 表重写;P8 增 · 背单词 3 表)
 *
 * 对齐:docs/数据模型设计.md v3.1 + docs/背单词数据模型设计.md v0.7.1
 * 原则:内容不入库(真题 HTML 留文件系统)/ 锚点即题目(题号三方对齐)/
 *       静态与动态一刀切开(exam_sets+papers=卷的定义,exam_sessions+exam_records=考的历史;
 *       word_books+words+book_word_relation=词书与词条的定义,
 *       word_progress+word_review_log=学习进度与答题流水)
 *
 * 删除语义:删 exam_sets 级联删 papers 与其下 sessions/records(删卷重录是合法操作);
 *       exam_records.exam_id 显式 RESTRICT(有作答记录的单科卷不许删,防误删)。
 *       旧 12 表(papers 旧列/sections/passages/question_groups/questions/choices/
 *       answers/writing_tasks/attempts/responses/grading_results)不保留兼容层。
 *
 * 背单词:删 word_books 级联清 book_word_relation(删词书重导合法);words.id 显式 RESTRICT
 *       (有词书引用的词条不许删,防误删共享内容;book_word_relation 走 cascade 清干净后 words
 *       行残留无害,下次任何书用到自动复用)。
 *       学习层:删 words 级联清 word_progress,删 word_progress 级联清 word_review_log
 *       (进度与流水是纯派生数据,词没了记忆没意义);删除主路径被 words RESTRICT 挡住,
 *       cascade 仅作兜底。
 */
import { sql } from "drizzle-orm";
import {
  sqliteTable,
  int,
  text,
  real,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/* ---------- 枚举 ---------- */

/** 科目(预留 speaking,上线时加值即可) */
export const SUBJECTS = ["reading", "writing", "listening"] as const;
export type Subject = (typeof SUBJECTS)[number];

/** 题型七值(由换皮脚本从源 HTML data-q_type 归一化产出;判分策略由 type 确定性推导) */
export const QUESTION_TYPES = [
  "SINGLE",
  "MULTI",
  "FILL",
  "TFNG",
  "MATCH",
  "BLOCK",
  "WRITING_TASK",
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

/** 完整考试场次状态(COMPLETED = 各科 exam_records 均有 band_score,含写作 AI 批改到位) */
export const SESSION_STATUSES = ["IN_PROGRESS", "COMPLETED", "ABANDONED"] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

/** 单科考试记录状态 */
export const RECORD_STATUSES = [
  "IN_PROGRESS",
  "SUBMITTED",
  "COMPLETED",
  "ABANDONED",
] as const;
export type RecordStatus = (typeof RECORD_STATUSES)[number];

/* ---------- JSON 列内契约(docs/数据模型设计.md §4) ---------- */

/** raw→band 换算表:[[39,9],[37,8.5],...] 降序 */
export type BandTable = Array<[number, number]>;

/** papers.assets_json — 静态资源清单(新增资源类型直接加键,不改表) */
export interface PaperAssets {
  /** 开考入口页(iframe 加载),如 /exams/a-2025jan/reading.html */
  entry: string;
  /** 听力音频,听力卷才有 */
  audio?: string;
  /** 答案速查静态页(成绩页/错题本跳转用),没有则缺省 */
  answersPage?: string;
}

/** papers.questions_json 单条 — 题目档案(键 = 题号 "23" 或任务号 "T1") */
export interface QuestionProfile {
  /** 阅读 Part 1–3 / 听力 Part 1–4;写作卷无 part */
  part: number | null;
  type: QuestionType;
  /** 页面控件名(q-23 / q-18-22),作答·答案·页面三方对齐键;写作卷无 */
  anchor: string | null;
  /** 该题满分:普通题 1,块题 = 块内题数;写作卷无 */
  max: number | null;
  /** 写作卷题干(纯文本,导入时从页面 wot.task.question 剥 HTML 得到);客观卷无 */
  prompt?: string;
  /** 写作卷字数下限(T1=150 / T2=250);客观卷无 */
  wordMin?: number;
  /** 写作卷建议用时(秒,T1=1200 / T2=2400);客观卷无 */
  suggestedSec?: number;
}
export type QuestionsJson = Record<string, QuestionProfile>;

/** papers.answers_json — 答案键(键 = 锚点,值 = 官方答案原串,'/' 备选与 '()' 可选原样保留;写作卷整列缺省) */
export type AnswersJson = Record<string, string>;

/** 四维维度名(PRD §3.6 评分维度) */
export type GradingDimensionName = "TR" | "CC" | "LR" | "GRA";

/** 单维度批改详情(PRD §3.6 dimensions[] 元素) */
export interface GradingDimension {
  name: GradingDimensionName;
  /** 该维度得分(0–9,0.5 进制) */
  band: number;
  /** 该维度评语 */
  comment: string;
  /** 引用考生原文作为评分依据 */
  evidence: string[];
  /** 针对性的改进建议 */
  improvement: string;
}

/** 标注出的具体问题(语法/用词/衔接/任务回应) */
export interface FlaggedIssue {
  type: "grammar" | "vocabulary" | "cohesion" | "task" | "other";
  /** 考生原句 */
  quote: string;
  /** 改法建议 */
  suggestion: string;
}

/**
 * 写作 AI 批改元数据(answer_sheet_json 写作条目的 ai 子对象,批改结果可复现有据可查)
 *
 * 前 8 个字段是任务状态与调用元数据(数据模型设计 §4.4);
 * bands/overall 是四维精简视图(雷达图与总分用);
 * dimensions/strengths/weaknesses/rewrittenSample/wordCount/flaggedIssues 是
 * PRD §3.6 定义的完整批改内容。全部可选 —— 批改未完成或失败时只写状态字段。
 */
export interface AiGrading {
  status: "PENDING" | "RUNNING" | "DONE" | "FAILED";
  model?: string;
  tokens?: number;
  latencyMs?: number;
  retryCount?: number;
  error?: string | null;
  gradedAt?: string;
  /** 四维分数精简视图(雷达图/总分用) */
  bands?: Record<GradingDimensionName, number>;
  /** 综合 band(T1/T2 各自的 overall,由四维按官方口径综合) */
  overall?: number;
  /** 四维完整批改详情(含评语/依据/建议) */
  dimensions?: GradingDimension[];
  strengths?: string[];
  weaknesses?: string[];
  /** 整篇改写范文(保留原意,展示同题高分写法) */
  rewrittenSample?: string | null;
  wordCount?: number;
  flaggedIssues?: FlaggedIssue[];
}

/** answer_sheet_json 客观题条目(未答的题也要有条目:value=null, correct=false) */
export interface ObjectiveSheetEntry {
  number: number;
  part: number;
  type: QuestionType;
  value: string | string[] | null;
  correct: boolean;
  points: number;
}

/** answer_sheet_json 写作题条目(考生全文 + AI 批改全信息) */
export interface WritingSheetEntry {
  task: "T1" | "T2";
  type: "WRITING_TASK";
  value: string | null;
  correct: null;
  points: null;
  ai?: AiGrading;
}

/** exam_records.answer_sheet_json — 答题卡(键 = 锚点名或 T1/T2,与页面锚点、answers_json 对齐) */
export type AnswerSheetJson = Record<string, ObjectiveSheetEntry | WritingSheetEntry>;

/* ---------- exam_sets:套卷定义(1 行 = 一场完整考试的卷组) ---------- */

export const examSets = sqliteTable("exam_sets", {
  /** 套卷英文短标识(如 a-2025jan),导入幂等键 */
  examSetId: text("exam_set_id").primaryKey(),
  title: text("title").notNull(),
  /** 'A'(学术类)/ 'G'(培训类) */
  category: text("category", { enum: ["A", "G"] }).notNull(),
  /** 考期 "2025-01",可排序可筛选 */
  testPeriod: text("test_period").notNull(),
  createdAt: int("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

/* ---------- papers:单科卷的静态定义(1 行 = 1 份单科卷) ---------- */

export const papers = sqliteTable(
  "papers",
  {
    id: int("id").primaryKey({ autoIncrement: true }),
    /** 卷的英文短标识(URL/目录名/幂等导入键,如 a-2025jan-reading-test1) */
    examId: text("exam_id").notNull(),
    examSetId: text("exam_set_id")
      .notNull()
      .references(() => examSets.examSetId, { onDelete: "cascade" }),
    subject: text("subject", { enum: SUBJECTS }).notNull(),
    /** 展示名(如「A类 阅读 · 2025 January Test 1」) */
    title: text("title").notNull(),
    /** 以下两项冗余自 exam_sets:导入一次写入永不更新的只读快照,列表/筛选全场景免 join */
    category: text("category", { enum: ["A", "G"] }).notNull(),
    testPeriod: text("test_period").notNull(),
    /** 限时秒数(阅读/写作 3600,听力按源卷 data-time) */
    durationSec: int("duration_sec").notNull(),
    /** raw→band 换算表;写作卷为空(分来自 AI 四维综合) */
    bandTableJson: text("band_table_json", { mode: "json" })
      .$type<BandTable>()
      .notNull(),
    assetsJson: text("assets_json", { mode: "json" })
      .$type<PaperAssets>()
      .notNull(),
    /** 题目档案(统计维度);写作卷为 T1/T2 两条 */
    questionsJson: text("questions_json", { mode: "json" })
      .$type<QuestionsJson>()
      .notNull(),
    /** 答案键(锚点→官方原串);写作卷无此数据 */
    answersJson: text("answers_json", { mode: "json" }).$type<AnswersJson>(),
    createdAt: int("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: int("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex("uq_papers_exam_id").on(t.examId),
    index("idx_papers_set").on(t.examSetId),
  ],
);

/* ---------- exam_sessions:完整考试场次(1 行 = 一次完整考试) ---------- */

export const examSessions = sqliteTable(
  "exam_sessions",
  {
    /** 开考前生成,如 a-2025jan-20260831-1830(套卷id+日期时间,人眼可读) */
    sessionId: text("session_id").primaryKey(),
    examSetId: text("exam_set_id")
      .notNull()
      .references(() => examSets.examSetId, { onDelete: "cascade" }),
    status: text("status", { enum: SESSION_STATUSES })
      .notNull()
      .default("IN_PROGRESS"),
    startedAt: int("started_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    /** 最后一科出分时间(完成时写入) */
    finishedAt: int("finished_at", { mode: "timestamp" }),
    /** 三科用时合计快照(完成时写入,列表展示免聚合) */
    totalUsedSec: int("total_used_sec"),
    /** 总分快照:各科 band_score 平均四舍五入到 0.5(完成时写入,与 band_score 同一快照防漂移原则) */
    overallBand: real("overall_band"),
    createdAt: int("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index("idx_sessions_set_started").on(t.examSetId, t.startedAt)],
);

/* ---------- exam_records:单科考试记录(1 行 = 1 次单科考试) ---------- */

export const examRecords = sqliteTable(
  "exam_records",
  {
    id: int("id").primaryKey({ autoIncrement: true }),
    /** RESTRICT:有作答记录的单科卷不许删 */
    examId: text("exam_id")
      .notNull()
      .references(() => papers.examId, { onDelete: "restrict" }),
    /** 冗余科目(列表页免 join) */
    subject: text("subject", { enum: SUBJECTS }).notNull(),
    /** 可空 = 单科随缘练习,不入场次;连考三科时 3 行共享同一场次 */
    sessionId: text("session_id").references(() => examSessions.sessionId, {
      onDelete: "cascade",
    }),
    status: text("status", { enum: RECORD_STATUSES })
      .notNull()
      .default("IN_PROGRESS"),
    startedAt: int("started_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    /** 交卷时间(自动交卷同样写入) */
    submittedAt: int("submitted_at", { mode: "timestamp" }),
    usedSec: int("used_sec"),
    /** 答对题数(客观卷 0–40,判分的原始产物;写作卷为空) */
    correctCount: int("correct_count"),
    /** 雅思成绩快照(考试时刻定格;客观卷由 band_table 换算,写作卷由 AI 四维综合) */
    bandScore: real("band_score"),
    /** 答题卡:考生作答 + 批改结果 + AI 元数据(见 §4.4) */
    answerSheetJson: text("answer_sheet_json", { mode: "json" })
      .$type<AnswerSheetJson>()
      .notNull(),
    createdAt: int("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    index("idx_records_exam_started").on(t.examId, t.startedAt),
    index("idx_records_session").on(t.sessionId),
    index("idx_records_status").on(t.status),
  ],
);

/* ---------- app_settings:非敏感界面设置 k/v(敏感 AI 配置只进 config.json,不动) ---------- */

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  valueJson: text("value_json", { mode: "json" })
    .notNull()
    .$type<Record<string, unknown>>(),
  updatedAt: int("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

/* ================================================================
 * P7 备考计划三表(docs/V2-P7-数据模型与实施.md v1.6 §1)
 * ================================================================ */

/* ---------- P7 JSON 契约(与 docs 同名接口一字不差) ---------- */

/** 计划生成来源:确认页徽标用 */
export const PLAN_SOURCES = ["llm", "template"] as const;
export type PlanSource = (typeof PLAN_SOURCES)[number];

export const PLAN_STATUSES = ["ACTIVE", "ARCHIVED"] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

/** 时段四值(phases weeklyTasks[].slot 与 study_preferences.subjectSlots 的值域;
 *  availability.slots 已改为精确范围数组,见 AvailableRange) */
export const TIME_SLOTS = ["morning", "noon", "afternoon", "evening"] as const;
export type TimeSlot = (typeof TIME_SLOTS)[number];

/** 可用时段范围(v2.8):HH:mm 24h 制,start<end;重叠/相邻<30min 合并,最多 6 条;
 *  范围→四段按中点归属(段边界由 wake/bed 推导) */
export interface AvailableRange {
  start: string;
  end: string;
}

/** 周任务类型 —— 与 study_activities 统计列一一对应 */
export const TASK_TYPES = [
  "words",
  "listening",
  "reading",
  "writing",
  "speaking",
  "set",
] as const;
export type TaskType = (typeof TASK_TYPES)[number];

/** study_plans.availability_json —— 这轮备考的节奏(换计划即换;申报每日量也在此) */
export interface PlanAvailability {
  /** 全职/在职 */
  mode: "fulltime" | "working";
  /** 每天可投入小时数(0.5 步进) */
  dailyHours: number;
  /** 可安排时段(v2.8:精确范围数组;空数组 = 任务不填时段渲染灰色) */
  slots: AvailableRange[];
  /** 用户申报的每日背词数(可选;未填由默认模板/LLM 定) */
  dailyWords?: number;
  /** 英语水平自述(可选自由文本;限 200 中文字符以内;原样注入 LLM;默认模板不解析) */
  englishLevel?: string;
}

/** study_plans.target_scores_json —— 四科目标,缺省项读取时用总分−0.5 兜底 */
export interface TargetScores {
  listening?: number;
  reading?: number;
  writing?: number;
  speaking?: number;
}

/** study_plans.phases_json 元素 —— 分阶段方案(LLM 与默认模板同一形状) */
export interface PlanPhase {
  /** 阶段名:基础期/强化期/冲刺期(LLM 可自拟,渲染原样展示) */
  name: string;
  /** 相对周数(从计划创建周起算第 1 周),各阶段连续不重叠覆盖 1..N */
  weeks: number[];
  /** 阶段重点,≤20 字 */
  focus: string;
  /** 周任务模板 */
  weeklyTasks: PlanTask[];
}

/** 周任务模板单行(type 决定 unit 的纯展示量词,查表 TASK_UNIT) */
export interface PlanTask {
  type: TaskType;
  /** 量:words=个/天,其余=套(次)/周 */
  count: number;
  unit: "个/天" | "套/周" | "次/周";
  /** 建议时段;无偏好且无可时段时缺省 */
  slot?: TimeSlot;
}

/** 任务 type → 展示量词(unit 是纯展示字段、由 type 唯一决定,任何写入路径都以本表覆写为准)。
 *  放 schema 而非 plan-gen:客户端组件(向导确认页)也要查表,避免把 Node 侧依赖拉进浏览器 bundle */
export const TASK_UNIT: Record<TaskType, PlanTask["unit"]> = {
  words: "个/天",
  listening: "套/周",
  reading: "套/周",
  writing: "套/周",
  speaking: "次/周",
  set: "套/周",
};

/** app_settings.study_preferences —— 个人习惯(人的属性,跨计划持久) */
export interface StudyPreferences {
  /** 作息 "HH:MM";缺省 07:00 / 23:00 */
  wakeTime?: string;
  bedTime?: string;
  /** 各科偏好时段,键 ∈ TASK_TYPES,值 ∈ TIME_SLOTS;未声明的不出现 */
  subjectSlots?: Partial<Record<TaskType, TimeSlot>>;
}

/** app_settings.punch_rules —— 打卡规则(可配置;默认值兜底,设置页可改) */
export interface PunchRules {
  /** 当日交卷达标线(默认 1) */
  submissionMin: number;
  /** 当日背词达标线(默认 5) */
  wordsMin: number;
  /** 双达标才满卡(默认 true;false = 任一达标即满卡) */
  bothForFull: boolean;
}

/** app_settings.template_rules —— 默认模板规则引擎查表数值(v2.9;
 *  与规划 §4.4 表格一一对应;单字段非法回退默认;整键删除 = 全恢复默认) */
export interface TemplateRules {
  /** 阶段划分比例:long=≥10 周[基础,强化,冲刺]百分比;mid=6–9 周[周数];short=3–5 周[周数] */
  phaseRatios: {
    long: [number, number, number];
    mid: [number, number, number];
    short: [number, number, number];
  };
  /** 基准任务表(每天 2h 基准;words=个/天,listening/reading/writing/set=套/周,speaking=次/周) */
  baseWeekly: Record<
    "basic" | "strengthen" | "sprint",
    Record<TaskType, number>
  >;
  /** 缩放基准小时数(默认 2) */
  scaleBaseHours: number;
  /** words 每日上限(默认 80) */
  wordsCeil: number;
  /** 单科每周上限(默认 7) */
  perSubjectCeil: number;
  /** 整块阈值分钟数(默认 60) */
  blockMinMinutes: number;
  /** 相邻范围合并间隔分钟数(默认 30) */
  mergeGapMinutes: number;
}

/** study_journals.ai_summary_json —— AI 昨日总结 */
export interface AiSummary {
  summary: string;
  suggestions: string[];
  basedOn: { submissions: number; words: number; journalExcerpt: boolean };
  model: string;
  generatedAt: string;
}

/* ---------- study_plans:备考计划(1 行 = 一份作战计划,同一时刻仅一条 ACTIVE) ---------- */

export const studyPlans = sqliteTable(
  "study_plans",
  {
    id: int("id").primaryKey({ autoIncrement: true }),
    /** 考试日期 YYYY-MM-DD(向导日历直选,必晚于创建日) */
    examDate: text("exam_date").notNull(),
    /** 目标总分(0–9,0.5 步进) */
    targetOverallBand: real("target_overall_band").notNull(),
    /** 四科目标(缺省项读取时用总分−0.5 兜底,不存兜底值) */
    targetScoresJson: text("target_scores_json", { mode: "json" })
      .$type<TargetScores>()
      .notNull(),
    /** 备考节奏(全职/在职+小时数+可时段+申报每日背词量 dailyWords+英语自述 englishLevel) */
    availabilityJson: text("availability_json", { mode: "json" })
      .$type<PlanAvailability>()
      .notNull(),
    /** 计划内容本体(确认页过目后落库;调整计划整体重写) */
    phasesJson: text("phases_json", { mode: "json" })
      .$type<PlanPhase[]>()
      .notNull(),
    /** 生成来源:确认页徽标「AI 定制 / 默认模板」 */
    generatedBy: text("generated_by", { enum: PLAN_SOURCES }).notNull(),
    /** ACTIVE/ARCHIVED;单 ACTIVE 由写入方保证(建新计划时归档旧计划) */
    status: text("status", { enum: PLAN_STATUSES }).notNull().default("ACTIVE"),
    /** 周基准点:phase.weeks 相对此时段所属周(调整计划只改未来,基准不动) */
    planStartWeekMonday: text("plan_start_week_monday").notNull(),
    createdAt: int("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: int("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index("idx_plans_status").on(t.status)],
);

/* ---------- study_activities:备考活动(1 行 = 一天的活动汇总,activity_date unique) ---------- */

export const studyActivities = sqliteTable(
  "study_activities",
  {
    id: int("id").primaryKey({ autoIncrement: true }),
    /** 统计日 YYYY-MM-DD(本地时区) */
    activityDate: text("activity_date").notNull(),
    /** 完整套卷(连考)完成数 */
    examSetCompletionCount: int("exam_set_completion_count")
      .notNull()
      .default(0),
    listeningSubmissionCount: int("listening_submission_count")
      .notNull()
      .default(0),
    readingSubmissionCount: int("reading_submission_count").notNull().default(0),
    writingSubmissionCount: int("writing_submission_count").notNull().default(0),
    /** 口语练习次数(P8 前恒 0,列先建好) */
    speakingSubmissionCount: int("speaking_submission_count")
      .notNull()
      .default(0),
    /** 当日背过的词累计(P8 前恒 0) */
    memorizedWordCount: int("memorized_word_count").notNull().default(0),
    createdAt: int("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: int("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [uniqueIndex("uq_activities_date").on(t.activityDate)],
);

/* ---------- study_journals:备考日记(1 行 = 一篇心得,unique(journal_date, period)) ---------- */

export const studyJournals = sqliteTable(
  "study_journals",
  {
    id: int("id").primaryKey({ autoIncrement: true }),
    /** 心得所属日 YYYY-MM-DD */
    journalDate: text("journal_date").notNull(),
    /** daily/weekly/monthly */
    period: text("period", { enum: ["daily", "weekly", "monthly"] }).notNull(),
    /** 自己写的心得,任何时候可写可改 */
    content: text("content").notNull().default(""),
    /** AI 昨日总结(可空;只在昨日有活动时生成,幂等不覆盖) */
    aiSummaryJson: text("ai_summary_json", { mode: "json" })
      .$type<AiSummary>(),
    createdAt: int("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: int("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [uniqueIndex("uq_journals_date_period").on(t.journalDate, t.period)],
);

/* ---------- 背单词:枚举 + JSON 契约 ---------- */

/** words.origin 内容血缘 */
export const WORD_ORIGINS = ["ecdict", "baicizhan", "import", "manual"] as const;
export type WordOrigin = (typeof WORD_ORIGINS)[number];

/** word_books.source 词书来源 */
export const BOOK_SOURCES = ["builtin", "custom"] as const;
export type BookSource = (typeof BOOK_SOURCES)[number];

/**
 * words.contentJson 契约(docs/背单词数据模型设计.md §5)
 *
 * 字段分类:
 *   - 展示型:translation / definition / examples / root / exchange / audio.word
 *   - 元数据型:collins / tags / bncRank / frqRank
 *   - 承载型:examples[].audio
 */
export interface WordExample {
  /** 例句英文原句 */
  en: string;
  /** 例句中文翻译(可空) */
  cn?: string;
  /** 例句音频路径,空表示未生成或生成失败 */
  audio?: string;
}
export interface WordContent {
  /** 中文释义(多行,百词斩 mean_cn 按 "；" 拆) */
  translation: string[];
  /** 英文释义(可空,百词斩 mean_en) */
  definition?: string[];
  /** 例句:默认 1 条(百词斩 join),schema 支持多条无上限 */
  examples: WordExample[];
  /** 词根拆解(可空,ECDICT wordroot.txt) */
  root?: string;
  /** 词形变化/重点短语(可空,百词斩 sentence_phrase / ECDICT exchange) */
  exchange?: string;
  /** 单词发音路径,如 /audio/words/abandon.mp3(可空,edge-tts 异步合成落盘后回写) */
  audio?: { word?: string };
  /** LLM 生成联想配图路径 /images/words/<word>.png(可空,MiniMax 生图管线落盘后回写,§6.1) */
  image?: string;
  /** 柯林斯星级 1-5(可空,ECDICT 补) */
  collins?: number;
  /** 考试标签 ["ielts","toefl"](可空,ECDICT tag 拆分) */
  tags?: string[];
  /** BNC 词频排名:数字越小越常用(可空,ECDICT bnc 补) */
  bncRank?: number;
  /** 当代语料词频排名:数字越小越常用(可空,ECDICT frq 补) */
  frqRank?: number;
}

/* ---------- word_books:词书定义(1 行 = 一本词书) ---------- */

export const wordBooks = sqliteTable(
  "word_books",
  {
    id: int("id").primaryKey({ autoIncrement: true }),
    /** 词书英文短标识,幂等导入键("ielts-core" / "custom-20260902");同 examSetId 模式 */
    bookId: text("book_id").notNull(),
    /** 展示名「雅思核心词汇」 */
    name: text("name").notNull(),
    /** 词书说明(来源/适用人群,可空) */
    description: text("description"),
    /** builtin(管线导入)/ custom(用户导入) */
    source: text("source", { enum: BOOK_SOURCES }).notNull(),
    createdAt: int("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: int("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [uniqueIndex("uq_word_books_book_id").on(t.bookId)],
);

/* ---------- words:词条内容(1 行 = 一个词,全局唯一) ---------- */

export const words = sqliteTable(
  "words",
  {
    id: int("id").primaryKey({ autoIncrement: true }),
    /** 单词本体(小写归一,模糊匹配在应用层做) */
    word: text("word").notNull(),
    /** 英式音标(百词斩 accent 落 Uk,可空) */
    phoneticUk: text("phonetic_uk"),
    /** 美式音标(后续从 ECDICT phonetic_us 补,可空) */
    phoneticUs: text("phonetic_us"),
    /** 富信息合并列(契约见 WordContent) */
    contentJson: text("content_json", { mode: "json" })
      .$type<WordContent>()
      .notNull(),
    /** 内容血缘:ecdict(管线)/ baicizhan(百词斩 join)/ import(用户导入带)/ manual(手动加词) */
    origin: text("origin", { enum: WORD_ORIGINS }).notNull(),
    createdAt: int("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: int("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex("uq_words_word").on(t.word),
    index("idx_words_origin").on(t.origin),
  ],
);

/* ---------- book_word_relation:关系表(1 行 = 某词书的第 N 个词) ---------- */

export const bookWordRelation = sqliteTable(
  "book_word_relation",
  {
    /** FK → word_books.id ON DELETE CASCADE:删词书级联清关联 */
    bookId: int("book_id")
      .notNull()
      .references(() => wordBooks.id, { onDelete: "cascade" }),
    /** FK → words.id ON DELETE RESTRICT:有词书引用的词条不许删(防误删共享内容) */
    wordId: int("word_id")
      .notNull()
      .references(() => words.id, { onDelete: "restrict" }),
    /** 词在本书中的序号(0 起,词序即默认学习序) */
    order: int("order").notNull(),
  },
  (t) => [
    uniqueIndex("uq_bwr_book_word").on(t.bookId, t.wordId),
    uniqueIndex("uq_bwr_book_order").on(t.bookId, t.order),
    index("idx_bwr_word").on(t.wordId),
  ],
);

/* ================================================================
 * P8 学习层(docs/背单词数据模型设计.md v0.7 §8/§9)
 * ================================================================ */

/* ---------- 学习层:枚举 + JSON 契约 ---------- */

/** word_progress.stage 出题阶段(recognize 认词卡 | spell 默写卡三型) */
export const PROGRESS_STAGES = ["recognize", "spell"] as const;
export type ProgressStage = (typeof PROGRESS_STAGES)[number];

/** word_progress.status 在学 | 用户跳过不调度(可恢复) */
export const PROGRESS_STATUSES = ["ACTIVE", "IGNORED"] as const;
export type ProgressStatus = (typeof PROGRESS_STATUSES)[number];

/** FSRS 评分枚举值(ts-fsrs Rating:Again=1 Hard=2 Good=3 Easy=4;UI 只暴露 1~3) */
export type FsrsRating = 1 | 2 | 3 | 4;

/**
 * word_progress.fsrs_state_json — FSRS 记忆状态(ts-fsrs Card 序列化)
 *
 * 只持久化记忆模型四要素 + 计数快照;due/lastReviewAt/reps/lapses 提为表列
 * (due 是到期队列热点查询条件,reps/lapses 是统计面),此处冗余仅作与 Card
 * 对齐的完整快照,回写时以表列为准。state ∈ ts-fsrs State 枚举:
 * 0=New 1=Learning 2=Review 3=Relearning
 */
export interface FsrsState {
  stability: number;
  difficulty: number;
  state: 0 | 1 | 2 | 3;
  /** learning_steps 步数(ts-fsrs Card.learning_steps) */
  step: number;
  /** 初始化参数版本(默认参数代次,便于未来参数升级迁移;ts-fsrs v5.4 = FSRS-6.0) */
  paramVersion?: string;
}

/* ---------- word_progress:学习进度(1 行 = 一个词,单轨一词一行) ---------- */

export const wordProgress = sqliteTable(
  "word_progress",
  {
    id: int("id").primaryKey({ autoIncrement: true }),
    /**
     * FK → words.id ON DELETE CASCADE:进度跟词走,词删记忆跟着走
     * (主删除路径被 book_word_relation RESTRICT 挡住,cascade 仅兜底);
     * UNIQUE(wordId) 单轨:一词一行,不设 dimension 双轨——会默写的词必然认识。
     */
    wordId: int("word_id")
      .notNull()
      .references(() => words.id, { onDelete: "cascade" }),
    /** 出题阶段:recognize(新词默认)| spell(连续 2 次认识后升级,见设计文档 §8.4) */
    stage: text("stage", { enum: PROGRESS_STAGES }).notNull().default("recognize"),
    /** ACTIVE 在学 | IGNORED 用户跳过(可恢复) */
    status: text("status", { enum: PROGRESS_STATUSES }).notNull().default("ACTIVE"),
    /** 下次到期时间 epoch ms——到期队列唯一热点查询条件,故提升为列+索引 */
    due: int("due").notNull(),
    /** FSRS 记忆状态(契约见 FsrsState) */
    fsrsStateJson: text("fsrs_state_json", { mode: "json" })
      .$type<FsrsState>()
      .notNull(),
    /** 累计答题次数 */
    reps: int("reps").notNull().default(0),
    /** 累计答错(跌落)次数 */
    lapses: int("lapses").notNull().default(0),
    /** 最后评分时间 epoch ms */
    lastReviewAt: int("last_review_at"),
    createdAt: int("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: int("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex("uq_word_progress_word").on(t.wordId),
    index("idx_word_progress_status_due").on(t.status, t.due),
  ],
);

/* ---------- word_review_log:答题流水(只增不改不删,1 行 = 一次答题) ---------- */

export const wordReviewLog = sqliteTable(
  "word_review_log",
  {
    id: int("id").primaryKey({ autoIncrement: true }),
    /** FK → word_progress.id ON DELETE CASCADE:流水随进度走 */
    progressId: int("progress_id")
      .notNull()
      .references(() => wordProgress.id, { onDelete: "cascade" }),
    /** FSRS 原生评分 1~4(Again/Hard/Good/Easy),实际只出现 1~3 */
    rating: int("rating").notNull(),
    /**
     * 答题时 stage 快照——历史事实,事后 join 不出来(stage 会变),故落列。
     * 用过提示且答对最多记 Hard 的判定依据也在评分时点落进 rating 本身。
     */
    stage: text("stage", { enum: PROGRESS_STAGES }).notNull(),
    /** 答题时间 epoch ms */
    reviewedAt: int("reviewed_at").notNull(),
  },
  (t) => [
    index("idx_word_review_log_progress").on(t.progressId),
    index("idx_word_review_log_reviewed").on(t.reviewedAt),
  ],
);
