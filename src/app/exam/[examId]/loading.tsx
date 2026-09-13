/**
 * /exam/[examId] 加载态
 *
 * 机考页是 force-dynamic + 整页 iframe,dev 首访还有 Turbopack 现场编译,
 * 跳转等待窗口期内没有 styled 过渡屏时,浏览器可能闪现未着色的内容(纯文本)。
 * 此文件给该段兜一个同风格的全屏过渡页:确认弹窗点下后,视觉上始终有styled画面。
 */
export default function ExamLoading() {
  return (
    <main className="flex h-screen flex-col items-center justify-center gap-4 bg-background">
      <div className="size-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      <p className="text-sm text-muted-foreground">正在进入机考,请稍候…</p>
    </main>
  );
}
