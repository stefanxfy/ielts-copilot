/**
 * src/lib/vocab-import.ts — 词库导入异步管线(#61)
 *
 * 把 scripts/import-vocab-pipeline.mjs 的 CLI 管线搬进服务端:
 *   解析去重 → 百词斩 join → ECDICT 索引补全 → 入库(word_books/words/book_word_relation)
 *   → edge-tts 双音色合成(单词/例句) → 核心词 MiniMax 生图
 *
 * 设计要点(docs/背单词词库导入与词库中心设计.md §3):
 *   - 异步任务注册表挂 globalThis(dev 热重载复用,同 src/db/index.ts 模式),
 *     单用户本地应用无需持久化队列;进程重启丢任务态可接受(重导即可)
 *   - 每步幂等:同词重导不覆盖已有内容(仅空字段补全);同 bookId 重导清旧关联重挂
 *   - TTS/生图失败只记数不中断;完成汇报显式列出未命中词清单(缺料不静默)
 *   - 核心词判据 collins≥3 或 bncRank≤2000,阈值读 app_settings.vocab_core_thresholds
 *     (缺省 3/2000;设置页可改,#62 顺带落 UI)
 *   - 音色默认 Andrew/Emma(src/lib/vocab-tts-voices.ts),随导入请求可覆盖
 *   - ECDICT 走 data/ecdict-index.db 索引(scripts/build-ecdict-index.py 一次性构建),
 *     运行时 point lookup,绝不解析大 csv(踩坑见 enrich 脚本头注)
 *
 * 屈折归并(v1 简版):仅当原形查无此词时,尝试剥常见后缀(s/es/ed/ing/d)回退
 * 原形查询;命中则按原形入库(abandoned→abandon,例句挖空判分已支持双答案)。
 */
import { spawn } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { bookWordRelation, wordBooks, words, type WordContent } from "@/db/schema";
import { dataDir, publicDir } from "@/lib/paths";
import {
  DEFAULT_SENT_VOICE,
  DEFAULT_WORD_VOICE,
  SENT_RATE,
  isVocabTtsVoiceId,
} from "@/lib/vocab-tts-voices";
import {
  DEFAULT_VOCAB_IMAGE_STYLE,
  isVocabImageStyleId,
  type VocabImageStyleId,
} from "@/lib/vocab-image-styles";
import { generateVocabImageFile } from "@/lib/vocab-image";
import { readCoreThresholds, isCoreWord } from "@/lib/vocab-core-word";

/* ---------- 类型与任务注册表 ---------- */

export type GenStrategy = "core" | "all" | "none";

export interface VocabImportParams {
  name: string;
  words: string[];
  genStrategy: GenStrategy;
  imageStyle: VocabImageStyleId;
  voiceWord: string;
  voiceSent: string;
  /** 可选:传入已有 bookId 时重导同书(清旧关联重挂,内容幂等补全),不传则新建词书 */
  bookId?: string;
}

export interface VocabImportTaskState {
  id: string;
  status: "running" | "done" | "error" | "cancelled";
  /** parse → bcz → ecdict → db → tts → image → done */
  phase: string;
  phaseLabel: string;
  /** 词库名称(列表页「导入中」卡片标题用) */
  name: string;
  bookId?: string;
  total: number;
  /** 已处理词数(各阶段累计推进,前端粗粒度进度用) */
  done: number;
  hitCount: number;
  /** 未命中词(百词斩+ECDICT 都没查到释义的),完成时显式汇报 */
  missWords: string[];
  audioWordOk: number;
  audioWordFail: number;
  audioSentOk: number;
  audioSentFail: number;
  imageTotal: number;
  imageOk: number;
  imageFail: number;
  error?: string;
  createdAt: number;
  finishedAt?: number;
}

const g = globalThis as unknown as {
  __vocabImportTasks?: Map<string, VocabImportTaskState>;
};

function taskMap(): Map<string, VocabImportTaskState> {
  if (!g.__vocabImportTasks) g.__vocabImportTasks = new Map();
  return g.__vocabImportTasks;
}

export function getImportTask(id: string): VocabImportTaskState | undefined {
  return taskMap().get(id);
}

