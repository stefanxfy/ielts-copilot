# Windows 真机测试手册

> 目标:在一台干净的 Windows 机器上,用 `ielts-copilot-win-*.zip` 跑通「双击 → 自动构建 → 自动开浏览器 → 关浏览器退出」全链路。
> 全程预计 **10–20 分钟**(首次构建占大头),构建完成后再次双击是 **1–2 秒**秒开。

---

## 0. 前置条件

| 项 | 要求 | 说明 |
|---|---|---|
| 系统 | Windows 10 1809+ / Windows 11 | 自带 PowerShell 5.1,无需改执行策略 |
| Node.js | **≥ 22 LTS** | 未装会弹出引导页 |
| 内存 | ≥ 8 GB 推荐(4 GB 能跑但构建易 OOM) | 构建峰值 2.5–4 GB |
| 磁盘 | ≥ 3 GB 可用 | 依赖 735 MB + 构建产物 |
| 网络 | 首次需联网 | `npm install` 拉依赖;之后完全离线可用 |

---

## 1. 三步跑起来

**① 装 Node 22 LTS** —— https://nodejs.org/zh-cn/download

> 不需要勾选 "Automatically install the necessary tools"(那是源码编译备用的;本项目的 SQLite 驱动自带预编译二进制,装好后无需任何编译环境)。

**② 解压 zip(用 7-Zip,不要双击 zip)**

**强烈建议**用 **7-Zip** 或 **Bandizip** —— 资源管理器原生解压会撞两类坑:

- **0x80010135 路径太长**:包内 `public/exams/shared/exam-assets/` 下有几张原站抓来的图,文件名 170+ 字符(例如 `Every country should have a free health service...expensive.jpg`),加上你的解压目录很容易超 Windows 260 字符的 `MAX_PATH` 限制,资源管理器会弹错误 0x80010135 中断复制。7-Zip 用 `\\?\` 长路径 API,不受这个限制。
- 中文文件名解成乱码:macOS zip 以 UTF-8 存中文名,资源管理器按本地代码页误读。

7-Zip 装好后,右键 zip → 7-Zip → **解压到当前文件夹**(或新建短路径如 `C:\ielts\`)。

> 没装 7-Zip 的应急:点资源管理器弹窗里的"**跳过**"(或勾上"为所有当前项目执行此操作")让解压继续,缺失的只是几张题图,不影响启动;但根除还是要用 7-Zip。

**③ 双击 `start.bat`**

接下来全自动,黑窗口会依次打印:

```
[启动] Node v22.x.x (C:\Program Files\nodejs\node.exe)
[启动] 已从 config.example.json 生成 config.json(默认端口 3177)
[启动] 首次运行:安装依赖并构建(数分钟,仅此一次)...
   ... npm install + npm run build 输出 ...
[启动] 服务 PID 12345 -> http://127.0.0.1:3177
[启动] 就绪。关闭浏览器窗口即退出应用(最迟约 100 秒);也可直接关闭本窗口。
```

**怎么判断"在干活"而不是卡死**:标题栏会显示 `npm install` 或 `npm` 相关字样、黑窗口里持续滚动 npm 的安装/编译输出 —— 都说明正常。**首次构建 3–10 分钟属正常**;如果完全静止超过 5 分钟且无任何新输出,参照第 3 节排查。

浏览器会自动打开 `http://127.0.0.1:3177`。

### 想看更细的安装进度?

`npm install` / `npm run build` 的详细输出本来就直接打在黑窗口里。想看得更清楚,可以不双击、改用命令行手动跑(输出实时滚动,滚动条也能回看):

```powershell
cd 解压目录
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\start-windows.ps1
```

另开一个窗口看构建进程的实时内存/CPU(可选):

```powershell
while ($true) { Get-Process node,npm -ErrorAction SilentlyContinue |
  Format-Table Id, @{n='MB';e={[math]::Round($_.WorkingSet64/1MB)}}, CPU -AutoSize; Start-Sleep 3 }
```

---

## 2. 验收清单(逐项打勾)

