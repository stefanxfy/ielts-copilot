# 雅思自学备考指南（IELTS Copilot）· 产品需求文档（PRD）

> 版本：v3.2 · 2026-08-30
> 形态：**本地单机应用**（MacBook + Windows，双击启动脚本运行，浏览器作为界面）
> 范围：V1 = 阅读机考 + 写作机考（含 AI 四维批改）；听力、口语后置
> 技术底座：Next.js 本地服务 · SQLite（better-sqlite3 + Drizzle）· LLM 走云端 API
> 数据与配置全部落在本地，无 Docker、无数据库服务、无账号体系

### 变更记录

- **v3.2 · 2026-08-30 — 去掉 PDF 导入/解析与校对后台，真题改为结构化卷源直接入库**
  - 决策依据：真题已按结构化 HTML 直接入库并在原型中即点即考，「上传 PDF → 文本抽取 → LLM 结构化 → 人工校对」链路不再需要
  - 产品形态影响：
    - §3.3 由「真题导入与校对流水线」改为「真题入库（结构化卷源直接入库）」，状态机简化为 `DRAFT → PUBLISHED`
    - 删除校对工作台页面、仪表盘「导入真题 PDF」入口及全部 admin 导入/解析/校对/发布 API；新增真题 = 新增一个卷源文件（工程动作，无运行时导入界面）
    - 数据目录去掉 `pdfs/`；`config.json` 去掉 `parseModel`；LLM 仅用于写作批改
  - 里程碑相应调整：M2 改为「真题结构化入库 + 题库列表页」
  - 项目更名：**雅思自学备考指南 / IELTS Copilot**（原 ielts-prep）；应用数据目录 `~/ielts-app/` 改为 `~/ielts-copilot/`

- **v3.1 · 2026-08-29 — 战略方向调整：A 类学术类为主，G 类培训类为辅**
  - 决策依据：用户在原型期已优先解析 A 类真题（IELTS Mock Test 2025 January Reading Practice Test 1），并明确表示后续题库以 A 类为主、G 类为辅
  - 产品形态影响：
    - 「机考模拟」顶部 A/G 切换器**顺序改为 A 在前**，默认选中 A 类
    - 入库顺序与运营重心：先扩 A 类真题库（学术类阅读/写作）；G 类作为兼容场景保留入口
    - 数据模型无需改动（`Paper.category` 已预留 G/A 字段，见 §6）
  - 不影响：技术底座、V1/V2/V3 范围、API 设计、里程碑 M1–M5

---

## 1. 产品概述

### 1.1 一句话定位

一个双击就能用的本地雅思备考工具：内置剑桥雅思 A 类 / G 类真题（结构化卷源直接入库，免解析即点即考），提供高还原度的阅读/写作机考界面，配套客观题判分与写作 AI 四维批改，形成「真题 → 机考 → 反馈 → 弱项」的备考闭环。（v3.1 起以 A 类学术类为主，详见 §1.4）

### 1.2 运行形态

- 用户拿到一个**应用文件夹**，双击 `启动.command`（Mac）/ `启动.bat`（Windows）
- 脚本自动：检查 Node → 启动本地服务（绑定 `127.0.0.1`）→ 打开默认浏览器访问 `http://127.0.0.1:3177`
- 关闭浏览器窗口 = 退出应用（脚本监听服务退出）
- 单用户，无注册/登录/多用户

### 1.3 G 类考试事实约束（阅读 + 写作）

- **阅读**：3 个 Section、40 题、60 分钟，无额外誊写时间。
  - Section 1：2-3 篇短文（通知、广告、说明书）
  - Section 2：2 篇中等文本（职场相关）
  - Section 3：1 篇长文（议论性）
- **写作**：Task1 书信（≥150 词）+ Task2 议论文（≥250 词），共用 60 分钟倒计时。
- 阅读判分：原始分（0-40）→ band score（官方换算表）。

### 1.4 A 类与 G 类的产品定位（v3.1 新增）

