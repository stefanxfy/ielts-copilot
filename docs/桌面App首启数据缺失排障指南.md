# 桌面 App 首启数据缺失排障指南

> **状态**：进行中。装包后打开应用数据为空(无真题、无词库)。
> **目的**：到 Windows 上按本文档步骤直接定位/验证修复。

---

## 1. 现象描述

### 1.1 用户反馈
- 装好 Setup.exe 后双击启动
- WebView 渲染出雅思应用主页面(机考盘、备考计划、机考模拟、背单词四大模块可见)
- 但**所有数据为空**：薄弱真题列表无内容、词库无词、真题收藏为空、学习记录无数据

### 1.2 已排除的因素
| 检查项 | 结果 |
|---|---|
| 应用能否启动 | ✅ 能(loading 页 → WebView 切换到真实应用) |
| node 服务能否启动 | ✅ 能(localhost:3177 正常监听) |
| 网络/端口/Job Object | ✅ 正常 |
| Drizzle 迁移是否应用 | ✅ 5 条迁移都跑了(schema 完整) |
| audio/图片资源是否装包 | ✅ 已装包(server/public/audio + images/words 都存在) |

### 1.3 已确认的问题
- **`data/app.db` 装包后只有 4KB**(仅有 schema，无数据)
- **seed-data/app.db 已进包**(顶层可见)
- **Rust 拷贝逻辑跑过但没拷贝 seed**——desktop.log 无"已从随包 seed 拷贝 app.db"日志

---

## 2. 根因分析

### 2.1 时间线
| 时间 | 事件 |
|---|---|
| 09:23 | `3f096fa` 提交(seed-data/app.db 入库 + 加拷贝逻辑) |
| 09:39 | CI 出包(commit c58233de，包含 seed-data/app.db) |
| 09:45 | 用户下载该 CI 产物 |
| 10:06 | 用户启动应用(此次启动的 exe **不含** `1e20df7` 修复) |
| 10:15 | 我 commit `1e20df7`(改用 marker 文件判断,修复 4KB db 跳过拷贝的 bug) |
| 10:20 | 修复还在本地 v2，未 push，未出包 |

### 2.2 根因
**`3f096fa` 的拷贝逻辑缺陷**：

```rust
// src-tauri/src/main.rs (3f096fa 时)
let db_path = data_dir.join("app.db");
let seed_db = resource_dir.join("seed-data").join("app.db");
if !db_path.exists() && seed_db.exists() {  // ← 这里
    std::fs::copy(&seed_db, &db_path);
}
```

**NSIS 装首次启动流程**：
1. Rust bootstrap 启动
2. drizzle 迁移跑过 → **自动创建 `data/app.db`(只有 schema，4KB)**
3. Rust 检查 `db_path.exists()` → **true**(因为 drizzle 已创建空 schema db)
4. 跳过拷贝 → **seed 永远不写入**

`data/app.db` 在 Rust 检查拷贝**之前**已被 drizzle 迁移创建并填充 schema。这是个**启动顺序问题**：Rust 的拷贝逻辑应该在 drizzle 跑之前，但实际跑在 drizzle 跑之后。

---

## 3. 修复方案

### 3.1 已实现(待 push)
**Commit `1e20df7`(本地未推)**：改用 marker 文件判断

```rust
// 修复后逻辑
let db_path = data_dir.join("app.db");
let seed_marker = data_dir.join(".seed-applied");  // ← marker 文件
let seed_db = resource_dir.join("seed-data").join("app.db");

if !seed_marker.exists() && seed_db.exists() {
    // 备份原 db(若有)
    if db_path.exists() {
        let _ = std::fs::copy(&db_path, data_dir.join("app.db.bak-pre-seed"));
    }
    // 覆盖式拷贝 seed
    std::fs::copy(&seed_db, &db_path);
    // 写 marker
    std::fs::write(&seed_marker, b"applied");
}
```

**关键改进**：
- 用 `data/.seed-applied` 存在性判断「是否已播种」(drizzle 不会创建这个文件)
- marker 存在 → 跳过(避免重复拷贝阻塞启动)
- marker 不存在 + seed_db 存在 → 覆盖式拷贝 + 写 marker
- 用户已有 db → 自动备份为 `app.db.bak-pre-seed` 再覆盖
- 拷贝失败仅警告,不影响应用启动

