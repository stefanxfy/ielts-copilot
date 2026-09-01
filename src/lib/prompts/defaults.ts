/**
 * src/lib/prompts/defaults.ts — LLM 提示词与默认模板规则的默认值集中地(v2.7/v2.9)
 *
 * 职责:
 *   1. 三条 system 提示词的默认文本 + getPrompt(key) 唯一取文入口
 *      (读 app_settings.prompt_* → 缺失/非法回退默认;调用点不允许绕过直读常量)
 *   2. DEFAULT_TEMPLATE_RULES(默认模板规则引擎查表数值,与规划 §4.4 表格一一对应)
 *      + getTemplateRules():逐字段合并 app_settings.template_rules,非法字段回退默认
 *      ——buildTemplatePhases 一律经此取规则。
 *
 * 与 v2.7 设计一致:只开放 system 段(user 段代码组装,防止改坏数据注入/JSON 契约);
 * 保存即生效(调用现读);「恢复默认」= 删键。
 */
import type {
  AiSummary,
  PlanAvailability,
  PlanPhase,
  StudyPreferences,
  TaskType,
  TemplateRules,
} from "@/db/schema";
import { TASK_TYPES } from "@/db/schema";
import { getSetting } from "@/lib/study/settings";

/* ======================================================================
 * ① 三条 system 提示词默认值
 * ====================================================================== */

export type PromptKey = "prompt_writing_grading" | "prompt_plan_generate" | "prompt_daily_summary";

/** 写作批改 system(自 grading/prompt.ts 迁入;三个占位符运行时替换) */
const DEFAULT_GRADING_SYSTEM = `你是一位经验丰富的雅思考官(Examiner),拥有十年以上评分经验,严格依据雅思官方公开的写作评分标准(IELTS Writing Band Descriptors, public version)批改考生作文。

评分原则:
1. 四个维度独立打分(TR / CC / LR / GRA),每个维度给出 0.5 进制的 band 分
2. 严格对齐下述官方描述,不要凭印象给分,也不要集体趋中
3. 评语必须基于考生文本中的具体证据,不要写空泛套话
4. 中文母语考生常见失分点要明确指出(如冠词、主谓一致、从句结构、中式表达)
5. 范文改写要保留考生原意与论证方向,只提升语言与组织质量

{trDescriptor}
{descriptors}
{outputSchema}`;

/** 计划生成 system(v2.7:方法论 + 输出契约;考生数据在 user 段由代码组装) */
const DEFAULT_PLAN_SYSTEM = `你是资深雅思备考规划师,为中国大陆机考考生制定分阶段作战计划。

## 规划方法论(必须遵循)
1. 阶段:基础期(词汇+题型认知) → 强化期(分科专项) → 冲刺期(整套模考+错题复盘);
   剩余 <3 周可省略基础期,<2 周只保留冲刺期。
2. 时段匹配:碎片时段只放轻任务(背词/泛听);整块时段(时长 ≥1h 的可用范围)放精听/精读/写作/模考;
   在职考生的完整套卷放晚上或周末。
3. 任务量务实:有效学习量 ≈ 可投入小时数 × 70%,宁少勿多;冲刺期只减不加。
4. 量随投入伸缩、差距加权(基准 = 每天 2h):听读各 2 套/周起步,每多 1h/天各加 1 套/周,
   全职(5–6h/天)听读可达每天 1 套真题;写作按「写→批改→复盘→重写」循环计
   (1 次写作 ≈ 60 分钟作答 + 等量批改复盘),每天 2h 时每周 1–2 套,≥3h/天 或
   写作为最大差距科目时每周 3–4 套;与目标差距最大的科目在强化期任务量再上调。
5. 习惯优先:考生声明的科目偏好时段必须遵守(slot 直接用偏好值);
   未声明偏好的科目按方法论 2 分配;任务不得安排在睡觉时间之后至起床之前。
6. 自述用法:考生英语自述用于理解背景与主观强弱项;与模考数据冲突时以模考数据为准。

## 输出(严格 JSON,无其他文本)
{"phases":[{"name":"基础期","weeks":[1,2,3],"focus":"词汇打底+听力精听",
  "weeklyTasks":[{"type":"words","count":30,"unit":"个/天","slot":"noon"},
                 {"type":"listening","count":1,"unit":"套/周","slot":"evening"}]}]}
约束:type ∈ words|listening|reading|writing|speaking|set(set=完整套卷);
unit 固定按 type 查表:words=个/天,listening/reading/writing/set=套/周,speaking=次/周(原样照抄);
weeks 从 1 起连续覆盖 1..{weeks} 不重叠;slot ∈ 四段枚举 morning|noon|afternoon|evening,
且所选段须被考生某条可用范围覆盖(按范围中点归属判定);
focus ≤ 20 字;不生成计划外自由文本任务。`;

