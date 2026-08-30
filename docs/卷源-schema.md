# 卷源 schema(M2 输入契约)

> 本文档是 **paper.json** 的事实标准,既是 M2 解析器的输出格式,也是 M3 渲染层
> + M2 入库脚本的输入格式。**写入端(zod `src/lib/seed-validate.ts`)和读取端
> (M2-3 db-import 脚本)用同一份 schema**。

## 顶层结构

```ts
type PaperSeed = {
  paper: Paper;
  sections: Section[];
  passages: Passage[];
  questionGroups: QuestionGroup[];
  questions: Question[];
  choices: Choice[];
  answers: Answer[];
  writingTasks?: WritingTask[];  // 仅 WRITING 卷有
};
```

---

## Paper(顶层卷元)

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| slug | `string` | ✓ | 幂等入库键 = 文件目录名,例 `a-2025jan-listening-test1` |
| title | `string` | ✓ | 卷名,显示在列表 + 顶栏 |
| category | `'A' \| 'G'` | ✓ | A 学术 / G 培训 |
| skill | `string` | ✓ | 逗号列表:`LISTENING` / `READING` / `WRITING`(V1 不支持 READING+WRITING 同卷)|
| source | `string \| null` | – | 卷源出处(可空),例 `ieltsonlinetests.com` |
| durationSec | `int ≥ 1` | ✓ | 考试时长(秒);听 1920 / 阅 3600 / 作 3600 |
| status | `'DRAFT' \| 'PUBLISHED'` | ✓ 默认 `PUBLISHED` | 入库时按需改 |
| meta | `object` | – | 卷元(听力的 `audioUrl` / 写作的字数限制等自由扩展)|
| bandTable | `Array<[minRaw, band]>` | ✓ | 官方 raw → band,降序;M3 移植 scoring.ts 时复用 |

---

## Section

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| sectionNo | `int ≥ 1` | ✓ | 卷内序号(1-based) |
| sectionType | `'LISTENING' \| 'READING' \| 'WRITING'` | ✓ | |
| title | `string \| null` | – | 例 `Part 1` |
| timeLimitSec | `int ≥ 1` | – | 默认沿用 `paper.durationSec` |

---

## Passage(正文 / 整篇图片型)

听/作留空 `[]`。阅读有,一节多篇按 `orderIndex` 升序:

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| sectionNo | `int` | ✓ | 挂到哪节 |
| orderIndex | `int ≥ 1` | ✓ | 节内排序 |
| title | `string \| null` | – | 例 `Questions 1-5` |
| subtitle | `string \| null` | – | |
| bodyHtml | `string \| null` | ✓ 至少 title/body/imageUrl 一项 | 段落正文(白名单清洗后入库) |
| imageUrl | `string \| null` | – | 整篇图片型,例 `/exam-assets/gt-vol1-reading-test1/section1.jpg` |

---

## QuestionGroup(共享选项集 + 块题计分)

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | `string` | ✓ | 卷内唯一,例 `g-q28-30` / `g-q6`(双选单题) |
| sectionNo | `int` | ✓ | 挂哪节 |
| orderIndex | `int` | ✓ | 节内排序 |
| scoreMode | `'PER_QUESTION' \| 'SET_INTERSECTION'` | ✓ 默认 `PER_QUESTION` | 块题多选走 `SET_INTERSECTION` |
| minSelect | `int \| null` | – | 最小勾选数(选填) |
| maxSelect | `int \| null` | – | 最大勾选数(选填);`SET_INTERSECTION` 必备 |
| instructionHtml | `string \| null` | – | 题组共享说明,如 `Choose TWO letters, A-E` |

**块题**:Q28-30 共享 `id="g-q28-30"` 的 group,组内 3 道 questions 都 `questionGroupId="g-q28-30"`,
choices 全挂在 groupId 上,answers **只提交一次**(`questionNumber` 可填任一块成员,
M3 入库时按 `questionGroupId` 去重为一行 `answers` + `scoreMode=SET_INTERSECTION`)。

