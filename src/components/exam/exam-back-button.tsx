"use client";

/**
 * ExamBackButton — 机考页顶栏「← 返回」按钮(方案 A)
 *
 * 点击不直接跳转,先弹自定义确认弹窗(英文文案):
 *   - Leave exam → 派发自定义事件 ielts-exit-exam,由 ExamGuard
 *     统一处理(解除防护 + 清听力已播标记 + 跳回仪表盘),
 *     保证与后退/刷新拦截共用同一条退出路径;
 *   - Continue exam → 关闭弹窗继续作答。
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function ExamBackButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  /** 确认离开:通知 guard 解除防护,由其统一清标记并跳转 */
  const handleLeave = () => {
    setOpen(false);
    window.dispatchEvent(new CustomEvent("ielts-exit-exam"));
    // 兜底:若 guard 未挂载(理论不会),直接跳转
    window.setTimeout(() => router.push("/"), 150);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="cursor-pointer text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Leave this exam?</DialogTitle>
            <DialogDescription>
              Your answers will NOT be saved. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Continue exam
            </Button>
            <Button variant="destructive" onClick={handleLeave}>
              Leave exam
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
