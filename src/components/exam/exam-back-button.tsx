"use client";

/**
 * ExamBackButton — 机考页顶栏「← 返回」按钮(方案 A)
 *
 * 点击不直接跳转,先弹统一确认弹窗(ExamConfirmDialog):
 *   - Leave exam → 派发自定义事件 ielts-exit-exam,由 ExamGuard
 *     统一处理(解除防护 + 清听力已播标记 + 跳回仪表盘),
 *     保证与后退/刷新拦截共用同一条退出路径;
 *   - Continue exam → 关闭弹窗继续作答。
 *
 * 回看模式(isReview):已交卷的卷面回放,无未保存答案,直接跳转不弹窗。
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExamConfirmDialog } from "@/components/exam/exam-confirm-dialog";

export function ExamBackButton({ isReview = false }: { isReview?: boolean }) {
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
        onClick={() => (isReview ? router.push("/") : setOpen(true))}
        className="cursor-pointer text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back
      </button>

      {!isReview && (
        <ExamConfirmDialog
          open={open}
          onOpenChange={setOpen}
          title="Leave this exam?"
          confirmLabel="Leave exam"
          onConfirm={handleLeave}
        />
      )}
    </>
  );
}
