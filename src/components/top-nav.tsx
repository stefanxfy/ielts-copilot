/**
 * src/components/top-nav.tsx — 顶部 sticky nav bar(对齐 prototype .topbar)
 *
 * prototype 原色:#10233f(深蓝),白色 logo + 三 tab。
 * 工程版继承同款深蓝(#10233f)作为顶栏背景,渲染 4 个 tab:
 *   仪表盘 / 机考模拟 / 学习中心 / 设置
 * active 态高亮(#7db2ff 透明背景)。
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "仪表盘", match: (p: string) => p === "/" },
  { href: "/papers", label: "机考模拟", match: (p: string) => p.startsWith("/papers") },
  { href: "/learn", label: "学习中心", match: (p: string) => p.startsWith("/learn") },
  { href: "/settings", label: "设置", match: (p: string) => p.startsWith("/settings") },
];

export function TopNav() {
  const pathname = usePathname() ?? "/";
  return (
    <header
      className="sticky top-0 z-50 flex items-center gap-4 px-5 text-white"
      style={{
        height: 52,
        background: "#10233f",
        boxShadow: "0 2px 6px rgba(0,0,0,.15)",
      }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2">
        <span
          className="flex items-center justify-center rounded font-bold text-[14px]"
          style={{ width: 30, height: 30, background: "rgba(125,178,255,.2)" }}
        >
          雅
        </span>
        <span className="font-semibold text-[15px] tracking-wide">
          IELTS<span style={{ color: "#7db2ff" }}> Copilot</span>
        </span>
      </Link>

      {/* Nav tabs */}
      <nav className="flex flex-1 gap-1">
        {TABS.map((t) => {
          const active = t.match(pathname);
          return (
            <Link
              key={t.href}
              href={t.href}
              className="rounded px-3 py-1.5 text-[13px] transition-colors"
              style={{
                color: active ? "#fff" : "#b9c6d8",
                background: active ? "rgba(125,178,255,.18)" : "transparent",
              }}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      {/* 右侧:留给未来用户/版本号等;当前空 */}
      <span
        className="rounded-full px-3 py-0.5 text-[11px]"
        style={{
          background: "rgba(255,255,255,.1)",
          border: "1px solid rgba(255,255,255,.2)",
          color: "#cfe3ff",
        }}
      >
        本地机考 · 数据全在本机
      </span>
    </header>
  );
}