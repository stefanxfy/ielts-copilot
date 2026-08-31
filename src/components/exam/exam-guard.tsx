"use client";

/**
 * ExamGuard — 机考页离开防护(顶层壳)
 *
 * 为什么在顶层:浏览器的后退/刷新/关闭操作的是顶层文档,iframe 内部的
 * popstate/beforeunload 拦不住顶层导航(旧版教训)。
 *
 * - beforeunload:拦截刷新/关闭标签页/关闭浏览器(浏览器原生确认框,
 *   需页面发生过用户交互才会弹;答题点击即满足)
 * - popstate + 历史哨兵:拦截浏览器后退,弹英文 confirm
 *   (OK = 放弃考试并回退;Cancel = 留在考试页继续作答)
 * - iframe 交卷信号:静态卷页 scoring/exam-note 交卷后
 *   postMessage({type:'ielts-exam-finished'}),收到即解除防护
 * - 听力场景:放弃/离开时清 sessionStorage.ielts_audio_played,
 *   下次进入音频可重播(session 重置)
 */
import { useEffect, useRef } from "react";

const PLAYED_KEY = "ielts_audio_played";

export function ExamGuard() {
  const armedRef = useRef(true);

  useEffect(() => {
    const w = window;
    console.log("[exam-guard][top] 顶层防护挂载(beforeunload + 后退拦截)");

    /* ---------- 1) 刷新/关闭/跳离:beforeunload ---------- */
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!armedRef.current) return;
      try {
        sessionStorage.removeItem(PLAYED_KEY); // 听力:离开即放弃,音频可重播
      } catch {}
      console.warn("[exam-guard][top] 拦截刷新/关闭/跳离,armed=" + armedRef.current);
      e.preventDefault();
      e.returnValue = "";
    };
    w.addEventListener("beforeunload", onBeforeUnload);

    /* ---------- 2) 浏览器后退:哨兵 + popstate ---------- */
    history.pushState({ ieltsGuard: 1 }, "", location.href);
    const onPopState = () => {
      if (!armedRef.current) {
        console.log("[exam-guard][top] popstate:已交卷,放行");
        return;
      }
      console.warn("[exam-guard][top] 拦截后退,弹确认");
      const leave = w.confirm(
        "You are about to leave the exam.\n\n" +
          "Your answers will NOT be saved.\n\n" +
          "Click OK to abandon the exam, or Cancel to continue.",
      );
      if (leave) {
        try {
          sessionStorage.removeItem(PLAYED_KEY);
        } catch {}
        console.log("[exam-guard][top] 放弃考试:清已播标记并回退");
        history.back();
      } else {
        console.log("[exam-guard][top] 继续考试:推回哨兵");
        history.pushState({ ieltsGuard: 1 }, "", location.href);
      }
    };
    w.addEventListener("popstate", onPopState);

    /* ---------- 3) iframe 交卷信号 → 解除 ---------- */
    const onMessage = (ev: MessageEvent) => {
      if ((ev.data as { type?: string } | null)?.type === "ielts-exam-finished") {
        armedRef.current = false;
        console.log("[exam-guard][top] 收到 iframe 交卷信号,防护解除");
      }
    };
    w.addEventListener("message", onMessage);

    return () => {
      w.removeEventListener("beforeunload", onBeforeUnload);
      w.removeEventListener("popstate", onPopState);
      w.removeEventListener("message", onMessage);
      console.log("[exam-guard][top] 顶层防护卸载");
    };
  }, []);

  return null;
}
