/**
 * src/lib/grading/prompt.ts — 写作 AI 四维批改 prompt(PRD §3.6)
 *
 * 三套评分侧重:
 *   T1-A(学术类)图表描述 —— 数据选取、趋势对比、流程完整
 *   T1-G(培训类)书信     —— 写信目的达成、语气语域得体
 *   T2       议论文      —— 立场明确、论证展开、双方回应
 *
 * 差异只在 TR(Task Response)的评分要点上;CC / LR / GRA 三维度共用官方公开描述。
 *
 * 输出约定:模型必须且只能输出一个 JSON 对象。部分网关不支持 response_format,
 * 且模型常给 JSON 包一层 ```json 代码围栏 —— 解析在 service.ts 统一容错处理。
 */

export interface GradingInput {
  task: "T1" | "T2";
  /** 试卷类别:A = 学术类(T1 为图表描述),G = 培训类(T1 为书信) */
  category: "A" | "G";
  /** 题干纯文本(papers.questions_json[task].prompt) */
  prompt: string;
  /** 字数下限(T1=150 / T2=250) */
  wordMin: number;
  /** 考生全文 */
  essay: string;
}

/** CC / LR / GRA 三维度共用的官方公开评分要点(精简版,覆盖 5–8 档主干特征) */
const COMMON_DESCRIPTORS = `
Coherence & Cohesion (CC):
- 9:衔接手段几乎不留痕迹,段落组织完全服务于逻辑
- 7:信息与观点排列有序,衔接手段使用得当且多样,段落划分充分
- 6:排列有逻辑,衔接手段有效但可能单调或略显机械;段落划分存在但不够清晰
- 5:信息组织有基本逻辑,但衔接手段不足、重复或错误;段落划分可能缺失
- 下档:缺乏整体推进,句式与衔接手段使用有限或错误频出

Lexical Resource (LR):
- 9:用词精准自然、地道且完全贴合语境,极少重复
- 7:词汇量充足,能灵活使用不太常见的词汇,对语体与搭配有良好意识,偶有失误
- 6:词汇量足以覆盖话题,尝试使用了不太常见的词汇但准确性不稳,错误不影响理解
- 5:词汇量有限但能覆盖基本话题,重复使用简单词,拼写/构词错误明显
- 下档:词汇严重不足,错误频繁影响理解

Grammatical Range & Accuracy (GRA):
- 9:语法结构丰富且几乎全对,标点完全准确
- 7:句式多样,多数句子无误,对复杂结构掌控良好
- 6:混合使用简单句与复杂句,复杂句出错率高于简单句但不影响理解
- 5:句式变化有限,复杂句尝试频繁出错,语法错误较明显
- 下档:仅能使用有限句式,错误密集且阻碍理解
`;

/** T1 学术类(图表描述)的 TR 评分要点 */
const TR_TASK1_ACADEMIC = `
Task Response (TR) — 图表描述任务:
- 9:完全满足要求,对图表关键特征的选取与呈现精准到位,概述清晰
- 7:覆盖所有关键特征,选择恰当,有清晰的概述,数据与趋势表述准确
- 6:选出并呈现了主要特征,概述存在但可能不够清晰,细节偶有偏差
- 5:仅呈现有限的主要特征,缺少清晰概述,数据描述可能机械或有误
- 下档:未能覆盖要求,内容偏少或偏题,大量数据罗列而无归纳
评分要点:是否选出主要特征而非罗列全部数据?是否有总体概述?是否做了相关比较?是否准确描述趋势/流程?
`;

/** T1 培训类(书信)的 TR 评分要点 */
const TR_TASK1_GENERAL = `
Task Response (TR) — 书信任务:
- 9:写信目的完全达成,内容充分展开,语气与语域完全贴合收信人与情境
- 7:三个要点(写信目的/说明情况/提出诉求)均充分展开,语气一致且得体
- 6:各要点均有回应,展开程度尚可,语气基本得体但偶有不稳
- 5:要点回应不完整或展开不足,语气与语域选择不够贴合
- 下档:目的不清,要点缺失,语气严重不当
评分要点:写信目的是否明确?三个bullet points是否都回应到?语气与语域是否匹配收信人(正式/半正式/非正式)?
`;

/** T2 议论文的 TR 评分要点 */
const TR_TASK2 = `
Task Response (TR) — 议论文任务:
- 9:立场清晰且贯穿全文,论证充分有力,所有论点都展开到足够深度
- 7:立场明确,主要论点展开充分,有清晰的推进,结论呼应立场
- 6:回应了题目要求,立场可见但可能不够一致,部分论点展开不足或略显笼统
- 5:立场存在但论证偏笼统,举例重复或缺乏支撑,结论可能不清
- 下档:偏题或未回应讨论要求,观点缺失,大量重复
评分要点:是否回应了题目的全部要求(如 Discuss both views 必须两边都讨论并给出自己观点)?立场是否清晰且贯穿?论点是否有展开与支撑?
`;

function pickTrDescriptor(task: "T1" | "T2", category: "A" | "G"): string {
  if (task === "T2") return TR_TASK2;
  return category === "G" ? TR_TASK1_GENERAL : TR_TASK1_ACADEMIC;
}

const TASK_LABEL: Record<string, string> = {
  "T1-A": "Writing Task 1 (Academic · 图表描述)",
  "T1-G": "Writing Task 1 (General Training · 书信)",
  T2: "Writing Task 2 (议论文)",
};

