@echo off
REM Windows launcher for IELTS Copilot
REM
REM Delegates all Node/Next.js logic to scripts/start-windows.ps1.
REM This wrapper is ASCII-only so it works under any Windows code page.

cd /d "%~dp0"

where powershell >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo [Launch] PowerShell not found. Please install PowerShell and retry.
    echo.
    pause
    exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-windows.ps1" %*

if %errorlevel% neq 0 (
    echo.
    echo [Launch] Startup failed. Please screenshot the error above.
    echo.
    pause
)
