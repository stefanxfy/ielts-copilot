/**
 * study-prefs-card.tsx — 「个人习惯」卡(P7,设置页「备考」分区)
 *
 * 与向导 STEP4 同源同校验:wakeTime/bedTime/subjectSlots,
 * 读写 /api/study-preferences(向导第 4 步离开时也 PUT 同一端点)。
 */
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { StudyPreferences, TaskType } from "@/db/schema";
import { TASK_TYPES } from "@/db/schema";

const CARD = "mb-4 max-w-[680px] rounded-xl border border-[#dfe4ec] bg-white p-5";
const ROW = "mb-3 flex items-center gap-2.5";
const LABEL = "w-[150px] shrink-0 text-[13px] text-[#5b6574]";
const INPUT =
  "h-9 w-[110px] rounded-md border border-[#dfe4ec] bg-white px-2.5 text-[13px] outline-none focus:border-[#1a6feb]";
const SELECT =
  "h-9 w-[180px] rounded-md border border-[#dfe4ec] bg-white px-2.5 text-[13px] outline-none focus:border-[#1a6feb]";
const BTN_PRIMARY =
  "rounded-md bg-[#1a6feb] px-3.5 py-1.5 text-[13px] text-white transition-colors hover:bg-[#0d4fa8] disabled:cursor-not-allowed disabled:opacity-50";
const HINT = "text-xs text-[#8a93a2]";

const TASK_LABEL: Record<TaskType, string> = {
  words: "背单词",
  listening: "听力",
  reading: "阅读",
  writing: "写作",
  speaking: "口语",
  set: "完整套卷",
};

const SLOT_OPTIONS: { value: string; label: string }[] = [
  { value: "morning", label: "上午" },
  { value: "noon", label: "中午" },
  { value: "afternoon", label: "下午" },
  { value: "evening", label: "晚上" },
  { value: "", label: "不指定" },
];

export function StudyPrefsCard() {
  const [loaded, setLoaded] = useState(false);
  const [wakeTime, setWakeTime] = useState("07:00");
  const [bedTime, setBedTime] = useState("23:00");
  const [subjectSlots, setSubjectSlots] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const resp = await fetch("/api/study-preferences");
      if (resp.ok) {
        const data = (await resp.json()) as { preferences: StudyPreferences };
        setWakeTime(data.preferences.wakeTime ?? "07:00");
        setBedTime(data.preferences.bedTime ?? "23:00");
        setSubjectSlots(
          Object.fromEntries(
            Object.entries(data.preferences.subjectSlots ?? {}).map(([k, v]) => [k, v]),
          ),
        );
      }
      setLoaded(true);
    })();
  }, []);

  async function save() {
    // 校验:起床须早于睡觉(服务端同规则;跨零点不支持,与向导一致)
    if (wakeTime >= bedTime) {
      setError("起床时间须早于睡觉时间");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const subjectSlotsOut: Record<string, string> = {};
      for (const [k, v] of Object.entries(subjectSlots)) {
        if (v && TASK_TYPES.includes(k as TaskType)) subjectSlotsOut[k] = v;
      }
      const resp = await fetch("/api/study-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wakeTime, bedTime, subjectSlots: subjectSlotsOut }),
      });
      const data = (await resp.json()) as { ok?: boolean; error?: string };
      if (!resp.ok || !data.ok) {
        toast.error(data.error ?? "保存失败");
        return;
      }
      toast.success("个人习惯已保存,下次生成计划时生效");
    } catch {
      toast.error("保存请求失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={CARD}>
      <h3 className="mb-1 text-[15px]">个人习惯</h3>
      <p className={`${HINT} mb-3.5`}>
        作息用于划分上午/中午/下午/晚上;各科偏好时段会在生成计划时优先安排对应任务。
      </p>

      {!loaded ? (
        <p className={HINT}>加载中…</p>
      ) : (
        <>
          <div className={ROW}>
            <label className={LABEL}>起床时间</label>
            <input
              type="time"
              className={INPUT}
              value={wakeTime}
              onChange={(e) => setWakeTime(e.target.value)}
            />
          </div>
          <div className={ROW}>
            <label className={LABEL}>睡觉时间</label>
            <input
              type="time"
              className={INPUT}
              value={bedTime}
              onChange={(e) => setBedTime(e.target.value)}
            />
          </div>
          <div className="mb-1.5 text-[13px] text-[#5b6574]">各科偏好时段(选填)</div>
          {TASK_TYPES.map((t) => (
            <div key={t} className={ROW}>
              <label className={LABEL}>{TASK_LABEL[t]}</label>
              <select
                className={SELECT}
                value={subjectSlots[t] ?? ""}
                onChange={(e) => setSubjectSlots((s) => ({ ...s, [t]: e.target.value }))}
              >
                {SLOT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          ))}

          {error && <p className="mb-3 text-xs text-destructive">{error}</p>}

          <button type="button" className={BTN_PRIMARY} disabled={saving} onClick={() => void save()}>
            {saving ? "保存中…" : "保存习惯"}
          </button>
        </>
      )}
    </div>
  );
}
