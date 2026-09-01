/**
 * src/db/schema.ts — 全量表定义(v3.1 · 5 表,推倒旧 12 表重写)
 *
 * 对齐:docs/数据模型设计.md v3.1(唯一事实源,字段语义/JSON 契约都在那)
 * 原则:内容不入库(真题 HTML 留文件系统)/ 锚点即题目(题号三方对齐)/
 *       静态与动态一刀切开(exam_sets+papers=卷的定义,exam_sessions+exam_records=考的历史)
 *
 * 删除语义:删 exam_sets 级联删 papers 与其下 sessions/records(删卷重录是合法操作);
 *       exam_records.exam_id 显式 RESTRICT(有作答记录的单科卷不许删,防误删)。
 *       旧 12 表(papers 旧列/sections/passages/question_groups/questions/choices/
 *       answers/writing_tasks/attempts/responses/grading_results)不保留兼容层。
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
  weeklyTasks: {
    type: TaskType;
    /** 量:words=个/天,其余=套(次)/周 */
    count: number;
    unit: "个/天" | "套/周" | "次/周";
    /** 建议时段;无偏好且无可时段时缺省 */
    slot?: TimeSlot;
  }[];
}

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
