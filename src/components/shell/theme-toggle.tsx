"use client";

/**
 * 皮肤快切按钮 · 挂在 topbar 右侧
 * 夜读(暗色) ↔ 上一次使用的浅色皮肤;轻点即换肤并持久化,与设置页「界面皮肤」同一 API。
 * mounted 前渲染占位防止 SSR 水合不匹配;图标为 MingCute 风格内联 SVG(strokeWidth 2.5)。
 */

import { useEffect, useState } from "react";
import {
  DEFAULT_UI_THEME,
  UI_THEMES,
  applyUiTheme,
  currentUiTheme,
  isUiThemeId,
  type UiThemeId,
} from "@/lib/ui-theme";

const STORAGE_KEY = "ui_theme";
const DEFAULT_LIGHT: UiThemeId = "wheat";

function readLastLight(): UiThemeId {
  try {
    const v = localStorage.getItem(`${STORAGE_KEY}.last_light`);
    return isUiThemeId(v) && !UI_THEMES.find((t) => t.id === v)?.dark ? v : DEFAULT_LIGHT;
  } catch {
    return DEFAULT_LIGHT;
  }
}

async function persist(theme: UiThemeId) {
  try {
    await fetch("/api/ui-theme", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme }),
    });
  } catch {
    // 本地已生效,持久化失败不打断交互(下次启动回落 DB 旧值)
  }
}

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<UiThemeId>(DEFAULT_UI_THEME);

  useEffect(() => {
    setMounted(true);
    setTheme(currentUiTheme()); // 以 SSR 直出的属性为准
  }, []);

  function switchTo(next: UiThemeId) {
    let target: UiThemeId;
    if (UI_THEMES.find((t) => t.id === next)?.dark) {
      // 夜读 → 上次浅色
      target = readLastLight();
    } else {
      // 浅色 → 夜读(记住当前浅色)
      try {
        localStorage.setItem(`${STORAGE_KEY}.last_light`, next);
      } catch {
        /* 忽略 */
      }
      target = "night";
    }
    applyUiTheme(target);
    setTheme(target);
    void persist(target);
  }

  if (!mounted) {
    return <div className="size-8 shrink-0" aria-hidden />;
  }

  const isDark = UI_THEMES.find((t) => t.id === theme)?.dark ?? false;

  return (
    <button
      type="button"
      aria-label={isDark ? "切换到浅色皮肤" : "切换到夜读·灯下"}
      title={isDark ? "浅色皮肤" : "夜读·灯下"}
      onClick={() => switchTo(theme)}
      className="press-bubble flex size-8 items-center justify-center rounded-full border border-border bg-secondary text-secondary-foreground transition-colors hover:bg-accent"
    >
      {isDark ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-4">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-4">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      )}
    </button>
  );
}
