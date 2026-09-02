"use client";

/**
 * 日/夜主题切换按钮
 * 挂在 topbar 右侧；mounted 前渲染占位防止 SSR 水合不匹配
 * 图标为 MingCute（Iconify 内联，圆润可爱风）
 */

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { SunIcon, MoonIcon } from "@/components/ui/cute-icons";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="size-8 shrink-0" aria-hidden />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label={isDark ? "切换到白天模式" : "切换到夜晚模式"}
      title={isDark ? "白天模式" : "夜晚模式"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="press-bubble flex size-8 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white hover:bg-white/25"
    >
      {isDark ? (
        <SunIcon className="size-4 text-amber-300" />
      ) : (
        <MoonIcon className="size-4 text-indigo-200" />
      )}
    </button>
  );
}
