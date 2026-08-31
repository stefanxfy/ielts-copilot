"use client";

/**
 * ExamGuard — 机考页离开防护(顶层壳)
 *
 * 为什么在顶层:浏览器的后退/刷新/关闭操作的是顶层文档,iframe 内部的
 * popstate/beforeunload 拦不住顶层导航(旧版教训)。
 *
 * - beforeunload:拦截刷新/关闭标签页/关闭浏览器(浏览器原生确认框。
 *   ⚠️ Chrome/Safari 策略:页面必须发生过真实用户交互(点击/按键)才弹,
 *   纯打开页面后直接 F5 不弹——这是浏览器规范,任何网站都无法绕过)
 * - popstate + 历史哨兵:拦截浏览器后退,弹英文 confirm
 *   (OK = 放弃考试并回退;Cancel = 留在考试页继续作答)
 * - iframe 交卷信号:静态卷页 scoring/exam-note 交卷后
 *   postMessage({type:'ielts-exam-finished'}),收到即解除防护
 * - 听力场景:放弃/离开时清 sessionStorage.ielts_audio_played,
 *   下次进入音频可重播(session 重置)
 * - 可见徽标:右下角常驻状态条(ARMED/OFF),无需开控制台即可确认防护在线
 */
import { useEffect, useRef, useState } from "react";

const PLAYED_KEY = "ielts_audio_played";

