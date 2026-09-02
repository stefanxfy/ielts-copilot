/**
 * punch-rules-card.tsx — 「打卡规则」卡(P7,设置页「备考」分区)
 *
 * submissionMin(提交类任务达标次数,1–20)/ wordsMin(背词达标数,1–100)
 * / bothForFull(两项同时达标才算满格)。GET 回填 → PUT 保存;
 * 运行时未配置即服务端默认(submissionMin=1 / wordsMin=5 / bothForFull=true)。
 */
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { PunchRules } from "@/db/schema";

const CARD = "mb-4 max-w-[680px] rounded-xl border border-border bg-card p-5";
const ROW = "mb-3 flex items-center gap-2.5";
const LABEL = "w-[150px] shrink-0 text-[13px] text-muted-foreground";
const INPUT =
  "h-9 w-[110px] rounded-md border border-border bg-card px-2.5 text-[13px] outline-none focus:border-primary";
const BTN_PRIMARY =
  "rounded-md bg-primary px-3.5 py-1.5 text-[13px] text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50";
const HINT = "text-xs text-muted-foreground";

export function PunchRulesCard() {
  const [loaded, setLoaded] = useState(false);
  const [submissionMin, setSubmissionMin] = useState("1");
  const [wordsMin, setWordsMin] = useState("5");
  const [bothForFull, setBothForFull] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const resp = await fetch("/api/study-punch-rules");
      if (resp.ok) {
        const data = (await resp.json()) as { rules: PunchRules };
        setSubmissionMin(String(data.rules.submissionMin));
        setWordsMin(String(data.rules.wordsMin));
        setBothForFull(data.rules.bothForFull);
      }
      setLoaded(true);
    })();
  }, []);

  async function save() {
    const sm = Number(submissionMin);
    const wm = Number(wordsMin);
    if (!Number.isInteger(sm) || sm < 1 || sm > 20) {
      setError("提交达标次数须为 1–20 的整数");
      return;
    }
    if (!Number.isInteger(wm) || wm < 1 || wm > 100) {
      setError("背词达标数须为 1–100 的整数");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const resp = await fetch("/api/study-punch-rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionMin: sm, wordsMin: wm, bothForFull }),
      });
      const data = (await resp.json()) as { ok?: boolean; error?: string };
      if (!resp.ok || !data.ok) {
        toast.error(data.error ?? "保存失败");
        return;
      }
      toast.success("打卡规则已保存,明日日历按新规则判定");
    } catch {
      toast.error("保存请求失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={CARD}>
      <h3 className="mb-1 text-[15px]">打卡规则</h3>
      <p className={`${HINT} mb-3.5`}>
        决定作战主页打卡日历的绿格判定。历史日期按当日规则快照回放,改规则只影响之后的判定。
      </p>

      {!loaded ? (
        <p className={HINT}>加载中…</p>
      ) : (
        <>
          <div className={ROW}>
            <label className={LABEL}>提交类任务达标(次/日)</label>
            <input
              className={INPUT}
              inputMode="numeric"
              value={submissionMin}
              onChange={(e) => setSubmissionMin(e.target.value.replace(/\D/g, ""))}
            />
            <span className={HINT}>1–20;听/读/写/套卷提交计次</span>
          </div>
          <div className={ROW}>
            <label className={LABEL}>背单词达标(个/日)</label>
            <input
              className={INPUT}
              inputMode="numeric"
              value={wordsMin}
              onChange={(e) => setWordsMin(e.target.value.replace(/\D/g, ""))}
            />
            <span className={HINT}>1–100</span>
          </div>
          <div className={ROW}>
            <label className={LABEL}>两项同时达标才算满格</label>
            <input
              type="checkbox"
              className="accent-primary"
              checked={bothForFull}
              onChange={(e) => setBothForFull(e.target.checked)}
            />
            <span className={HINT}>
              关闭时:任一项达标即满格;开启时:达标=浅绿,双达标=深绿
            </span>
          </div>

          {error && <p className="mb-3 text-xs text-destructive">{error}</p>}

          <button type="button" className={BTN_PRIMARY} disabled={saving} onClick={() => void save()}>
            {saving ? "保存中…" : "保存规则"}
          </button>
        </>
      )}
    </div>
  );
}
