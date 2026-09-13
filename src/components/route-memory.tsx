"use client";

/**
 * RouteMemory — 全局路由记忆器(挂根布局,全站唯一实例)
 *
 * 持续把「最近一个非机考页」写进 sessionStorage(`ielts_return_path`),
 * 供机考页退出时回跳:从哪进就回哪页,而不是固定回仪表盘。
 *
 * 规则:
 * - 路径以 /exam 开头(含 /exam?jump= 回看)时不记录 —— 保住进机考前的页面;
 * - 其余路径每次变化都覆盖刷新;
 * - sessionStorage 按标签页隔离,双开考试互不串扰。
 */
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const KEY = "ielts_return_path";

export function getExamReturnPath(fallback = "/"): string {
  try {
    return sessionStorage.getItem(KEY) || fallback;
  } catch {
    return fallback;
  }
}

export function RouteMemory() {
  const pathname = usePathname();
  const lastRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname === lastRef.current) return;
    lastRef.current = pathname;
    if (pathname.startsWith("/exam")) return; // 机考页不覆盖回跳目标
    try {
      sessionStorage.setItem(KEY, pathname);
    } catch {}
  }, [pathname]);

  return null;
}
