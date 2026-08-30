/**
 * src/lib/seed-validate.ts — paper.json zod schema + sanitize-html 工具(M2 步骤 1)
 *
 * 单一权威源:docs/卷源-schema.md(代码与文档 1:1 对应)
 * 写入端(M2 解析器生成 paper.json)与读取端(M2-3 db-import 脚本)用同一份 schema。
 */
import { z } from "zod";
import sanitize, { type IOptions as SanitizeHtmlOptions } from "sanitize-html";

/* ---------- HTML 片段白名单清洗(用户决策:全剥 style/class) ---------- */

/** sanitize-html 配置:文档「卷源-schema.md·题面 HTML 入库前全剥」节 */
const SANITIZE_OPTS: SanitizeHtmlOptions = {
  allowedTags: [
    "p", "span", "div", "br", "strong", "em", "b", "i", "u", "sub", "sup",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
    "ul", "ol", "li", "dl", "dt", "dd",
    "input", "textarea", "select", "option", "optgroup",
    "label", "fieldset", "legend", "form",
    "a", "img",
    "svg", "g", "path", "circle", "rect", "line", "polyline", "polygon",
    "text", "defs", "linearGradient", "stop",
  ],
  allowedAttributes: {
    "*": ["class", "data-num", "data-template", "data-q_type", "title"],
    a: ["href"],
    img: ["src", "alt", "width", "height"],
    input: ["type", "name", "value", "placeholder", "checked", "disabled", "readonly", "required"],
    textarea: ["name", "rows", "cols", "placeholder", "readonly"],
    select: ["name", "disabled", "required"],
    option: ["value", "selected", "disabled"],
    form: ["action"],
    table: ["border", "cellpadding", "cellspacing"],
    th: ["colspan", "rowspan", "scope"],
    td: ["colspan", "rowspan"],
    svg: ["viewBox", "width", "height", "xmlns"],
    path: ["d", "fill", "stroke"],
    circle: ["cx", "cy", "r", "fill", "stroke"],
    rect: ["x", "y", "width", "height", "rx", "ry", "fill", "stroke"],
    line: ["x1", "y1", "x2", "y2", "stroke"],
    text: ["x", "y", "fill", "font-size", "font-weight", "text-anchor"],
    linearGradient: ["id", "x1", "y1", "x2", "y2"],
    stop: ["offset", "stop-color"],
    g: ["transform"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["http", "https", "data"] },
  allowedSchemesAppliedToAttributes: ["href", "src"],
  // on* / javascript: / data: 等默认拒绝,sanitize-html 已实现
  disallowedTagsMode: "discard",
  transformTags: {
    // 用户决策:style / class 全剥 → 这里只剥 inline style 属性,class 由 allowedAttributes
    // 白名单控制(不列即剥);连同表单自提交防住
    form: (tagName: string, attribs: Record<string, string>) => ({
      tagName,
      attribs: { ...attribs, action: "" }, // 原站 action 已被中和为 '#';入库前再清一次
    }),
  },
};

/** 对外暴露:任何题面 HTML 入库前过这一刀 */
export function sanitizeHtml(dirty: string): string {
  return sanitize(dirty ?? "", SANITIZE_OPTS);
}

/* ---------- 类型与枚举 ---------- */

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

export const SCORE_MODES = ["PER_QUESTION", "SET_INTERSECTION"] as const;
export const SECTION_TYPES = ["LISTENING", "READING", "WRITING"] as const;
export const CATEGORIES = ["A", "G"] as const;
export const SKILLS = ["LISTENING", "READING", "WRITING"] as const;
export const PAPER_STATUSES = ["DRAFT", "PUBLISHED"] as const;
export const WRITING_TASK_IDS = ["T1", "T2"] as const;

/* ---------- zod schema ---------- */

// HTML 字段统一走 sanitizeHtml(后置 transform);空串视为 null(给 nullable 用)
const htmlField = z
  .string()
  .max(200_000, "HTML 片段超过 200KB 上限(疑似存了大文件)")
  .transform((v) => sanitizeHtml(v));

const optionalHtml = z
  .string()
  .max(200_000)
  .transform((v) => sanitizeHtml(v))
  .nullable()
  .or(z.literal("").transform(() => null));

const optionalString = z
  .string()
  .max(2000)
  .nullable()
  .or(z.literal("").transform(() => null));

const paperSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9][a-z0-9\-_]*$/, "slug 仅允许小写字母/数字/-/_"),
  title: z.string().min(1).max(300),
  category: z.enum(CATEGORIES),
  skill: z.string().min(1), // 允许多值逗号列表,严格枚举留 M2-3 入库时校验
  source: optionalString,
  durationSec: z.number().int().min(1).max(60 * 60 * 4),
  status: z.enum(PAPER_STATUSES).default("PUBLISHED"),
  meta: z
    .record(z.string(), z.unknown())
    .nullable()
    .or(z.literal("").transform(() => null))
    .default({}),
  bandTable: z
    .array(z.tuple([z.number().int().min(0), z.number().min(0).max(9)]))
    .min(1),
});

