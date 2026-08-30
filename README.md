# IELTS Copilot · 雅思自学备考指南

本地机考备考应用 · A/G 双类 · 阅读 + 写作 + 听力(原型已验证,M1 工程化进行中)

仓库包含两套产物:

- **原型**(原型时代的 A/G × 阅读/写作/听力四科可考,带判分/速查):直接双击 `prototype/` 下 HTML 即可
- **工程版 M1**(Next.js 16 + SQLite,正在搭建):双击 `启动.command` 起本地服务,数据存本机

> 工程版与原型并存:M1 计划见 `docs/M1-实施计划.md`(2026-08-30 落地文档)。本 README 末尾附 M1 验收清单。

---

## 1. 快速开始(双击启动 — 工程版 M1)

1. **macOS · 首次启动**:在仓库根目录双击 `启动.command`
   - 自动检查 Node(≥22,缺则引导打开 `docs/need-node.html`)
   - 产物缺失 → 自动 `npm install && npm run build`(仅此一次)
   - 端口 3177 被占 → 自动 +1 递增(最多 +20,不写回 `config.json`)
   - 60 秒健康轮询 → 自动开浏览器 → 浏览器关 ≤100s 应用退出
2. **浏览器使用**:首屏仪表盘(DB / 配置 / LLM 三状态卡)→ 点「设置」填 API Key → 回仪表盘确认全绿
3. **数据位置**:`data/app.db`(SQLite,自动建库)+ `config.json`(本地配置,**勿分享**)
4. **Windows 启动**:M1 不交付(2026-08-30 用户决定),移至 M5

---

## 2. 目录结构

```
ielts-copilot/
├─ 启动.command              # macOS 双击入口(M1)
├─ config.example.json       # 配置样板(进 git,带完整注释)
├─ config.json               # 运行时配置(本地,不进 git)
├─ package.json / next.config.ts / tsconfig.json / eslint.config.mjs / drizzle.config.ts / components.json
├─ docs/                     # 产品与工程文档
│  ├─ IELTS-机考网站PRD.md   # PRD v3.2(产品口径)
│  ├─ M1-实施计划.md          # M1 工程里程碑(2026-08-30 定稿)
│  └─ need-node.html          # Node 缺失引导页
├─ prototype/                # 原型时代的 HTML 真题(保留,与工程版并存)
│  └─ (见第 4 节)
├─ exam-analysis/            # 原型换皮脚本 + 数据(保留)
├─ questions/                # 真题源 HTML(原始保存页)
├─ scripts/                  # 工程脚本(M1)
│  ├─ dev.mjs                # 读 config 端口 → next dev -H 127.0.0.1 -p PORT
│  ├─ postbuild.mjs          # standalone 产物修补 → next-server/(自动 npm 钩子)
│  └─ db-inspect.mjs         # 调试:dump 表计数
├─ src/                      # Next.js 16 App Router
│  ├─ instrumentation.ts     # 启动钩子:建库 + 心跳看门狗(仅打包模式)
│  ├─ app/                   # 页面与 API
│  │  ├─ page.tsx            # 仪表盘(三状态卡 + 快捷入口)
│  │  ├─ settings/page.tsx   # 设置页(port/host 只读 + AI provider/apiKey/model/timeout)
│  │  └─ api/                # health / heartbeat / config / config/test-llm
│  ├─ db/                    # Drizzle schema + 迁移(进 git) + 单例
│  ├─ lib/                   # paths / config(zod) / config-schema / band-table / llm/providers
│  ├─ components/ui/         # shadcn 生成(button/input/select/card/label/sonner)
│  ├─ components/heartbeat.tsx  # 客户端 5s 心跳 + visibilitychange 回前台补发
│  └─ stores/settings.ts     # zustand
├─ data/                     # SQLite 库(运行时生成,gitignore)
├─ next-server/              # 编译产物(PRD §3.1 命名,gitignore,postbuild 生成)
├─ public/                   # 静态资源(M2 真题图片进这里)
└─ .gitignore                # 双态共存:node_modules / .next / next-server / data / config.json 一律忽略
```

---

## 3. npm scripts