/**
 * 取消导入任务:仅改状态让「导入中」卡片消失;管线内的 TTS/生图循环检测到
 * cancelled 后尽快自行退出(spawn 粒度,最多再跑完当前并发批)。
 */
export function cancelImportTask(id: string): boolean {
  const t = taskMap().get(id);
  if (!t || t.status !== "running") return false;
  t.status = "cancelled";
  t.phaseLabel = "已取消";
  t.finishedAt = Date.now();
  return true;
}

/** 任务是否已被取消/失效(管线各阶段循环里轮询,及时止损) */
function taskCancelled(state: VocabImportTaskState): boolean {
  return state.status !== "running";
}

/** 全部进行中任务(词库列表页「导入中」卡片渲染用) */
export function listRunningImportTasks(): VocabImportTaskState[] {
  return [...taskMap().values()].filter((t) => t.status === "running");
}

/** 最多保留 20 个历史任务态,防内存缓慢膨胀(单用户本地无所谓,防御性) */
function pruneTasks(): void {
  const m = taskMap();
  if (m.size <= 20) return;
  const ids = [...m.keys()].slice(0, m.size - 20);
  for (const id of ids) m.delete(id);
}

const PHASE_LABELS: Record<string, string> = {
  parse: "解析词表 · 去重合并",
  bcz: "抓取释义 / 例句(百词斩)",
  ecdict: "ECDICT 元数据补全",
  db: "入库 word_books / words",
  tts: "合成发音音频(edge-tts)",
  image: "核心词批量生图(MiniMax)",
  done: "完成",
};

/* ---------- 入口:校验 + 启动后台任务 ---------- */

export interface StartImportResult {
  id: string;
  bookId: string;
  total: number;
}

