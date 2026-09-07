"use client";

/**
 * ExamSessionLink — 完整套卷连考编排(P4 + 连考丝滑转场)
 *
 * 机考页壳 ?session=<sessionId> 模式下挂载,职责:
 * 1. iframe 加载后注入 {sessionId, examId}(scoring.js / exam-note.js 交卷上报时带上,
 *    归入场次;写作页无 answers 文件,examId 由此处注入供其上报)
 * 2. 连考提交闸门:iframe 点交卷 → postMessage(ielts-submit-request) → 本组件弹英文
 *    确认 Dialog → 确认后回发 ielts-submit-decision → iframe 静默入库 →
 *    postMessage(ielts-exam-saved) → 本组件【同步解除防护】再整页导航到下一科
 *
 * 为什么转场前要先解除防护:整页导航(window.location.assign)会触发顶层 beforeunload,
 * 若防护仍武装,浏览器会弹原生「重新加载/离开此网站」框,打断丝滑转场。这里在导航前
 * 同步 dispatchEvent('ielts-disarm-guard'),ExamGuard 收到后置 armed=false,原生框不弹。
 *
 * 连考顺序:听力 → 阅读 → 写作,每科交卷后由本组件推进到下一科;
 * 最后一科交卷后跳场次成绩单 /session/[sessionId]。
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ExamConfirmDialog } from "@/components/exam/exam-confirm-dialog";

const SUBJECT_LABEL: Record<string, string> = {
  listening: "Listening",
  reading: "Reading",
  writing: "Writing",
};

export function ExamSessionLink({
  sessionId,
  examId,
  nextExamId,
  subject,
}: {
  sessionId: string;
  /** 当前科卷 id(注入 iframe,写作页上报用) */
  examId: string;
  /** 下一科的卷 id;null 表示本场最后一科,交卷后跳成绩单 */
  nextExamId: string | null;
  /** 当前科目,用于确认弹窗文案 */
  subject: string;
}) {
  const doneRef = useRef(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** 转场:同步解除防护 → 整页导航。doneRef 防重复触发。 */
  const advance = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    // 先同步解除离开防护,再导航 → beforeunload 不弹原生框,转场丝滑
    window.dispatchEvent(new Event("ielts-disarm-guard"));
    const target = nextExamId
      ? `/exam/${nextExamId}?session=${sessionId}`
      : `/session/${sessionId}`;
    console.log("[exam-session] 转场:", target);
    window.location.assign(target);
  }, [nextExamId, sessionId]);

  useEffect(() => {
    const frame = document.querySelector("iframe") as HTMLIFrameElement | null;
    const inject = () => {
      if (!frame?.contentWindow) return;
      try {
        frame.contentWindow.postMessage(
          { type: "ielts-session", sessionId, examId },
          "*",
        );
      } catch {}
    };
    // iframe 每次 load 后注入一次(听力卷试音页会跳转到正式卷,需重复注入)
    const onLoad = () => window.setTimeout(inject, 200);
    frame?.addEventListener("load", onLoad);
    inject();

    const onMessage = (ev: MessageEvent) => {
      const d = ev.data as { type?: string; ok?: boolean } | null;
      if (!d?.type) return;
      if (d.type === "ielts-submit-request") {
        // iframe 请求确认提交本卷
        console.log("[exam-session] 收到提交确认请求");
        setConfirmOpen(true);
      } else if (d.type === "ielts-exam-saved") {
        // 入库完成 → 转场(无论 ok 与否都推进,避免卡死;失败仅告警)
        if (!d.ok) console.warn("[exam-session] 入库回执 ok=false,仍推进转场");
        setTransitioning(false);
        if (fallbackTimer.current) {
          clearTimeout(fallbackTimer.current);
          fallbackTimer.current = null;
        }
        advance();
      } else if (d.type === "ielts-exam-finished") {
        // 兜底:静默提交的 IELTS_EXAM_GUARD_OFF 也会发此信号,
        // 若 ielts-exam-saved 因故未到,由此兜底转场
        advance();
      }
    };
    window.addEventListener("message", onMessage);

    return () => {
      frame?.removeEventListener("load", onLoad);
      window.removeEventListener("message", onMessage);
    };
  }, [sessionId, examId, advance]);

  /** 用户点确认:解除防护 → 显示转场遮罩 → 下发 approved 给 iframe 静默入库。
   *  解除防护后,保存→转场期间任何刷新/后退都不再弹确认框(已提交,不可撤销),
   *  且 iframe 内的刷新键拦截仍在(preventDefault),保证入库不被中断。 */
  const handleConfirm = useCallback(() => {
    setConfirmOpen(false);
    window.dispatchEvent(new Event("ielts-disarm-guard"));
    setTransitioning(true);
    const frame = document.querySelector("iframe") as HTMLIFrameElement | null;
    try {
      frame?.contentWindow?.postMessage(
        { type: "ielts-submit-decision", approved: true },
        "*",
      );
    } catch {}
    // 兜底:8s 内未收到 ielts-exam-saved(网络/脚本异常),仍转场避免卡死
    fallbackTimer.current = setTimeout(() => {
      console.warn("[exam-session] 入库回执超时,强制转场");
      advance();
    }, 8000);
  }, [advance]);

  /** 用户点取消:关闭弹窗 → 下发 rejected 给 iframe 恢复作答 */
  const handleCancel = useCallback(() => {
    setConfirmOpen(false);
    const frame = document.querySelector("iframe") as HTMLIFrameElement | null;
    try {
      frame?.contentWindow?.postMessage(
        { type: "ielts-submit-decision", approved: false },
        "*",
      );
    } catch {}
  }, []);

  const subjectLabel = SUBJECT_LABEL[subject] ?? "this section";

  return (
    <>
      <ExamConfirmDialog
        open={confirmOpen}
        onOpenChange={(o) => {
          if (!o) handleCancel();
        }}
        title={`Submit ${subjectLabel}?`}
        description={`Are you sure you want to submit your answers for ${subjectLabel}? You will not be able to change them after submission.`}
        confirmLabel="Submit"
        cancelLabel="Keep answering"
        onConfirm={handleConfirm}
      />

      {transitioning && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-border border-t-primary" />
            <div className="text-sm text-muted-foreground">
              {nextExamId
                ? "Saving your answers…"
                : "Saving & finishing your exam…"}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