| 维度 | A 类 · 学术类 | G 类 · 培训类 |
|------|--------------|---------------|
| **战略地位** | **主推方向**（v3.1 起） | 兼容方向，保留入口 |
| **目标用户** | 申请海外本科/研究生（大学申请刚需） | 移民/工作/培训（次主流） |
| **题库优先级** | 优先扩量，运营重心 | 已有资源保留，不再优先投入 |
| **UI 顺序** | 顶部切换器首位，默认选中 | 次位，需手动切换 |
| **数据模型** | `Paper.category = 'A'` | `Paper.category = 'G'`（已预留，见 §6） |

**决策**：v3.1 起，机考模拟页 A 类导航放在第一位、默认选中 A；用户已明确"以 A 类为主，G 类为辅"。G 类不删，但不再作为新功能/题库扩量的优先方向。

- 真题来源说明：现有 G 类卷（雅思真题试卷 一月 · 雅思阅读真题 1）已在原型中可用；A 类卷（IELTS Mock Test 2025 January · Reading Practice Test 1）已入库并验证通过判分引擎
- 新增真题以结构化卷源直接入库（见 §3.3），A/G 类别在卷源中标记

---

## 2. 版本规划

| 版本 | 范围 | 状态 |
|------|------|------|
| **V1（本轮）** | **结构化真题入库**、**阅读机考**、**写作机考 + AI 四维批改**、判分、成绩页、启动脚本 | **当前唯一执行目标**：跑通「真题 → 机考 → 出分 → 批改反馈」 |
| V2 | 听力机考（音频 + 打点 + 判分）、口语机考（录音 + Whisper 转写 + LLM 点评） | 暂缓，V1 稳定使用后再议 |
| V3 | 错题本、弱项雷达、分数曲线、单题型专项、听力精听、生词本、同义替换库、题库包导出/导入 | 暂缓（按提分杠杆排序已论证，见需求复盘），V1 后再议 |

> **2026-08-29 范围确认**：只做 V1（阅读 + 写作 + AI 批改），其他一律不投入。V2/V3 保留在文档中仅作方向存档，不进任何开发计划。
>
> **v3.1 方向调整**：V1 内的题库扩量**优先 A 类学术类**（详见 §1.4），G 类培训类作为兼容场景保留。下面的 §3 在叙述上仍以 G 类卷为示例，不一一改写。

---

## 3. V1 功能需求

### 3.1 启动与目录结构

```
ielts-copilot/
├─ 启动.command            # Mac：双击执行（chmod +x 已预设）
├─ 启动.bat                # Windows：双击执行
├─ config.json             # 应用配置（界面可编辑，也可手改）
├─ next-server/            # 编译产物（Next.js standalone），无源码依赖
├─ data/
│  ├─ app.db               # SQLite 单文件
│  └─ exports/             # 题库包导出（V3）
```

启动脚本逻辑（两个平台同构）：
1. 定位脚本所在目录（Mac 用 `$0`，Windows 用 `%~dp0`），`cd` 过去
2. 检测 `node` 是否存在 → 缺失则打开提示页引导安装（或内置 Node 可选）
3. 检查端口 `3177` 是否被占用 → 被占则自动换端口并写回临时变量
4. 后台启动服务（`node next-server/server.js`），轮询健康检查
5. 服务就绪后 `open http://127.0.0.1:3177`（Mac）/ `start`（Windows）
6. 用户关闭浏览器后脚本退出

### 3.2 config.json（AI 与应用配置）

```jsonc
{
  "server": { "port": 3177, "host": "127.0.0.1" },
  "llm": {
    "provider": "openai",          // openai | anthropic | openai-compatible
    "baseUrl": "https://api.openai.com/v1",
    "apiKey": "sk-...",            // 必填，用户自填
    "gradingModel": "gpt-4o",      // 写作批改用（质量优先）
    "timeoutSec": 120
  }
}
```

- **双通道配置**：界面「设置」页可改并保存；用户也可直接编辑 `config.json`（应用启动时读取，保存时写回，格式保持 JSONC 注释友好）
- 所有 AI 调用都走 `config.json` 里的 `provider/baseUrl/apiKey/model`，**不写死、不进代码**
- 本地文件安全：`apiKey` 明文存储属本机自用可接受，README 注明勿把整个文件夹分享出去

