/**
 * src/lib/vocab-memory.ts — 记忆轨迹服务端核心(今日总览 + 单词遗忘曲线)
 *
 * 数据基础:word_review_log(每次评分的时间戳/评级/stage 流水)+ word_progress
 * (fsrs_state_json 当前记忆状态)。遗忘曲线不另存快照——用与 vocab-review.ts
 * 完全相同的 ts-fsrs 调度器(FSRS-6.0 默认参数)从 New 卡起按评分流水逐条
 * repeat 重放,结果与库里 fsrs_state_json 完全吻合(achieve 实测 S/D 双对齐)。
 *
 * 词难易程度 = FSRS 难度参数 D(difficulty,1~10):
 *   首评即初始化(不认识 6.4 / 模糊 5.1 / 认识 2.1);答错大幅上调(+1.2~2.4),
 *   答对小幅回落;D 越高 → 后续每次答对拉长的间隔越短,即"越难啃的词"。
 */
import { and, asc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { createEmptyCard, fsrs, type Card, type Grade } from "ts-fsrs";
import { getDb } from "@/db";
import {
  words,
  wordProgress,
  wordReviewLog,
  type FsrsState,
  type ProgressStage,
} from "@/db/schema";

/** 与 vocab-review.ts 同参调度器(FSRS-6.0 默认),保证重放与真实调度一字不差 */
const scheduler = fsrs();

const round2 = (n: number) => Math.round(n * 100) / 100;
const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** FSRS 卡状态中文名(0=New 1=Learning 2=Review 3=Relearning) */
export function fsrsStateName(state: number): string {
  return (["新词", "学习中", "复习中", "重学中"] as const)[state] ?? "未知";
}

/**
 * 词难易程度分级(FSRS 难度 D,1~10)。
 * 分档依据 ts-fsrs FSRS-6.0 默认参数实测:首评不认识 D=6.41 / 模糊 5.11 /
 * 认识 2.12;Learning 连错升至 9.6;Review 答对约 -0.01/次,答错 +3 左右。
 */
export function difficultyLabel(d: number): string {
  if (!d || d <= 0) return "未定级"; // New 卡尚未首评
  if (d >= 8) return "很难";
  if (d >= 6.5) return "偏难";
  if (d >= 4) return "中等";
  if (d >= 2.5) return "偏易";
  return "容易";
}

/* ------------------------------------------------------------------ */
/* 遗忘曲线重放                                                        */
/* ------------------------------------------------------------------ */

export interface TrailPoint {
  /** 评分时刻 epoch ms */
  t: number;
  /** FSRS 评分 1=Again(不认识) 2=Hard(模糊) 3=Good(认识) */
  rating: number;
  /** 答题时卡型快照 */
  stage: ProgressStage;
  /** 距上一次评分的间隔 ms(首评为 null) */
  gapMs: number | null;
  /** 本次评分后的下次到期 epoch ms */
  nextDue: number;
  /** 评分后卡状态 0=New 1=Learning 2=Review 3=Relearning */
  state: 0 | 1 | 2 | 3;
  stability: number;
  difficulty: number;
}

/** 按评分流水重放记忆路径(流水按时间升序传入;与 gradeReview 同一套 repeat 语义) */
export function replayMemoryPath(
  logs: { rating: number; stage: ProgressStage; reviewedAt: number }[],
): TrailPoint[] {
  let card: Card = createEmptyCard(new Date(0));
  const points: TrailPoint[] = [];
  let prevT: number | null = null;
  for (const log of logs) {
    const result = scheduler.repeat(card, new Date(log.reviewedAt))[
      log.rating as Grade
    ];
    card = result.card;
    points.push({
      t: log.reviewedAt,
      rating: log.rating,
      stage: log.stage,
      gapMs: prevT == null ? null : log.reviewedAt - prevT,
      nextDue: card.due.getTime(),
      state: card.state as 0 | 1 | 2 | 3,
      stability: round3(card.stability),
      difficulty: round2(card.difficulty),
    });
    prevT = log.reviewedAt;
  }
  return points;
}

/* ------------------------------------------------------------------ */
/* 今日总览(轨迹抽屉 / 轨迹弹窗数据源)                                 */
/* ------------------------------------------------------------------ */

export interface TodayWordItem {
  progressId: number;
  wordId: number;
  word: string;
  phoneticUk: string | null;
  reps: number;
  lapses: number;
  due: number;
  state: 0 | 1 | 2 | 3;
  stateName: string;
  stability: number;
  difficulty: number;
  difficultyLabel: string;
  /** 今日评分次数(0=今日未学,因到期进列) */
  todayCount: number;
  /** 今日最后一次评分(认识/模糊/不认识;null=今日未学) */
  lastRating: 1 | 2 | 3 | null;
  /** 今日评分流水重放(升序,截尾 12 段) */
  trail: TrailPoint[];
}

export interface TodayMemory {
  date: string;
  now: number;
  stats: {
    /** 今日最后评「认识」的词数(学过至少一次) */
    remembered: number;
    /** 今日最后评「模糊」的词数 */
    fuzzy: number;
    /** 今日最后评「不认识」的词数 */
    forgot: number;
    /** 计划内当前已到期待学的词数(含未学新词) */
    dueNow: number;
    /** 今日评分总次数 */
    todayReviewed: number;
  };
  words: TodayWordItem[];
}

interface ProgressLike {
  id: number;
  wordId: number;
  reps: number;
  lapses: number;
  due: number;
  fsrsStateJson: FsrsState;
}

const PROGRESS_COLS = {
  id: wordProgress.id,
  wordId: wordProgress.wordId,
  reps: wordProgress.reps,
  lapses: wordProgress.lapses,
  due: wordProgress.due,
  fsrsStateJson: wordProgress.fsrsStateJson,
};

function localDateStr(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 今日记忆总览(纯查询无副作用) */
export function getTodayMemory(nowMs = Date.now()): TodayMemory {
  const db = getDb();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayLogs = db
    .select({
      progressId: wordReviewLog.progressId,
      rating: wordReviewLog.rating,
      stage: wordReviewLog.stage,
      reviewedAt: wordReviewLog.reviewedAt,
    })
    .from(wordReviewLog)
    .where(gte(wordReviewLog.reviewedAt, todayStart.getTime()))
    .orderBy(asc(wordReviewLog.reviewedAt), asc(wordReviewLog.id))
    .all();

  // 今日评过的词 → 各自流水分组(全局已按时间升序,组内自然升序)
  const byProgress = new Map<number, typeof todayLogs>();
  for (const l of todayLogs) {
    const arr = byProgress.get(l.progressId) ?? [];
    arr.push(l);
    byProgress.set(l.progressId, arr);
  }

  // 今日学过的词 + 当前到期词(ACTIVE & due<=now,截 500)合并为列表
  const progressIds = [...byProgress.keys()];
  const studiedRows: ProgressLike[] = progressIds.length
    ? (db
        .select(PROGRESS_COLS)
        .from(wordProgress)
        .where(inArray(wordProgress.id, progressIds))
        .all() as ProgressLike[])
    : [];
  const dueRows: ProgressLike[] = db
    .select(PROGRESS_COLS)
    .from(wordProgress)
    .where(and(eq(wordProgress.status, "ACTIVE"), lte(wordProgress.due, nowMs)))
    .orderBy(asc(wordProgress.due))
    .limit(500)
    .all() as ProgressLike[];

  const dueNowCount =
    db
      .select({ n: sql<number>`count(*)` })
      .from(wordProgress)
      .where(and(eq(wordProgress.status, "ACTIVE"), lte(wordProgress.due, nowMs)))
      .get()?.n ?? 0;

  const rowMap = new Map<number, ProgressLike>();
  for (const r of studiedRows) rowMap.set(r.id, r);
  for (const r of dueRows) if (!rowMap.has(r.id)) rowMap.set(r.id, r);

  const wordIds = [...new Set([...rowMap.values()].map((r) => r.wordId))];
  const wordRows = wordIds.length
    ? db
        .select({ id: words.id, word: words.word, phoneticUk: words.phoneticUk })
        .from(words)
        .where(inArray(words.id, wordIds))
        .all()
    : [];
  const wordMap = new Map(wordRows.map((w) => [w.id, w]));

  let remembered = 0;
  let fuzzy = 0;
  let forgot = 0;
  const items: TodayWordItem[] = [];
  for (const [pid, row] of rowMap) {
    const logs = byProgress.get(pid) ?? [];
    const lastRating = logs.length
      ? (logs[logs.length - 1].rating as 1 | 2 | 3)
      : null;
    // 「已记住/模糊/不认识」按今日最后一次评分归类(仅限真学过的词 reps>0)
    if (logs.length > 0 && row.reps > 0) {
      if (lastRating === 3) remembered += 1;
      else if (lastRating === 2) fuzzy += 1;
      else forgot += 1;
    }
    const st = row.fsrsStateJson;
    const w = wordMap.get(row.wordId);
    items.push({
      progressId: pid,
      wordId: row.wordId,
      word: w?.word ?? "?",
      phoneticUk: w?.phoneticUk ?? null,
      reps: row.reps,
      lapses: row.lapses,
      due: row.due,
      state: st.state,
      stateName: fsrsStateName(st.state),
      stability: round3(st.stability),
      difficulty: round2(st.difficulty),
      difficultyLabel: difficultyLabel(st.difficulty),
      todayCount: logs.length,
      lastRating,
      trail: replayMemoryPath(logs).slice(-12),
    });
  }

  // 排序:最先到期在前;已到期一组(最难在前),未来到期按时间升序(同刻同样难的在前)
  items.sort((a, b) => {
    const aExp = a.due <= nowMs ? 1 : 0;
    const bExp = b.due <= nowMs ? 1 : 0;
    if (aExp !== bExp) return bExp - aExp;
    if (a.due !== b.due) return a.due - b.due;
    if (b.difficulty !== a.difficulty) return b.difficulty - a.difficulty;
    if (b.lapses !== a.lapses) return b.lapses - a.lapses;
    return a.word.localeCompare(b.word);
  });

  return {
    date: localDateStr(nowMs),
    now: nowMs,
    stats: {
      remembered,
      fuzzy,
      forgot,
      dueNow: Number(dueNowCount),
      todayReviewed: todayLogs.length,
    },
    words: items.slice(0, 1000),
  };
}

/* ------------------------------------------------------------------ */
/* 单词遗忘曲线(词表详情面板数据源)                                    */
/* ------------------------------------------------------------------ */

export interface WordMemoryResult {
  /** false = 该词尚未加入计划/从未学过 */
  studied: boolean;
  word?: { word: string; phoneticUk: string | null; translation: string[] };
  progress?: {
    reps: number;
    lapses: number;
    due: number;
    lastReviewAt: number | null;
    stateName: string;
    stability: number;
    difficulty: number;
    difficultyLabel: string;
  };
  logsCount?: number;
  /** 完整历史重放(升序,截尾 50 段) */
  trail?: TrailPoint[];
}

export function getWordMemory(wordId: number): WordMemoryResult {
  const db = getDb();
  const row = db
    .select()
    .from(wordProgress)
    .where(eq(wordProgress.wordId, wordId))
    .get();
  if (!row) return { studied: false };

  const logs = db
    .select({
      rating: wordReviewLog.rating,
      stage: wordReviewLog.stage,
      reviewedAt: wordReviewLog.reviewedAt,
    })
    .from(wordReviewLog)
    .where(eq(wordReviewLog.progressId, row.id))
    .orderBy(asc(wordReviewLog.reviewedAt), asc(wordReviewLog.id))
    .all();
  const w = db
    .select({ word: words.word, phoneticUk: words.phoneticUk, contentJson: words.contentJson })
    .from(words)
    .where(eq(words.id, wordId))
    .get();
  const st = row.fsrsStateJson;
  return {
    studied: true,
    word: {
      word: w?.word ?? "?",
      phoneticUk: w?.phoneticUk ?? null,
      translation: w?.contentJson?.translation ?? [],
    },
    progress: {
      reps: row.reps,
      lapses: row.lapses,
      due: row.due,
      lastReviewAt: row.lastReviewAt,
      stateName: fsrsStateName(st.state),
      stability: round3(st.stability),
      difficulty: round2(st.difficulty),
      difficultyLabel: difficultyLabel(st.difficulty),
    },
    logsCount: logs.length,
    trail: replayMemoryPath(logs).slice(-50),
  };
}
