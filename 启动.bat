@echo off
REM 启动.bat — IELTS Copilot Windows 双击入口
REM
REM 与 macOS 启动.command 行为对齐:
REM   1) 进入本脚本所在目录(支持路径含空格)
REM   2) 主体逻辑在 scripts/start-windows.ps1:Node 版本闸(>=22)-> 首次自动构建
REM      -> 读 config.json 端口(被占则 +1,最多 +20)-> 健康轮询 -> 开浏览器
REM      -> 关浏览器后由服务心跳看门狗退出,本脚本随之结束
REM   3) 直接关闭本窗口也可结束服务
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
