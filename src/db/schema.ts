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
}
export type QuestionsJson = Record<string, QuestionProfile>;

/** papers.answers_json — 答案键(键 = 锚点,值 = 官方答案原串,'/' 备选与 '()' 可选原样保留;写作卷整列缺省) */
export type AnswersJson = Record<string, string>;

/** 写作 AI 批改元数据(answer_sheet_json 写作条目的 ai 子对象,批改结果可复现有据可查) */
export interface AiGrading {
  status: "PENDING" | "RUNNING" | "DONE" | "FAILED";
  model?: string;
  tokens?: number;
  latencyMs?: number;
  retryCount?: number;
  error?: string | null;
  gradedAt?: string;
  bands?: { TR: number; CC: number; LR: number; GRA: number };
  overall?: number;
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
