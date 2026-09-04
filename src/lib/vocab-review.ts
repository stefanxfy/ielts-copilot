/**
 * src/lib/vocab-review.ts — 背单词复习 session 服务端核心(S3)
 *
 * 职责(docs/背单词数据模型设计.md §8/§10/§11 + docs/背单词卡片交互设计.md):
 *   1. buildReviewQueue():出题队列 = 到期复习(reps>0,due<=now) + 新词(reps=0,
 *      限额 prefs.dailyNewWords),按 due 混排;spell 词服务端按可用卡型加权抽定 spellType
 *      (无图剔视觉、例句不命中剔语境,回退链 §10.3),客户端只管渲染。
 *   2. gradeReview():评分写回 —— ts-fsrs 5.4.2(FSRS-6.0) repeat() 调度,同事务写
 *      word_progress(fsrsState/due/stage/reps/lapses/lastReviewAt) + word_review_log。
 *      stage 状态机服务端拥有(§8.4):
 *        recognize+Good 且最近两条流水均为 recognize+Good → 升 spell(连续 2 次认识);
 *        spell+Good 留 spell;spell+Hard/Again 降 recognize(判错两档与两级提示用满答对
 *        都由客户端折算成 Hard/Again 传上来,服务端不必复刻编辑距离)。
 */
import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { fsrs, State, type Card, type Grade } from "ts-fsrs";
import { getDb } from "@/db";
import {
  words,
  wordProgress,
  wordReviewLog,
  type ProgressStage,
  type WordContent,
} from "@/db/schema";
import { hasVocabImage } from "@/lib/vocab-card-policy";
import { readVocabStudyPrefs } from "@/lib/vocab-study-prefs";

/** 默写卡三型(与原型 card-demo CARD_TYPES 一致) */
export type SpellCardType = "visual" | "audio" | "ctx";

export interface ReviewQueueItem {
  progressId: number;
  wordId: number;
  word: string;
  phoneticUk: string | null;
  /** 出题阶段(服务端状态机) */
  stage: ProgressStage;
  /** spell 词的服务端抽定卡型(recognize 词无此字段) */
  spellType?: SpellCardType;
  content: WordContent;
  /** 配图是否可用(文件系统实证,非仅路径非空) */
  hasImage: boolean;
  /** 当前连续认识计数(由流水推导,0~2) */
  streakNow: number;
  due: number;
}

export interface ReviewSession {
  queue: ReviewQueueItem[];
  stats: {
    /** 计划内总词数 */
    total: number;
    /** 在学(ACTIVE)词数 */
    active: number;
    /** 本批出题数 */
    batch: number;
    /** 今日已复习次数(本地时区 0 点起) */
    todayReviewed: number;
  };
  prefs: { dailyNewWords: number };
}

/** FSRS 调度器(默认参数 FSRS-6.0;每次调用现建,无状态) */
const scheduler = fsrs();

/** 单批复习上限兜底(到期复习不限量,但一次 session 不给超过 200 词) */
const MAX_BATCH = 200;

/* ------------------------------------------------------------------ */
/* 出题队列                                                            */
/* ------------------------------------------------------------------ */

/** 例句是否可用于语境型:examples[0].en 命中 word\w*(含规则屈折,§10.3) */
function exampleHit(word: string, content: WordContent | null | undefined): boolean {
  const en = content?.examples?.[0]?.en;
  if (!en) return false;
  try {
    return new RegExp(`${word}\\w*`, "i").test(en);
  } catch {
    return false;
  }
}

/** spell 词抽卡型:可用池(视觉需图/语境需例句命中,音频恒可用)按 ratio 加权归一随机 */
function pickSpellType(word: string, content: WordContent): SpellCardType {
  const all: { id: SpellCardType; ratio: number }[] = [
    { id: "visual", ratio: 40 },
    { id: "audio", ratio: 30 },
    { id: "ctx", ratio: 30 },
  ];
  const pool = all.filter((t) => {
    if (t.id === "visual") return hasVocabImage(content);
    if (t.id === "ctx") return exampleHit(word, content);
    return true; // 听觉型只依赖音频,永远可用
  });
  const total = pool.reduce((s, t) => s + t.ratio, 0);
  let r = Math.random() * total;
  for (const t of pool) {
    r -= t.ratio;
    if (r < 0) return t.id;
  }
  return pool[pool.length - 1]?.id ?? "audio";
}