### 3.3 真题入库（结构化卷源直接入库）

```
结构化卷源 ─→ 入库脚本 ─→ SQLite ─→ 即点即考
(HTML/JSON)   (确定性导入)  (PUBLISHED)
```

真题不走 PDF 导入/解析/人工校对链路，直接以**结构化卷源**形式随应用入库：

1. **卷源**：每套真题一个卷源文件（HTML：篇章 + 题目 + 选项 + 答案；或等价 JSON），A/G 类别在卷源中标记。卷源即最终数据，所见即所得
2. **入库**：初始化/升级脚本读取卷源 → 按 §3.3.2 Schema 校验并写入 SQLite → PUBLISHED
3. **新增一套真题 = 新增一个卷源文件**（工程动作，无运行时导入界面）

#### 3.3.1 状态机

试卷状态：`DRAFT → PUBLISHED`（卷源校验入库即 PUBLISHED；`DRAFT` 仅供暂存未写完的卷源，不进入题库列表）

#### 3.3.2 题目 JSON Schema（卷源与机考的公共契约）

```jsonc
{
  "paper": { "title": "剑19 GT Test 1", "category": "G", "source": "Cambridge 19" },
  "sections": [
    {
      "sectionNo": 1,
      "sectionType": "READING",
      "passages": [
        { "order": 1, "title": "...", "text": "..." }
      ],
      "questions": [
        {
          "number": 1,
          "type": "SINGLE_CHOICE",
          "stem": "...",
          "instruction": "...",
          "wordLimit": null,              // 填空题：{words, numbers}
          "passageOrder": 1,
          "choices": [{ "label": "A", "text": "..." }],
          "answer": ["A"],
          "answerAlternatives": [],
          "explanation": ""
        }
      ]
    }
  ]
}
```

#### 3.3.3 V1 必须支持的阅读题型

| 枚举值 | 题型 | 交互形态 | 判分规则 |
|--------|------|----------|----------|
| `SINGLE_CHOICE` | 单选 | 单选按钮组 | 精确匹配 |
| `MULTI_CHOICE` | 多选（Choose TWO/THREE） | 复选框（限选数） | 集合完全相等（不分序） |
| `FILL_BLANK` | 填空（笔记/表格/摘要/句子完成） | 文本输入框 | 归一化后匹配 |
| `TRUE_FALSE_NG` | 判断题 | 三选一（TRUE/FALSE/NOT GIVEN） | 精确匹配 |
| `MATCH_HEADINGS` | 段落标题匹配 | 下拉选 heading（i, ii, iii…） | 精确匹配 |
| `MATCH_INFO` | 段落信息匹配 | 下拉选段落字母 | 精确匹配 |
| `MATCH_FEATURES` | 特征匹配 | 下拉 | 精确匹配 |
| `MATCH_ENDINGS` | 句子开头-结尾匹配 | 下拉 | 精确匹配 |
| `SHORT_ANSWER` | 简答 | 文本输入框 | 归一化后匹配 |

> 填空归一化器：去首尾空格、统一大小写、全半角标点统一、数字等价（one=1）可配置。

### 3.4 阅读机考界面

- **左右分屏**：左当前 Section 篇章区，右题目区；Section 1/2/3 切换 Tab
- 篇章文字**禁止选中/复制/右键**（还原官方限制）；**Highlight 拖选高亮** + 一键清除，高亮随 attempt 持久化
- 底部导航条：题号方块（未答=白、已答=蓝、标记=圆圈），点方块跳题；每题「Review」标记
- 顶部：60 分钟倒计时**精确到秒（mm:ss 逐秒递减，2026-08-30 用户确认要求，原型已用 clock-sec.js 实现）**（≤10 分钟转红）、字体缩放
- 时间到**强制自动提交**；中途退出二次确认
- 交卷前 Review 面板：未作答/已标记列表，可跳转

### 3.5 写作机考界面