### 3.2 待 push 的 commits
```
1e20df7  fix(desktop): seed 拷贝改用 marker 文件,覆盖空 schema db
d5c5618  fix(iot-fetch): 兼容2025-07+新版答案结构
3f096fa  chore(repo): 补 v3 新生成的生图 + seed-data/app.db 入库
8e28eee  chore(scripts): gitignore 注释 audio/images + scripts 并发保护
35e3cc4  chore(repo): public/audio + public/images/words 入库(已在 origin)
```

### 3.3 push + 出包后预期
- 装新版 Setup.exe
- 首次启动 desktop.log 应包含：
  ```
  [bootstrap] 检测到旧 db,已备份为 app.db.bak-pre-seed
  [bootstrap] 已从随包 seed 拷贝 app.db (14000000 字节)
  ```
- 应用打开后能看到词库、真题、学习数据

---

## 4. 临时手动验证(等不及 push + CI)

**适用场景**：你不想等 30-50 分钟 CI 出包，想现在立即看到数据。

### 4.1 操作步骤

#### 步骤 A：把 mac 上的 14MB seed.db 拷到 Windows 安装目录

**Windows 资源管理器**：
1. 地址栏粘贴：
   ```
   %LOCALAPPDATA%\IELTS Copilot
   ```
2. 回车进入应用安装目录
3. 双击进入 `data/` 子目录
4. 把当前的 `app.db` 重命名为 `app.db.bak-pre-seed`(留作备份)
5. 把 mac 上的 `src-tauri/seed-data/app.db`(14MB)拷到 `data/` 下,重命名为 `app.db`

#### 步骤 B：启动应用

双击 `IELTS Copilot.exe` 启动。

#### 步骤 C：检查 desktop.log

```
notepad %APPDATA%\ielts-copilot\data\desktop.log
```

或资源管理器地址栏粘贴：
```
%APPDATA%\ielts-copilot\data\desktop.log
```

**预期日志**：
```
[bootstrap] 桌面壳启动
[bootstrap] node PID xxx → http://127.0.0.1:3177
[bootstrap] 就绪:http://127.0.0.1:3177
```

(手动覆盖后,drizzle 不会再次迁移,因为 app.db 已有 __drizzle_migrations 行)

### 4.2 应用层验证

应用打开后:
1. 进入「机考盘」 → 看到「薄弱真题·巩固清单」有内容
2. 进入「背单词」 → 词书选择能看到「雅思核心词 3500」等
3. 点开任意一个词 → 看到配图 + 翻译 + 助记卡

### 4.3 验证 mac seed.db 与 Windows 当前 app.db 一致性

如果 mac 上的 seed.db 与 Windows 装的 app.db 内容格式有差异(比如迁移号不对),启动后会报"table already exists"或类似 drizzle 错误。

**诊断命令**(Windows cmd):
```bat
cd "%LOCALAPPDATA%\IELTS Copilot\server"
..\runtime\node.exe -e "const Database=require('better-sqlite3'); const db=new Database('../data/app.db',{readonly:true}); console.log('migrations:', db.prepare(\"SELECT count(*) c FROM __drizzle_migrations\").get().c, '| words:', db.prepare(\"SELECT count(*) c FROM words\").get().c);"
```

**预期输出**:
```
migrations: 5 | words: 3500+
```

---

## 5. 完整诊断 checklist(给 agent 测试用)

### 5.1 装包状态检查
```bat
:: 安装目录结构
dir "%LOCALAPPDATA%\IELTS Copilot" /b
:: 预期看到: ielts-copilot.exe, data, server, runtime, seed-data, uninstall.exe, _up_

:: seed-data 存在性 + 大小
dir "%LOCALAPPDATA%\IELTS Copilot\seed-data"
:: 预期看到 app.db 大约 14000000 字节

:: data/app.db 当前状态
dir "%LOCALAPPDATA%\IELTS Copilot\data\app.db"
```

### 5.2 资源检查
```bat
:: 音频(应能看到 contexts/sentences/words 三个子目录)
dir "%LOCALAPPDATA%\IELTS Copilot\server\public\audio" /b

:: 图片(应能看到 words 子目录,几百个 PNG)
dir "%LOCALAPPDATA%\IELTS Copilot\server\public\images\words" /b | find /c "v3"
```

