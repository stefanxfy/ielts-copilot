import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { Heartbeat } from "@/components/heartbeat";
import { RouteMemory } from "@/components/route-memory";
/* 中文正文:思源黑体本地包(Fontsource 可变字重 100-900)。
   不用 next/font/google —— Turbopack 在部分网络环境下拉 Google Fonts 会
   Module not found / 字体 404(vercel/next.js#91653),本地单机应用必须零外网依赖。 */
import "@fontsource-variable/noto-sans-sc";
import "./globals.css";
import { DEFAULT_UI_THEME, isUiThemeId, type UiThemeId } from "@/lib/ui-theme";
import { getSetting } from "@/lib/study/settings";

export const metadata: Metadata = {
  title: "IELTS Copilot · 本地机考",
  description: "本地雅思机考与备考 · 数据全在本机",
  /* 站点图标显式声明（?v=2 是缓存击穿参数，图标内容更新时递增）。
     背景：/favicon.ico 此前长期 404，浏览器 favicon 库按「页面URL+图标URL」
     把失败态缓存死了，普通刷新不重拉，只有图标 URL 变化才会重新请求。
     单一事实源 = public/exams/shared/exam-assets/app-logo.svg（卷面 ts-logo/
     favicon link 同源）；favicon.ico 由该 SVG 渲染(48/32/16 PNG-in-ICO)兜底
     不认 SVG favicon 的场景。不用 src/app/icon.svg 文件约定——那会注入
     固定 URL(/icon.svg?hash)，缓存击穿要改文件名，不如显式声明好控。 */
  icons: {
    /* 只声明 favicon.ico：浏览器 tab 固定用它（如同时给 SVG，Chrome 会优先
       选 SVG 而非 ico）。SVG 版仍由卷面 HTML 的 <link>/<img> 直接引用。 */
    icon: [{ url: "/favicon.ico?v=2", sizes: "48x48", type: "image/x-icon" }],
    shortcut: ["/favicon.ico?v=2"],
  },
};

/** 服务端读 app_settings.ui_theme,SSR 直出 <html data-theme>,首屏零闪屏。 */
function readUiThemeFromDb(): UiThemeId {
  try {
    const raw = getSetting<{ theme: UiThemeId }>("ui_theme");
    return raw && isUiThemeId(raw.theme) ? raw.theme : DEFAULT_UI_THEME;
  } catch {
    return DEFAULT_UI_THEME; // DB 未就绪等异常回退默认皮肤
  }
}

export default function RootLayout({ children }: { children: ReactNode }) {
  const uiTheme = readUiThemeFromDb();
  return (
    <html
      lang="zh-CN"
      suppressHydrationWarning
      data-theme={uiTheme === "wheat" ? undefined : uiTheme}
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Heartbeat />
        <RouteMemory />
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
