"use client";

/**
 * ExamSessionLink — 完整套卷连考编排(P4)
 *
 * 机考页壳 ?session=<sessionId> 模式下挂载:
 * 1. iframe 加载后注入 sessionId(scoring.js 交卷上报时带上,归入场次)
 * 2. 监听 iframe 的 ielts-exam-finished 交卷信号 → 跳下一科(next 参数)
 *
 * 连考顺序:听力 → 阅读 → 写作,每科交卷后由本组件推进到下一科;
 * 最后一科交卷后跳场次成绩单 /session/[sessionId]。
 */
import { useEffect, useRef } from "react";

export function ExamSessionLink({
  sessionId,
  nextExamId,
}: {
  sessionId: string;
  /** 下一科的卷 id;null 表示本场最后一科,交卷后跳成绩单 */
  nextExamId: string | null;
}) {
  const doneRef = useRef(false);

  useEffect(() => {
    const frame = document.querySelector("iframe");
    const inject = () => {
      if (!frame?.contentWindow) return;
      try {
        frame.contentWindow.postMessage({ type: "ielts-session", sessionId }, "*");
        console.log("[exam-session] 已注入场次:", sessionId);
      } catch {}
    };
    // iframe 每次 load 后注入一次(听力卷试音页会跳转到正式卷,需重复注入)
    const onLoad = () => window.setTimeout(inject, 200);
    frame?.addEventListener("load", onLoad);
    inject();

    // 交卷信号 → 推进下一科
    const onMessage = (ev: MessageEvent) => {
      if (doneRef.current) return;
      if (ev.data && ev.data.type === "ielts-exam-finished") {
        doneRef.current = true;
        console.log("[exam-session] 交卷,推进下一科:", nextExamId ?? "成绩单");
        // 下一科或场次成绩单(整页导航,文档级跳转)
        window.location.assign(nextExamId ? `/exam/${nextExamId}?session=${sessionId}` : `/session/${sessionId}`);
      }
    };
    window.addEventListener("message", onMessage);

    return () => {
      frame?.removeEventListener("load", onLoad);
      window.removeEventListener("message", onMessage);
    };
  }, [sessionId, nextExamId]);

  return null;
}
