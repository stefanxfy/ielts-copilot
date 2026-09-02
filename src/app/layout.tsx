import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Heartbeat } from "@/components/heartbeat";
import { ThemeProvider } from "@/components/theme-provider";
/* 中文正文:思源黑体本地包(Fontsource 可变字重 100-900)。
   不用 next/font/google —— Turbopack 在部分网络环境下拉 Google Fonts 会
   Module not found / 字体 404(vercel/next.js#91653),本地单机应用必须零外网依赖。 */
import "@fontsource-variable/noto-sans-sc";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IELTS Copilot · 本地机考",
  description: "本地雅思机考与备考 · 数据全在本机",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      suppressHydrationWarning
      className={`${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Heartbeat />
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
