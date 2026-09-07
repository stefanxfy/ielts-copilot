<#
.SYNOPSIS
    IELTS Copilot · Windows 一键启动脚本(与 macOS 启动.command 行为对齐)

.DESCRIPTION
    双击仓库根目录的 启动.bat 即调用本脚本(带 -ExecutionPolicy Bypass,无需改系统策略)。
    六步链路:
      1) 定位应用根目录(scripts/ 的上一级)并进入
      2) Node 版本闸(缺失或主版本 < 22 -> 打开 docs/need-node.html 引导)
      3) config.json 缺失 -> 从 config.example.json 复制(首次运行常见)
      4) next-server/server.js 缺失 -> npm install && npm run build(仅此一次,数分钟)
      5) 读 config.json 端口(容注释/尾逗号,缺省 3177);被占用则 +1 递增(上限 +20,不写回文件)
      6) 后台起 node next-server/server.js + /api/health 轮询 60s -> 开浏览器 -> 前台等进程退出
         (心跳看门狗 IELTS_HEARTBEAT_EXIT=1:关闭浏览器 <=100s 服务自退,本脚本随之退出)

.PARAMETER Rebuild
    强制重新构建(先删 next-server/ 再 install + build)。源码更新后使用。

.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-windows.ps1 -Rebuild
#>
[CmdletBinding()]
param(
    [switch]$Rebuild
)

$ErrorActionPreference = "Stop"

# ---------- 0. 定位应用根目录并进入 ----------
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $Root
try { $Host.UI.RawUI.WindowTitle = "IELTS Copilot" } catch { }

$ServerEntry = Join-Path $Root "next-server/server.js"
$ConfigPath  = Join-Path $Root "config.json"
$ExamplePath = Join-Path $Root "config.example.json"
$GuidePage   = Join-Path $Root "docs/need-node.html"
$DefaultPort = 3177
$MaxPortStep = 20

function Write-Step {
    param(
        [string]$Message,
        [string]$Color = "Gray"
    )
    Write-Host "[启动] $Message" -ForegroundColor $Color
}

function Stop-WithMessage {
    param([string]$Message)
    Write-Host ""
    Write-Host "[启动] $Message" -ForegroundColor Red
    exit 1
}

function Open-Guide {
    param([string]$Reason)
    Write-Host ""
    Write-Host "[启动] $Reason" -ForegroundColor Yellow
    if (Test-Path $GuidePage) {
        try { Start-Process $GuidePage | Out-Null } catch { }
    }
    exit 1
}

function Test-PortListening {
    param([int]$Port)
    if (Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue) {
        $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        return ($null -ne $conn)
    }
    # 回退:老系统(无 Get-NetTCPConnection)用 netstat
    $lines = & netstat -ano -p tcp 2>$null
    foreach ($line in $lines) {
        if (($line -match "LISTENING") -and ($line -match "[:\.]$Port\s")) { return $true }
    }
    return $false
}

# ---------- 1/2. Node 版本闸(>= 22;better-sqlite3 原生模块 ABI) ----------
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) { Open-Guide "未检测到 Node.js -- 打开引导页" }

$NodeExe = $nodeCmd.Source
$nodeVersion = (& $NodeExe -p "process.versions.node" 2>$null | Select-Object -Last 1)
if ([string]::IsNullOrWhiteSpace($nodeVersion)) { Open-Guide "Node.js 无法执行 -- 打开引导页" }

[int]$nodeMajor = 0
[void][int]::TryParse(($nodeVersion -split '\.')[0], [ref]$nodeMajor)
if ($nodeMajor -lt 22) { Open-Guide "Node 版本过低(v$nodeVersion,需 >= 22) -- 打开引导页" }
Write-Step "Node v$nodeVersion ($NodeExe)"

# ---------- 3. config.json 缺失 -> 从样板复制 ----------
if (-not (Test-Path $ConfigPath)) {
    if (Test-Path $ExamplePath) {
        Copy-Item $ExamplePath $ConfigPath
        Write-Step "已从 config.example.json 生成 config.json(默认端口 $DefaultPort)"
    }
    else {
        Write-Step "缺少 config.json,按默认端口 $DefaultPort 启动"
    }
}

