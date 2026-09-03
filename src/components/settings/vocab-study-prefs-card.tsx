/**
 * vocab-study-prefs-card.tsx — 「背单词」偏好卡(设置页「备考」分区)
 *
 * 目前只有「每日新词量」:S3 背单词页今日进度 N/M 的分母。
 * 读写 /api/vocab-study-prefs;交互仿「核心词阈值」卡(数字输入 + 保存 + 恢复默认)。
 */
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

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

const DEFAULT_DAILY = 10;

export function VocabStudyPrefsCard() {
  const [loaded, setLoaded] = useState(false);
  const [dailyNewWords, setDailyNewWords] = useState(String(DEFAULT_DAILY));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const resp = await fetch("/api/vocab-study-prefs");
        if (resp.ok) {
          const data = (await resp.json()) as { prefs: { dailyNewWords: number } };
          setDailyNewWords(String(data.prefs.dailyNewWords));
        }
      } catch {
        // 静默:保持默认
      }
      setLoaded(true);
    })();
  }, []);

  async function save(value: number) {
    if (!Number.isInteger(value) || value < 1 || value > 100) {
      setError("每日新词量应为 1–100 的整数");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const resp = await fetch("/api/vocab-study-prefs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyNewWords: value }),
      });
      const data = (await resp.json()) as { ok?: boolean; error?: string };
      if (!resp.ok || !data.ok) {
        toast.error(data.error ?? "保存失败");
        return;
      }
      setDailyNewWords(String(value));
      toast.success("背单词偏好已保存,背单词页今日进度立即按新值显示");
    } catch {
      toast.error("保存请求失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={CARD}>
      <h3 className="mb-1 text-[15px]">背单词</h3>
      <p className={`${HINT} mb-3.5`}>
        背单词页「今日进度」的每日目标;改完立即生效。
      </p>

      {!loaded ? (
        <p className={HINT}>加载中…</p>
      ) : (
        <>
          <div className={ROW}>
            <label className={LABEL}>每日新词量</label>
            <input
              className={INPUT}
              inputMode="numeric"
              value={dailyNewWords}
              onChange={(e) => setDailyNewWords(e.target.value.replace(/\D/g, ""))}
            />
            <span className={HINT}>1–100 词/天</span>
          </div>

          {error && <p className="mb-3 text-xs text-destructive">{error}</p>}

          <div className="flex gap-2.5">
            <button
              type="button"
              className={BTN_PRIMARY}
              disabled={saving}
              onClick={() => void save(Number(dailyNewWords))}
            >
              {saving ? "保存中…" : "保存"}
            </button>
            <button
              type="button"
              className={BTN}
              disabled={saving}
              onClick={() => {
                setDailyNewWords(String(DEFAULT_DAILY));
                void save(DEFAULT_DAILY);
              }}
            >
              恢复默认({DEFAULT_DAILY} 词)
            </button>
          </div>
        </>
      )}
    </div>
  );
}
