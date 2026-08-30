/**
 * src/components/heartbeat.tsx — 客户端心跳(M1 步骤 5)
 *
 * 每 5s POST /api/heartbeat;visibilitychange 回前台立即补发一跳
 * (后台标签被节流漏跳后,切回时第一时间续上)。挂 root layout,全站生效。
 * 配套:服务端看门狗见 src/instrumentation.ts(仅打包模式退出,dev 不杀)。
 */
"use client";

import { useEffect } from "react";

export function Heartbeat() {
  useEffect(() => {
    const ping = () => {
      fetch("/api/heartbeat", { method: "POST", keepalive: true }).catch(() => {});
    };
    ping();
    const timer = setInterval(ping, 5000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") ping();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
  return null;
}
