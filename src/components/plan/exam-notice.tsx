/**
 * exam-notice.tsx — 考前须知弹窗(P7)
 *
 * 文案常量 EXAM_NOTICE_ITEMS + 受控 Dialog;
 * 向导 STEP1(自动弹出 + 「查看考前须知」链接)与作战主页倒计时 ⓘ 两处复用。
 */
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** 考前须知文案(机考常识集合,单条一问) */
export const EXAM_NOTICE_ITEMS: string[] = [
  "考试当天携带报名时使用的同一证件原件(身份证/护照),证件过期或信息不符将无法入场。",
  "提前 30 分钟到达考点并规划好出行路线;机考入场截止后不得补入场。",
  "考场提供一次性耳机、铅笔与橡皮;个人物品须存放于指定储物柜,手机等电子设备关机。",
  "听力放音前有试音环节,注意调节音量;音频只播放一遍,不安排重听。",
  "听力、阅读与写作之间不设休息,建议考前按考试时段调整作息,保持长时间专注。",
  "写作留意字数下限:Task 1 不少于 150 词、Task 2 不少于 250 词,字数不足会被扣分。",
];

export function ExamNoticeDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>考前须知</DialogTitle>
          <DialogDescription>机考当天注意事项,建议考前一天再过一遍</DialogDescription>
        </DialogHeader>
        <ol className="grid gap-2.5">
          {EXAM_NOTICE_ITEMS.map((t, i) => (
            <li
              key={i}
              className="flex gap-2.5 text-[13px] leading-relaxed text-[#3c4656]"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#eef3fb] text-[11px] font-medium text-[#1a6feb]">
                {i + 1}
              </span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  );
}
