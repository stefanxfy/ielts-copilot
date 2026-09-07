/**
 * src/lib/vocab-study-prefs.ts — 背单词偏好(app_settings.vocab_study_prefs)
 *
 * 字段:
 *   - dailyNewWords 每日新词量(S3 背单词页今日进度 N/M 的分母来源)
 *   - keySfxStyle   认词卡键入音效风格(lib/vocab-sfx.ts 的 5 种合成音)
 *
 * 独立成键而非塞进 study_preferences(个人习惯/作息属备考计划域,背单词节奏属词汇域),
 * 键值结构留扩展位(后续每日复习上限、卡型比例等再往里加)。
 */
import { getSetting, setSetting } from "@/lib/study/settings";
import {
  DEFAULT_KEY_SFX_STYLE,
  isKeySfxStyle,
  type KeySfxStyle,
} from "@/lib/vocab-sfx";

export interface VocabStudyPrefs {
  /** 每日新词量(1–100;默认 10) */
  dailyNewWords: number;
  /** 认词卡键入音效风格(默认 tick) */
  keySfxStyle: KeySfxStyle;
}

export const DEFAULT_VOCAB_STUDY_PREFS: VocabStudyPrefs = {
  dailyNewWords: 10,
  keySfxStyle: DEFAULT_KEY_SFX_STYLE,
};

const KEY = "vocab_study_prefs";

function isFiniteNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/** 读取偏好:未配置/字段非法逐字段回退默认(查询时现读,改完立即生效) */
export function readVocabStudyPrefs(): VocabStudyPrefs {
  const raw = getSetting<Partial<VocabStudyPrefs>>(KEY);
  if (!raw || typeof raw !== "object") return { ...DEFAULT_VOCAB_STUDY_PREFS };
  const r = raw as Partial<VocabStudyPrefs>;
  return {
    dailyNewWords:
      isFiniteNum(r.dailyNewWords) && r.dailyNewWords >= 1 && r.dailyNewWords <= 100
        ? Math.trunc(r.dailyNewWords)
        : DEFAULT_VOCAB_STUDY_PREFS.dailyNewWords,
    keySfxStyle: isKeySfxStyle(r.keySfxStyle)
      ? r.keySfxStyle
      : DEFAULT_VOCAB_STUDY_PREFS.keySfxStyle,
  };
}

/** 整体覆盖写入(route 层已校验;此处再兜一道) */
export function writeVocabStudyPrefs(prefs: VocabStudyPrefs): void {
  const dailyNewWords =
    isFiniteNum(prefs.dailyNewWords) && prefs.dailyNewWords >= 1 && prefs.dailyNewWords <= 100
      ? Math.trunc(prefs.dailyNewWords)
      : DEFAULT_VOCAB_STUDY_PREFS.dailyNewWords;
  const keySfxStyle = isKeySfxStyle(prefs.keySfxStyle)
    ? prefs.keySfxStyle
    : DEFAULT_VOCAB_STUDY_PREFS.keySfxStyle;
  setSetting(KEY, { dailyNewWords, keySfxStyle });
}

/** 部分更新:读当前值合并后整体覆盖(设置页两字段可独立保存) */
export function updateVocabStudyPrefs(patch: Partial<VocabStudyPrefs>): VocabStudyPrefs {
  const merged = { ...readVocabStudyPrefs(), ...patch };
  writeVocabStudyPrefs(merged);
  return readVocabStudyPrefs();
}