/**
 * 连续认识计数:由流水推导——最近 N 条流水全部为 recognize+Good 时 N 即 streak
 * (封顶 2)。出现任何其他评分/spell 流水即断,与原型「降级清零重数」语义一致。
 */
function deriveStreak(progressId: number, cap = 2): number {
  const db = getDb();
  const rows = db
    .select({ rating: wordReviewLog.rating, stage: wordReviewLog.stage })
    .from(wordReviewLog)
    .where(eq(wordReviewLog.progressId, progressId))
    .orderBy(desc(wordReviewLog.reviewedAt), desc(wordReviewLog.id))
    .limit(cap)
    .all();
  let n = 0;
  // 倒序取的是最新在前,从最新往回数连续 recognize+Good
  for (const r of rows) {
    if (r.stage === "recognize" && r.rating === 3) n += 1;
    else break;
  }
  return Math.min(n, cap);
}

/** 构建复习 session(纯查询无副作用) */
export function buildReviewSession(nowMs = Date.now()): ReviewSession {
  const db = getDb();
  const prefs = readVocabStudyPrefs();

  const base = db
    .select({
      progressId: wordProgress.id,
      wordId: words.id,
      word: words.word,
      phoneticUk: words.phoneticUk,
      contentJson: words.contentJson,
      stage: wordProgress.stage,
      due: wordProgress.due,
      reps: wordProgress.reps,
    })
    .from(wordProgress)
    .innerJoin(words, eq(words.id, wordProgress.wordId))
    .where(and(eq(wordProgress.status, "ACTIVE"), lte(wordProgress.due, nowMs)))
    .orderBy(asc(wordProgress.due))
    .limit(MAX_BATCH)
    .all();

  // 新词(reps=0)限额 prefs.dailyNewWords;到期复习(reps>0)不限,统一按 due 排
  let newCount = 0;
  const picked = base.filter((r) => {
    if (r.reps > 0) return true;
    if (newCount < prefs.dailyNewWords) {
      newCount += 1;
      return true;
    }
    return false;
  });

  const queue: ReviewQueueItem[] = picked.map((r) => {
    const content = r.contentJson;
    const item: ReviewQueueItem = {
      progressId: r.progressId,
      wordId: r.wordId,
      word: r.word,
      phoneticUk: r.phoneticUk,
      stage: r.stage,
      content,
      hasImage: hasVocabImage(content),
      streakNow: deriveStreak(r.progressId),
      due: r.due,
    };
    if (r.stage === "spell") item.spellType = pickSpellType(r.word, content);
    return item;
  });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayReviewed = db
    .select({ n: sql<number>`count(*)` })
    .from(wordReviewLog)
    .where(gte(wordReviewLog.reviewedAt, todayStart.getTime()))
    .get()?.n ?? 0;

  const total = db
    .select({ n: sql<number>`count(*)` })
    .from(wordProgress)
    .get()?.n ?? 0;
  const active = db
    .select({ n: sql<number>`count(*)` })
    .from(wordProgress)
    .where(eq(wordProgress.status, "ACTIVE"))
    .get()?.n ?? 0;

  return {
    queue,
    stats: {
      total,
      active,
      batch: queue.length,
      todayReviewed: Number(todayReviewed),
    },
    prefs,
  };
}

/* ------------------------------------------------------------------ */
/* 评分写回                                                            */
/* ------------------------------------------------------------------ */

export class ReviewError extends Error {}

interface ProgressRow {
  id: number;
  wordId: number;
  stage: ProgressStage;
  due: number;
  fsrsStateJson: {
    stability: number;
    difficulty: number;
    state: 0 | 1 | 2 | 3;
    step: number;
    paramVersion?: string;
  };
  reps: number;
  lapses: number;
  lastReviewAt: number | null;
}