/** AI 昨日总结 system */
const DEFAULT_SUMMARY_SYSTEM = `你是考生的备考助理,根据「昨日学习数据」与「昨日心得」写一份简短的复盘总结。

## 输出(严格 JSON,无其他文本)
{
  "summary": "昨日表现总结(中文,3-5 句:做了什么/强度如何/与计划的匹配度)",
  "suggestions": ["今日建议(中文,2-3 条,具体可执行)"]
}
要求:
- 只依据给定数据,不要编造没发生的事;数据为空时如实说明并给轻量建议
- 语气务实鼓励,不堆砌套话;suggestions 要具体到任务类型与量`;

export interface PromptMeta {
  /** 设置页卡片标题 */
  label: string;
  /** 用途说明 */
  description: string;
  /** 占位符说明(编辑卡展示) */
  placeholders: { name: string; desc: string }[];
  /** 必需占位符(保存校验) */
  required: string[];
  defaultText: string;
}

export const PROMPT_META: Record<PromptKey, PromptMeta> = {
  prompt_writing_grading: {
    label: "写作批改",
    description: "交卷后自动 AI 四维批改(TR/CC/LR/GRA)的评分指令",
    placeholders: [
      { name: "{trDescriptor}", desc: "按任务类型注入的 Task Response 评分要点(代码按 T1-A/T1-G/T2 选择)" },
      { name: "{descriptors}", desc: "CC/LR/GRA 三维度共用评分要点" },
      { name: "{outputSchema}", desc: "输出 JSON 结构约定(勿删,否则批改解析失败)" },
    ],
    required: ["{trDescriptor}", "{descriptors}", "{outputSchema}"],
    defaultText: DEFAULT_GRADING_SYSTEM,
  },
  prompt_plan_generate: {
    label: "计划生成",
    description: "备考计划向导「AI 定制」路径的规划指令(考生数据由系统组装注入,不在本模板)",
    placeholders: [
      { name: "{weeks}", desc: "备考剩余周数(输出约束里用到)" },
    ],
    required: ["{weeks}"],
    defaultText: DEFAULT_PLAN_SYSTEM,
  },
  prompt_daily_summary: {
    label: "昨日总结",
    description: "作战主页「AI 昨日总结」卡的复盘指令(昨日数据由系统组装注入)",
    placeholders: [
      { name: "{activityBlock}", desc: "昨日活动数据块(交卷/套卷/背词统计)" },
      { name: "{journalBlock}", desc: "昨日备考心得文本块(无则为空说明)" },
    ],
    // 占位符可选内联注入(summary.ts:数据块始终注入 user 段,模板写不写均可),不设必填
    required: [],
    defaultText: DEFAULT_SUMMARY_SYSTEM,
  },
};

const PROMPT_MAX_LEN = 8000;

/** 存储键即 PromptKey 本身(app_settings:prompt_writing_grading = {text, updatedAt}) */
interface StoredPrompt {
  text: string;
  updatedAt?: number;
}

/** 唯一取文入口:缺失/超长/占位符缺失 → 回退默认 */
export function getPrompt(key: PromptKey): string {
  const meta = PROMPT_META[key];
  try {
    const stored = getSetting<StoredPrompt>(key);
    if (
      stored &&
      typeof stored.text === "string" &&
      stored.text.trim().length > 0 &&
      stored.text.length <= PROMPT_MAX_LEN &&
      meta.required.every((p) => stored.text.includes(p))
    ) {
      return stored.text;
    }
  } catch {
    /* 读库失败回退默认 */
  }
  return meta.defaultText;
}

/** 保存校验:占位符齐全 + ≤8000 字符;通过返回 null,否则返回错误文案 */
export function validatePromptText(key: PromptKey, text: string): string | null {
  const meta = PROMPT_META[key];
  if (!text || !text.trim()) return "内容不能为空";
  if (text.length > PROMPT_MAX_LEN) return `长度不能超过 ${PROMPT_MAX_LEN} 字符`;
  const missing = meta.required.filter((p) => !text.includes(p));
  if (missing.length) return `缺少必需占位符:${missing.join(" ")}`;
  return null;
}

