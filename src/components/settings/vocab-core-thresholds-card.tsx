/**
 * vocab-core-thresholds-card.tsx — 「核心词阈值」卡(设置页「备考」分区)
 *
 * 核心词判据 collins ≥ collinsMin 或 bncRank ≤ bncMax(词库导入生图策略 core 的筛词依据)。
 * GET 回填 → PUT 保存;阈值立即生效(导入管线每次现读 app_settings,无缓存)。
 * 交互仿「打卡规则」卡:两数字输入 + 保存按钮 + 恢复默认。
 */
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { CoreThresholds } from "@/lib/vocab-core-word";

const CARD = "mb-4 max-w-[680px] rounded-xl border border-border bg-card p-5";
const ROW = "mb-3 flex items-center gap-2.5";
const LABEL = "w-[150px] shrink-0 text-[13px] text-muted-foreground";
const INPUT =
  "h-9 w-[110px] rounded-md border border-border bg-card px-2.5 text-[13px] outline-none focus:border-primary";
const BTN_PRIMARY =
  "rounded-md bg-primary px-3.5 py-1.5 text-[13px] text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50";
const BTN =
  "rounded-md border border-border bg-card px-3 py-1.5 text-[13px] text-foreground transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50";
const HINT = "text-xs text-muted-foreground";

export function VocabCoreThresholdsCard() {
  const [loaded, setLoaded] = useState(false);
  const [collinsMin, setCollinsMin] = useState("3");
  const [bncMax, setBncMax] = useState("2000");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const resp = await fetch("/api/vocab-core-thresholds");
        if (resp.ok) {
          const data = (await resp.json()) as { thresholds: CoreThresholds };
          setCollinsMin(String(data.thresholds.collinsMin));
          setBncMax(String(data.thresholds.bncMax));
        }
      } catch {
        // 静默:保持默认
      }
      setLoaded(true);
    })();
  }, []);

  function validate(sm: number, bm: number): string | null {
    if (!Number.isInteger(sm) || sm < 1 || sm > 5) return "柯林斯星级门槛须为 1–5 的整数";
    if (!Number.isInteger(bm) || bm < 100 || bm > 50000) return "BNC 词频上限须为 100–50000 的整数";
    return null;
  }

  async function save() {
    const sm = Number(collinsMin);
    const bm = Number(bncMax);
    const errMsg = validate(sm, bm);
    if (errMsg) {
      setError(errMsg);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const resp = await fetch("/api/vocab-core-thresholds", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collinsMin: sm, bncMax: bm }),
      });
      const data = (await resp.json()) as { ok?: boolean; error?: string };
      if (!resp.ok || !data.ok) {
        toast.error(data.error ?? "保存失败");
        return;
      }
      toast.success("核心词阈值已保存,下次导入生图按新阈值筛词");
    } catch {
      toast.error("保存请求失败");
    } finally {
      setSaving(false);
    }
  }

  async function resetDefault() {
    setCollinsMin("3");
    setBncMax("2000");
    setError(null);
    setSaving(true);
    try {
      const resp = await fetch("/api/vocab-core-thresholds", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collinsMin: 3, bncMax: 2000 }),
      });
      const data = (await resp.json()) as { ok?: boolean; error?: string };
      if (!resp.ok || !data.ok) {
        toast.error(data.error ?? "恢复默认失败");
        return;
      }
      toast.success("已恢复默认阈值 3 / 2000");
    } catch {
      toast.error("保存请求失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={CARD}>
      <h3 className="mb-1 text-[15px]">核心词阈值</h3>
      <p className={`${HINT} mb-3.5`}>
        词库导入「仅核心词生图」策略的筛词判据:满足任一条件即为核心词。
        阈值保存后立即生效,对之后的导入任务生效,已生成的配图不受影响。
      </p>

      {!loaded ? (
        <p className={HINT}>加载中…</p>
      ) : (
        <>
          <div className={ROW}>
            <label className={LABEL}>柯林斯星级 ≥</label>
            <input
              className={INPUT}
              inputMode="numeric"
              value={collinsMin}
              onChange={(e) => setCollinsMin(e.target.value.replace(/\D/g, ""))}
            />
            <span className={HINT}>1–5;3 星及以上为高频核心词</span>
          </div>
          <div className={ROW}>
            <label className={LABEL}>BNC 词频排名 ≤</label>
            <input
              className={INPUT}
              inputMode="numeric"
              value={bncMax}
              onChange={(e) => setBncMax(e.target.value.replace(/\D/g, ""))}
            />
            <span className={HINT}>100–50000;数字越小越常用</span>
          </div>

          {error && <p className="mb-3 text-xs text-destructive">{error}</p>}

          <div className="flex gap-2.5">
            <button type="button" className={BTN_PRIMARY} disabled={saving} onClick={() => void save()}>
              {saving ? "保存中…" : "保存阈值"}
            </button>
            <button
              type="button"
              className={BTN}
              disabled={saving}
              onClick={() => void resetDefault()}
            >
              恢复默认(3 / 2000)
            </button>
          </div>
        </>
      )}
    </div>
  );
}
