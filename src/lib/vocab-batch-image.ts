/**
 * src/lib/vocab-batch-image.ts — 词书批量补图异步任务(前置工作 A)
 *
 * 场景:早期版本导入的词书(如 ielts-core-pilot)生图可能没跑全;此任务按
 * 「核心词判据 + 已有图跳过 + 失败重试一轮」补齐配图。仅补核心词(策略 core)
 * 即用户拍板的用法:非核心词留无图,正好当无图记词卡/默写卡降级的测试样本。
 *
 * 设计沿用 vocab-import.ts 的任务模式:
 *   - 任务态挂 globalThis(dev 热重载复用),进程重启丢任务态可接受(再跑即可)
 *   - 单进程同一时间只跑一个批量补图任务(防并发打爆 MiniMax 配额)
 *   - 幂等:已有图(>1KB)的词直接计入 noImage 之外;只对无图核心词出图
 *   - 生图并发 2(与导入管线一致),失败记数不中断;结束后失败词再整轮重试一次
 *   - 落盘/回写复用 vocab-image.ts 的 generateVocabImageFile + contentJson.image
 */
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { bookWordRelation, wordBooks, words, type WordContent } from "@/db/schema";
import { readVocabImageStyle, generateVocabImageFile } from "@/lib/vocab-image";
import { readCoreThresholds, isCoreWord, type CoreThresholds } from "@/lib/vocab-core-word";

export interface VocabBatchImageTaskState {
  id: string;
  bookId: string;
  bookName: string;
  status: "running" | "done";
  /** 全书词数 */
  totalWords: number;
  /** 无图词数(核心+非核心) */
  noImageWords: number;
  /** 本次出图目标 = 无图核心词数 */
  targetWords: number;
  /** 非核心无图词数(故意不补,留作无图降级测试) */
  skippedNonCore: number;
  done: number;
  ok: number;
  fail: number;
  /** 终态失败词清单(重试后仍失败) */
  failedWords: string[];
  startedAt: number;
  finishedAt?: number;
}

/** 单词出图结果(worker 收集;fail/failedWords 由主流程按本轮结果终审结算) */
type ItemResult = { word: string; ok: boolean };

interface TargetItem {
  id: number;
  word: string;
  contentJson: WordContent;
}

const g = globalThis as unknown as {
  __vocabBatchImageTask?: VocabBatchImageTaskState;
};

export function getBatchImageTask(): VocabBatchImageTaskState | null {
  return g.__vocabBatchImageTask ?? null;
}

export interface StartBatchImageResult {
  id: string;
  targetWords: number;
  skippedNonCore: number;
}

export function startBatchImageTask(
  rawBookId: string,
): { ok: true; value: StartBatchImageResult } | { ok: false; error: string } {
  if (g.__vocabBatchImageTask?.status === "running") {
    return { ok: false, error: "已有批量补图任务在跑,等它完成再试" };
  }

  const db = getDb();
  const book = db.select().from(wordBooks).where(eq(wordBooks.bookId, rawBookId)).get();
  if (!book) return { ok: false, error: `词书不存在: ${rawBookId}` };

  const rows = db
    .select({ id: words.id, word: words.word, contentJson: words.contentJson })
    .from(bookWordRelation)
    .innerJoin(words, eq(words.id, bookWordRelation.wordId))
    .where(eq(bookWordRelation.bookId, book.id))
    .all();

  if (rows.length === 0) return { ok: false, error: "该书没有任何词条" };

  const thresholds: CoreThresholds = readCoreThresholds();
  const noImage: TargetItem[] = rows
    .filter((r) => !r.contentJson?.image)
    .map((r) => ({ id: r.id, word: r.word, contentJson: r.contentJson }));
  // 只补核心词;非核心留无图(用户拍板:留作无图降级测试样本)
  const targets = noImage.filter((r) => isCoreWord(r.contentJson, thresholds));
  const skippedNonCore = noImage.length - targets.length;

  if (targets.length === 0) {
    return { ok: false, error: `没有需要补图的核心词(无图词 ${noImage.length} 个,全部非核心或已处理)` };
  }

  const state: VocabBatchImageTaskState = {
    id: `bi-${Date.now().toString(36)}`,
    bookId: book.bookId,
    bookName: book.name,
    status: "running",
    totalWords: rows.length,
    noImageWords: noImage.length,
    targetWords: targets.length,
    done: 0,
    ok: 0,
    fail: 0,
    skippedNonCore,
    failedWords: [],
    startedAt: Date.now(),
  };
  g.__vocabBatchImageTask = state;

  void runBatch(state, targets).catch((e) => {
    // worker 内已兜异常,理论不会到;防御性收尾
    state.status = "done";
    state.failedWords.push(`任务异常: ${e instanceof Error ? e.message : String(e)}`);
    state.finishedAt = Date.now();
  });

  return { ok: true, value: { id: state.id, targetWords: targets.length, skippedNonCore } };
}

/** 并发 2 跑一批词;done/ok 在 worker 内实时推进(轮询可见进度) */
async function runWorkers(
  state: VocabBatchImageTaskState,
  list: TargetItem[],
  style: ReturnType<typeof readVocabImageStyle>,
): Promise<ItemResult[]> {
  const results: ItemResult[] = [];
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < list.length) {
      const t = list[cursor++];
      let ok = false;
      try {
        const { webPath } = await generateVocabImageFile(t.word, t.contentJson, style);
        const db = getDb();
        db.update(words)
          .set({ contentJson: { ...t.contentJson, image: webPath }, updatedAt: new Date() })
          .where(eq(words.id, t.id))
          .run();
        ok = true;
      } catch (e) {
        console.warn(`[vocab-batch-image] ${t.word} 生图失败:`, e instanceof Error ? e.message : e);
      }
      state.done++;
      if (ok) state.ok++;
      results.push({ word: t.word, ok });
    }
  }
  await Promise.all([worker(), worker()]);
  return results;
}

async function runBatch(state: VocabBatchImageTaskState, targets: TargetItem[]): Promise<void> {
  const style = readVocabImageStyle();

  // 首轮(done/ok 实时推进;失败词暂不记 fail,待重试轮终审)
  const first = await runWorkers(state, targets, style);

  // 失败词整轮重试一次(与导入管线 TTS 补扫同思路)
  const failedOnce = first.filter((r) => !r.ok).map((r) => r.word);
  if (failedOnce.length > 0) {
    const retrySet = new Set(failedOnce);
    const retryItems = targets.filter((t) => retrySet.has(t.word));
    const retry = await runWorkers(state, retryItems, style);
    for (const r of retry) {
      if (!r.ok) {
        state.fail++;
        state.failedWords.push(r.word);
      }
    }
  }

  state.status = "done";
  state.finishedAt = Date.now();
}
