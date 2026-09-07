#!/usr/bin/env node
/**
 * scripts/pack-for-windows.mjs — 打「另一台机器」的测试/分发包(从 macOS 开发机)
 *
 * 为什么必须排除 node_modules / .next / next-server:
 *   1) better-sqlite3 是原生模块(.node),本机是 darwin-arm64 版本,Windows / Intel Mac 加载直接崩;
 *      同架构同 OS 的 mac→mac 才可以用 --keep-deps 连依赖一起带;
 *   2) postbuild 把 node_modules/better-sqlite3 整目录拷进了 next-server/,属同一污染;
 *   3) 启动脚本以 next-server/server.js 是否存在判断是否已构建 —— 带了旧产物就会跳过构建,
 *      于是"一键启动"跑在别机产物上。目标机默认重新 npm install + npm run build。
 *
 * 用法:
 *   node scripts/pack-for-windows.mjs                       # 默认 win:源码 + public(图片/真题)
 *   node scripts/pack-for-windows.mjs --target=mac          # mac:保留 启动.command(中文名正常)
 *   node scripts/pack-for-windows.mjs --with-data           # + data/app.db(先 WAL checkpoint)
 *   node scripts/pack-for-windows.mjs --with-audio          # + public/audio(TTS 音频,159M)
 *   node scripts/pack-for-windows.mjs --with-extras         # + questions/ prototype/
 *   node scripts/pack-for-windows.mjs --keep-deps           # 连 node_modules + next-server 一起带
 *                                                           # (仅同平台同架构可用,包 ~1.6G)
 *   node scripts/pack-for-windows.mjs --full                # 上面数据项全开
 *
 * 产物:dist/ielts-copilot-<win|mac>-<YYYYMMDD-HHMM>.zip(项目 .gitignore 已忽略 dist/)
 */
import { existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const argv = new Set(process.argv.slice(2));
const full = argv.has("--full");
const withData = full || argv.has("--with-data");
const withAudio = full || argv.has("--with-audio");
const withExtras = full || argv.has("--with-extras");
const keepDeps = argv.has("--keep-deps");
const target = [...argv].find((a) => a.startsWith("--target="))?.split("=")[1] || "win";
if (!["win", "mac"].includes(target)) {
  console.error("[pack] --target 只支持 win | mac");
  process.exit(1);
}
const forWin = target === "win";

// ---------- 1. 前置校验 ----------
const must = forWin
  ? [
      // 注意:win 包不打中文名的 启动.bat —— macOS zip 以 UTF-8 存文件名,Windows 资源管理器
      // 解压会按本地代码页误读成 "????.bat" 之类的乱码名,看着脏且易误点;包内只保留
      // ASCII 名的 start.bat(两者内容一致)。
      "start.bat",
      "scripts/start-windows.ps1",
    ]
  : ["启动.command"];
const mustAll = ["package.json", "package-lock.json", "config.example.json"];
const missing = [...must, ...mustAll].filter((f) => !existsSync(join(root, f)));
if (missing.length) {
  console.error("[pack] 缺少必要文件:", missing.join(", "));
  process.exit(1);
}
try {
  execFileSync("zip", ["-h"], { stdio: "ignore" });
} catch {
  console.error("[pack] 未找到 zip 命令(macOS 自带,若丢失请重装 command line tools)");
  process.exit(1);
}

// ---------- 2. 带数据时先把 WAL 合并进 app.db(只拷单文件,避免 -wal/-shm 跨机不一致) ----------
if (withData) {
  const dbPath = join(root, "data", "app.db");
  if (!existsSync(dbPath)) {
    console.warn("[pack] --with-data:未找到 data/app.db,跳过");
  } else {
    try {
      const { createRequire } = await import("node:module");
      const require = createRequire(import.meta.url);
      const Database = require("better-sqlite3");
      const db = new Database(dbPath, { readonly: false });
      db.pragma("wal_checkpoint(TRUNCATE)");
      db.close();
      console.log("[pack] WAL 已 checkpoint → 只需携带 app.db 单文件");
    } catch (e) {
      console.warn("[pack] WAL checkpoint 失败(忽略,将携带 -wal/-shm):", e.message);
    }
  }
}

// ---------- 3. 排除清单 ----------
const excludes = [
  ".git/*",
  "dist/*",
  ".workbuddy/*",
  ".DS_Store",
  "*/.DS_Store",
  "*.log",
  "*.tsbuildinfo",
  "config.json", // 含 apiKey,不随包分发;目标机启动脚本/首次运行会从 example 生成
  "package-for-*.zip",
];
if (!keepDeps) excludes.push("node_modules/*", ".next/*", "next-server/*");
if (!withData) excludes.push("data/*");
else excludes.push("data/*.bak*", "data/app.db-shm", "data/app.db-wal");
if (!withAudio) excludes.push("public/audio/*");
if (!withExtras) excludes.push("questions/*", "prototype/*");
// 中文名坑只影响 Windows 资源管理器;mac 包保留中文名入口(解压后显示正常)
if (forWin) excludes.push("启动.bat");

// ---------- 4. 打包 ----------
const stamp = new Date()
  .toISOString()
  .slice(0, 16)
  .replace(/[-:]/g, "")
  .replace("T", "-");
const distDir = join(root, "dist");
mkdirSync(distDir, { recursive: true });
const out = join(distDir, `ielts-copilot-${target}-${stamp}.zip`);
if (existsSync(out)) rmSync(out);

console.log(
  `[pack] 打包 ${target} 中…(slim${withData ? " +data" : ""}${withAudio ? " +audio" : ""}${withExtras ? " +extras" : ""}${keepDeps ? " +deps" : ""})`,
);
execFileSync("zip", ["-r", "-q", "-X", "-y", out, ".", "-x", ...excludes], {
  cwd: root,
  stdio: "inherit",
});

const mb = (statSync(out).size / 1024 / 1024).toFixed(1);
console.log(`\n[pack] 完成:${out}(${mb} MB)`);

// ---------- 4b. Windows MAX_PATH 预警(260 字符;包内路径 > 200 就有风险) ----------
try {
  const names = execFileSync("unzip", ["-Z1", out], { encoding: "utf8" })
    .split("\n")
    .filter(Boolean);
  const long = names.filter((n) => n.length > 200).sort((a, b) => b.length - a.length);
  if (long.length) {
    console.warn(
      `\n[pack] 警告:${long.length} 个条目路径 > 200 字符 —— Windows 资源管理器解压可能报 0x80010135(路径太长)`,
    );
    console.warn("[pack] 解法:用 7-Zip / Bandizip 解压(自带长路径 API),或解压到短目录如 C:\\ielts\\");
    long.slice(0, 3).forEach((n) => console.warn(`       ${n.length}  ...${n.slice(-56)}`));
  }
} catch {
  // 无 unzip 则跳过预警(不影响产物)
}

// ---------- 5. 目标机步骤 ----------
if (forWin) {
  console.log(`
目标机(Windows)步骤:
  1) 安装 Node.js 22 LTS(https://nodejs.org/zh-cn/download),建议勾选
     "Automatically install the necessary tools"(better-sqlite3 若无预编译包需本地编译)
  2) 用 7-Zip / Bandizip 解压(Windows 资源管理器解压会把中文名解成乱码,故包内只放了
     ASCII 名的 start.bat,与 启动.bat 内容一致)
  3) 双击 start.bat —— ${keepDeps ? "已带依赖,直接起服务" : "首次会自动 npm install + npm run build(数分钟,需联网)"},
     随后自动开浏览器访问 http://127.0.0.1:3177
  4) 结束:关闭浏览器(最迟 ~100s 服务自退)或直接关黑窗口
  5) 源码更新后重新构建:
     powershell -NoProfile -ExecutionPolicy Bypass -File scripts\\start-windows.ps1 -Rebuild
`);
} else {
  console.log(`
目标机(macOS)步骤:
  1) 安装 Node.js 22 LTS(https://nodejs.org/zh-cn/download)${keepDeps ? "(已带依赖时仍需≥22,且架构须与打包机一致:arm64↔arm64)" : ""}
  2) 解压(zip 内文件名 UTF-8,macOS 解压正常,中文名 启动.command 可正常显示)
  3) 若双击提示"无法打开,因为来自身份不明的开发者":右键 启动.command → 打开 → 确认
     (或先执行 chmod +x 启动.command)
  4) 双击 启动.command —— ${keepDeps ? "已带依赖,直接起服务" : "首次自动 npm install + npm run build(数分钟,需联网)"},
     随后自动开浏览器访问 http://127.0.0.1:3177
  5) 结束:关闭浏览器(最迟 ~100s 服务自退);直接关终端窗口同理
`);
}
