/**
 * vocab-image-style-card.tsx — 「配图风格」卡(设置页「备考」分区,Task 58)
 *
 * 背单词认词卡的 AI 联想配图风格(§6.1):5 选网格,选中即 PUT 持久化,
 * 下次生图/重生成按新风格出图(已生成的旧图不受影响,单词级重生成才换)。
 * 交互仿「界面皮肤」卡:点击即选中即时生效,无独立保存按钮。
 */
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  DEFAULT_VOCAB_IMAGE_STYLE,
  vocabImageStyleOptions,
  type VocabImageStyleId,
} from "@/lib/vocab-image-styles";

const CARD = "mb-4 max-w-[680px] rounded-xl border border-border bg-card p-5";
const HINT = "text-xs text-muted-foreground";

export function VocabImageStyleCard() {
  const [style, setStyle] = useState<VocabImageStyleId>(DEFAULT_VOCAB_IMAGE_STYLE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const resp = await fetch("/api/vocab-image-style");
        if (resp.ok) {
          const data = (await resp.json()) as { style?: VocabImageStyleId };
          if (data.style) setStyle(data.style);
        }
      } catch {
        // 静默:保持默认
      }
      setLoaded(true);
    })();
  }, []);

  async function select(id: VocabImageStyleId) {
    setStyle(id); // 乐观更新
    try {
      const resp = await fetch("/api/vocab-image-style", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style: id }),
      });
      if (!resp.ok) {
        const data = (await resp.json().catch(() => ({}))) as { error?: string };
        toast.error(data.error ?? "保存失败");
        return;
      }
      toast.success("配图风格已保存,新生成的配图将使用该风格");
    } catch {
      toast.error("保存请求失败");
    }
  }

  const options = vocabImageStyleOptions();

  return (
    <div className={CARD}>
      <h3 className="mb-1 text-[15px]">配图风格</h3>
      <p className={`${HINT} mb-3.5`}>
        背单词认词卡的 AI 联想配图风格。切换后对新生成的配图生效;
        已有配图可在词库中单词级重新生成。
      </p>

      {!loaded ? (
        <p className={HINT}>加载中…</p>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {options.map((o) => {
            const active = style === o.id;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => void select(o.id)}
                className={`press-bubble rounded-lg border p-2.5 text-left transition-colors ${
                  active
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border hover:border-primary/50"
                }`}
                aria-pressed={active}
              >
                <span className="flex items-center justify-between text-[13px] leading-none">
                  <span className={active ? "font-semibold text-primary" : "text-foreground"}>
                    {o.label}
                  </span>
                  {active && <span className="text-[11px] text-primary">✓</span>}
                </span>
                <span className={`${HINT} mt-1.5 block leading-snug`}>{o.desc}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
