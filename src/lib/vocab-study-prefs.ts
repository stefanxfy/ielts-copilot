/**
 * src/lib/vocab-study-prefs.ts — 背单词偏好(app_settings.vocab_study_prefs)
 *
 * 目前只有「每日新词量」(S3 背单词页今日进度 N/M 的分母来源)。
 * 独立成键而非塞进 study_preferences(个人习惯/作息属备考计划域,背单词节奏属词汇域),
 * 键值结构留扩展位(后续每日复习上限、卡型比例等再往里加)。
 */
import { getSetting, setSetting } from "@/lib/study/settings";

export interface VocabStudyPrefs {
  /** 每日新词量(1–100;默认 10) */
  dailyNewWords: number;
}

export const DEFAULT_VOCAB_STUDY_PREFS: VocabStudyPrefs = {
  dailyNewWords: 10,
};

const KEY = "vocab_study_prefs";

function isFiniteNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/** 读取偏好:未配置/字段非法回退默认(查询时现读,改完立即生效) */
export function readVocabStudyPrefs(): VocabStudyPrefs {
  const raw = getSetting<Partial<VocabStudyPrefs>>(KEY);
  if (!raw || typeof raw !== "object") return { ...DEFAULT_VOCAB_STUDY_PREFS };
  const r = raw as Partial<VocabStudyPrefs>;
  return {
    dailyNewWords:
      isFiniteNum(r.dailyNewWords) && r.dailyNewWords >= 1 && r.dailyNewWords <= 100
        ? Math.trunc(r.dailyNewWords)
        : DEFAULT_VOCAB_STUDY_PREFS.dailyNewWords,
  };
}

/** 整体覆盖写入(route 层已校验范围;此处再兜一道) */
export function writeVocabStudyPrefs(prefs: VocabStudyPrefs): void {
  const dailyNewWords =
    isFiniteNum(prefs.dailyNewWords) && prefs.dailyNewWords >= 1 && prefs.dailyNewWords <= 100
      ? Math.trunc(prefs.dailyNewWords)
      : DEFAULT_VOCAB_STUDY_PREFS.dailyNewWords;
  setSetting(KEY, { dailyNewWords });
}