| 命令 | 作用 |
|---|---|
| `npm run dev` | 开发模式:读 config.json 端口 → next dev,无心跳退出 |
| `npm run build` | 生产构建 → 自动触发 `postbuild` 生成 `next-server/` |
| `npm run start` | 启动产物:`node next-server/server.js`(心跳退出 env 由启动脚本注入) |
| `npm run lint` | eslint .(Next 16 已移除 `next lint`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:generate` | drizzle-kit 生成新迁移(进 git) |
| `npm run db:studio` | drizzle-kit studio(可视化 DB) |

---

## 4. 原型(保留,与工程版并存)

```
prototype/
├─ index.html                  # 主原型:仪表盘 + 机考模拟 + 学习 + 设置 + A/G 切换
├─ a-reading-test.html         # A 类阅读真题 · 2025 January Test 1
├─ a-reading-answers.html      # A 类答案速查页
├─ a-writing-test.html         # A 类写作真题 · 2025 January Test 1(无客观判分,设计如此)
├─ a-listening-test.html       # A 类听力真题 · 2025 January Test 1(音频本地化 + 引擎判分)
├─ a-listening-answers.html    # A 类听力答案速查页
├─ gt-reading-test.html        # G 类阅读真题 · 一月卷 Test 1
├─ gt-reading-answers.html     # G 类答案速查页
├─ gt-writing-test.html        # G 类写作真题 · 一月卷 Test 1
├─ gt-listening-test.html      # G 类听力真题 · 一月卷 Test 1
├─ gt-listening-answers.html   # G 类听力答案速查页
└─ exam-assets/                # 原型依赖(勿与真题页分离)
   ├─ scoring.js               # 通用判分引擎(阅读/听力)
   ├─ exam-note.js             # 写作/听力页练习提示
   ├─ clock-sec.js             # 倒计时到秒(四页通用)
   ├─ answers-*.js             # 按套题的答案数据
   ├─ listening-*.mp3          # 听力卷音频
   └─ (原站 CSS / JS / 图片,逐字节原样复制)
```

打开方式:直接双击 `prototype/index.html`,或某套真题 HTML(需与 `exam-assets/` 同目录)。

## 5. 新增一套 HTML 真题(原型流程)

1. 从培训机构保存真题页(HTML + `_files/`),放进 `questions/<科目>/`
2. 阅读卷:改 `exam-analysis/reskin-v2.py` 的 SRC / SRC_FILES / OUT;写作卷:改 `reskin-writing.py`(同骨架,不注判分);听力卷:改 `reskin-listening.py`
3. 运行脚本:资源拷入 `prototype/exam-assets/`、引用重定向、主题覆盖;阅读/听力注入判分,写作注入练习提示
4. 答案页:按 `sys-answer` 结构抽取 → 生成 `exam-assets/answers-<id>.js`
5. 在 `prototype/index.html` 的 PAPERS 数据挂入口(`href` + `only` 即点即考)

## 6. 数据来源与隐私

- 真题来源:ieltsonlinetests.com 保存页(本地换皮,仅个人学习使用,勿分发)
- band 换算:雅思官方阅读半分制对照表(A/G 同表)
- **`config.json` 中的 `apiKey` 明文存储仅限本机自用 —— 勿把整个文件夹分享出去**
- 工程版所有数据存本机 SQLite(`data/app.db`),无任何外发请求(LLM 调用走用户自配 endpoint)

---

## 7. M1 工程版验收清单(2026-08-30)

| 条目 | 状态 |
|---|---|
| 任务 A · A 类 2025 Jan 写作入原型 | ✅ |
| §3.1 双击 `启动.command` 六步全链(node 闸 / 端口跳号 / 健康 / 开浏览器 / 关浏览器退出) | ✅ |
| §3.2 config.json 双通道(界面 ↔ 手改文件互认,mtime 优先);apiKey 不出 GET | ✅ |
| §6 核心表全部建成且迁移幂等(12 表 + drizzle journal) | ✅ |
| §7 GET/PUT `/api/config`、POST `/api/config/test-llm` 行为符合 | ✅ |
| §8 `/` 与 `/settings` 两页面可用 | ✅ |
| §9 技术栈齐(Next 16 + TS + Tailwind 4 + shadcn + zustand + better-sqlite3 + Drizzle) | ✅ |
| 用户诉求预留:responses 逐题记录表 + attempts 可回放字段就绪(M2/M3 直接使用) | ✅ |
| Windows 启动脚本 `.bat` | ⏸ M5(2026-08-30 用户决定延后) |

判分引擎、卷源解析入库、机考界面、成绩页 → 见 `docs/M1-实施计划.md` 后续里程碑(M2/M3)。
