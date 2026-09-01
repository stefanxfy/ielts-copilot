/**
 * src/lib/study/settings.ts — app_settings 类型化读写(P7)
 *
 * app_settings 是非敏感 k/v 表(key + value_json)。这里提供:
 *   - 泛型 get/set/del
 *   - punch_rules / study_preferences / study_runtime 三个键的读取(默认值兜底)
 *
 * 敏感 AI 配置不在此(只进 config.json,见 lib/config.ts)。
 */
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { appSettings } from "@/db/schema";
import type { PunchRules, StudyPreferences } from "@/db/schema";

export function getSetting<T>(key: string): T | null {
  const row = getDb()
    .select({ valueJson: appSettings.valueJson })
    .from(appSettings)
    .where(eq(appSettings.key, key))
    .get();
  return row ? (row.valueJson as T) : null;
}

export function setSetting(key: string, value: Record<string, unknown>): void {
  getDb()
    .insert(appSettings)
    .values({ key, valueJson: value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { valueJson: value, updatedAt: new Date() },
    })
    .run();
}

/** 「恢复默认」= 删键 */
export function deleteSetting(key: string): void {
  getDb().delete(appSettings).where(eq(appSettings.key, key)).run();
}

/* ---------- punch_rules(打卡规则) ---------- */

export const DEFAULT_PUNCH_RULES: PunchRules = {
  submissionMin: 1,
  wordsMin: 5,
  bothForFull: true,
};

function isFiniteNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/** 打卡规则:未配置/字段非法逐字段回退默认(查询时现读,改配置立即生效) */
export function readPunchRules(): PunchRules {
  const raw = getSetting<Partial<PunchRules>>("punch_rules");
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PUNCH_RULES };
  const r = raw as Partial<PunchRules>;
  return {
    submissionMin:
      isFiniteNum(r.submissionMin) && r.submissionMin >= 1 && r.submissionMin <= 20
        ? r.submissionMin
        : DEFAULT_PUNCH_RULES.submissionMin,
    wordsMin:
      isFiniteNum(r.wordsMin) && r.wordsMin >= 1 && r.wordsMin <= 100
        ? r.wordsMin
        : DEFAULT_PUNCH_RULES.wordsMin,
    bothForFull:
      typeof r.bothForFull === "boolean" ? r.bothForFull : DEFAULT_PUNCH_RULES.bothForFull,
  };
}

/* ---------- study_preferences(个人习惯) ---------- */

const TIME_SLOTS_SET = new Set(["morning", "noon", "afternoon", "evening"]);
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export const DEFAULT_STUDY_PREFERENCES: StudyPreferences = {
  wakeTime: "07:00",
  bedTime: "23:00",
};

/** 个人习惯:非法字段回退默认 */
export function readStudyPreferences(): StudyPreferences {
  const raw = getSetting<StudyPreferences>("study_preferences");
  if (!raw || typeof raw !== "object") return { ...DEFAULT_STUDY_PREFERENCES };
  const p = raw as StudyPreferences;
  const out: StudyPreferences = {
    wakeTime: p.wakeTime && HHMM.test(p.wakeTime) ? p.wakeTime : DEFAULT_STUDY_PREFERENCES.wakeTime,
    bedTime: p.bedTime && HHMM.test(p.bedTime) ? p.bedTime : DEFAULT_STUDY_PREFERENCES.bedTime,
  };
  if (p.subjectSlots && typeof p.subjectSlots === "object") {
    const slots: StudyPreferences["subjectSlots"] = {};
    for (const [k, v] of Object.entries(p.subjectSlots)) {
      if (TIME_SLOTS_SET.has(v as string)) {
        slots[k as keyof NonNullable<StudyPreferences["subjectSlots"]>] =
          v as NonNullable<StudyPreferences["subjectSlots"]>[keyof NonNullable<StudyPreferences["subjectSlots"]>];
      }
    }
    if (Object.keys(slots).length) out.subjectSlots = slots;
  }
  return out;
}

/* ---------- study_runtime(运行时状态:AI 总结推进日期等) ---------- */

export interface StudyRuntime {
  lastSummaryDate?: string;
}

export function readStudyRuntime(): StudyRuntime {
  return getSetting<StudyRuntime>("study_runtime") ?? {};
}
