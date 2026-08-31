"use client";

/**
 * ExamConfirmDialog — 机考页统一的「危险操作确认」弹窗
 *
 * 为什么抽出来:离开考试有 3 个触发点(顶栏 ← Back 按钮、浏览器后退、
 * 刷新快捷键 / 工具栏刷新),早期各自实现导致样式与文案漂移 —— 顶栏走
 * React <Dialog>、后退与刷新走 window.confirm(浏览器原生框,带
 * "localhost:3177 显示" 标题、按钮只能是"取消/确定")。
 *
 * 现在三者共用本组件,视觉与文案单一来源,只靠 props 区分语义。
 *
 * 用法(受控):调用方持有一个 pending 状态,事件回调里只需 setPending(...)
 * 打开弹窗;真正的放行动作(reload / history.back / router.push)放在
 * onConfirm 里,用户点确认后才执行 —— 这样弹窗的开关与副作用解耦,
 * 也避免了在 popstate 这类同步事件里直接做异步确认的老问题。
 */
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface ExamConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 弹窗标题,如 "Leave this exam?" */
  title: string;
  /** 说明文案;默认统一的「答案不会保存」告警 */
  description?: string;
  /** 取消按钮文案(默认 Continue exam,语义是「继续考试」) */
  cancelLabel?: string;
  /** 确认按钮文案,如 "Leave exam" / "Reload" */
  confirmLabel: string;
  /** 用户点确认后的放行动作 */
  onConfirm: () => void;
}

const DEFAULT_DESCRIPTION =
  "Your answers will NOT be saved. This action cannot be undone.";

export function ExamConfirmDialog({
  open,
  onOpenChange,
  title,
  description = DEFAULT_DESCRIPTION,
  cancelLabel = "Continue exam",
  confirmLabel,
  onConfirm,
}: ExamConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* showCloseButton=false:考试场景下不允许用右上角 X 蒙混过关,
          必须明确选择「继续考试」或「离开」 */}
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
