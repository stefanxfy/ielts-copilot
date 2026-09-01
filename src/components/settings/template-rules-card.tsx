/**
 * template-rules-card.tsx — 「默认模板规则」卡(v2.9,设置页「备考」分区)
 *
 * 阶段比例 / 基准任务表 / 上限与阈值:结构化表单逐字段数值输入 + 范围校验
 * / 保存(PUT)/ 恢复默认(表单回默认值;运行时单字段非法本就回退默认)。
 */
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { TaskType, TemplateRules } from "@/db/schema";
import { TASK_TYPES } from "@/db/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const CARD = "mb-4 max-w-[680px] rounded-xl border border-[#dfe4ec] bg-white p-5";
const ROW = "mb-3 flex flex-wrap items-center gap-x-2.5 gap-y-1.5";
const LABEL = "w-[130px] shrink-0 text-[13px] text-[#5b6574]";
const INPUT =
  "h-9 min-w-0 flex-1 rounded-md border border-[#dfe4ec] bg-white px-2.5 text-[13px] outline-none focus:border-[#1a6feb]";
const BTN =
  "rounded-md border border-[#dfe4ec] bg-white px-3 py-1.5 text-[13px] text-[#1c2330] transition-colors hover:border-[#1a6feb] hover:text-[#1a6feb] disabled:cursor-not-allowed disabled:opacity-50";
const BTN_PRIMARY =
  "rounded-md bg-[#1a6feb] px-3.5 py-1.5 text-[13px] text-white transition-colors hover:bg-[#0d4fa8] disabled:cursor-not-allowed disabled:opacity-50";
const HINT = "text-xs text-[#8a93a2]";

const PHASE_LABEL: Record<"basic" | "strengthen" | "sprint", string> = {
  basic: "基础期",
  strengthen: "强化期",
  sprint: "冲刺期",
};
const TASK_LABEL: Record<TaskType, string> = {
  words: "背单词",
  listening: "听力",
  reading: "阅读",
  writing: "写作",
  speaking: "口语",
  set: "套卷",
};
const RATIO_LABEL: Record<"long" | "mid" | "short", string> = {
  long: "长期(≥10 周,%)",
  mid: "中期(6–9 周,周数)",
  short: "短期(3–5 周,周数)",
};

const SMALL_FIELDS = [
  ["scaleBaseHours", "缩放基准(小时/天)", 1, 12],
  ["wordsCeil", "背词每日上限", 10, 500],
  ["perSubjectCeil", "单科每周上限", 1, 21],
  ["blockMinMinutes", "整块阈值(分钟)", 15, 240],
  ["mergeGapMinutes", "合并间隔(分钟)", 0, 120],
] as const;

type NumText = Record<string, string>;

/** 内置默认(v2.9 §4.4;与 lib/prompts/defaults.ts DEFAULT_TEMPLATE_RULES 同值) */
const DEFAULT: TemplateRules = {
  phaseRatios: { long: [40, 40, 20], mid: [2, 3, 1], short: [1, 2, 1] },
  baseWeekly: {
    basic: { words: 40, listening: 1, reading: 1, writing: 1, speaking: 0, set: 0 },
    strengthen: { words: 30, listening: 2, reading: 2, writing: 2, speaking: 1, set: 0 },
    sprint: { words: 20, listening: 2, reading: 2, writing: 1, speaking: 1, set: 1 },
  },
  scaleBaseHours: 2,
  wordsCeil: 80,
  perSubjectCeil: 7,
  blockMinMinutes: 60,
  mergeGapMinutes: 30,
};

export function TemplateRulesCard() {
  const [rules, setRules] = useState<TemplateRules | null>(null);
  const [ratios, setRatios] = useState<NumText>({});
  const [base, setBase] = useState<NumText>({});
  const [small, setSmall] = useState<NumText>({});
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const resp = await fetch("/api/study-template-rules");
      if (!resp.ok) return;
      const data = (await resp.json()) as { rules: TemplateRules };
      fill(data.rules);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function fill(r: TemplateRules) {
    setRules(r);
    setRatios({
      "long.0": String(r.phaseRatios.long[0]),
      "long.1": String(r.phaseRatios.long[1]),
      "long.2": String(r.phaseRatios.long[2]),
      "mid.0": String(r.phaseRatios.mid[0]),
      "mid.1": String(r.phaseRatios.mid[1]),
      "mid.2": String(r.phaseRatios.mid[2]),
      "short.0": String(r.phaseRatios.short[0]),
      "short.1": String(r.phaseRatios.short[1]),
      "short.2": String(r.phaseRatios.short[2]),
    });
    setBase(
      Object.fromEntries(
        (["basic", "strengthen", "sprint"] as const).flatMap((phase) =>
          TASK_TYPES.map((t) => [`${phase}.${t}` as const, String(r.baseWeekly[phase][t])]),
        ),
      ),
    );
    setSmall({
      scaleBaseHours: String(r.scaleBaseHours),
      wordsCeil: String(r.wordsCeil),
      perSubjectCeil: String(r.perSubjectCeil),
      blockMinMinutes: String(r.blockMinMinutes),
      mergeGapMinutes: String(r.mergeGapMinutes),
    });
  }

  function buildPayload(): TemplateRules | null {
    const num = (v: string): number | null => {
      const n = Number(v);
      return v.trim() !== "" && Number.isFinite(n) ? n : null;
    };
    const get = (src: NumText, k: string): number | null => num(src[k] ?? "");

    const phaseRatios = {} as TemplateRules["phaseRatios"];
    for (const key of ["long", "mid", "short"] as const) {
      const triple = [get(ratios, `${key}.0`), get(ratios, `${key}.1`), get(ratios, `${key}.2`)];
      if (triple.some((n) => n == null || n < 0)) {
        setErr(`${RATIO_LABEL[key]} 应为 3 个非负数`);
        return null;
      }
      const sum = triple.reduce<number>((a, c) => a + (c ?? 0), 0);
      if (key === "long" && Math.round(sum) !== 100) {
        setErr("长期比例之和应为 100");
        return null;
      }
      if (key !== "long" && (!triple.every((n) => Number.isInteger(n)) || sum < 1 || sum > 52)) {
        setErr(`${RATIO_LABEL[key]} 周数应为非负整数且合计 1–52`);
        return null;
      }
      phaseRatios[key] = triple.map((n) => n ?? 0) as [number, number, number];
    }

    const baseWeekly = {} as TemplateRules["baseWeekly"];
    for (const phase of ["basic", "strengthen", "sprint"] as const) {
      const row = {} as Record<TaskType, number>;
      for (const t of TASK_TYPES) {
        const v = get(base, `${phase}.${t}`);
        if (v == null || v < 0 || v > 999) {
          setErr(`${PHASE_LABEL[phase]}·${TASK_LABEL[t]} 应为 0–999 的数值`);
          return null;
        }
        row[t] = v;
      }
      baseWeekly[phase] = row;
    }

    const out = { phaseRatios, baseWeekly } as TemplateRules;
    for (const [key, label, min, max] of SMALL_FIELDS) {
      const v = get(small, key);
      if (v == null || v < min || v > max) {
        setErr(`${label} 应为 ${min}–${max}`);
        return null;
      }
      (out as unknown as Record<string, number>)[key] = v;
    }
    return out;
  }

  async function save() {
    const payload = buildPayload();
    if (!payload) return;
    setSaving(true);
    try {
      const resp = await fetch("/api/study-template-rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await resp.json()) as { ok?: boolean; rules?: TemplateRules; error?: string };
      if (!resp.ok || !data.ok) {
        setErr(data.error ?? "保存失败");
        toast.error(data.error ?? "保存失败");
        return;
      }
      setErr(null);
      if (data.rules) fill(data.rules);
      toast.success("默认模板规则已保存,下次生成计划生效");
    } catch {
      toast.error("保存请求失败");
    } finally {
      setSaving(false);
    }
  }

  async function resetToDefault() {
    setConfirmReset(false);
    try {
      // 「恢复默认」:发送内置默认值覆盖保存(GET 回读即默认;运行时本就单字段回退)
      const resp = await fetch("/api/study-template-rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(DEFAULT),
      });
      const data = (await resp.json()) as { ok?: boolean; rules?: TemplateRules; error?: string };
      if (!resp.ok || !data.ok) {
        toast.error(data.error ?? "恢复默认失败");
        return;
      }
      if (data.rules) fill(data.rules);
      toast.info("已恢复默认规则");
    } catch {
      toast.error("恢复默认请求失败");
    }
  }

  return (
    <div className={CARD}>
      <h3 className="mb-1 text-[15px]">默认模板规则</h3>
      <p className={`${HINT} mb-3.5`}>
        向导「默认模板」生成路径的规则引擎查表数值;运行时单字段非法自动回退默认。
      </p>

      {rules === null ? (
        <p className={HINT}>加载中…</p>
      ) : (
        <>
          {/* 阶段比例 */}
          <div className="mb-1.5 text-[13px] font-medium text-[#1c2330]">阶段划分</div>
          {(["long", "mid", "short"] as const).map((key) => (
            <div key={key} className={ROW}>
              <span className={LABEL}>{RATIO_LABEL[key]}</span>
              {/* 定宽 w-16 + 各层 min-w-0:input 固有宽度会撑大嵌套 flex 的 min-content,把行尾「冲刺期」顶出卡片 */}
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1.5">
                {(["basic", "strengthen", "sprint"] as const).map((phase, i) => (
                  <div key={phase} className="flex min-w-0 items-center gap-1.5">
                    <input
                      className="h-9 w-16 min-w-0 rounded-md border border-[#dfe4ec] bg-white px-2 text-center text-[13px] outline-none focus:border-[#1a6feb]"
                      inputMode="numeric"
                      value={ratios[`${key}.${i}`] ?? ""}
                      onChange={(e) =>
                        setRatios((r) => ({ ...r, [`${key}.${i}`]: e.target.value }))
                      }
                    />
                    <span className="shrink-0 text-[12px] text-[#8a93a2]">{PHASE_LABEL[phase]}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* 基准任务表 */}
          <div className="mb-1.5 mt-4 text-[13px] font-medium text-[#1c2330]">
            基准任务表(每天 2h 基准)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-left text-[#8a93a2]">
                  <th className="py-1 pr-2 font-normal">阶段</th>
                  {TASK_TYPES.map((t) => (
                    <th key={t} className="py-1 pr-2 font-normal">
                      {TASK_LABEL[t]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(["basic", "strengthen", "sprint"] as const).map((phase) => (
                  <tr key={phase}>
                    <td className="py-1 pr-2 text-[#5b6574]">{PHASE_LABEL[phase]}</td>
                    {TASK_TYPES.map((t) => (
                      <td key={t} className="py-1 pr-2">
                        <input
                          className="h-8 w-16 rounded-md border border-[#dfe4ec] bg-white px-2 text-[12px] outline-none focus:border-[#1a6feb]"
                          inputMode="decimal"
                          value={base[`${phase}.${t}`] ?? ""}
                          onChange={(e) =>
                            setBase((b) => ({ ...b, [`${phase}.${t}`]: e.target.value }))
                          }
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={`${HINT} mt-1`}>
            words=个/天,listening/reading/writing/set=套(次)/周,speaking=次/周
          </p>

          {/* 上限与阈值 */}
          <div className="mb-1.5 mt-4 text-[13px] font-medium text-[#1c2330]">上限与阈值</div>
          {SMALL_FIELDS.map(([key, label]) => (
            <div key={key} className={ROW}>
              <span className={LABEL}>{label}</span>
              <input
                className={INPUT}
                inputMode="decimal"
                value={small[key] ?? ""}
                onChange={(e) => setSmall((s) => ({ ...s, [key]: e.target.value }))}
              />
            </div>
          ))}

          {err && <p className="mb-3 text-xs text-destructive">{err}</p>}

          <div className="mt-3 flex gap-2.5">
            <button type="button" className={BTN_PRIMARY} onClick={() => void save()} disabled={saving}>
              {saving ? "保存中…" : "保存规则"}
            </button>
            <button type="button" className={BTN} onClick={() => setConfirmReset(true)}>
              恢复默认
            </button>
          </div>
        </>
      )}

      <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>恢复默认规则?</DialogTitle>
            <DialogDescription>全部规则数值将回到内置默认,当前修改丢弃。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button type="button" className={BTN} onClick={() => setConfirmReset(false)}>
              取消
            </button>
            <button type="button" className={BTN_PRIMARY} onClick={() => void resetToDefault()}>
              确认恢复
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
