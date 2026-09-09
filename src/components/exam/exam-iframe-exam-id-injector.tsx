"use client";
/**
 * ExamIframeExamIdInjector — 单科模式下,顶层主动给 iframe 注入 examId
 *
 * 写作页(exam-note.js)在单科交卷时需要拿 examId 上报 /api/exam-records,
 * 连考模式由 ExamSessionLink 通过 postMessage(ielts-session) 注入;
 * 单科模式此前无任何 examId 来源 → 写作单科交卷后只能停在本地提示页。
 * 本组件承担这个桥,onMount 后给 iframe 发 {type:'ielts-exam-id', examId}。
 *
 * 为什么不在 /exam/[examId]/page.tsx 里直接 postMessage?
 *  因为 page.tsx 是 RSC,postMessage 必须客户端。
 *
 * 为什么重试多次:iframe 的 load 事件在我们挂监听时可能已经触发过(SSR 的 RSC
 * 流式渲染常让组件在 iframe 已 loaded 之后才挂载),所以需要「立即发 + 多次重发」兜底。
 * 不锁 sentRef — 即使发出去没被接收到,后续重新发一次也无副作用(写入同值)。 */
import { useEffect, useRef } from "react";

export function ExamIframeExamIdInjector({ examId }: { examId: string }) {
  const examIdRef = useRef(examId);
  examIdRef.current = examId;

  useEffect(() => {
    const send = () => {
      const frame = document.querySelector("iframe");
      if (!frame?.contentWindow) return;
      try {
        frame.contentWindow.postMessage(
          { type: "ielts-exam-id", examId: examIdRef.current },
          "*",
        );
      } catch {}
    };
    // 立即发 + iframe load + 多重试(覆盖 RSC 流式挂载竞态)
    const frame = document.querySelector("iframe");
    frame?.addEventListener("load", send);
    send();
    const timers = [
      window.setTimeout(send, 200),
      window.setTimeout(send, 800),
      window.setTimeout(send, 2000),
      window.setTimeout(send, 5000),
    ];
    return () => {
      frame?.removeEventListener("load", send);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);
  return null;
}