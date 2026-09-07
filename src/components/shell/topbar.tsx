"use client";

/**
 * 顶栏导航
 * 左侧一级导航(仪表盘/备考计划/机考模拟/背单词),右侧区域定稿顺序:
 *   资料库 ▾(下拉:单词库实链,语法库/阅读库/视听库置灰占位) → 设置 → 皮肤切换
 * 「学习中心」已退役(v1.3,docs/学习中心重构-背单词页面编排规划.md):/learn 现为背单词复习 session;
 * 原「本地单机版 · 数据存于本机」胶囊已删除。
 * 激活态跟随路由(usePathname);/exam/[examId] 全屏机考页不含此壳。
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "@/components/shell/theme-toggle";

const NAV = [
  { href: "/", label: "仪表盘" },
  { href: "/plan", label: "备考计划" },
  { href: "/mock", label: "机考模拟" },
  { href: "/learn", label: "背单词" },
];

/** 资料库下拉项:enabled=false 为占位(置灰,点击无反应),后续实现时补 href 即可 */
const LIBRARY_ITEMS = [
  { label: "单词库", href: "/learn/books", enabled: true },
  { label: "语法库", href: null, enabled: false },
  { label: "阅读库", href: null, enabled: false },
  { label: "视听库", href: null, enabled: false },
] as const;

/** 资料库下拉 · 导航右侧、「设置」左边(设置导航项在 NAV 内,排布上紧邻其左) */
function LibraryDropdown() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // 点外部/Esc 收起;路由变化时收起
  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDocDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDocDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  useEffect(() => setOpen(false), [pathname]);

  const isActive = pathname.startsWith("/learn/books");

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`press-bubble flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-medium transition-all ${
          isActive
            ? "bg-primary/15 font-semibold text-primary"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        }`}
      >
        资料库
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`size-3 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="资料库"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-40 animate-in fade-in-0 zoom-in-95 overflow-hidden rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-md duration-100"
        >
          {LIBRARY_ITEMS.map((item) =>
            item.enabled && item.href ? (
              <Link
                key={item.label}
                href={item.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex w-full items-center rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors hover:bg-accent/60"
              >
                {item.label}
              </Link>
            ) : (
              <span
                key={item.label}
                role="menuitem"
                aria-disabled
                title="即将上线"
                className="flex w-full cursor-not-allowed items-center rounded-lg px-2.5 py-2 text-left text-[13px] text-muted-foreground/50"
              >
                {item.label}
              </span>
            ),
          )}
        </div>
      )}
    </div>
  );
}

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
      {/* 右侧定稿顺序(v1.3):资料库 ▾ → 设置 → 皮肤切换 */}
      <div className="ml-auto flex items-center gap-1">
        <LibraryDropdown />
        <Link
          href="/settings"
          className={`press-bubble rounded-full px-3 py-1.5 text-[13px] font-medium transition-all ${
            isActive("/settings")
              ? "bg-primary/15 font-semibold text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          设置
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
