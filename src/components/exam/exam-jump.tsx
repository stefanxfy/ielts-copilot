"use client";

/**
 * ExamJump — 错题锚点跳转(P3)
 *
 * 成绩详情页的错题链接带 ?jump=<anchor>(如 q-23 / q-18-22)。
 * 本组件在机考页壳顶层读取该参数,等 iframe 加载完成后向其发送
 * ielts-jump-anchor 消息;静态卷页侧的 exam-guard.js 负责实际滚动定位。
 *
 * 跳转属于"回看"而非"重考",此时防护应直接解除:
 * - 跳转模式下 ExamGuard 不武装(经 exam-guard.tsx 读取同参数判断)
 */
import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

export function ExamJump() {
  const searchParams = useSearchParams();
  const anchor = searchParams.get("jump");
  const pendingRef = useRef(anchor);
  const sentRef = useRef(false);

  useEffect(() => {
    if (!anchor || sentRef.current) return;
    pendingRef.current = anchor;

    const trySend = () => {
      const frame = document.querySelector("iframe");
      if (!frame?.contentWindow) return false;
      try {
        frame.contentWindow.postMessage(
          { type: "ielts-jump-anchor", anchor: pendingRef.current },
          "*",
        );
        console.log("[exam-jump] 已发送锚点跳转指令:", pendingRef.current);
        sentRef.current = true;
        return true;
      } catch {
        return false;
      }
    };

    // iframe 加载完成才能收消息;load 后再补发一次保证到达
    const frame = document.querySelector("iframe");
    const onLoad = () => trySend();
    frame?.addEventListener("load", onLoad);

    // 兜底轮询:卷页有重定向(听力试音页)或多脚本时序不定,最多试 10 秒
    let tries = 0;
    const timer = window.setInterval(() => {
      if (sentRef.current || ++tries > 50) {
        window.clearInterval(timer);
        return;
      }
      trySend();
    }, 200);

    return () => {
      frame?.removeEventListener("load", onLoad);
      window.clearInterval(timer);
    };
  }, [anchor]);

  return null;
}