**双选单题**:Q6 也是 `name="q-6"` 共享的 checkbox 组,但属于**单题双选**:
scoreMode = `PER_QUESTION`,每题仅一道题(`questionGroupId="g-q6"` 仅挂在 Q6 那一道)。

---

## Question

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| number | `int ≥ 1` | ✓ | **卷内题号 1-N 连续**,与 `name="q-N"` 对应 |
| type | `QuestionType`(九值枚举)| ✓ | 见下表 |
| sectionNo | `int` | ✓ | 挂哪节 |
| stemHtml | `string \| null` | – | 题干/题面,白名单清洗后 |
| instructionHtml | `string \| null` | – | 题号头上方的说明,如 `Choose the correct letter, A, B, C or D` |
| questionGroupId | `string \| null` | – | 块题成员必填(继承组的 scoreMode);普通题留空 |
| taskId | `'T1' \| 'T2' \| null` | – | 写作题挂载(暂留位;M4 详化) |
| wordLimit | `{min?: int, max?: int} \| null` | – | 短答/简答的字限 |

### 题型九值(M1 枚举,paper.json 直接采用)

| 枚举 | 对应原型形态 | 入库形态 |
|---|---|---|
| `SINGLE_CHOICE` | radio name="q-N" | choices 全挂 questionId,scoreMode PER_QUESTION |
| `MULTI_CHOICE` 单题双选 | checkbox name="q-N"(同题共享)| choices 全挂 groupId(`g-q6`),scoreMode PER_QUESTION |
| `MULTI_CHOICE` 块题 | checkbox name="q-N-M"(N-M 共享)| choices 全挂 groupId(`g-q-N-M`),scoreMode SET_INTERSECTION |
| `FILL_BLANK` | input data-num="N" 无 options | 仅 stemHtml,无 choices |
| `TRUE_FALSE_NG` | select data-num="N" | choices 全挂 questionId,label ∈ {TRUE, FALSE, NOT GIVEN} |
| `MATCH_*` | select data-num="N" | choices 全挂 questionId,label = 选项字母/罗马数字 |
| `SHORT_ANSWER` | input data-num="N"(短答)| 仅 stemHtml,无 choices |

---

## Choice

`questionId` 与 `groupId` 二选一(与 M1 XOR CHECK 对齐):

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| label | `string` | ✓ | 选项标号(A/B/C/D、i/ii/iii、TRUE/FALSE/NOT GIVEN)|
| textHtml | `string \| null` | – | 选项文字(MULTI/SHORT 的题干白名单清洗后) |
| orderIndex | `int ≥ 1` | ✓ | 节内排序 |
| questionId | `string \| null` | – | 单题选项必填,组共享留空 |
| questionGroupId | `string \| null` | – | 组共享必填(块题 + 双选单题)|

---

## Answer

`questionNumber` 必填。块题成员 `questionGroupId` 同组时,按组去重提交一次
(M2-3 入库脚本处理;paper.json 里块题 answers 一条足够):

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| questionNumber | `int` | ✓ | 对应 `questions[].number` |
| value | `string` | ✓ | 官方原串:'B' / 'A,C' / 'an agent/a registered agent' / '(heavy) import duties' / 'TRUE' |
| alternatives | `string[]` | – | 备选写法(可空;主备选已内联在 value 的 '/' 语法里) |
| questionGroupId | `string \| null` | – | 块题成员标 groupId(同组 answer 只入库一次)|
| explanationHtml | `string \| null` | – | 解释(M3 成绩页展示,可空)|

---

## WritingTask(仅 WRITING 卷)

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| taskId | `'T1' \| 'T2'` | ✓ | |
| promptHtml | `string` | ✓ | 题干(白名单清洗后) |
| materialHtml | `string \| null` | – | GT T1 书信情景 / A T1 图表(可空) |
| wordMin | `int ≥ 1` | ✓ | 字数下限(T1=150 / T2=250) |
| suggestedTimeSec | `int ≥ 1` | ✓ | 建议时长(T1=1200 / T2=2400) |
| orderIndex | `int ≥ 1` | ✓ | |

---

