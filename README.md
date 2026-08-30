# IELTS Copilot · 雅思自学备考指南

IELTS 本地机考备考应用（开发中）

## 当前状态

V1 范围：阅读机考 + 写作机考 + AI 批改（听力/口语 V2 暂缓）。A 类 + G 类双支持。
真题以 HTML 方式直接内置为主，PDF 导入为辅。

## 目录结构

```
ielts-copilot/
├── docs/                      # 产品文档
│   └── IELTS-机考网站PRD.md    # PRD v3.0（架构/里程碑/判分设计）
├── prototype/                 # 高保真原型 + HTML 真题
│   ├── index.html             # 主原型（仪表盘/机考模拟/学习/设置 + A/G 切换题库）
│   ├── gt-reading-test.html   # G类阅读真题 · 一月卷 Test 1（原站样式保留 + 蓝主题 + inline 批改）
│   ├── gt-reading-answers.html# G类答案速查页（40 题，按 Part 折叠）
│   ├── a-reading-test.html    # A类阅读真题 · 2025 January Test 1（同上）
│   ├── a-reading-answers.html # A类答案速查页
│   ├── a-writing-test.html    # A类写作真题 · 2025 January Test 1（双 Task 编辑器/字数统计/交卷拦截提示，无判分）
│   ├── gt-writing-test.html   # G类写作真题 · 一月卷 Test 1（Task1 公交服务书信 + Task2 免费医疗议论文，同上）
│   ├── a-listening-test.html  # A类听力真题 · 2025 January Test 1（音频本地化 + 原生控件；门槛/锁已在引擎层根除）
│   └── exam-assets/           # 机考页依赖（勿与真题页分离）
│       ├── scoring.js         # 通用判分引擎（采集/判分/band换算/inline批改/交卷拦改重做，仅阅读页用）
│       ├── exam-note.js       # 写作/听力页练习提示（按 body class 自适配文案，拦截交卷/保存/时间到）
│       ├── clock-sec.js       # 倒计时到秒（mm:ss 接管原站整分钟显示，≤10 分钟转红，四页通用）
│       ├── answers-*.js       # 按套题的答案数据（window.IELTS_EXAM）
│       ├── listening-*.mp3    # 听力卷音频（本地化，原远程 OSS 引用已改接）
│       └── (其余文件为原站 CSS/JS/图片，逐字节原样复制)
└── exam-analysis/             # 加工脚本与数据
    ├── reskin-v2.py           # 阅读卷换皮脚本：保存页 → 内置真题页（拷资源/重定向/去品牌/主题/注入判分）
    ├── reskin-writing.py      # 写作卷换皮脚本：同骨架但不注判分，改注 exam-note.js，并抹除存档页账号信息
    ├── reskin-listening.py    # 听力卷换皮脚本：音频本地化改接 + 隐藏"Click here to start"开场门槛
    ├── answers-gt-vol1-test1.json  # 从答案保存页抽取的 40 题答案
    ├── build.py               # v1 自研重建脚本（已弃用，留档）
    └── extracted.json         # v1 结构化抽取（留档）
```

## 新增一套 HTML 真题的流程

1. 从培训机构保存真题页（HTML + `_files/` 目录），放进 `questions/<科目>/`
2. 阅读卷：修改 `exam-analysis/reskin-v2.py` 的 SRC/SRC_FILES/OUT 路径；写作卷：改 `reskin-writing.py`（同骨架，不注判分）
3. 运行脚本：资源拷入 `prototype/exam-assets/`、引用重定向、主题覆盖；阅读卷注入判分，写作卷注入练习提示
4. 阅读卷若有答案保存页：按 `sys-answer` 结构抽取答案 → 生成 `exam-assets/answers-<id>.js`
5. 在 `prototype/index.html` 的 PAPERS 数据挂入口（带 `href` + `only` 即点即考）

## 打开方式

直接双击 `prototype/gt-reading-test.html`（需与 `exam-assets/` 同目录），
或打开 `prototype/index.html` 从「机考模拟」进入。

## 数据来源

- 真题：ieltsonlinetests.com 保存页（本地换皮，仅个人学习使用，勿分发）
- band 换算：雅思官方阅读半分制对照表（A/G 同表）