export function startImportTask(raw: unknown): { ok: true; value: StartImportResult } | { ok: false; error: string } {
  const body = (raw ?? {}) as Record<string, unknown>;
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : "未命名词库";
  if (name.length > 80) return { ok: false, error: "词库名称过长(≤80 字符)" };

  if (!Array.isArray(body.words) || body.words.length === 0) {
    return { ok: false, error: "words required(非空单词数组)" };
  }
  if (body.words.length > 5000) {
    return { ok: false, error: "单次导入上限 5000 词" };
  }
  for (const w of body.words) {
    if (typeof w !== "string" || !w.trim()) return { ok: false, error: "words 数组含空/非字符串项" };
  }

  const genStrategy: GenStrategy =
    body.genStrategy === "all" || body.genStrategy === "none" ? body.genStrategy : "core";
  const imageStyle: VocabImageStyleId =
    body.imageStyle !== undefined
      ? isVocabImageStyleId(body.imageStyle)
        ? body.imageStyle
        : DEFAULT_VOCAB_IMAGE_STYLE
      : DEFAULT_VOCAB_IMAGE_STYLE;
  const voiceWord = body.voiceWord !== undefined && isVocabTtsVoiceId(body.voiceWord) ? body.voiceWord : DEFAULT_WORD_VOICE;
  const voiceSent = body.voiceSent !== undefined && isVocabTtsVoiceId(body.voiceSent) ? body.voiceSent : DEFAULT_SENT_VOICE;

  // 解析归一在任务内第一步做;这里先粗计数返回
  const id = `vt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  // 重导同书:入参带合法 bookId 且库里存在 → 复用;否则新建
  const requestedBookId =
    typeof body.bookId === "string" && body.bookId.trim() ? body.bookId.trim() : undefined;
  const knownBook = requestedBookId
    ? getDb().select({ id: wordBooks.id }).from(wordBooks).where(eq(wordBooks.bookId, requestedBookId)).get()
    : undefined;
  const bookId = knownBook ? requestedBookId! : `custom-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 6)}`;
  const state: VocabImportTaskState = {
    id,
    status: "running",
    phase: "parse",
    phaseLabel: PHASE_LABELS.parse,
    name,
    bookId,
    total: body.words.length,
    done: 0,
    hitCount: 0,
    missWords: [],
    audioWordOk: 0,
    audioWordFail: 0,
    audioSentOk: 0,
    audioSentFail: 0,
    imageTotal: 0,
    imageOk: 0,
    imageFail: 0,
    createdAt: Date.now(),
  };
  taskMap().set(id, state);
  pruneTasks();

  const params: VocabImportParams = { name, words: body.words as string[], genStrategy, imageStyle, voiceWord, voiceSent, bookId };
  // 后台跑,不 await;错误记入任务态
  void runImportPipeline(state, params).catch((e) => {
    state.status = "error";
    state.error = e instanceof Error ? e.message : String(e);
    state.phaseLabel = "失败";
    state.finishedAt = Date.now();
  });

  return { ok: true, value: { id, bookId, total: state.total } };
}

/* ---------- 管线主体 ---------- */

function setPhase(state: VocabImportTaskState, phase: string): void {
  state.phase = phase;
  state.phaseLabel = PHASE_LABELS[phase] ?? phase;
}

async function runImportPipeline(state: VocabImportTaskState, params: VocabImportParams): Promise<void> {
  // ===== 1. 解析归一:trim/小写/去空/去重(保序) =====
  setPhase(state, "parse");
  const seen = new Set<string>();
  const list: string[] = [];
  for (const raw of params.words) {
    const w = raw.trim().toLowerCase().replace(/\s+/g, " ");
    if (!w || w.startsWith("#") || seen.has(w)) continue;
    seen.add(w);
    list.push(w);
  }
  state.total = list.length;
  state.done = 0;
  if (list.length === 0) throw new Error("解析后词表为空");

  // ===== 2. 百词斩 join =====
  setPhase(state, "bcz");
  const BCZ_BASE = "https://cdn.jsdelivr.net/gh/lyc8503/baicizhan-word-meaning-API/data/words/";
  const fetched = new Map<string, {
    phoneticUk?: string; translation: string[]; definition?: string[];
    examples: { en: string; cn?: string }[];
  }>();
  for (let i = 0; i < list.length; i++) {
    if (taskCancelled(state)) return;
    const w = list[i];
    const data = await fetchBcz(BCZ_BASE + encodeURIComponent(w) + ".json");
    if (data) {
      const translation = (data.mean_cn ?? "")
        .split(/[;；]/)
        .map((s: string) => s.trim())
        .filter(Boolean);
      fetched.set(w, {
        phoneticUk: data.accent || undefined,
        translation,
        definition: data.mean_en ? [data.mean_en] : undefined,
        examples: data.sentence ? [{ en: data.sentence, cn: data.sentence_trans || undefined }] : [],
      });
      state.hitCount++;
    }
    state.done = i + 1;
  }

  // ===== 3. ECDICT 索引补全(含未命中词释义兜底) =====
  setPhase(state, "ecdict");
  const ecdictPath = join(dataDir(), "ecdict-index.db");
  let ecdict: Database.Database | null = null;
  try {
    if (existsSync(ecdictPath)) {
      ecdict = new Database(ecdictPath, { readonly: true });
    }
  } catch {
    ecdict = null;
  }
  const thresholds = readCoreThresholds();
  const ecdictRows = new Map<string, EcdictRow>();
  const mainStmt = ecdict?.prepare(
    "SELECT phonetic, definition, translation, collins, tag, bnc, frq, exchange FROM ecdict WHERE word = ?",
  );
  const rootStmt = ecdict?.prepare("SELECT root FROM wordroot WHERE word = ?");
  const missWords: string[] = [];
  for (const w of list) {
    if (ecdict && mainStmt) {
      const row = mainStmt.get(w) as EcdictRow | undefined;
      if (row) ecdictRows.set(w, row);
      // 屈折回退:原形查无 → 剥后缀再查(仅用于补元数据/释义判断,不改词形)
      if (!row && !fetched.has(w)) {
        const base = singularize(w);
        if (base && base !== w) {
          const brow = mainStmt.get(base) as EcdictRow | undefined;
          if (brow) ecdictRows.set(w, brow);
        }
      }
    }
    const hasMeaning =
      (fetched.get(w)?.translation?.length ?? 0) > 0 ||
      Boolean(ecdictRows.get(w)?.translation);
    if (!hasMeaning) missWords.push(w);
  }
  state.missWords = missWords;

  // ===== 4. 入库(幂等:同词不覆盖已有内容,仅空字段补全) =====
  setPhase(state, "db");
  const db = getDb();
  const now = new Date();
  const wordIdByName = new Map<string, number>();

  let book = db.select().from(wordBooks).where(eq(wordBooks.bookId, state.bookId!)).get();
  if (!book) {
    book = db
      .insert(wordBooks)
      .values({
        bookId: state.bookId!,
        name: params.name,
        description: `界面导入 ${list.length} 词 · ${now.toISOString().slice(0, 10)}`,
        source: "custom",
      })
      .returning()
      .get();
  } else {
    db.update(wordBooks).set({ name: params.name, updatedAt: now }).where(eq(wordBooks.id, book.id)).run();
  }

  for (let i = 0; i < list.length; i++) {
    const w = list[i];
    const bcz = fetched.get(w);
    const ec = ecdictRows.get(w);
    const content: WordContent = {
      translation: bcz?.translation ?? (ec?.translation ? splitTranslation(ec.translation) : []),
      examples: bcz?.examples ?? [],
      ...(bcz?.definition?.length ? { definition: bcz.definition } : ec?.definition ? { definition: [ec.definition] } : {}),
      ...(ec?.exchange ? { exchange: ec.exchange } : {}),
      ...(ec?.collins ? { collins: ec.collins } : {}),
      ...(ec?.tag ? { tags: ec.tag.split(/\s+/).filter(Boolean) } : {}),
      ...(ec?.bnc ? { bncRank: ec.bnc } : {}),
      ...(ec?.frq ? { frqRank: ec.frq } : {}),
    };
    const root = rootStmt?.get(w) as { root: string } | undefined;
    if (root) content.root = root.root;

    const existing = db.select().from(words).where(eq(words.word, w)).get();
    if (existing) {
      wordIdByName.set(w, existing.id);
      // 仅当现有 translation 为空时补全(防重导覆盖手动内容)
      if (!existing.contentJson?.translation?.length && content.translation.length) {
        const merged: WordContent = { ...content, ...existing.contentJson, translation: content.translation };
        db.update(words).set({ contentJson: merged, updatedAt: now }).where(eq(words.id, existing.id)).run();
      }
    } else {
      const row = db
        .insert(words)
        .values({
          word: w,
          phoneticUk: bcz?.phoneticUk ?? null,
          phoneticUs: ec?.phonetic ?? null,
          contentJson: content,
          origin: "baicizhan",
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: words.id })
        .get();
      wordIdByName.set(w, row.id);
    }
    state.done = i + 1;
  }

  // 清旧关联重挂(同 bookId 重导幂等)
  db.delete(bookWordRelation).where(eq(bookWordRelation.bookId, book.id)).run();
  db.insert(bookWordRelation)
    .values(list.map((w, i) => ({ bookId: book.id, wordId: wordIdByName.get(w)!, order: i })).filter((r) => r.wordId))
    .run();

  // ===== 5. TTS(双音色:单词 voiceWord / 例句 voiceSent -8%) =====
  setPhase(state, "tts");
  const wordsDir = join(publicDir(), "audio", "words");
  const sentsDir = join(publicDir(), "audio", "sentences");
  await mkdir(wordsDir, { recursive: true });
  await mkdir(sentsDir, { recursive: true });

  const ttsJobs: TtsJob[] = [];
  for (const w of list) {
    const id = wordIdByName.get(w);
    if (!id) continue;
    const row = db.select({ contentJson: words.contentJson }).from(words).where(eq(words.id, id)).get();
    const c = row?.contentJson;
    if (c && !c.audio?.word) {
      ttsJobs.push({ word: w, kind: "word", text: w, out: join(wordsDir, `${w}.mp3`) });
    }
    const examples = c?.examples ?? [];
    for (let idx = 0; idx < examples.length; idx++) {
      if (!examples[idx].audio && examples[idx].en) {
        ttsJobs.push({ word: w, kind: "sent", idx, text: examples[idx].en, out: join(sentsDir, `${w}_${idx}.mp3`) });
      }
    }
  }
  await runTtsJobs(ttsJobs, params, state);

  // 回写 audio 路径(文件存在且 >1KB 才写;edge-tts 失败会留 0 字节文件,不能只判 existsSync)
  const mp3Ready = (p: string): boolean => existsSync(p) && statSync(p).size > 1000;
  for (const w of list) {
    const id = wordIdByName.get(w);
    if (!id) continue;
    const row = db.select({ contentJson: words.contentJson }).from(words).where(eq(words.id, id)).get();
    if (!row) continue;
    const c: WordContent = row.contentJson ?? { translation: [], examples: [] };
    let changed = false;
    if (!c.audio?.word && mp3Ready(join(wordsDir, `${w}.mp3`))) {
      c.audio = { ...(c.audio ?? {}), word: `/audio/words/${w}.mp3` };
      changed = true;
    }
    const examples = c.examples ?? [];
    for (let idx = 0; idx < examples.length; idx++) {
      if (!examples[idx].audio && mp3Ready(join(sentsDir, `${w}_${idx}.mp3`))) {
        examples[idx].audio = `/audio/sentences/${w}_${idx}.mp3`;
        changed = true;
      }
    }
    if (changed) {
      db.update(words).set({ contentJson: { ...c, examples }, updatedAt: now }).where(eq(words.id, id)).run();
    }
  }

  // ===== 6. 核心词生图 =====
  setPhase(state, "image");
  const imageTargets: string[] = [];
  if (params.genStrategy !== "none") {
    for (const w of list) {
      const id = wordIdByName.get(w);
      if (!id) continue;
      const row = db.select({ contentJson: words.contentJson }).from(words).where(eq(words.id, id)).get();
      const c = row?.contentJson;
      if (!c || c.image) continue; // 已有图跳过(幂等)
      if (params.genStrategy === "core" && !isCoreWord(c, thresholds)) continue;
      imageTargets.push(w);
    }
  }
  state.imageTotal = imageTargets.length;
  // 生图较慢(5~15s/张),并发 2,失败只记数;取消即停
  let imgCursor = 0;
  async function imageWorker(): Promise<void> {
    while (imgCursor < imageTargets.length && !taskCancelled(state)) {
      const w = imageTargets[imgCursor++];
      const id = wordIdByName.get(w)!;
      const row = db.select({ contentJson: words.contentJson }).from(words).where(eq(words.id, id)).get();
      if (!row) continue;
      try {
        const { webPath } = await generateVocabImageFile(w, row.contentJson, params.imageStyle);
        if (taskCancelled(state)) break; // 取消后不再回写
        const c = row.contentJson;
        db.update(words).set({ contentJson: { ...c, image: webPath }, updatedAt: now }).where(eq(words.id, id)).run();
        state.imageOk++;
      } catch {
        state.imageFail++;
      }
    }
  }
  await Promise.all([imageWorker(), imageWorker()]);
  if (taskCancelled(state)) return; // 已取消:不覆盖 status,保持 cancelled 态

  // ===== 完成 =====
  setPhase(state, "done");
  state.status = "done";
  state.finishedAt = Date.now();
}

/* ---------- 子模块:百词斩 fetch ---------- */

async function fetchBcz(url: string, attempts = 3): Promise<Record<string, string> | null> {
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (res.ok) return (await res.json()) as Record<string, string>;
      if (res.status === 404) return null;
    } catch {
      /* retry */
    }
    if (i < attempts) await new Promise((r) => setTimeout(r, 500 * i));
  }
  return null;
}

/* ---------- 子模块:ECDICT 行 ---------- */
/* 核心词判据(readCoreThresholds/isCoreWord)已抽到 vocab-core-word.ts(批量补图共用) */

interface EcdictRow {
  phonetic: string | null;
  definition: string | null;
  translation: string | null;
  collins: number | null;
  tag: string | null;
  bnc: number | null;
  frq: number | null;
  exchange: string | null;
}

/** ECDICT translation 拆分(按 \n 或 ;/；),兜底释义用 */
function splitTranslation(raw: string): string[] {
  return raw
    .split(/\n|;|；/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 6);
}

/** 极简屈折回退:剥常见后缀找原形;仅当原词查无时使用 */
function singularize(w: string): string | null {
  const rules: [RegExp, string][] = [
    [/ies$/, "y"],        // studies→study
    [/ves$/, "f"],        // lives→life
    [/(ches|shes|sses|xes)$/, ""], // boxes→box
    [/([^s])s$/, "$1"],   // books→book
    [/ied$/, "y"],        // carried→carry
    [/(.)\1(ed|ing)$/, "$1"], // stopped→stop, running→run(双写辅音)
    [/(ed|ing)$/, ""],    // walked→walk
  ];
  for (const [re, rep] of rules) {
    if (re.test(w)) {
      const cand = w.replace(re, rep);
      if (cand.length >= 2) return cand;
    }
  }
  return null;
}

/* ---------- 子模块:edge-tts 合成 ---------- */

interface TtsJob {
  word: string;
  kind: "word" | "sent";
  idx?: number;
  text: string;
  out: string;
}

/* ---------- 子模块:edge-tts 合成 ---------- */

/** managed venv python(可用环境变量覆盖);CLI 管线同款 */
export const EDGE_TTS_PY = process.env.EDGE_TTS_PY ?? "/Users/fanyunxu/.workbuddy/binaries/python/envs/default/bin/python3";

/**
 * 合成单条音频(单词级重生成复用,见 vocab-regen.ts;勿改签名语义)
 */
export async function synthOne(
  text: string,
  out: string,
  voice: string,
  rate: string | null,
  retries = 5,
): Promise<boolean> {
  if (existsSync(out) && statSync(out).size > 1000) return true; // 已有跳过(幂等;0 字节失败残留不短路)
  await mkdir(join(out, ".."), { recursive: true });
  const args = ["-m", "edge_tts", "--voice", voice, "--text", text, "--write-media", out];
  // 注意:必须用 --rate=-8% 等号形式;分开传 "-8%" 会被 argparse 当未知选项直接 exit 2
  if (rate) args.push(`--rate=${rate}`);
  for (let attempt = 1; attempt <= retries; attempt++) {
    const ok = await new Promise<boolean>((resolve) => {
      const child = spawn(EDGE_TTS_PY, args, { stdio: ["ignore", "pipe", "pipe"] });
      let errText = "";
      let settled = false;
      const finish = (v: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        try { child.kill(); } catch { /* 已退出 */ }
        resolve(v);
      };
      // 单次 45s 硬超时:代理/网络挂起时杀进程重试,防整条管线无限卡死
      const timer = setTimeout(() => {
        console.warn(`[vocab-import] edge-tts timeout(text=${text.slice(0, 24)},attempt=${attempt})`);
        finish(false);
      }, 45_000);
      child.stderr.on("data", (d: Buffer) => {
        errText += d.toString();
      });
      child.on("exit", (code) => {
        if (code === 0 && existsSync(out) && statSync(out).size > 0) finish(true);
        else {
          console.warn(`[vocab-import] edge-tts fail(text=${text.slice(0, 24)!},attempt=${attempt}):`, errText.trim().slice(-300) || `exit ${code}`);
          finish(false);
        }
      });
      child.on("error", (e) => {
        console.warn(`[vocab-import] edge-tts spawn error:`, e.message);
        finish(false);
      });
    });
    if (ok) return true;
    if (attempt < retries) await new Promise((r) => setTimeout(r, 1200 * attempt + Math.random() * 800));
  }
  return false;
}

async function runTtsJobs(jobs: TtsJob[], params: VocabImportParams, state: VocabImportTaskState): Promise<void> {
  const CONCURRENCY = 4;
  const ready = (out: string): boolean => existsSync(out) && statSync(out).size > 1000;

  async function runList(list: TtsJob[]): Promise<void> {
    let cursor = 0;
    async function worker(): Promise<void> {
      while (cursor < list.length && !taskCancelled(state)) {
        const job = list[cursor++];
        const voice = job.kind === "word" ? params.voiceWord : params.voiceSent;
        const rate = job.kind === "sent" ? SENT_RATE : null;
        await synthOne(job.text, job.out, voice, rate);
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  }

  await runList(jobs);
  // 补扫:代理抖动(单次失败率可到 50%+)下首扫漏掉的再来一整轮(取消即跳过)
  const missed = taskCancelled(state) ? [] : jobs.filter((j) => !ready(j.out));
  if (missed.length) await runList(missed);

  // 计数按文件终态统计(补扫成功不会双计)
  for (const j of jobs) {
    const good = ready(j.out);
    if (j.kind === "word") {
      if (good) state.audioWordOk++;
      else state.audioWordFail++;
    } else {
      if (good) state.audioSentOk++;
      else state.audioSentFail++;
    }
  }
}