- Task1（书信）+ Task2（议论文），共用 60 分钟倒计时（**同样精确到秒，见 §3.4**），顶部 Task 切换
- 编辑器：**纯文本、无自动纠错、无拼写检查**（刻意还原官方）；实时字数统计（≥150 / ≥250 达标变色）
- 交卷后进入**AI 四维批改**（异步任务）：

### 3.6 写作 AI 四维批改

- **评分维度**（对齐官方公开评分描述）：
  - TR：Task Response（书信的写信目的达成/议论文的任务回应）
  - CC：Coherence & Cohesion（连贯衔接、段落组织、连接词）
  - LR：Lexical Resource（词汇多样性、搭配准确性）
  - GRA：Grammatical Range & Accuracy（语法多样性与准确性）
- 输出结构（入库可回看）：
  ```jsonc
  {
    "taskId": "T1",
    "overallBand": 6.5,
    "dimensions": [
      { "name": "TR", "band": 6, "comment": "...", "evidence": ["..."], "improvement": "..." }
    ],
    "strengths": ["..."],
    "weaknesses": ["..."],
    "rewrittenSample": "整篇改写范文（保留原意，展示同题高分写法）",
    "wordCount": 168,
    "flaggedIssues": [{ "type": "grammar", "quote": "原句", "suggestion": "改法" }]
  }
  ```
- Prompt 固化模板（内含官方 band 描述），按 `gradingModel` 调用
- 异步执行 + 结果缓存 + 失败重试；设置页可测试连通性

### 3.7 判分与成绩页

- 阅读客观题：提交时同步判分，raw score → band（官方换算表常量）
- 成绩页：
  - 总览：raw / 40、band、用时
  - 逐题列表：我的答案 vs 正确答案，按题型分组正确率
  - 写作：四维雷达简图 + 批改详情 + 改写范文
  - 错题可一键收藏进错题本（V3 落地）

---

## 4. V2 功能需求（听力 + 口语，本版不实现）

- **听力机考**：音频上传 + Part 打点、只播一遍、不可回拖、2 分钟检查；题型复用阅读题型枚举
- **口语机考**：Part1/2/3 流程、MediaRecorder 录音、Whisper 转写（复用 config.json 的 llm 段，转写走 API）、LLM 三维点评
- 数据模型预留 `SectionType.LISTENING / SPEAKING` 与 `partStartMs` 字段，V1 不建表或建表不使用（倾向：V1 不建，V2 再迁移）

---

## 5. V3 功能需求（学习闭环，本版不实现）

错题本（题型归类/重做）、弱项雷达、分数曲线、单题型专项训练、精听模式、生词本（Anki 导出）、**题库包导出/导入**（`data/exports/*.json` + 附卷源引用路径，用于换机迁移与备份）。

---

## 6. 数据设计（SQLite + Drizzle）

表结构与 v2.0 的 Prisma 草案一致（`User`、`InviteCode`、`Auth` 相关全部删除），变更点：

- `Paper.category` 保留（未来 A 类复用）
- `Section.timeLimitSec`：阅读 3600；写作 3600（写作两个 Task 合一个 Section 或两个 Section，**定稿：一个 Section，含 task1/task2 两个 WritingTask 子结构**
- `Question` 增加 `taskId`（`T1`/`T2`）用于写作题挂载；写作的「答案」为 AI 批改结果（`GradingResult` 表）
- 新增表：
  - `WritingTask`（paperId, taskId, prompt 文本, wordMin）
  - `GradingResult`（attemptId, taskId, 完整批改 JSON）
- 新增 `AppSetting`（k/v 表）仅存非敏感界面设置；**敏感 AI 配置只进 config.json**

核心表：`Paper / Section / Passage / Question / Choice / Answer / Attempt / Response / WritingTask / GradingResult`

---

## 7. API 设计（Next.js Route Handlers，全部本地）