export function ExamGuard() {
  const armedRef = useRef(true);
  const [armed, setArmed] = useState(true);
  const [activated, setActivated] = useState(false); // 顶层是否收到过用户交互

  useEffect(() => {
    const w = window;
    let activatedSeen = false;
    console.log("[exam-guard][top] 顶层防护挂载(beforeunload + 后退拦截)");

    /* ---------- 0) 用户激活监控(诊断 Chrome 弹窗资格) ---------- */
    const ua = () => {
      const nav = navigator as Navigator & { userActivation?: { hasBeenActive: boolean } };
      return typeof nav.userActivation === "object" ? nav.userActivation.hasBeenActive : null;
    };
    console.log("[exam-guard][top] 初始用户激活状态(决定刷新弹窗资格):", ua());

    const markActivated = (via: string) => {
      if (activatedSeen) return;
      activatedSeen = true;
      setActivated(true);
      console.log("[exam-guard][top] 用户激活到位(" + via + ") → 刷新/关闭弹窗资格就绪, hasBeenActive=" + ua());
    };

    // 路径 A:顶层文档自身被点击(顶栏/徽标区域)
    const onPointerDown = () => markActivated("顶层点击");
    w.addEventListener("pointerdown", onPointerDown);

    // 路径 B:iframe 内答题点击(激活按规范会传播到顶层,轮询检测兜底;
    //         轮询同时覆盖试音页/须知页等未注入 guard 脚本的页面)
    const poll = window.setInterval(() => {
      if (ua() === true) markActivated("iframe内点击/键盘(激活传播)");
    }, 400);

    // 路径 C:iframe 内 guard 脚本显式上报(最快通知,便于日志观察)
    // (在 onMessage 里统一处理 ielts-user-active)

    /* ---------- 1) 刷新/关闭/跳离:beforeunload ---------- */
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!armedRef.current) {
        console.log("[exam-guard][top] beforeunload:已交卷,放行刷新");
        return;
      }
      try {
        sessionStorage.removeItem(PLAYED_KEY); // 听力:离开即放弃,音频可重播
      } catch {}
      const active = ua();
      console.warn(
        "[exam-guard][top] 拦截到刷新/关闭/跳离 · armed=true · " +
          (active === null
            ? "浏览器不支持激活查询(弹窗应正常)"
            : active
              ? "已有用户交互 → 浏览器将显示确认弹窗"
              : "⚠️ 无用户交互 → 浏览器按策略不弹窗(先点一下页面任意处再刷新即可复现)"),
      );
      e.preventDefault();
      e.returnValue = "";
    };
    w.addEventListener("beforeunload", onBeforeUnload);

    /* ---------- 2) 浏览器后退:哨兵 + popstate ---------- */
    history.pushState({ ieltsGuard: 1 }, "", location.href);
    console.log("[exam-guard][top] 后退哨兵已推入(history+1),state=", history.state);
    const onPopState = (ev: PopStateEvent) => {
      console.log(
        "[exam-guard][top] popstate 触发 · state=" + JSON.stringify(ev.state)?.slice(0, 60) + " · armed=" + armedRef.current,
      );
      if (!armedRef.current) return;
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

    /* ---------- 3) iframe 消息:交卷解除 / 用户激活上报 ---------- */
    const onMessage = (ev: MessageEvent) => {
      const data = ev.data as { type?: string } | null;
      if (!data?.type) return;
      if (data.type === "ielts-exam-finished") {
        armedRef.current = false;
        setArmed(false);
        console.log("[exam-guard][top] 收到 iframe 交卷信号,防护解除");
      } else if (data.type === "ielts-user-active") {
        markActivated("iframe显式上报");
      }
    };
    w.addEventListener("message", onMessage);

    return () => {
      w.removeEventListener("beforeunload", onBeforeUnload);
      w.removeEventListener("popstate", onPopState);
      w.removeEventListener("message", onMessage);
      w.removeEventListener("pointerdown", onPointerDown);
      window.clearInterval(poll);
      console.log("[exam-guard][top] 顶层防护卸载");
    };
  }, []);

  /**
   * 内置自检:点击徽标触发,逐项体检并弹报告(自查利器,不依赖控制台)
   * 检查项:处理器挂载/武装状态/历史哨兵/用户激活/iframe加载/信号脚本
   */
  const runSelfCheck = () => {
    const nav = navigator as Navigator & { userActivation?: { hasBeenActive: boolean } };
    const hasUA = typeof nav.userActivation === "object";
    const lines: string[] = [];

    // 1. beforeunload 处理器(用合成事件测监听链路)
    let handlerFired = false;
    const probe = () => { handlerFired = true; };
    window.addEventListener("beforeunload", probe, { once: true });
    const synth = new Event("beforeunload");
    window.dispatchEvent(synth);
    lines.push(`${handlerFired ? "PASS" : "FAIL"} · beforeunload 监听链路 ${handlerFired ? "正常" : "断开"}`);

    // 2. 武装状态
    lines.push(`${armedRef.current ? "PASS" : "WARN"} · 防护 armed=${armedRef.current}${armedRef.current ? "" : " (已交卷解除)"}`);

    // 3. 历史哨兵
    const sent = (history.state as { ieltsGuard?: number } | null)?.ieltsGuard === 1;
    lines.push(`${sent ? "PASS" : "FAIL"} · 后退哨兵 ${sent ? "就位" : "丢失(刷新过页面?重进考试页可恢复)"}`);

    // 4. 用户激活(弹窗资格)
    if (hasUA) {
      lines.push(`${nav.userActivation!.hasBeenActive ? "PASS" : "WARN"} · 用户激活=${nav.userActivation!.hasBeenActive}${nav.userActivation!.hasBeenActive ? " → 刷新会弹窗" : " → 刷新不弹窗(浏览器策略,先点击题目区)"}`);
    } else {
      lines.push("INFO · 浏览器不支持激活查询,弹窗行为未知");
    }

    // 5. iframe 与信号脚本
    const f = document.querySelector("iframe");
    if (f) {
      const fw = f.contentWindow as (Window & { IELTS_EXAM_GUARD?: boolean }) | null;
      const fs = fw?.IELTS_EXAM_GUARD === true;
      lines.push(`${fs ? "PASS" : "WARN"} · iframe 信号脚本 ${fs ? "已加载" : "未加载(试音/须知页正常,主体页应加载)"}`);
    } else {
      lines.push("FAIL · 未找到 iframe");
    }

    console.log("[exam-guard][self-check]\n" + lines.join("\n"));
    alert("Exam Guard Self-Check\n\n" + lines.join("\n"));
  };

  return (
    <button
      type="button"
      onClick={runSelfCheck}
      title="点击运行防护自检"
      className="fixed right-3 bottom-3 z-50 cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-medium shadow-sm select-none"
      style={{
        background: armed ? "#eefaf3" : "#f2f3f5",
        borderColor: armed ? "#cde8da" : "#dfe4ec",
        color: armed ? "#18925c" : "#8a93a2",
      }}
    >
      {armed
        ? `Exam protection: ON${activated ? "" : " · click anywhere to enable refresh-guard"}`
        : "Exam protection: OFF (submitted)"}
    </button>
  );
}
