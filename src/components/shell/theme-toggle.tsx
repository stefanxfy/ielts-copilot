"use client";

/**
 * 顶栏皮肤切换器 · 8 套皮肤全量入口
 * 按钮显示当前皮肤色条,点开弹出面板列出全部 8 套(色条 + 名称 + 当前勾选),
 * 点击即换肤并持久化;与设置页「界面皮肤」共用 selectUiTheme + 事件互相同步。
 * mounted 前渲染占位防止 SSR 水合不匹配。
 */

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_UI_THEME,
  UI_THEME_CHANGE_EVENT,
  UI_THEMES,
  currentUiTheme,
  selectUiTheme,
  type UiThemeMeta,
  type UiThemeId,
} from "@/lib/ui-theme";

/** 色条:还原 glearn 主题卡观感(底色 + 品牌 + 点缀三段) */
function Swatch({ meta, className }: { meta: UiThemeMeta; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex h-4 w-7 shrink-0 overflow-hidden rounded-full border border-black/10 dark:border-white/10",
        className,
      )}
    >
      <span className="h-full flex-[3]" style={{ backgroundColor: meta.swatch[0] }} />
      <span className="h-full flex-[2]" style={{ backgroundColor: meta.swatch[1] }} />
      <span className="h-full flex-[2]" style={{ backgroundColor: meta.swatch[2] }} />
    </span>
  );
}

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<UiThemeId>(DEFAULT_UI_THEME);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    setTheme(currentUiTheme()); // 以 SSR 直出的属性为准
  }, []);

  // 换肤统一入口:应用 + 持久化 + 广播;并同步选中态
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

  // 任意入口(本组件/设置页)换肤后同步选中态
  useEffect(() => {
    const sync = () => setTheme(currentUiTheme());
    window.addEventListener(UI_THEME_CHANGE_EVENT, sync);
    return () => window.removeEventListener(UI_THEME_CHANGE_EVENT, sync);
  }, []);

  if (!mounted) return <div className="size-8 shrink-0" aria-hidden />;

  const current = UI_THEMES.find((t) => t.id === theme) ?? UI_THEMES[0];

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-label="切换界面皮肤"
        aria-haspopup="listbox"
        aria-expanded={open}
        title={`界面皮肤 · ${current.label}`}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "press-bubble flex h-8 items-center gap-1.5 rounded-full border border-border bg-secondary py-0 pl-1.5 pr-2.5 text-secondary-foreground transition-colors hover:bg-accent",
          open && "bg-accent",
        )}
      >
        <Swatch meta={current} className="h-4 w-7" />
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn("size-3 text-muted-foreground transition-transform", open && "rotate-180")}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="选择界面皮肤"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 animate-in fade-in-0 zoom-in-95 overflow-hidden rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-md duration-100"
        >
          {UI_THEMES.map((t) => {
            const active = theme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  if (!active) void selectUiTheme(t.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors",
                  active
                    ? "bg-accent font-semibold text-accent-foreground"
                    : "hover:bg-accent/60",
                )}
              >
                <Swatch meta={t} />
                <span className="flex-1 truncate">{t.label}</span>
                {active && (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-3.5 text-primary"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
