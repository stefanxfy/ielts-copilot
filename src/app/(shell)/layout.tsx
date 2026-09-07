/**
 * 壳层布局(route group):顶栏 + 居中主区
 * 仪表盘 / 机考模拟 / 学习中心 / 设置 共用;/exam/[examId] 全屏机考页不在此组内
 */

import type { PropsWithChildren } from "react";
import { Topbar } from "@/components/shell/topbar";

export default function ShellLayout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen">
      <Topbar />
      <main className="mx-auto max-w-[1180px] px-5 pt-6 pb-[90px]">{children}</main>
    </div>
  );
}
