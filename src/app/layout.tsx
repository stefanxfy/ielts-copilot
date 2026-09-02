import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Heartbeat } from "@/components/heartbeat";
/* 中文正文:思源黑体本地包(Fontsource 可变字重 100-900)。
   不用 next/font/google —— Turbopack 在部分网络环境下拉 Google Fonts 会
   Module not found / 字体 404(vercel/next.js#91653),本地单机应用必须零外网依赖。 */
import "@fontsource-variable/noto-sans-sc";
import "./globals.css";
import { DEFAULT_UI_THEME, isUiThemeId, type UiThemeId } from "@/lib/ui-theme";
import { getSetting } from "@/lib/study/settings";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IELTS Copilot · 本地机考",
  description: "本地雅思机考与备考 · 数据全在本机",
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  const uiTheme = readUiThemeFromDb();
  return (
    <html
      lang="zh-CN"
      suppressHydrationWarning
      data-theme={uiTheme === "wheat" ? undefined : uiTheme}
      className={`${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Heartbeat />
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
