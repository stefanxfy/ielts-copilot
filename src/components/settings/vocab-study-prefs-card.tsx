/**
 * vocab-study-prefs-card.tsx — 「背单词」偏好卡(设置页「备考」分区)
 *
 * 「每日新词量」:S3 背单词页今日进度 N/M 的分母。
 * 「键入音效」:认词卡拼写自练线每键一音的风格(lib/vocab-sfx.ts 五种合成音),
 *   含试听按钮;保存走 /api/vocab-study-prefs,保存后模块级即时生效。
 * 交互仿「核心词阈值」卡(输入 + 保存 + 恢复默认)。
 */
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  DEFAULT_KEY_SFX_STYLE,
  KEY_SFX_OPTIONS,
  setKeySfxStyle,
  sfxKey,
  type KeySfxStyle,
} from "@/lib/vocab-sfx";

const CARD = "mb-4 max-w-[680px] rounded-xl border border-border bg-card p-5";
const ROW = "mb-3 flex items-center gap-2.5";
const LABEL = "w-[150px] shrink-0 text-[13px] text-muted-foreground";
const INPUT =
  "h-9 w-[110px] rounded-md border border-border bg-card px-2.5 text-[13px] outline-none focus:border-primary";
const SELECT =
  "h-9 w-[220px] rounded-md border border-border bg-card px-2.5 text-[13px] outline-none focus:border-primary";
const BTN_PRIMARY =
  "rounded-md bg-primary px-3.5 py-1.5 text-[13px] text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50";
const BTN =
  "rounded-md border border-border bg-card px-3 py-1.5 text-[13px] text-foreground transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50";
const HINT = "text-xs text-muted-foreground";

const DEFAULT_DAILY = 10;

export function VocabStudyPrefsCard() {
  const [loaded, setLoaded] = useState(false);
  const [dailyNewWords, setDailyNewWords] = useState(String(DEFAULT_DAILY));
  const [keySfx, setKeySfx] = useState<KeySfxStyle>(DEFAULT_KEY_SFX_STYLE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const resp = await fetch("/api/vocab-study-prefs");
        if (resp.ok) {
          const data = (await resp.json()) as { prefs: { dailyNewWords: number; keySfxStyle?: string } };
          setDailyNewWords(String(data.prefs.dailyNewWords));
          const s = data.prefs.keySfxStyle;
          if (s && KEY_SFX_OPTIONS.some((o) => o.id === s)) setKeySfx(s as KeySfxStyle);
        }
      } catch {
        // 静默:保持默认
      }
      setLoaded(true);
    })();
  }, []);

  async function save(nextDaily: number, nextSfx: KeySfxStyle) {
    if (!Number.isInteger(nextDaily) || nextDaily < 1 || nextDaily > 100) {
      setError("每日新词量应为 1–100 的整数");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const resp = await fetch("/api/vocab-study-prefs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyNewWords: nextDaily, keySfxStyle: nextSfx }),
      });
      const data = (await resp.json()) as { ok?: boolean; error?: string };
      if (!resp.ok || !data.ok) {
        toast.error(data.error ?? "保存失败");
        return;
      }
      setDailyNewWords(String(nextDaily));
      setKeySfx(nextSfx);
      setKeySfxStyle(nextSfx); // 模块级即时生效(同会话切到 /learn 不用重进)
      toast.success("背单词偏好已保存,立即生效");
    } catch {
      toast.error("保存请求失败");
    } finally {
      setSaving(false);
    }
  }

  /** 试听:连响三声(间隔 160ms,可听出 scale 爬升感);直接传当前选中风格,无需先保存 */
  function preview() {
    for (let i = 0; i < 3; i++) {
      window.setTimeout(() => sfxKey(keySfx), i * 160);
    }
  }

  return (
    <div className={CARD}>
      <h3 className="mb-1 text-[15px]">背单词</h3>
      <p className={`${HINT} mb-3.5`}>
        背单词页「今日进度」的每日目标;认词卡拼写自练线的键入音效。改完立即生效。
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

          <div className={ROW}>
            <label className={LABEL}>键入音效</label>
            <select
              className={SELECT}
              value={keySfx}
              onChange={(e) => setKeySfx(e.target.value as KeySfxStyle)}
            >
              {KEY_SFX_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <button type="button" className={BTN} onClick={preview}>
              试听
            </button>
            <span className={HINT}>{KEY_SFX_OPTIONS.find((o) => o.id === keySfx)?.desc}</span>
          </div>

          {error && <p className="mb-3 text-xs text-destructive">{error}</p>}

          <div className="flex gap-2.5">
            <button
              type="button"
              className={BTN_PRIMARY}
              disabled={saving}
              onClick={() => void save(Number(dailyNewWords), keySfx)}
            >
              {saving ? "保存中…" : "保存"}
            </button>
            <button
              type="button"
              className={BTN}
              disabled={saving}
              onClick={() => {
                setDailyNewWords(String(DEFAULT_DAILY));
                setKeySfx(DEFAULT_KEY_SFX_STYLE);
                void save(DEFAULT_DAILY, DEFAULT_KEY_SFX_STYLE);
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
