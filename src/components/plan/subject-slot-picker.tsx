/**
 * subject-slot-picker.tsx — 各科偏好时段多选器(P7 个人习惯)
 *
 * chip 按钮组:点选/取消切换;已选状态下整行出现「×」一键清空该科。
 * 向导 STEP4 与设置页「个人习惯」卡共用,值形状与 StudyPreferences.subjectSlots v2 一致:
 * 有选择 → TimeSlot[];未选择/已清空 → 不含该键(undefined)。
 */
"use client";

import type { TaskType, TimeSlot } from "@/db/schema";
import { TIME_SLOTS } from "@/db/schema";

export const SLOT_LABEL: Record<TimeSlot, string> = {
  morning: "上午",
  noon: "中午",
  afternoon: "下午",
  evening: "晚上",
};

const CHIP =
  "flex h-7 items-center rounded-full border px-3 text-[12px] transition-colors select-none";
const CHIP_ON =
  "border-primary bg-primary/10 text-primary font-medium";
const CHIP_OFF =
  "border-border text-muted-foreground hover:border-primary/50 hover:text-primary";

export function SubjectSlotPicker({
  value,
  onChange,
}: {
  /** 当前选中时段(有序);空数组/undefined = 未指定 */
  value?: TimeSlot[];
  /** 变更回调;传 [] 表示清空该科 */
  onChange: (next: TimeSlot[]) => void;
}) {
  const selected = value ?? [];

  const toggle = (s: TimeSlot) => {
    onChange(
      selected.includes(s)
        ? selected.filter((x) => x !== s)
        : TIME_SLOTS.filter((x) => selected.includes(x) || x === s), // 输出按固定顺序
    );
  };

  return (
    <div className="flex items-center gap-1.5">
      {TIME_SLOTS.map((s) => {
        const on = selected.includes(s);
        return (
          <button
            key={s}
            type="button"
            aria-pressed={on}
            className={`${CHIP} ${on ? CHIP_ON : CHIP_OFF}`}
            onClick={() => toggle(s)}
          >
            {SLOT_LABEL[s]}
          </button>
        );
      })}
      {selected.length > 0 && (
        <button
          type="button"
          aria-label="清空该科偏好时段"
          title="清空"
          className="ml-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onChange([])}
        >
          ×
        </button>
      )}
    </div>
  );
}

/** 把 UI 内部状态转换为落库/提交形状:空数组剔除该键 */
export function normalizeSubjectSlots(
  slots: Partial<Record<TaskType, TimeSlot[]>>,
): Partial<Record<TaskType, TimeSlot[]>> {
  const out: Partial<Record<TaskType, TimeSlot[]>> = {};
  for (const [k, v] of Object.entries(slots)) {
    if (v && v.length) out[k as TaskType] = v;
  }
  return out;
}
