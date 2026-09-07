/**
 * /api/study-preferences — 个人习惯读写(P7,向导第 4 步 + 设置页共用)
 *
 * GET:读 app_settings.study_preferences(未配置返回默认 07:00/23:00)
 * PUT:整体覆盖;字段非法直接拒绝(与读侧逐字段兜底不同,写入必须干净)
 */
import { NextResponse } from "next/server";
import type { StudyPreferences, TimeSlot, TaskType } from "@/db/schema";
import { TASK_TYPES, TIME_SLOTS } from "@/db/schema";
import {
  DEFAULT_STUDY_PREFERENCES,
  getSetting,
  setSetting,
} from "@/lib/study/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function GET() {
  const raw = getSetting<StudyPreferences>("study_preferences");
  return NextResponse.json({
    preferences: raw ?? DEFAULT_STUDY_PREFERENCES,
  });
}

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const out: StudyPreferences = {};

  if (b.wakeTime != null) {
    if (typeof b.wakeTime !== "string" || !HHMM.test(b.wakeTime)) {
      return NextResponse.json({ error: "起床时间格式应为 HH:MM" }, { status: 400 });
    }
    out.wakeTime = b.wakeTime;
  }
  if (b.bedTime != null) {
    if (typeof b.bedTime !== "string" || !HHMM.test(b.bedTime)) {
      return NextResponse.json({ error: "睡觉时间格式应为 HH:MM" }, { status: 400 });
    }
    out.bedTime = b.bedTime;
  }
  if (b.subjectSlots != null) {
    if (typeof b.subjectSlots !== "object") {
      return NextResponse.json({ error: "subjectSlots 应为对象" }, { status: 400 });
    }
    const slots: Partial<Record<TaskType, TimeSlot>> = {};
    for (const [k, v] of Object.entries(b.subjectSlots as Record<string, unknown>)) {
      if (!TASK_TYPES.includes(k as TaskType)) {
        return NextResponse.json({ error: `未知科目:${k}` }, { status: 400 });
      }
      if (v == null) continue; // null = 清除该科偏好
      if (!TIME_SLOTS.includes(v as TimeSlot)) {
        return NextResponse.json({ error: `科目 ${k} 时段非法` }, { status: 400 });
      }
      slots[k as TaskType] = v as TimeSlot;
    }
    out.subjectSlots = slots;
  }

  setSetting("study_preferences", out as Record<string, unknown>);
  return NextResponse.json({ ok: true, preferences: out });
}
