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

/** 考前须知文案(换题季/费用/报名/考位/出分,单条一个主题) */
export const EXAM_NOTICE_ITEMS: { title: string; text: string }[] = [
  {
    title: "换题季说明",
    text: "每年 1 月、5 月、9 月为雅思口语换题季,新题在该月首场考试启用。想降低口语碰新题的风险,建议避开换题季首场;本应用覆盖的写作与听读不受换题季影响。",
  },
  {
    title: "费用说明",
    text: "普通雅思与 UKVI 报名费统一为 1990 元/次(以官方最新公布为准)。",
  },
  {
    title: "官方报名",
    text: "请前往教育部教育考试院雅思报名官网 ielts.neea.cn 完成报名与考位查询。",
  },
  {
    title: "考位建议",
    text: "机考虽每日可考,但热门城市周末考位紧张,建议提前 1–2 个月关注考位释放情况并尽早报名(机考报名在考前 3 个工作日截止)。",
  },
  {
    title: "出分时间",
    text: "机考考后 1–5 天出分,最快 48 小时。",
  },
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
          <DialogDescription>报名与出分等关键事项,建议报名前先过一遍</DialogDescription>
        </DialogHeader>
        <ol className="grid gap-3">
          {EXAM_NOTICE_ITEMS.map((item, i) => (
            <li
              key={i}
              className="flex gap-2.5 text-[13px] leading-relaxed text-muted-foreground"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-medium text-primary">
                {i + 1}
              </span>
              <span>
                <span className="font-medium text-foreground">{item.title}</span>
                <span className="mx-1.5 text-border">|</span>
                {item.text}
              </span>
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  );
}
