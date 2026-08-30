#!/bin/bash
# 启动.command — IELTS Copilot Mac 双击入口(M1 步骤 6,PRD §3.1 六步)
#
# 1) 定位脚本目录并 cd
# 2) node 检查(缺失/主版本<22 → 打开 docs/need-node.html 引导)
# 3) 读 config.json 端口(容注释,缺省 3177);被占则 +1 递增(上限 +20,只进临时变量)
# 4) 后台起 node next-server/server.js(心跳退出 env)+ 健康轮询(60s)
# 5) 就绪后 open 浏览器(测试可 IELTS_NO_OPEN=1 跳过)
# 6) wait 服务进程 —— 浏览器关闭 → 心跳停 → 服务端看门狗 exit → 本脚本随之退出
set -u
cd "$(dirname "$0")" || exit 1

# ---- 1/2. node 版本闸(≥22;better-sqlite3 ABI,见 docs/M1-实施计划.md 风险#1) ----
if ! command -v node >/dev/null 2>&1; then
  echo "[启动] 未检测到 Node.js —— 打开引导页"
  open docs/need-node.html 2>/dev/null
  read -r -p "按回车关闭…" _
  exit 1
fi
NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
if [ "$NODE_MAJOR" -lt 22 ]; then
  echo "[启动] Node 版本过低(v$(node -p process.versions.node),需 ≥22)—— 打开引导页"
  open docs/need-node.html 2>/dev/null
  read -r -p "按回车关闭…" _
  exit 1
fi

# ---- 3. 产物缺失 → 兜底构建(postbuild 自动产出 next-server/) ----
if [ ! -f next-server/server.js ]; then
  echo "[启动] 首次运行:安装依赖并构建(数分钟,仅此一次)…"
  npm install || { read -r -p "构建失败,按回车关闭…" _; exit 1; }
  npm run build || { read -r -p "构建失败,按回车关闭…" _; exit 1; }
fi

# ---- 4. 读端口(容注释 JSONC) ----
PORT="$(node -e "try{const s=require('strip-json-comments');const c=JSON.parse(s(require('fs').readFileSync('config.json','utf8'),{trailingCommas:true}));const p=Number(c&&c.server&&c.server.port);console.log(Number.isInteger(p)&&p>0&&p<65536?p:3177)}catch(e){console.log(3177)}")"
BASE_PORT="$PORT"

# 占口 +1 递增(上限 +20)
N=0
while lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; do
  N=$((N+1))
  if [ "$N" -gt 20 ]; then
    echo "[启动] 端口 ${BASE_PORT}-$((BASE_PORT+20)) 全被占用,退出"
    read -r -p "按回车关闭…" _
    exit 1
  fi
  PORT=$((PORT+1))
done
[ "$N" -gt 0 ] && echo "[启动] 端口 $BASE_PORT 被占用 → 改用 $PORT(不写回 config.json)"

# ---- 5. 起服务 + 健康轮询(60s) ----
HOSTNAME=127.0.0.1 PORT="$PORT" IELTS_HEARTBEAT_EXIT=1 node next-server/server.js &
PID=$!
echo "[启动] 服务 PID $PID → http://127.0.0.1:$PORT"

OK=0
for _ in $(seq 1 60); do
  sleep 1
  if curl -sf "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1; then OK=1; break; fi
  kill -0 "$PID" 2>/dev/null || break
done
if [ "$OK" -ne 1 ]; then
  echo "[启动] 服务 60s 内未就绪,退出(重试请再双击一次)"
  kill "$PID" 2>/dev/null
  read -r -p "按回车关闭…" _
  exit 1
fi

# ---- 6. 开浏览器,随服务进程一起等 ----
if [ "${IELTS_NO_OPEN:-0}" != "1" ]; then
  open "http://127.0.0.1:$PORT"
fi
echo "[启动] 就绪。关闭浏览器窗口即退出应用。"
wait "$PID"
echo "[启动] 应用已退出。"
