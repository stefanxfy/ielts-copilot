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
import { useRouter } from "next/navigation";

const PLAYED_KEY = "ielts_audio_played";

export function ExamGuard() {
  const router = useRouter();
  const armedRef = useRef(true);
  // ref 持有 router:让退出处理器稳定引用,避免整组监听随 router 实例重建
  const routerRef = useRef(router);
  useEffect(() => {
    routerRef.current = router;
  }, [router]);
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

    /* ---------- 1a) 刷新快捷键拦截(硬方案,不依赖浏览器弹窗策略) ----------
       beforeunload 弹窗受浏览器「用户激活」策略与各家实现差异影响
       (Safari/Arc 常不显示),改为 keydown 阶段直接拦下刷新快捷键:
       F5 / Cmd+R / Cmd+Shift+R / Ctrl+R / Ctrl+F5 前先弹自定义英文 confirm。
       preventDefault 后刷新不发生,弹窗必显示。

       ⚠️ 关键:本监听器只覆盖「焦点在顶层」的情况。用户答题时焦点在
       iframe 内,键盘事件直接派发给 iframe 的 document,不会传播到顶层
       window,这份 keydown 收不到 —— 那一半由 iframe 内 exam-guard.js
       在 capture 阶段拦下并 postMessage({type:'ielts-reload-request'})
       转发,最终同样走下面的 handleReloadRequest。 */
    const CONFIRM_MSG =
      "You are about to refresh or leave the exam.\n\n" +
      "Your answers will NOT be saved.\n\n" +
      "Click OK to abandon the exam, or Cancel to continue.";

    // 统一的刷新确认入口:顶层 keydown 与 iframe 转发共用,行为一致
    const handleReloadRequest = (via: string) => {
      if (!armedRef.current) return;
      console.warn("[exam-guard][top] 拦截刷新快捷键(" + via + "),弹确认");
      const leave = w.confirm(CONFIRM_MSG);
      if (leave) {
        try {
          sessionStorage.removeItem(PLAYED_KEY);
        } catch {}
        // 用户已在我们自己 confirm 里确认放弃 —— 解除防护,避免
        // location.reload() 触发 beforeunload 又弹一次 Chrome 原生弹窗
        armedRef.current = false;
        setArmed(false);
        console.log("[exam-guard][top] 确认放弃:清标记并放行刷新(解除 beforeunload)");
        location.reload();
      } else {
        console.log("[exam-guard][top] 继续考试:刷新已被阻止");
      }
    };

    const onReloadKeys = (e: KeyboardEvent) => {
      if (!armedRef.current) return;
      const key = e.key?.toLowerCase() ?? "";
      const isF5 = key === "f5";
      // Cmd/Ctrl + R(刷新,含 Shift 变体)
      const isReloadCombo = key === "r" && (e.metaKey || e.ctrlKey);
      if (!isF5 && !isReloadCombo) return;
      e.preventDefault();
      e.stopPropagation();
      handleReloadRequest(isF5 ? "F5" : "Cmd/Ctrl+R");
    };
    w.addEventListener("keydown", onReloadKeys, true);

    /* ---------- 1b) 兜底:beforeunload(地址栏刷新/关闭标签页/跳离) ---------- */
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
      const data = ev.data as { type?: string; via?: string } | null;
      if (!data?.type) return;
      if (data.type === "ielts-exam-finished") {
        armedRef.current = false;
        setArmed(false);
        console.log("[exam-guard][top] 收到 iframe 交卷信号,防护解除");
      } else if (data.type === "ielts-reload-request") {
        // iframe 内焦点下按 F5/Cmd+R:顶层 keydown 收不到(键盘事件直接
        // 派发给 iframe document),由 iframe guard 拦截后转发到此
        handleReloadRequest("iframe内 " + (data.via ?? "刷新键"));
      } else if (data.type === "ielts-user-active") {
        markActivated("iframe显式上报");
      }
    };
    w.addEventListener("message", onMessage);

    /* ---------- 4) 页面内「← Back」按钮:自定义弹窗确认退出(方案 A) ----------
       exam-back-button 弹窗确认后派发 ielts-exit-exam,由本组件统一处理:
       解除防护 + 清听力已播标记 + 跳回仪表盘(与后退/刷新拦截共用退出路径)。 */
    const onExitExam = () => {
      console.log("[exam-guard][top] 收到页面内退出确认,解除防护并返回仪表盘");
      armedRef.current = false;
      setArmed(false);
      try {
        sessionStorage.removeItem(PLAYED_KEY);
      } catch {}
      // SPA 内跳转:解除防护后 router.push 不会触发 beforeunload
      routerRef.current.push("/");
    };
    w.addEventListener("ielts-exit-exam", onExitExam);

    return () => {
      w.removeEventListener("beforeunload", onBeforeUnload);
      w.removeEventListener("keydown", onReloadKeys, true);
      w.removeEventListener("popstate", onPopState);
      w.removeEventListener("message", onMessage);
      w.removeEventListener("pointerdown", onPointerDown);
      w.removeEventListener("ielts-exit-exam", onExitExam);
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
