<#
.SYNOPSIS
    IELTS Copilot · Windows 环境自检(一键体检)

.DESCRIPTION
    在真机上先跑它,把"环境是否达标"和"卡在哪一步"一次性看清楚。
    只做只读检查,不启动服务、不改任何文件。

    检查项:
      1) Windows 版本 / PowerShell 版本
      2) 物理内存与 C 盘可用空间(构建需要 2.5-4GB 内存、3GB 磁盘)
      3) Node.js 与 npm 是否可用、版本是否 >= 22
      4) config.json 是否存在、端口值
      5) next-server/server.js 是否存在(即是否已构建;未构建=首次会自动 install+build)
      6) data/app.db 是否存在(未建库=首次启动自动建)
      7) 端口是否被占用(占用则启动脚本会 +1 跳号)

.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-windows-env.ps1
#>

$ErrorActionPreference = "SilentlyContinue"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

function Write-Row {
    param([string]$Item, [string]$Value, [string]$Level = "INFO")
    $color = switch ($Level) {
        "PASS" { "Green" }
        "WARN" { "Yellow" }
        "FAIL" { "Red" }
        default { "Gray" }
    }
    Write-Host ("  {0,-8} {1,-26} {2}" -f "[$Level]", $Item, $Value) -ForegroundColor $color
}

Write-Host ""
Write-Host "IELTS Copilot · Windows 环境自检" -ForegroundColor Cyan
Write-Host ("应用目录:{0}" -f $Root) -ForegroundColor DarkGray
Write-Host ""

# ---------- 1. 系统与 PowerShell ----------
$os = Get-CimInstance Win32_OperatingSystem
Write-Host "[系统]" -ForegroundColor White
Write-Row "Windows" ("{0} (build {1})" -f $os.Caption.Trim(), $os.BuildNumber) "INFO"
$psMajor = $PSVersionTable.PSVersion.Major
if ($psMajor -ge 5) { Write-Row "PowerShell" ("v{0}" -f $PSVersionTable.PSVersion) "PASS" }
else { Write-Row "PowerShell" ("v{0} (建议 >= 5.1)" -f $PSVersionTable.PSVersion) "WARN" }

# ---------- 2. 内存与磁盘 ----------
$memGB = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 1)
$freeGB = [math]::Round((Get-PSDrive -Name ($Root.Substring(0, 1))).Free / 1GB, 1)
Write-Host ""
Write-Host "[资源]" -ForegroundColor White
if ($memGB -ge 8) { Write-Row "物理内存" ("{0} GB" -f $memGB) "PASS" }
elseif ($memGB -ge 4) { Write-Row "物理内存" ("{0} GB (构建可能吃力,建议 >= 8GB)" -f $memGB) "WARN" }
else { Write-Row "物理内存" ("{0} GB (偏低,构建大概率 OOM)" -f $memGB) "FAIL" }

if ($freeGB -ge 3) { Write-Row "磁盘可用" ("{0} GB" -f $freeGB) "PASS" }
else { Write-Row "磁盘可用" ("{0} GB (建议 >= 3GB:依赖 735MB + 构建产物)" -f $freeGB) "WARN" }

# ---------- 3. Node / npm ----------
Write-Host ""
Write-Host "[运行时]" -ForegroundColor White
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    Write-Row "Node.js" "未检测到 —— 需安装 22 LTS" "FAIL"
    Write-Row "npm" "未检测到" "FAIL"
}
else {
    $nodeVer = (& $nodeCmd.Source -p "process.versions.node" 2>$null | Select-Object -Last 1)
    [int]$major = 0
    [void][int]::TryParse(($nodeVer -split '\.')[0], [ref]$major)
    if ($major -ge 22) { Write-Row "Node.js" ("v{0} ({1})" -f $nodeVer, $nodeCmd.Source) "PASS" }
    else { Write-Row "Node.js" ("v{0} —— 需 >= 22" -f $nodeVer) "FAIL" }

    $npmCmd = Get-Command npm -ErrorAction SilentlyContinue
    if ($npmCmd) { Write-Row "npm" (& $npmCmd.Source -v 2>$null | Select-Object -Last 1) "PASS" }
    else { Write-Row "npm" "未检测到(随 Node 安装)" "FAIL" }
}

# ---------- 4. 配置文件与端口 ----------
Write-Host ""
Write-Host "[应用状态]" -ForegroundColor White
$configPath = Join-Path $Root "config.json"
$port = 3177
if (Test-Path $configPath) {
    Write-Row "config.json" "存在" "PASS"
    $js = 'try{const s=require("strip-json-comments");const c=JSON.parse(s(require("fs").readFileSync("config.json","utf8"),{trailingCommas:true}));const p=Number(c&&c.server&&c.server.port);console.log(Number.isInteger(p)&&p>0&&p<65536?p:3177)}catch(e){console.log(3177)}'
    $out = & $nodeCmd.Source -e $js 2>$null | Select-Object -Last 1
    [int]$p2 = 0
    if ([int]::TryParse($out, [ref]$p2) -and $p2 -gt 0) { $port = $p2 }
    Write-Row "配置端口" $port "INFO"
}
else {
    Write-Row "config.json" "不存在 —— 首次启动会从 config.example.json 生成" "WARN"
}

$entry = Join-Path $Root "next-server/server.js"
if (Test-Path $entry) { Write-Row "构建产物" "next-server/ 已就绪(启动将跳过构建,秒开)" "PASS" }
else { Write-Row "构建产物" "未构建 —— 首次双击会自动 npm install + build(数分钟)" "WARN" }

$db = Join-Path $Root "data/app.db"
if (Test-Path $db) {
    $sizeMB = [math]::Round((Get-Item $db).Length / 1MB, 1)
    Write-Row "数据库" ("data/app.db {0} MB" -f $sizeMB) "PASS"
}
else { Write-Row "数据库" "不存在 —— 首次启动自动建库并跑迁移" "WARN" }

# ---------- 5. 端口占用 ----------
Write-Host ""
Write-Host "[端口]" -ForegroundColor White
$listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if ($listener) {
    $pidOwner = ($listener | Select-Object -First 1).OwningProcess
    $procName = (Get-Process -Id $pidOwner -ErrorAction SilentlyContinue).ProcessName
    Write-Row ("端口 {0}" -f $port) ("被占用(PID {1} {2})—— 启动脚本会自动改用它 +1" -f $pidOwner, $procName) "WARN"
}
else { Write-Row ("端口 {0}" -f $port) "空闲" "PASS" }

Write-Host ""
Write-Host "结论:PASS=达标 WARN=需留意(多数可自动处理) FAIL=必须先解决" -ForegroundColor DarkGray
Write-Host "下一步:双击 start.bat 启动" -ForegroundColor Cyan
Write-Host ""