# ---------- 4. 产物缺失(或 -Rebuild) -> 安装依赖并构建 ----------
if ($Rebuild -and (Test-Path (Join-Path $Root "next-server"))) {
    Write-Step "强制重新构建:清理 next-server/ ..."
    Remove-Item -Recurse -Force (Join-Path $Root "next-server") -ErrorAction SilentlyContinue
}

if (-not (Test-Path $ServerEntry)) {
    $npmCmd = Get-Command npm -ErrorAction SilentlyContinue
    if (-not $npmCmd) { Stop-WithMessage "未检测到 npm(随 Node.js 一起安装),请先重装 Node.js" }

    Write-Host ""
    Write-Step "首次运行:安装依赖并构建(数分钟,仅此一次)..." "Cyan"
    Write-Host ""
    & cmd.exe /c "`"$($npmCmd.Source)`" install"
    if ($LASTEXITCODE -ne 0) {
        Stop-WithMessage "npm install 失败(退出码 $LASTEXITCODE)。常见原因:网络不通,或 better-sqlite3 需编译环境(安装 Node 时勾选 'Automatically install the necessary tools',或装 Visual Studio 生成工具)"
    }
    & cmd.exe /c "`"$($npmCmd.Source)`" run build"
    if ($LASTEXITCODE -ne 0) { Stop-WithMessage "npm run build 失败(退出码 $LASTEXITCODE)" }
    if (-not (Test-Path $ServerEntry)) { Stop-WithMessage "构建完成但未找到 next-server/server.js" }
}

# ---------- 5. 读端口(容注释 JSONC,与 macOS 启动.command 同款逻辑) ----------
[int]$Port = $DefaultPort
if (Test-Path $ConfigPath) {
    $js = 'try{const s=require("strip-json-comments");const c=JSON.parse(s(require("fs").readFileSync("config.json","utf8"),{trailingCommas:true}));const p=Number(c&&c.server&&c.server.port);console.log(Number.isInteger(p)&&p>0&&p<65536?p:3177)}catch(e){console.log(3177)}'
    $out = (& $NodeExe -e $js 2>$null | Select-Object -Last 1)
    [int]$parsed = 0
    if ([int]::TryParse($out, [ref]$parsed) -and $parsed -gt 0 -and $parsed -lt 65536) { $Port = $parsed }
}

$BasePort = $Port
[int]$step = 0
while (Test-PortListening $Port) {
    $step++
    if ($step -gt $MaxPortStep) {
        Stop-WithMessage "端口 $BasePort ~ $($BasePort + $MaxPortStep) 全被占用,退出"
    }
    $Port = $Port + 1
}
if ($step -gt 0) { Write-Step "端口 $BasePort 被占用 -> 改用 $Port(不写回 config.json)" }

# ---------- 6. 起服务 + 健康轮询(60s) ----------
$env:PORT = [string]$Port
$env:HOSTNAME = "127.0.0.1"
$env:IELTS_HEARTBEAT_EXIT = "1"

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $NodeExe
$psi.Arguments = '"' + $ServerEntry + '"'
$psi.WorkingDirectory = $Root
$psi.UseShellExecute = $false

$server = [System.Diagnostics.Process]::Start($psi)
Write-Step "服务 PID $($server.Id) -> http://127.0.0.1:$Port"

$ready = $false
for ($t = 1; $t -le 60; $t++) {
    Start-Sleep -Seconds 1
    if ($server.HasExited) { break }
    try {
        $resp = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/api/health" -UseBasicParsing -TimeoutSec 3
        if ([int]$resp.StatusCode -eq 200) { $ready = $true; break }
    }
    catch { }
}

if (-not $ready) {
    if (-not $server.HasExited) { $server.Kill() }
    Stop-WithMessage "服务 60 秒内未就绪,已停止(重试请再双击一次)"
}

# ---------- 7. 开浏览器,随服务进程一起等 ----------
if ($env:IELTS_NO_OPEN -ne "1") {
    try { Start-Process "http://127.0.0.1:$Port" | Out-Null }
    catch { Write-Step "无法自动打开浏览器,请手动访问 http://127.0.0.1:$Port" }
}
Write-Step "就绪。关闭浏览器窗口即退出应用(最迟约 100 秒);也可直接关闭本窗口。"

try {
    $server.WaitForExit()
}
finally {
    if (-not $server.HasExited) {
        Write-Step "正在停止服务进程 $($server.Id) ..."
        $server.Kill()
    }
}

Write-Step "应用已退出。"