const sectionSchema = z.object({
  sectionNo: z.number().int().min(1).max(10),
  sectionType: z.enum(SECTION_TYPES),
  title: optionalString,
  timeLimitSec: z.number().int().min(1).max(60 * 60 * 4).optional(),
});

const passageSchema = z.object({
  sectionNo: z.number().int().min(1),
  orderIndex: z.number().int().min(1),
  title: optionalString,
  subtitle: optionalString,
  bodyHtml: optionalHtml,
  imageUrl: optionalString,
});

const questionGroupSchema = z.object({
  id: z.string().min(1).max(80),
  sectionNo: z.number().int().min(1),
  orderIndex: z.number().int().min(1),
  scoreMode: z.enum(SCORE_MODES).default("PER_QUESTION"),
  minSelect: z.number().int().min(1).max(10).nullable().optional(),
  maxSelect: z.number().int().min(1).max(10).nullable().optional(),
  instructionHtml: optionalHtml,
});

const questionSchema = z.object({
  number: z.number().int().min(1).max(200),
  type: z.enum(QUESTION_TYPES),
  sectionNo: z.number().int().min(1),
  stemHtml: optionalHtml,
  instructionHtml: optionalHtml,
  questionGroupId: z.string().min(1).nullable().optional(),
  taskId: z.enum(WRITING_TASK_IDS).nullable().optional(),
  wordLimit: z
    .object({
      min: z.number().int().min(0).optional(),
      max: z.number().int().min(0).optional(),
    })
    .nullable()
    .optional(),
});

const choiceSchema = z
  .object({
    label: z.string().min(1).max(40),
    textHtml: optionalHtml,
    orderIndex: z.number().int().min(1),
    questionId: z.string().min(1).nullable().optional(),
    questionGroupId: z.string().min(1).nullable().optional(),
  })
  .refine(
    (c) => Boolean(c.questionId) !== Boolean(c.questionGroupId),
    "choice 必须 questionId / questionGroupId 二选一",
  );

const answerSchema = z.object({
  questionNumber: z.number().int().min(1),
  value: z.string().min(1).max(500),
  alternatives: z.array(z.string().min(1).max(500)).max(20).optional(),
  questionGroupId: z.string().min(1).nullable().optional(),
  explanationHtml: optionalHtml,
});

const writingTaskSchema = z.object({
  taskId: z.enum(WRITING_TASK_IDS),
  promptHtml: htmlField,
  materialHtml: optionalHtml,
  wordMin: z.number().int().min(1).max(10_000),
  suggestedTimeSec: z.number().int().min(60).max(60 * 60 * 4),
  orderIndex: z.number().int().min(1),
});

export const paperSeedSchema = z.object({
  paper: paperSchema,
  sections: z.array(sectionSchema).min(1).max(10),
  passages: z.array(passageSchema),
  questionGroups: z.array(questionGroupSchema),
  questions: z.array(questionSchema).min(1),
  choices: z.array(choiceSchema),
  answers: z.array(answerSchema),
  writingTasks: z.array(writingTaskSchema).optional(),
});

export type PaperSeed = z.infer<typeof paperSeedSchema>;
export type Paper = z.infer<typeof paperSchema>;
export type Section = z.infer<typeof sectionSchema>;
export type Passage = z.infer<typeof passageSchema>;
export type QuestionGroup = z.infer<typeof questionGroupSchema>;
export type Question = z.infer<typeof questionSchema>;
export type Choice = z.infer<typeof choiceSchema>;
export type Answer = z.infer<typeof answerSchema>;
export type WritingTask = z.infer<typeof writingTaskSchema>;