| 方法 | 路由 | 说明 |
|------|------|------|
| GET | `/api/config` | 读取脱敏配置（Key 打码显示） |
| PUT | `/api/config` | 保存配置（写回 config.json） |
| POST | `/api/config/test-llm` | 连通性测试 |
| GET | `/api/papers` | 已发布试卷列表 |
| POST | `/api/papers/[id]/attempts` | 开考（**不下发答案**） |
| PUT | `/api/attempts/[id]/responses` | 逐题暂存（防刷新丢失） |
| PUT | `/api/attempts/[id]/highlights` | 阅读高亮持久化 |
| POST | `/api/attempts/[id]/submit` | 交卷 → 客观题判分 |
| POST | `/api/attempts/[id]/grade-writing` | 触发写作 AI 批改（异步） |
| GET | `/api/attempts/[id]/result` | 成绩 + 批改结果 |

安全要点：服务只绑 `127.0.0.1`；答案字段在开考接口服务端过滤；attempt 归属校验（本机单用户也做，防手滑串题）。

---

## 8. 页面清单

| 路由 | 页面 |
|------|------|
| `/` | 仪表盘：题库、历史成绩、快捷入口 |
| `/exam/[attemptId]` | 机考界面（阅读/写作共用框架，按 SectionType 渲染） |
| `/result/[attemptId]` | 成绩页（含写作批改详情） |
| `/settings` | 设置页（AI 配置、端口、数据目录） |

---

## 9. 技术选型

| 层 | 选型 | 理由 |
|----|------|------|
| 框架 | Next.js 14+（App Router, TS），`output: 'standalone'` | 前后端一体，产物可独立运行 |
| UI | Tailwind CSS + shadcn/ui + Zustand | 机考界面高度定制 |
| 数据库 | **better-sqlite3 + Drizzle ORM**（迁移：drizzle-kit） | 单文件零安装，比 Prisma 轻（无引擎二进制） |
| 文件 | `data/` 目录直读直写 | 纯本地，无需对象存储 |
| LLM | 任意 OpenAI 兼容 API（config.json 可配） | 写作批改（V1 唯一 AI 调用） |
| 启动 | 两个平台启动脚本 + Next standalone | 双击即用，无需 Node 开发环境 |
| Node 分发 | 可选：脚本内嵌检测，缺失时提示安装；最终分发可附带 Node 便携版（Mac/Windows 各一档） | 降低使用门槛 |

---

## 10. 里程碑

| 阶段 | 内容 | 预估 |
|------|------|------|
| M1 | 项目骨架、SQLite 建模、config.json 读写、设置页、启动脚本 | 1 周 |
| M2 | 真题结构化入库（卷源格式固化、入库脚本、题库列表页） | 1 周 |
| M3 | 阅读机考（分屏/高亮/导航/Review/判分/成绩页） | 2 周 |
| M4 | 写作机考 + AI 四维批改（prompt 打磨、异步任务、结果页） | 2 周 |
| M5 | 双平台启动脚本打磨、入库 2-3 套真题实测、打包 zip | 0.5 周 |

> 里程碑只覆盖 V1；每个阶段结束产出可直接运行/演示的版本，随时可用。M2 开工前先以已验证的 A 类卷为样板固化卷源格式（HTML 与 JSON 二选一定稿），格式定稿后再写入库脚本。

---

## 11. 风险与待定项

1. **Node 依赖**：目标机器需 Node ≥ 18；最终随包附带便携版 Node 可彻底解决（打包体积 ~50-80MB，可接受）
2. **LLM 成本**：写作批改每次约几毛到 1 元（按模型）。设置页展示累计用量（本地计数）
3. **批改质量**：LLM 给 band 分有漂移风险 → 双模型交叉（可选）+ 提供「重新批改」；prompt 内置官方 rubric 词表
4. **config.json 手改冲突**：界面保存与手改同时发生时，以「文件修改时间戳」为准，界面提示重载
5. **端口占用**：3177 被占自动换端口（脚本内处理）
6. **版权**：剑桥真题仅个人备考使用，勿传播；题库包导出仅含结构化题目数据与引用路径
7. **待定**：是否附带便携 Node；写作批改是否支持多模型交叉评分

---

## 12. 下一步

1. 确认本 PRD → 初始化项目骨架（M1）
2. **先固化卷源格式**：以已入库的 A 类卷（IELTS Mock Test 2025 January）为样板，定稿卷源格式（HTML 或 JSON）与 Schema 校验规则，再实现入库脚本（M2 前置）