/** 由表列 + fsrsStateJson 重建 ts-fsrs Card(repeat 的输入) */
function rebuildCard(row: ProgressRow): Card {
  const st = row.fsrsStateJson;
  return {
    due: new Date(row.due),
    stability: st.stability,
    difficulty: st.difficulty,
    elapsed_days: 0, // ts-fsrs 内部按 last_review 现算,此字段仅展示用
    scheduled_days: 0,
    learning_steps: st.step,
    reps: row.reps,
    lapses: row.lapses,
    state: st.state as State,
    last_review: row.lastReviewAt ? new Date(row.lastReviewAt) : undefined,
  };
}

/**
 * 评分写回(同事务:word_progress 更新 + word_review_log 追加)。
 *
 * @param progressId 进度行
 * @param cardStage  答题时的 stage 快照(客户端渲染的卡面阶段)
 * @param rating     FSRS 评分 1=Again 2=Hard 3=Good(Easy 不暴露)。
 *                   折算口径:认词卡三键直传;默写卡 0~1 提示答对=Good、
 *                   两级提示用满答对=Hard(方案 B 上限,与交互设计 §2.5 降级合并)、
 *                   判错距离≤2=Hard、距离>2=Again、查看答案=Again。
 * @returns 新 stage / 新 due / 最新连续认识计数(侧栏刷新用)
 */
export function gradeReview(
  progressId: number,
  cardStage: ProgressStage,
  rating: 1 | 2 | 3,
  nowMs = Date.now(),
): { stage: ProgressStage; due: number; streakNow: number } {
  const db = getDb();
  const row = db
    .select()
    .from(wordProgress)
    .where(eq(wordProgress.id, progressId))
    .get() as ProgressRow | undefined;
  if (!row) throw new ReviewError(`进度行不存在: progressId=${progressId}`);

  const grade = rating as Grade;
  const result = scheduler.repeat(rebuildCard(row), new Date(nowMs))[grade];
  const newCard = result.card;

  // ---- stage 状态机(服务端拥有,§8.4) ----
  let newStage: ProgressStage = row.stage;
  if (cardStage === "spell") {
    // 默写:Good 留 spell;Hard/Again 降 recognize(判错/提示用满/查看答案都走这)
    newStage = rating === 3 ? "spell" : "recognize";
  } else {
    // 认词:Good 且「本次 + 最近一条流水」均为 recognize+Good → 升 spell;其余留 recognize
    // (判定发生在本次流水插入前,故只需查最近 1 条,加上当前评分即连续 2 次)
    if (rating === 3) {
      const last = db
        .select({ rating: wordReviewLog.rating, stage: wordReviewLog.stage })
        .from(wordReviewLog)
        .where(eq(wordReviewLog.progressId, progressId))
        .orderBy(desc(wordReviewLog.reviewedAt), desc(wordReviewLog.id))
        .limit(1)
        .all();
      const doubleGood =
        last.length === 1 &&
        last[0].stage === "recognize" &&
        last[0].rating === 3;
      if (doubleGood) newStage = "spell";
    }
  }

  db.transaction((tx) => {
    tx
      .update(wordProgress)
      .set({
        stage: newStage,
        due: newCard.due.getTime(),
        fsrsStateJson: {
          stability: newCard.stability,
          difficulty: newCard.difficulty,
          state: newCard.state as 0 | 1 | 2 | 3,
          step: newCard.learning_steps,
          paramVersion: "FSRS-6.0-default",
        },
        reps: newCard.reps,
        lapses: newCard.lapses,
        lastReviewAt: nowMs,
        updatedAt: new Date(nowMs),
      })
      .where(eq(wordProgress.id, progressId))
      .run();
    tx
      .insert(wordReviewLog)
      .values({
        progressId,
        rating,
        stage: cardStage,
        reviewedAt: nowMs,
      })
      .run();
  });

  return {
    stage: newStage,
    due: newCard.due.getTime(),
    streakNow: deriveStreak(progressId),
  };
}
