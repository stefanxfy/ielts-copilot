"use client";

/**
 * 顶栏导航 · 可爱清爽版
 * 浅色系随主题变色（不再是写死的深海军蓝），右侧日/夜主题切换
 * 激活态跟随路由(usePathname);/exam/[examId] 全屏机考页不含此壳
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/shell/theme-toggle";

const NAV = [
  { href: "/", label: "仪表盘" },
  { href: "/plan", label: "备考计划" },
  { href: "/mock", label: "机考模拟" },
  { href: "/learn", label: "学习中心" },
  { href: "/settings", label: "设置" },
];

export function Topbar() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 flex h-[52px] items-center gap-4 border-b border-border/70 bg-card/85 px-5 text-card-foreground backdrop-blur">
      <Link
        href="/"
        className="press-bubble text-[15px] font-bold tracking-[0.5px]"
      >
        IELTS<span className="text-primary">Copilot</span>
      </Link>
      <nav className="flex flex-1 gap-1">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={`press-bubble rounded-full px-3 py-1.5 text-[13px] font-medium transition-all ${
              isActive(n.href)
                ? "bg-primary/15 font-semibold text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {n.label}
          </Link>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-2.5">
        <div className="hidden rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground sm:block">
          本地单机版 · 数据存于本机
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