## 题面 HTML 入库前**全剥**(用户决策)

入库前过 `src/lib/sanitize-html.ts`,白名单:

```
标签:p / span / div / br / strong / em / b / i / u / sub / sup / br / hr /
    h1-h6 / table / thead / tbody / tfoot / tr / th / td / caption /
    ul / ol / li / dl / dt / dd /
    form(限制 action='') / input / textarea / select / option / optgroup /
    label / fieldset / legend /
    a(限制 href=http|https|mailto) / img /
    svg(限制 viewBox) / g / path / circle / rect / line / polyline /
    polygon / text / defs / linearGradient / stop
属性:class / id / style / data-num / data-template / data-q_type /
    href / src / alt / title / type / name / value / placeholder /
    checked / disabled / selected / readonly / required /
    colspan / rowspan / headers / scope /
    width / height / viewBox / fill / stroke
拒绝:on* / javascript: / data: / vbscript: / 表达式 / <script> / <iframe> /
    <object> / <embed> / <meta> / <link>
```

**渲染层**(`/papers/[slug]/test`)再用 **DOMPurify 二次过滤**(纵深防御)。

---

## 解析器产物形态(`seeds/<slug>/paper.json` 与 `assets/`)

```
seeds/a-2025jan-listening-test1/
├─ paper.json                 # 本文档定义的全部内容
└─ assets/                    # 原型 HTML 引用的图 + 音频(拷自 prototype/..._files/)
   ├─ 2698951bff….png
   ├─ Questions 25-27.png
   └─ practice-test-1.mp3     # 听力卷特有
```

**入库脚本**(`scripts/db-import.mjs`)读 `paper.json` → 拷 `assets/` 到 `public/exam-assets/<slug>/` → 改 `paper.json` 里所有 `<img src="/exam-assets/<slug>/...">` 和 `meta.audioUrl` → **校验每个引用都有对应文件**(缺则拒入并报错)。

---

## 校验节点(写在 M2-1 完成定义里)

1. zod schema 对 6 套卷的 paper.json 实例校验 **6/6 通过**
2. **图片资产差 0**:对比 `prototype/<卷>_files/`(去 `*.css/*.js` 和 `hm.js`)与 `seeds/<slug>/assets/` 数量一致
3. **题数对比**:解析器输出 `questions.length` 与原型 HTML `data-num` 集合大小一致;`answers.length` 与现有 `answers-*.js` 一致
4. **样式 0 残留**:入库前 paper.json 的 `bodyHtml` / `stemHtml` / `promptHtml` 不含 `style=` 或 `class="iot-..."`

---

## 实例(GT 阅 Q1)

```jsonc
{
  "questions": [{
    "number": 1, "type": "MULTI_CHOICE",
    "sectionNo": 1, "questionGroupId": "g-q1",
    "stemHtml": "Complete the form below. Write ONE WORD AND/OR A NUMBER for each answer."
  }],
  "questionGroups": [{
    "id": "g-q1", "sectionNo": 1, "orderIndex": 1,
    "scoreMode": "PER_QUESTION", "minSelect": 2, "maxSelect": 2,
    "instructionHtml": "Choose TWO letters, A-E."
  }],
  "choices": [
    { "label": "A", "textHtml": "…", "orderIndex": 1, "questionGroupId": "g-q1" },
    { "label": "B", "textHtml": "…", "orderIndex": 2, "questionGroupId": "g-q1" },
    { "label": "C", "textHtml": "…", "orderIndex": 3, "questionGroupId": "g-q1" },
    { "label": "D", "textHtml": "…", "orderIndex": 4, "questionGroupId": "g-q1" },
    { "label": "E", "textHtml": "…", "orderIndex": 5, "questionGroupId": "g-q1" }
  ],
  "answers": [
    { "questionNumber": 1, "value": "A,C", "questionGroupId": "g-q1" }
  ]
}
```

**双选单题**(g-q1) 与 **块题多选**(g-q28-30)的区别只在一个 question 上挂 groupId 还是 N 个
question 上挂 groupId —— 这就是同一形态兼容两种用法的关键。