### 5.3 应用启动诊断
```bat
:: 启动后检查 desktop.log
type "%APPDATA%\ielts-copilot\data\desktop.log"

:: 看 stderr 文件(若有未捕获错误)
type "%TEMP%\ielts-copilot-node-stderr.log"
```

### 5.4 数据完整性验证
```bat
:: 在 server 目录下用 node 检查 db
cd "%LOCALAPPDATA%\IELTS Copilot\server"
..\runtime\node.exe -e "
const Database = require('better-sqlite3');
const db = new Database('../data/app.db', { readonly: true });
const tables = db.prepare(\"SELECT name FROM sqlite_master WHERE type='table' ORDER BY name\").all();
for (const r of tables) {
  try {
    const cnt = db.prepare('SELECT count(*) c FROM \"' + r.name + '\"').get();
    console.log(r.name + ': ' + cnt.c);
  } catch (e) { console.log(r.name + ': (查不到)'); }
}
"
```

**预期**(正常有数据):
```
__drizzle_migrations: 5
app_settings: 7
book_word_relation: 4000+
papers: 6
words: 3500+
word_books: 4
word_progress: 10+
...
```

**异常**(空 db):
```
__drizzle_migrations: 5
app_settings: 1
book_word_relation: 0
papers: 0
words: 0
...
```

---

## 6. 已知坑点

### 6.1 SmartScreen 拦截
未签名 exe 首次启动会触发 SmartScreen,点「更多信息」→「仍要运行」即可。

### 6.2 stderr 日志路径
- 旧版:`%TEMP%\ielts-copilot-node-stderr.log`
- 新版(`commit 06de473` 之后):`%TEMP%\ielts-copilot-node-stderr.log`(可能是 `%TEMP%\1\...`,Windows 在低权限下重定向)

### 6.3 数据目录选择
Tauri v2 NSIS per-user 装时,`pick_data_dir` 优先选可写路径(NSIS 默认 `%LOCALAPPDATA%\Programs\IELTS Copilot`)。这是 `data/` 目录在 install_root 而不是 `%APPDATA%` 的原因。

### 6.4 资源平铺
Tauri v2 NSIS per-user 装把 resources 平铺到 install_root,而不是 `resources/` 子目录。所以 `seed-data/app.db` 在 `IELTS Copilot\seed-data\app.db`,不在 `IELTS Copilot\resources\seed-data\app.db`。

---

## 7. CI 出包预期

### 7.1 push 后预计 CI 时长
- npm install 阶段:从 git 拉 340MB 资源(audio+images+seed-data)→ ~5-8 分钟
- Rust 编译:5-10 分钟(有缓存)
- NSIS 打包:10-15 分钟
- **总计**:20-33 分钟

### 7.2 出包大小
- 装包大小:LZMA 压缩后约 80-110MB(从 ~340MB raw 压缩)
- audio 音频高度冗余,压缩比约 60-70%
- images/words 已是 PNG,压缩比约 80%
- 14MB seed.db 压缩后约 5-7MB

---

## 8. 当前 commit 状态(2026-09-08 10:54)

```
origin/v2 head: c58233de (包含 3f096fa seed-data/app.db 入库 + 拷贝逻辑缺陷)
本地 v2 head: 1e20df7 (marker 逻辑修复,未 push)
```

**待 push 1 个 commit**:`1e20df7`
**包含的修复**:seed 拷贝逻辑改用 marker 文件,覆盖已有空 schema db

---

## 9. 验证修复后的关键检查点

启动应用并进入主页面后,检查以下数据可见:

| 模块 | 检查项 |
|---|---|
| 机考盘 | 「薄弱真题·巩固清单」显示真题条目 |
| 机考盘 | 「备考计划」显示已排计划 |
| 背单词 | 「雅思核心词 3500」等词书可见 |
| 背单词 | 单词详情页:有图片、能听发音、有例句 |

如果以上都不显示 → 数据未正确装载,看 desktop.log。

如果应用启动失败 → 看 stderr(ielts-copilot-node-stderr.log)。

如果词卡图 404 → 检查 server/public/images/words/v3/ 是否有对应 PNG。

如果音频 404 → 检查 server/public/audio/words/ 是否有对应 MP3。
