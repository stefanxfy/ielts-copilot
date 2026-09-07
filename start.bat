@echo off
REM start.bat — IELTS Copilot Windows 双击入口(ASCII 文件名版)
REM
REM 与 启动.bat 内容完全一致,仅文件名不同:从 macOS 打的 zip 在 Windows 资源管理器里
REM 解压时,中文文件名可能被解成乱码(编码差异),此文件保证任何环境下都能正常双击。
REM 两个入口二选一即可,维护时请同步修改。
REM
REM 主体逻辑在 scripts/start-windows.ps1:Node 版本闸(>=22)-> 首次自动构建
REM -> 读 config.json 端口(被占则 +1,最多 +20)-> 健康轮询 -> 开浏览器
REM -> 关浏览器后由服务心跳看门狗退出,本脚本随之结束;直接关闭本窗口也可结束服务。
REM
REM 说明:无需修改 PowerShell 执行策略(下面已带 -ExecutionPolicy Bypass)

chcp 936 >nul 2>&1
title IELTS Copilot
cd /d "%~dp0"

where powershell >nul 2>nul
if errorlevel 1 (
  echo.
  echo [启动] 未找到 PowerShell,请升级 Windows 或安装 PowerShell 后重试。
  echo.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-windows.ps1" %*

if errorlevel 1 (
  echo.
  echo [启动] 启动失败,请截图上面的错误信息反馈。
  echo.
  pause
)
