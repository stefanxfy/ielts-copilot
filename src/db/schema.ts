/**
 * src/db/schema.ts — 全量表定义(M1 步骤 2)
 *
 * 对齐:docs/M1-实施计划.md「数据库 Schema · 表清单」+ docs/IELTS-机考网站PRD.md §3.3.3/§6
 * 四个关键决策(见 plan):
 *   A. 富文本一律 HTML 片段列(stemHtml/bodyHtml/promptHtml),渲染端 dangerouslySetInnerHTML
 *   B. question_groups 题组表:多题共享选项集 + 部分计分(scoreMode)
 *   C. answers 独立表:开考 payload 只查 questions+choices,答案整表不下发
 *   D. answers.value 存官方原串('/' 备选与 '()' 可选段的展开在 M3 scoring.ts)
 *
 * 删除语义:卷树(papers→sections→passages/groups→questions→choices/answers)与
 * attempts→responses/grading_results 用 CASCADE(删卷重录/删考试记录是合法操作);
 * attempts.paperId 按计划显式 RESTRICT(有作答记录的卷不许删,防误删)。
 */
import { sql } from "drizzle-orm";
import {
  sqliteTable,
  int,
  text,
  real,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/sqlite-core";

/* ---------- 枚举(PRD §3.3.3 九值 + 状态机常量) ---------- */

/** V1 题型九值(PRD §3.3.3;听力复用同枚举) */
export const QUESTION_TYPES = [
  "SINGLE_CHOICE",
  "MULTI_CHOICE",
  "FILL_BLANK",
  "TRUE_FALSE_NG",
  "MATCH_HEADINGS",
  "MATCH_INFO",
  "MATCH_FEATURES",
  "MATCH_ENDINGS",
  "SHORT_ANSWER",
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

/** 题组计分模式:逐题 | 集合交集(块题按命中计分) */
export const SCORE_MODES = ["PER_QUESTION", "SET_INTERSECTION"] as const;
export type ScoreMode = (typeof SCORE_MODES)[number];

/** M1 只建列不写状态机(M3 实现) */
export const ATTEMPT_STATUSES = [
  "IN_PROGRESS",
  "SUBMITTED",
  "COMPLETED",
  "GRADING",
  "ABANDONED",
] as const;
export type AttemptStatus = (typeof ATTEMPT_STATUSES)[number];

export const GRADING_STATUSES = ["PENDING", "RUNNING", "DONE", "FAILED"] as const;
export type GradingStatus = (typeof GRADING_STATUSES)[number];

/* ---------- papers:试卷(M2 以 slug 幂等入库) ---------- */

export const papers = sqliteTable(
  "papers",
  {
    id: int("id").primaryKey({ autoIncrement: true }),
    /** 幂等入库键(如 gt-vol1-reading-test1) */
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    /** 'A' | 'G' */
    category: text("category", { enum: ["A", "G"] }).notNull(),
    /** 逗号列表,如 'READING,WRITING'(M2 入库写入) */
    skill: text("skill").notNull(),
    source: text("source"),
    status: text("status", { enum: ["DRAFT", "PUBLISHED"] })
      .notNull()
      .default("DRAFT"),
    metaJson: text("meta_json", { mode: "json" }).$type<Record<string, unknown>>(),
    createdAt: int("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: int("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex("uq_papers_slug").on(t.slug),
    index("idx_papers_status_skill").on(t.status, t.skill),
  ],
);

/* ---------- sections:卷内大节(阅读/写作) ---------- */

export const sections = sqliteTable(
  "sections",
  {
    id: int("id").primaryKey({ autoIncrement: true }),
    paperId: int("paper_id")
      .notNull()
      .references(() => papers.id, { onDelete: "cascade" }),
    sectionNo: int("section_no").notNull(),
    sectionType: text("section_type", { enum: ["READING", "WRITING"] }).notNull(),
    title: text("title"),
    /** 阅读 3600;写作同值(一个 Section 含 T1/T2 两个 WritingTask,PRD §6 定稿) */
    timeLimitSec: int("time_limit_sec").notNull().default(3600),
    orderIndex: int("order_index").notNull(),
  },
  (t) => [uniqueIndex("uq_sections_paper_no").on(t.paperId, t.sectionNo)],
);

/* ---------- passages:篇章(正文 HTML / 整篇图片型) ---------- */

export const passages = sqliteTable(
  "passages",
  {
    id: int("id").primaryKey({ autoIncrement: true }),
    sectionId: int("section_id")
      .notNull()
      .references(() => sections.id, { onDelete: "cascade" }),
    orderIndex: int("order_index").notNull(),
    title: text("title"),
    subtitle: text("subtitle"),
    bodyHtml: text("body_html"),
    /** 整篇图片型篇章(如 GT 卷 S1),引用 /exam-assets/<slug>/ 路径 */
    imageUrl: text("image_url"),
  },
  (t) => [index("idx_passages_section_order").on(t.sectionId, t.orderIndex)],
);

/* ---------- question_groups:题组(共享选项集 + 部分计分) ---------- */

export const questionGroups = sqliteTable(
  "question_groups",
  {
    id: int("id").primaryKey({ autoIncrement: true }),
    sectionId: int("section_id")
      .notNull()
      .references(() => sections.id, { onDelete: "cascade" }),
    instructionHtml: text("instruction_html"),
    /** 渲染提示(如 'heading-list' / 'letter-grid') */
    layoutHint: text("layout_hint"),
    scoreMode: text("score_mode", { enum: SCORE_MODES })
      .notNull()
      .default("PER_QUESTION"),
    minSelect: int("min_select"),
    maxSelect: int("max_select"),
    orderIndex: int("order_index").notNull(),
  },
  (t) => [index("idx_groups_section_order").on(t.sectionId, t.orderIndex)],
);

/* ---------- questions:题目(1-40 全卷连续题号) ---------- */

export const questions = sqliteTable(
  "questions",
  {
    id: int("id").primaryKey({ autoIncrement: true }),
    /** 冗余列,供 uq(paperId, number) 全卷题号唯一 */
    paperId: int("paper_id")
      .notNull()
      .references(() => papers.id, { onDelete: "cascade" }),
    sectionId: int("section_id")
      .notNull()
      .references(() => sections.id, { onDelete: "cascade" }),
    groupId: int("group_id").references(() => questionGroups.id, {
      onDelete: "set null",
    }),
    number: int("number").notNull(),
    type: text("type", { enum: QUESTION_TYPES }).notNull(),
    stemHtml: text("stem_html"),
    instructionHtml: text("instruction_html"),
    /** 词限(如 {"min":150}),填空/简答可能用 */
    wordLimitJson: text("word_limit_json", { mode: "json" }).$type<
      Record<string, unknown>
    >(),
    /** 关联 passage 的序(同 section 多篇章) */
    passageOrder: int("passage_order"),
    /** PRD §6 预留:写作题挂载 T1/T2(写作作答实际走 writingTaskId 外键) */
    taskId: text("task_id", { enum: ["T1", "T2"] }),
    metaJson: text("meta_json", { mode: "json" }).$type<Record<string, unknown>>(),
  },
  (t) => [
    uniqueIndex("uq_questions_paper_number").on(t.paperId, t.number),
    index("idx_questions_section").on(t.sectionId),
    index("idx_questions_group").on(t.groupId),
    index("idx_questions_type").on(t.type),
  ],
);

/* ---------- choices:选项(题级 XOR 组级共享) ---------- */

export const choices = sqliteTable(
  "choices",
  {
    id: int("id").primaryKey({ autoIncrement: true }),
    questionId: int("question_id").references(() => questions.id, {
      onDelete: "cascade",
    }),
    groupId: int("group_id").references(() => questionGroups.id, {
      onDelete: "cascade",
    }),
    /** 选项标号(A/B/C/D、i/ii/iii、TRUE/FALSE/NOT GIVEN) */
    label: text("label").notNull(),
    textHtml: text("text_html"),
    orderIndex: int("order_index").notNull(),
  },
  (t) => [
    check(
      "choices_owner_xor",
      sql`((${t.questionId} IS NOT NULL AND ${t.groupId} IS NULL) OR (${t.questionId} IS NULL AND ${t.groupId} IS NOT NULL))`,
    ),
    index("idx_choices_question").on(t.questionId),
    index("idx_choices_group").on(t.groupId),
  ],
);

/* ---------- answers:标准答案(永不出现在开考 payload) ---------- */

export const answers = sqliteTable(
  "answers",
  {
    id: int("id").primaryKey({ autoIncrement: true }),
    questionId: int("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    /** 官方原串:'B' / 'A,C' / 'an agent/a registered agent' / '(heavy) import duties' / 'TRUE'
        ('/' 备选与 '()' 可选段的展开 = M3 src/lib/scoring.ts,决策 D) */
    value: text("value").notNull(),
    /** M2 入库可选的附加备选(主备选已内联在 value 的 '/' 语法里,此列留扩展) */
    alternativesJson: text("alternatives_json", { mode: "json" }).$type<
      Record<string, unknown>
    >(),
    explanationHtml: text("explanation_html"),
  },
  (t) => [uniqueIndex("uq_answers_question").on(t.questionId)],
);

/* ---------- writing_tasks:写作任务(T1/T2) ---------- */

export const writingTasks = sqliteTable(
  "writing_tasks",
  {
    id: int("id").primaryKey({ autoIncrement: true }),
    paperId: int("paper_id")
      .notNull()
      .references(() => papers.id, { onDelete: "cascade" }),
    taskId: text("task_id", { enum: ["T1", "T2"] }).notNull(),
    promptHtml: text("prompt_html").notNull(),
    /** GT Task1 书信情景 / A 类 Task1 图表材料图引用 */
    materialHtml: text("material_html"),
    wordMin: int("word_min").notNull(),
    suggestedTimeSec: int("suggested_time_sec").notNull(),
    orderIndex: int("order_index").notNull(),
  },
  (t) => [uniqueIndex("uq_writing_tasks_paper_task").on(t.paperId, t.taskId)],
);

/* ---------- attempts:一次考试(M1 只建列,状态机 M3) ---------- */

export const attempts = sqliteTable(
  "attempts",
  {
    id: int("id").primaryKey({ autoIncrement: true }),
    /** RESTRICT:有作答记录的卷不许删(plan 表清单显式要求) */
    paperId: int("paper_id")
      .notNull()
      .references(() => papers.id, { onDelete: "restrict" }),
    status: text("status", { enum: ATTEMPT_STATUSES })
      .notNull()
      .default("IN_PROGRESS"),
    startedAt: int("started_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    submittedAt: int("submitted_at", { mode: "timestamp" }),
    completedAt: int("completed_at", { mode: "timestamp" }),
    usedSec: int("used_sec"),
    rawScore: int("raw_score"),
    /** band 含 .5 档,用 real */
    bandScore: real("band_score"),
    correctCount: int("correct_count"),
    wrongCount: int("wrong_count"),
    blankCount: int("blank_count"),
    /** 列先留,结构 M3 定(plan 明确) */
    highlightsJson: text("highlights_json", { mode: "json" }).$type<
      Record<string, unknown>
    >(),
  },
  (t) => [
    index("idx_attempts_paper_started").on(t.paperId, t.startedAt),
    index("idx_attempts_status").on(t.status),
  ],
);

/* ---------- responses:逐题作答(暂存幂等 + 判分回填) ---------- */

export const responses = sqliteTable(
  "responses",
  {
    id: int("id").primaryKey({ autoIncrement: true }),
    attemptId: int("attempt_id")
      .notNull()
      .references(() => attempts.id, { onDelete: "cascade" }),
    questionId: int("question_id").references(() => questions.id, {
      onDelete: "cascade",
    }),
    writingTaskId: int("writing_task_id").references(() => writingTasks.id, {
      onDelete: "cascade",
    }),
    /** 统一 JSON 单列:单选 "B" / 多选 ["A","C"] / 填空 "biggest" / 写作全文(plan valueJson 形态表) */
    valueJson: text("value_json", { mode: "json" })
      .notNull()
      .$type<string | string[]>(),
    /** Review 标记 */
    isMarked: int("is_marked", { mode: "boolean" }).notNull().default(false),
    /** 判分回填(交卷后写入;写作题为空,走 grading_results) */
    isCorrect: int("is_correct", { mode: "boolean" }),
    points: real("points"),
    updatedAt: int("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    check(
      "responses_target_xor",
      sql`((${t.questionId} IS NOT NULL AND ${t.writingTaskId} IS NULL) OR (${t.questionId} IS NULL AND ${t.writingTaskId} IS NOT NULL))`,
    ),
    uniqueIndex("uq_responses_attempt_question").on(t.attemptId, t.questionId),
    uniqueIndex("uq_responses_attempt_task").on(t.attemptId, t.writingTaskId),
  ],
);

/* ---------- grading_results:写作 AI 批改(M4 实现,M1 建列) ---------- */

export const gradingResults = sqliteTable(
  "grading_results",
  {
    id: int("id").primaryKey({ autoIncrement: true }),
    attemptId: int("attempt_id")
      .notNull()
      .references(() => attempts.id, { onDelete: "cascade" }),
    writingTaskId: int("writing_task_id")
      .notNull()
      .references(() => writingTasks.id, { onDelete: "cascade" }),
    status: text("status", { enum: GRADING_STATUSES })
      .notNull()
      .default("PENDING"),
    /** 结构化批改结果(TR·CC·LR·GRA 四维,结构 M4 定) */
    resultJson: text("result_json", { mode: "json" }).$type<Record<string, unknown>>(),
    /** LLM 原始响应留档 */
    rawJson: text("raw_json", { mode: "json" }).$type<Record<string, unknown>>(),
    /** 模型快照(provider/model,复现用) */
    model: text("model"),
    error: text("error"),
    latencyMs: int("latency_ms"),
    tokens: int("tokens"),
    retryCount: int("retry_count").notNull().default(0),
  },
  (t) => [
    uniqueIndex("uq_grading_attempt_task").on(t.attemptId, t.writingTaskId),
  ],
);

/* ---------- app_settings:非敏感界面设置 k/v(敏感 AI 配置只进 config.json) ---------- */

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  valueJson: text("value_json", { mode: "json" })
    .notNull()
    .$type<Record<string, unknown>>(),
  updatedAt: int("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});