- [ ] 双击后**没有一闪而过** —— 出错时窗口会 `pause` 停住并打印 `[启动] 启动失败`
- [ ] Node 版本闸生效:临时把 Node 换成 18 应弹出 `docs/need-node.html`(可选测)
- [ ] 首次构建自动完成,未手工干预
- [ ] 浏览器自动打开,地址 `http://127.0.0.1:3177`
- [ ] 首屏仪表盘三状态卡:**DB 正常 / 配置已加载 / LLM 未配置**(黄或灰,因为还没填 Key)
- [ ] 端口占用跳号:手动占住 3177 再双击 → 应自动改用 3178 并打印提示
- [ ] **关闭浏览器窗口 → 约 90–100 秒后黑窗口自动退出**(心跳看门狗)
- [ ] 直接关闭黑窗口 → 服务进程随之终止(任务管理器里 `node.exe` 不残留)
- [ ] 第二次双击:跳过 install/build,1–2 秒起来

---

## 3. 故障排查

| 现象 | 原因 / 处理 |
|---|---|
| 窗口一闪就没 | 极少见(脚本已 pause)。手动跑:`powershell -NoProfile -ExecutionPolicy Bypass -File scripts\start-windows.ps1` |
| **双击后黑窗口里出现大量 `xxx 不是内部或外部命令`,其中 xxx 是批注里的中文片段** | `start.bat` / `启动.bat` 的换行符或编码在传输中被破坏。**解法**:重新下载本 zip 包;如仍出现,改用 ASCII 入口 `start.bat` 或手动执行 PowerShell 命令(见上行) |
| **黑窗口停在"首次运行:安装依赖并构建"后,弹出一个记事本打开 `npm.ps1`** | 旧版启动脚本用 `Get-Command npm` 解析到了 `npm.ps1`,经 cmd 调用时被文件关联当文档打开。**解法**:用**新版** `scripts/start-windows.ps1`(已改为解析 `npm.cmd`)覆盖解压目录里的同名文件后重新双击 |
| **解压时弹 0x80010135 "路径太长"** | 包内 `public/exams/shared/exam-assets/` 几张原站题图文件名 170+ 字符,加上你的解压目录(常见 `C:\Users\xxx\Downloads\...`)超 Windows MAX_PATH 260 限制。**改用 7-Zip 解压**(自带长路径支持);应急点"跳过"继续 |
| `npm install 失败` | 网络不通,或杀软拦截。换网络 / 关杀软重试 |
| `gyp ERR!` / 编译失败 | `better-sqlite3` 没走预编译包 → 重装 Node 勾选 native tools,或装 Visual Studio 生成工具 |
| `npm run build 失败` 且报内存 | 内存不足 → `$env:NODE_OPTIONS="--max-old-space-size=3072"` 后再跑 build;仍不行就上 GitHub Actions 出免构建包 |
| `服务 60 秒内未就绪` | 构建太慢(机械硬盘常见)。把轮询从 60s 调大:`start-windows.ps1` 第 161 行 `$t -le 60` |
| 端口被占且跳号失败 | 有程序占住 3177–3197。改 `config.json` 的 `server.port` |
| 浏览器没自动开 | 无默认浏览器关联。手动访问 `http://127.0.0.1:3177` |
| 关浏览器后不退出 | 检查页面是否真的关闭(后台标签会节流心跳);最迟 100s |
| 中文提示显示成方块/乱码 | 控制台代码页非 936。执行 `chcp 936` 后重开 |

**一键体检**(不确定环境是否达标时先跑它):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-windows-env.ps1
```

---

## 4. 常用命令

```powershell
# 正常启动
双击 start.bat

# 源码更新后强制重建
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\start-windows.ps1 -Rebuild

# 不开浏览器(纯服务,便于远程/脚本化验证)
$env:IELTS_NO_OPEN=1; powershell -NoProfile -ExecutionPolicy Bypass -File scripts\start-windows.ps1

# 看服务内存占用
Get-Process node | Select-Object Id, @{n='MB';e={[math]::Round($_.WorkingSet64/1MB)}}

# 手工健康检查
curl http://127.0.0.1:3177/api/health
```

---

## 5. 测完请反馈这些

1. Windows 版本 + Node 版本 + 内存容量
2. 首次构建耗时(从双击到浏览器打开)
3. `Get-Process node` 的常驻 MB 与构建峰值 MB
4. 验收清单里**没打勾**的项 + 黑窗口最后的报错原文(截图)
5. 若 `npm install` / `npm run build` 失败,贴最后 20 行输出