/** 占位符运行时替换(缺失占位符保留原文,便于发现问题) */
export function fillPrompt(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (m, name: string) =>
    Object.prototype.hasOwnProperty.call(values, name) ? values[name] : m,
  );
}

/* ======================================================================
 * ② 默认模板规则(v2.9)
 * ====================================================================== */

const ZERO_TASKS: Record<TaskType, number> = {
  words: 0,
  listening: 0,
  reading: 0,
  writing: 0,
  speaking: 0,
  set: 0,
};

export const DEFAULT_TEMPLATE_RULES: TemplateRules = {
  // §4.4 ① 阶段划分:long=百分比(基础/强化/冲刺),mid/short=周数
  phaseRatios: { long: [40, 40, 20], mid: [2, 3, 1], short: [1, 2, 1] },
  // §4.4 ② 基准任务表(每天 2h 基准)
  baseWeekly: {
    basic: { ...ZERO_TASKS, words: 40, listening: 1, reading: 1, writing: 1 },
    strengthen: { ...ZERO_TASKS, words: 30, listening: 2, reading: 2, writing: 2, speaking: 1 },
    sprint: { ...ZERO_TASKS, words: 20, listening: 2, reading: 2, writing: 1, speaking: 1, set: 1 },
  },
  scaleBaseHours: 2,
  wordsCeil: 80,
  perSubjectCeil: 7,
  blockMinMinutes: 60,
  mergeGapMinutes: 30,
};

const PHASE_KEYS = ["basic", "strengthen", "sprint"] as const;
type PhaseKey = (typeof PHASE_KEYS)[number];

function numOr(v: unknown, fallback: number, min: number, max: number): number {
  return typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : fallback;
}

/** template_rules 逐字段合并:未配置/非法字段回退默认(整键删除 = 全恢复默认) */
export function getTemplateRules(): TemplateRules {
  const raw = getSetting<Partial<TemplateRules>>("template_rules");
  const d = DEFAULT_TEMPLATE_RULES;
  if (!raw || typeof raw !== "object") return structuredClone(d);

  const ratios = (raw as TemplateRules).phaseRatios;
  const pickRatio = (key: "long" | "mid" | "short", def: [number, number, number], max: number) => {
    const v = ratios?.[key];
    if (
      Array.isArray(v) &&
      v.length === 3 &&
      v.every((n) => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= max) &&
      v.some((n) => n > 0)
    ) {
      return [...v] as [number, number, number];
    }
    return def;
  };

  const baseRaw = (raw as TemplateRules).baseWeekly;
  const baseWeekly = {} as TemplateRules["baseWeekly"];
  for (const phase of PHASE_KEYS) {
    const src = baseRaw?.[phase];
    const out = {} as Record<TaskType, number>;
    for (const t of TASK_TYPES) {
      const def = d.baseWeekly[phase][t];
      out[t] = numOr(src?.[t], def, 0, 999);
    }
    baseWeekly[phase] = out;
  }

  return {
    phaseRatios: {
      long: pickRatio("long", d.phaseRatios.long, 100),
      mid: pickRatio("mid", d.phaseRatios.mid, 52),
      short: pickRatio("short", d.phaseRatios.short, 52),
    },
    baseWeekly,
    scaleBaseHours: numOr((raw as TemplateRules).scaleBaseHours, d.scaleBaseHours, 1, 12),
    wordsCeil: numOr((raw as TemplateRules).wordsCeil, d.wordsCeil, 10, 500),
    perSubjectCeil: numOr((raw as TemplateRules).perSubjectCeil, d.perSubjectCeil, 1, 21),
    blockMinMinutes: numOr((raw as TemplateRules).blockMinMinutes, d.blockMinMinutes, 15, 240),
    mergeGapMinutes: numOr((raw as TemplateRules).mergeGapMinutes, d.mergeGapMinutes, 0, 120),
  };
}

/** 类型守卫供给单测/页面复用:PlanPhase 是否合法(LLM 输出校验在 plan-gen 内做) */
export type { PlanAvailability, PlanPhase, StudyPreferences, AiSummary };