/** 输出结构约定(PRD §3.6)—— 要求模型严格照此输出 */
const OUTPUT_SCHEMA = `
输出要求:只能输出一个 JSON 对象,不要任何解释文字,不要包在代码围栏里。结构如下:
{
  "overallBand": 6.5,
  "dimensions": [
    { "name": "TR",  "band": 6,   "comment": "该维度评语(中文,2-3 句)",
      "evidence": ["引用考生原文中的原句作为依据(最多 2 条,可为空数组)"],
      "improvement": "针对该维度的一条具体可执行建议(中文)" },
    { "name": "CC",  "band": 6,   "comment": "...", "evidence": [], "improvement": "..." },
    { "name": "LR",  "band": 5.5, "comment": "...", "evidence": [], "improvement": "..." },
    { "name": "GRA", "band": 6,   "comment": "...", "evidence": [], "improvement": "..." }
  ],
  "strengths": ["本文做得好的地方(中文,2-4 条)"],
  "weaknesses": ["需要改进的地方(中文,2-4 条)"],
  "rewrittenSample": "整篇改写范文(英文,保留考生原意,展示同题的高分写法,达到 7 分水准;长度与原文相当或略长)",
  "wordCount": 168,
  "flaggedIssues": [
    { "type": "grammar", "quote": "考生原句中的错误片段", "suggestion": "改法" }
  ]
}
字段说明:
- band 一律取 0 / 1–9 的 0.5 进制值(如 5.5、6.0、7.5),不要用字符串
- dimensions 必须按顺序包含 TR / CC / LR / GRA 四项,name 用这四个大写缩写
- comment / improvement / strengths / weaknesses / suggestion 用中文(用户是中文母语者);
  rewrittenSample / quote 保持英文原文
- flaggedIssues 的 type 只能是 grammar / vocabulary / cohesion / task / other;挑最典型 3–8 处,不要滥发
- wordCount 按英文学术写作惯例统计(以空格分隔的词数)
- overallBand 按雅思官方口径由四维综合得出(四维算术平均后,按官方惯例取整到 0.5)
`;

/** 组装完整的批改 prompt(返回 [system, user] 两条消息) */
export function buildGradingMessages(input: GradingInput) {
  const label = input.task === "T1" ? TASK_LABEL[`T1-${input.category}`] : TASK_LABEL.T2;
  const trDescriptor = pickTrDescriptor(input.task, input.category);

  const system = `你是一位经验丰富的雅思考官(Examiner),拥有十年以上评分经验,严格依据雅思官方公开的写作评分标准(IELTS Writing Band Descriptors, public version)批改考生作文。

评分原则:
1. 四个维度独立打分(TR / CC / LR / GRA),每个维度给出 0.5 进制的 band 分
2. 严格对齐下述官方描述,不要凭印象给分,也不要集体趋中
3. 评语必须基于考生文本中的具体证据,不要写空泛套话
4. 中文母语考生常见失分点要明确指出(如冠词、主谓一致、从句结构、中式表达)
5. 范文改写要保留考生原意与论证方向,只提升语言与组织质量

${trDescriptor}
${COMMON_DESCRIPTORS}
${OUTPUT_SCHEMA}`;

  const user = `请批改以下雅思作文。

【任务类型】${label}
【字数要求】至少 ${input.wordMin} 词
【题目】
${input.prompt}

【考生作文】
${input.essay}

请按输出要求给出 JSON 结果。`;

  return [
    { role: "system" as const, content: system },
    { role: "user" as const, content: user },
  ];
}

/**
 * 从模型输出里提取 JSON 对象。
 * 容错三种常见情况:
 *   1. 包了 ```json ... ``` 代码围栏(MiniMax / 多数国产模型常见)
 *   2. 前后带了说明文字(首尾有非 JSON 内容)
 *   3. 直接就是裸 JSON
 */
export function extractJson(text: string): unknown {
  let s = String(text ?? "").trim();

  // 0) 剥离推理模型的 <think>…</think> 思考块(MiniMax-M3 / DeepSeek-R1 等)。
  //    这一步必须在找 '{' 之前做:模型思考时常会复述或举例输出结构,
  //    思考内容里的花括号会让 indexOf('{') 指到错误位置,解析出完全不相干的对象
  //    ——T2 长作文连续失败就是这个原因(思考块更长,中招概率更高)。
  s = s.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  // 只有开标签没有闭标签 = 输出在思考阶段就被 max_tokens 截断,整段丢弃交给重试
  if (/^<think>/i.test(s)) s = "";

  // 1) 剥代码围栏(```json 或 ```)
  const fence = s.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  if (fence) s = fence[1].trim();

  // 2) 直接解析
  try {
    return JSON.parse(s);
  } catch {
    /* 落到 3) 截取 */
  }

  // 3) 取第一个 { 到最后一个 } 之间的内容
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first >= 0 && last > first) {
    try {
      return JSON.parse(s.slice(first, last + 1));
    } catch {
      /* 无法解析,落到 4) 抢救 */
    }
  }

  // 4) 截断抢救:输出被 max_tokens 截断时(长范文常见),从末尾往回退,
  //    找最长的可解析前缀。只在闭合字符处试解析,且只扫描尾部 2000 字符
  //    ——截断必定发生在末尾,全量扫描会是 O(n²)。
  if (first >= 0) {
    const candidate = s.slice(first);
    const scanFrom = Math.max(1, candidate.length - 2000);
    for (let end = candidate.length; end >= scanFrom; end--) {
      const ch = candidate[end - 1];
      if (ch !== "}" && ch !== "]") continue;
      try {
        return JSON.parse(candidate.slice(0, end));
      } catch {
        /* 继续回退 */
      }
    }
  }
  return null;
}
