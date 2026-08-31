"use client";

/**
 * ExamJump — 错题回看模式(P3)
 *
 * 成绩详情页链接带 ?jump=<anchor>&record=<id>。本组件在机考页壳顶层:
 * 1. (有 record 时)向 /api/exam-records/<id> 取答题卡
 * 2. 等 iframe 加载完成,发送 ielts-review-record(答题卡 → 回填 + inline 批改)
 * 3. (有 anchor 时)发送 ielts-jump-anchor(滚动定位 + 高亮)
 *
 * 卷面由 scoring.js 的 gradeInline 渲染批改效果(✓/✗ 标注/题号板染色/
 * 成绩条),与交卷时刻完全一致。
 */
import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

interface ReviewPayload {
  anchor: string | null;
  /** 键 = 题号(如 "23"),值 = 考生原始作答串;块题块内每题同值 */
  values: Record<string, string> | null;
}

export function ExamJump({
  recordId,
  anchor,
}: {
  recordId: number | null;
  anchor: string | null;
}) {
  const searchParams = useSearchParams();
  // searchParams 仅用于触发重渲染(路由变化时组件刷新)
  void searchParams;

  const stateRef = useRef<ReviewPayload>({ anchor, values: null });
  const sentRef = useRef(false);
  const valuesFetchedRef = useRef(!recordId);

  useEffect(() => {
    let cancelled = false;

    // 1) 取答题卡(有 record 时):服务端返回完整 sheet,转回 values 形态
    if (recordId) {
      fetch(`/api/exam-records/${recordId}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((d: {
          sheet?: Record<
            string,
            { type?: string; number?: number; value?: string | string[] | null }
          >;
        }) => {
          if (cancelled || !d.sheet) return;
          const values: Record<string, string> = {};
          for (const [, entry] of Object.entries(d.sheet)) {
            if (entry.type === "WRITING_TASK" || entry.number == null) continue;
            const v = entry.value;
            if (v == null || v === "") continue;
            // sheet 键是锚点(q-23 / q-18-22),values 键是题号(23);块题 collect
            // 语义 = 块内每题同值,后端入库时已按此展开,这里直接用 number 字段
            values[String(entry.number)] = Array.isArray(v) ? v.join(",") : v;
          }
          stateRef.current.values = values;
          valuesFetchedRef.current = true;
        })
        .catch((e) => {
          console.warn("[exam-jump] 答题卡获取失败,按空白卷回看:", e);
          valuesFetchedRef.current = true;
        });
    }

    // 2) 等待条件满足后向 iframe 发消息
    const trySend = () => {
      if (sentRef.current || !valuesFetchedRef.current) return false;
      const frame = document.querySelector("iframe");
      if (!frame?.contentWindow) return false;
      try {
        // 先回填批改,再锚点定位(顺序保证批改标记渲染后再滚动)
        frame.contentWindow.postMessage(
          { type: "ielts-review-record", values: stateRef.current.values },
          "*",
        );
        if (stateRef.current.anchor) {
          frame.contentWindow.postMessage(
            { type: "ielts-jump-anchor", anchor: stateRef.current.anchor },
            "*",
          );
        }
        console.log(
          "[exam-jump] 回看指令已发送:record=%s anchor=%s",
          recordId,
          stateRef.current.anchor,
        );
        sentRef.current = true;
        return true;
      } catch {
        return false;
      }
    };

    const frame = document.querySelector("iframe");
    const onLoad = () => {
      // 卷页脚本(scoring/exam-guard)在 DOMContentLoaded 后注册,稍等确保就绪
      window.setTimeout(trySend, 300);
    };
    frame?.addEventListener("load", onLoad);

    // 兜底轮询:听力卷 iframe 入口是试音页会跳转,load 时机不定,最多试 15 秒
    let tries = 0;
    const timer = window.setInterval(() => {
      if (sentRef.current || ++tries > 75) {
        window.clearInterval(timer);
        return;
      }
      trySend();
    }, 200);

    return () => {
      cancelled = true;
      frame?.removeEventListener("load", onLoad);
      window.clearInterval(timer);
    };
  }, [recordId, anchor]);

  return null;
}
