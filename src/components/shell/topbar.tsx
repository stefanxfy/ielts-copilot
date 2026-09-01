"use client";

/**
 * 顶栏导航(复刻原型 prototype/index.html .topbar)
 * 深海军蓝 #10233f · logo 双色 · 4 个导航项 · 右侧状态徽章
 * 激活态跟随路由(usePathname);/exam/[examId] 全屏机考页不含此壳
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "仪表盘" },
  { href: "/mock", label: "机考模拟" },
  { href: "/learn", label: "学习中心" },
  { href: "/settings", label: "设置" },
];

export function Topbar() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 flex h-[52px] items-center gap-4 bg-[#10233f] px-5 text-white">
      <Link href="/" className="text-[15px] font-semibold tracking-[0.5px]">
        IELTS<span className="text-[#7db2ff]">Copilot</span>
      </Link>
      <nav className="flex flex-1 gap-1">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={`rounded-md px-3 py-1.5 text-[13px] transition-colors ${
              isActive(n.href)
                ? "bg-[#7db2ff]/20 text-white"
                : "text-[#b9c6d8] hover:bg-white/10 hover:text-white"
            }`}
          >
            {n.label}
          </Link>
        ))}
      </nav>
      <div className="ml-auto hidden rounded-full border border-white/25 bg-white/15 px-2.5 py-0.5 text-xs text-[#cfe3ff] sm:block">
        本地单机版 · 数据存于本机
      </div>
    </header>
  );
}
