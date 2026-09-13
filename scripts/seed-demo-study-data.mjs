/**
 * scripts/seed-demo-study-data.mjs — 演示数据种子(下):备考计划 2 周 + 背单词 + 各练习流水
 *
 * 与 seed-demo-exam-data.mjs 配套(先跑 exam 再跑本脚本)。幂等:先清后插。
 *
 * 清空并重生成:
 *   - study_activities   2026-08-31 .. 2026-09-13 共 14 天(计划两个周一起),
 *     各科计数与 exam 种子(2 场次+5 单科)、typing/writing/reading 流水严格对齐
 *   - study_journals     9 天打卡留言 + 3 天 AI 昨日总结
 *   - typing_sessions    文章跟打 13 场 + 错词 drill 4 场(wpm/连击随日期缓升)
 *   - writing_sessions   /writing 仿真 2 篇(9/5、9/8,未批改留白)
 *   - reading_progress   阅读库读完 6 篇 + 进行中 1 篇
 *   - word_progress / word_review_log  120 词 FSRS 伪造学习史(近 2 周,含超期/待复习混合)
 *
 * 保留不动:study_plans(用户真实计划)、exam_sessions/records(exam 脚本管)、
 *          words/word_books 词库本体、app_settings。
 *
 * ⚠ 破坏性:执行前整库备份(prune-db-backups tag=demostudy)。
 */
import Database from "better-sqlite3";
import { pruneDbBackups } from "../scripts/lib/prune-db-backups.mjs";
import { randomInt } from "node:crypto";

/** [0,1) 随机浮点(种子数据不需要密码学强度) */
const random = () => Math.random();

const DRY = process.argv.includes("--dry");
const DB_PATH = new URL("../data/app.db", import.meta.url).pathname;

/* ---------- 时间工具 ---------- */
const DAY = (dateStr, h, m = 0) => {
  const [y, mo, d] = dateStr.split("-").map(Number);
  return Math.floor(new Date(y, mo - 1, d, h, m, randomInt(0, 59)).getTime() / 1000);
};
/** 同一日期的 Date 对象(用于 activity_date 字符串) */
const D = (dateStr) => {
  const [y, mo, d] = dateStr.split("-").map(Number);
  return new Date(y, mo - 1, d);
};

/* ---------- 14 天计划总表(与 exam 种子日期对齐) ----------
 * set=完整场次 L/R/W=单科考试提交 typ=文章跟打场数 lib=阅读库读完 words=背词数
 */
const SCHEDULE = {
  "2026-08-31": { set: 1, L: 1, R: 1, W: 1, typ: 1, lib: 0, words: 18 },
  "2026-09-01": { set: 0, L: 0, R: 1, W: 0, typ: 1, lib: 1, words: 22 },
  "2026-09-02": { set: 0, L: 1, R: 0, W: 0, typ: 0, lib: 0, words: 25, drill: 1 },
  "2026-09-03": { set: 0, L: 0, R: 2, W: 0, typ: 1, lib: 2, words: 28 },
  "2026-09-04": { set: 0, L: 0, R: 1, W: 0, typ: 1, lib: 0, words: 20 },
  "2026-09-05": { set: 0, L: 0, R: 0, W: 1, typ: 0, lib: 0, words: 16, drill: 1 },
  "2026-09-06": { set: 1, L: 1, R: 1, W: 1, typ: 0, lib: 0, words: 15 },
  "2026-09-07": { set: 0, L: 1, R: 0, W: 0, typ: 2, lib: 0, words: 30 },
  "2026-09-08": { set: 0, L: 1, R: 0, W: 1, typ: 0, lib: 0, words: 24 },
  "2026-09-09": { set: 0, L: 0, R: 2, W: 0, typ: 1, lib: 1, words: 26 },
  "2026-09-10": { set: 0, L: 0, R: 0, W: 1, typ: 0, lib: 0, words: 32 },
  "2026-09-11": { set: 0, L: 0, R: 2, W: 0, typ: 1, lib: 2, words: 22 },
  "2026-09-12": { set: 0, L: 0, R: 0, W: 0, typ: 2, lib: 0, words: 35, drill: 1 },
  "2026-09-13": { set: 0, L: 0, R: 1, W: 0, typ: 1, lib: 1, words: 12, drill: 1 },
};

const NOTES = {
  "2026-08-31": "周一首战 G 类真题热身:听力 6.5 比预期稳,阅读 Part2 判断题掉坑多,明天精读一篇找找感觉。",
  "2026-09-01": "读完住宿资讯那篇,生词率可控;跟打 10 分钟找手感。",
  "2026-09-02": "单科听力卷一份,选择题预读还是慢,错词重练了一遍。",
  "2026-09-03": "阅读库连读两篇,长难句拆句速度有提升,跟打保持。",
  "2026-09-04": "阅读单科 5.5,TFNG 还是最大失分点,整理错题本。",
  "2026-09-05": "小作文仿真一篇,字数达标但数据对比展开不足,周末再练。",
  "2026-09-06": "第二套完整真题:听力 7.0 突破,阅读 6.5 回稳,写作维持 6.0。",
  "2026-09-07": "听力单科保持手感,跟打两篇冲连击。",
  "2026-09-08": "大作文仿真 + 听力单科各一,观点展开比上周顺。",
  "2026-09-09": "阅读单科 6.5,判断题正确率上来了;库里再补一篇。",
  "2026-09-10": "写作单科交卷,衔接词这次有意识做了替换。",
  "2026-09-11": "阅读库两篇 + 跟打,保持节奏。",
  "2026-09-12": "今天只练打字和背词,给下周真题日留状态。",
};

const AI_SUMMARIES = {
  "2026-09-02": {
    summary: "昨天完成了阅读库精读与跟打练习,阅读正确率稳定;判断题型仍是主要失分点,建议今天安排一份单科阅读卷针对性检验。",
    suggestions: ["精读时标注 TFNG 题对应原文句", "跟打前先热身 2 分钟数字与连字符"],
    basedOn: { submissions: 2, words: 22, journalExcerpt: true },
  },
  "2026-09-07": {
    summary: "前日第二套完整真题表现亮眼:听力首次破 7.0,阅读回稳 6.5。写作时间分配仍偏紧,建议本周大作文保持隔天一练。",
    suggestions: ["复盘听力 Section3 的配对题", "大作文限时 40 分钟完整写一篇"],
    basedOn: { submissions: 4, words: 15, journalExcerpt: true },
  },
  "2026-09-13": {
    summary: "昨天以打字和背词轻量保持状态,完成 35 词复习。两场模考趋势向好,本周可再约一套完整真题冲刺阅读 7.0。",
    suggestions: ["把听力错题本过一遍", "阅读限时训练保持考场节奏"],
    basedOn: { submissions: 2, words: 35, journalExcerpt: true },
  },
};

/** T2 大作文样例(写作仿真 content 用) */
const SIM_ESSAY =
  "Some people believe that children should start learning a foreign language at primary school, while others think it is better to begin at secondary school.\n\nSupporters of an early start point to the natural advantages young children enjoy. Primary school pupils absorb pronunciation and intonation far more easily than teenagers, and they tend to approach a new language without the self-consciousness that often blocks older learners. Early exposure also allows more cumulative hours of contact before the demands of examinations begin to crowd out language study.\n\nOpponents, however, argue that primary curricula are already crowded, and that adding a language may squeeze the literacy and numeracy foundations on which all later learning depends. They also note that without properly trained primary teachers, early lessons risk building bad habits that secondary schools must later correct.\n\nOn balance, I believe the advantages of an early start outweigh the difficulties. Young children's receptivity to sound and their fearlessness in speaking are assets that fade with age, and these can be protected by modest, play-based lessons delivered by well-trained teachers.\n\nIn conclusion, although practical obstacles exist, introducing a foreign language at primary school gives children the strongest possible foundation, provided that schools resource it properly.";

async function main() {
  const db = new Database(DB_PATH);

  /* 素材池 */
  const articles = db.prepare("SELECT article_id, title, word_count FROM reading_articles ORDER BY article_id").all();
  if (articles.length < 8) throw new Error("reading_articles 不足");
  const prompts = db.prepare("SELECT prompt_id, min_words FROM writing_prompts WHERE prompt_id LIKE '%:t2'").all();
  const wordIds = db.prepare("SELECT id FROM words WHERE id BETWEEN 17 AND 5309 ORDER BY random() LIMIT 120").all().map((r) => r.id);
  const dates = Object.keys(SCHEDULE);

  /* ---------- 生成 typing_sessions ---------- */
  const typingRows = [];
  let artIdx = 0;
  let comboBase = 18;
  for (const date of dates) {
    const s = SCHEDULE[date];
    for (let i = 0; i < (s.typ ?? 0); i++) {
      const a = articles[artIdx++ % articles.length];
      const chars = Math.round(a.word_count * 4.8);
      const dur = randomInt(420, 880);
      const ratio = 0.93 + Math.min(0.045, randomInt(0, 45) / 1000) + (new Date(date) - new Date("2026-08-31")) / (14 * 86400e3) * 0.01;
      const correct = Math.round(chars * Math.min(ratio, 0.975));
      comboBase += randomInt(2, 7);
      const start = DAY(date, 8 + i * 2 + randomInt(0, 3), randomInt(0, 59));
      typingRows.push({
        mode: "article", article_id: a.article_id, duration_sec: dur,
        char_total: chars, char_correct: correct, backspaces: randomInt(25, 90),
        max_combo: comboBase, wpm: Math.round((correct / 5) / (dur / 60) * 10) / 10,
        accuracy: Math.round((correct / chars) * 10000) / 10000,
        error_chars_json: JSON.stringify(Object.fromEntries([["a", randomInt(1, 4)], ["i", randomInt(1, 3)], ["n", randomInt(1, 2)]])),
        drill_meta_json: null, started_at: start, typos_json: "{}",
      });
    }
    for (let i = 0; i < (s.drill ?? 0); i++) {
      const a = articles[artIdx++ % articles.length];
      const chars = randomInt(180, 420);
      const dur = randomInt(120, 300);
      const correct = Math.round(chars * (0.9 + random(0, 0.06)));
      typingRows.push({
        mode: "drill", article_id: a.article_id, duration_sec: dur,
        char_total: chars, char_correct: correct, backspaces: randomInt(5, 20),
        max_combo: randomInt(8, 30), wpm: Math.round((correct / 5) / (dur / 60) * 10) / 10,
        accuracy: Math.round((correct / chars) * 10000) / 10000,
        error_chars_json: "{}",
        drill_meta_json: JSON.stringify({ triggerWords: ["however", "significant", "economic", "particular"].slice(0, randomInt(2, 5)) }),
        started_at: DAY(date, 21, randomInt(0, 59)), typos_json: "{}",
      });
    }
  }

  /* ---------- 生成 writing_sessions(9/5、9/8) ---------- */
  const writingRows = [
    { date: "2026-09-05", pid: prompts[0 % prompts.length]?.prompt_id ?? "a-2022apr-test1-writing-test1:t2", wc: 262, dur: 2280 },
    { date: "2026-09-08", pid: prompts[1 % prompts.length]?.prompt_id ?? "a-2022apr-test2-writing-test2:t2", wc: 289, dur: 2460 },
  ].map((w) => ({
    prompt_id: w.pid, word_count: w.wc, duration_sec: w.dur, reached_min: 1,
    content: SIM_ESSAY, finished_at: DAY(w.date, 20, randomInt(10, 50)), ai_json: null,
  }));

  /* ---------- 生成 reading_progress ---------- */
  const libDone = [
    ["2026-09-01", "gt-vol1-r-t1-p1"], ["2026-09-03", "gt-vol1-r-t1-p2"], ["2026-09-03", "gt-vol1-r-t1-p3"],
    ["2026-09-09", "a-2025jan-r-t1-p1"], ["2026-09-11", "a-2025jan-r-t1-p2"], ["2026-09-11", "a-2025jan-r-t1-p3"],
    ["2026-09-13", "gt-vol1-r-t1-p4"],
  ];
  const validIds = new Set(articles.map((a) => a.article_id));
  const readingRows = libDone
    .filter(([, id]) => validIds.has(id))
    .map(([date, id]) => {
      const done = DAY(date, 19 + randomInt(0, 2), randomInt(0, 59));
      const sec = randomInt(520, 1080);
      return { article_id: id, status: "COMPLETED", last_paragraph: randomInt(12, 25), read_sec: sec, last_read_at: done, created_at: done - sec, updated_at: done };
    });
  {
    const half = DAY("2026-09-13", 12, 30);
    readingRows.push({ article_id: validIds.has("a-2025jan-r-t1-p4") ? "a-2025jan-r-t1-p4" : articles[0].article_id, status: "IN_PROGRESS", last_paragraph: 3, read_sec: 240, last_read_at: half, created_at: half - 240, updated_at: half });
  }

  /* ---------- 生成 word_progress + word_review_log ---------- */
  const now = Date.now();
  const progressRows = [];
  const reviewRows = [];
  for (const wid of wordIds) {
    const firstDay = dates[randomInt(0, 10)]; // 前 11 天入词,末尾几天留新词余地
    const createdAt = DAY(firstDay, randomInt(7, 22), randomInt(0, 59));
    const reps = randomInt(3, 8);
    let t = createdAt * 1000;
    let lapses = 0;
    const stage = random(0, 1) < 0.6 ? "recognize" : "spell";
    for (let r = 0; r < reps; r++) {
      const rating = random(0, 1) < 0.12 ? 1 : random(0, 1) < 0.42 ? 3 : random(0, 1) < 0.75 ? 4 : 2;
      if (rating === 1) lapses++;
      reviewRows.push({ word_id: wid, rating, stage, reviewed_at: Math.round(t) });
      t += randomInt(1, 3) * 86400e3 * (0.8 + random(0, 0.5));
      if (t > now - 3600e3) break;
    }
    const stability = Math.min(60, 0.8 + reps * random(0.8, 2.2));
    const lastMs = Math.round(Math.min(t, now - randomInt(2, 20) * 3600e3));
    const dueMs = Math.round(lastMs + stability * 86400e3 * (random(0, 1) < 0.35 ? random(0.2, 0.9) : random(1.0, 1.6)));
    progressRows.push({
      word_id: wid, stage, status: "ACTIVE",
      due: dueMs,
      fsrs_state_json: JSON.stringify({
        stability: Math.round(stability * 1e6) / 1e6,
        difficulty: Math.round((3.5 + random(0, 5.5)) * 1e6) / 1e6,
        state: 2, step: 0, paramVersion: "FSRS-6.0-default",
      }),
      reps: reviewRows.filter((r) => r.word_id === wid).length,
      lapses,
      last_review_at: lastMs,
      created_at: createdAt, updated_at: Math.floor(lastMs / 1000),
    });
  }
  const progressIdByWord = new Map();

  /* ---------- 打卡 journals ---------- */
  const journalRows = [];
  for (const date of dates) {
    if (!(date in NOTES)) continue;
    const ai = AI_SUMMARIES[date];
    journalRows.push({
      journal_date: date, period: "daily",
      content: NOTES[date],
      ai_summary_json: ai
        ? JSON.stringify({ ...ai, model: "MiniMax-M3", generatedAt: new Date(D(date).getTime() + 8.5 * 3600e3).toISOString() })
        : null,
      created_at: DAY(date, 22, randomInt(0, 40)), updated_at: DAY(date, 22, randomInt(0, 40)),
    });
  }

  /* ---------- 预演输出 ---------- */
  console.log(`== 备考数据预演(${DRY ? "DRY" : "APPLY"}) ==`);
  let totSub = 0;
  for (const date of dates) {
    const s = SCHEDULE[date];
    const subs = s.set + s.L + s.R + s.W;
    totSub += subs;
    console.log(`${date}  提交${subs} 打字${s.typ} 背词${s.words} 阅读${s.lib}${s.drill ? " drill" : ""}`);
  }
  console.log(`typing=${typingRows.length} writing=${writingRows.length} reading=${readingRows.length} words=${progressRows.length} reviews=${reviewRows.length} journals=${journalRows.length} 总提交日历=${totSub}`);
  if (DRY) return console.log("dry-run 结束,未写库。加 --apply 执行。");

  /* ---------- 备份 → 清空 → 写入 ---------- */
  console.log("备份整库…");
  pruneDbBackups(DB_PATH, "demostudy", 3);
  const { copyFileSync } = await import("node:fs");
  copyFileSync(DB_PATH, `${DB_PATH}.bak-demostudy-${Date.now()}`);

  const tx = db.transaction(() => {
    db.prepare("DELETE FROM study_activities").run();
    db.prepare("DELETE FROM study_journals").run();
    db.prepare("DELETE FROM typing_sessions").run();
    db.prepare("DELETE FROM writing_sessions").run();
    db.prepare("DELETE FROM reading_progress").run();
    db.prepare("DELETE FROM word_review_log").run();
    db.prepare("DELETE FROM word_progress").run();

    const insAct = db.prepare(`INSERT INTO study_activities
      (activity_date, exam_set_completion_count, listening_submission_count, reading_submission_count, writing_submission_count, speaking_submission_count, memorized_word_count, created_at, updated_at, typing_submission_count)
      VALUES (?,?,?,?,?,?,?,?,?,?)`);
    for (const date of dates) {
      const s = SCHEDULE[date];
      const ts = DAY(date, 23, 59);
      insAct.run(date, s.set, s.L, s.R, s.W, 0, s.words, ts, ts, s.typ);
    }

    const insTyp = db.prepare(`INSERT INTO typing_sessions
      (mode, article_id, duration_sec, char_total, char_correct, backspaces, max_combo, wpm, accuracy, error_chars_json, drill_meta_json, started_at, typos_json)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    for (const r of typingRows)
      insTyp.run(r.mode, r.article_id, r.duration_sec, r.char_total, r.char_correct, r.backspaces, r.max_combo, r.wpm, r.accuracy, r.error_chars_json, r.drill_meta_json, r.started_at, r.typos_json);

    const insWri = db.prepare(`INSERT INTO writing_sessions
      (prompt_id, word_count, duration_sec, reached_min, content, finished_at, ai_json) VALUES (?,?,?,?,?,?,?)`);
    for (const r of writingRows) insWri.run(r.prompt_id, r.word_count, r.duration_sec, r.reached_min, r.content, r.finished_at, r.ai_json);

    const insRead = db.prepare(`INSERT INTO reading_progress
      (article_id, status, last_paragraph, read_sec, last_read_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?)`);
    for (const r of readingRows) insRead.run(r.article_id, r.status, r.last_paragraph, r.read_sec, r.last_read_at, r.created_at, r.updated_at);

    const insProg = db.prepare(`INSERT INTO word_progress
      (word_id, stage, status, due, fsrs_state_json, reps, lapses, last_review_at, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)`);
    for (const r of progressRows) {
      const info = insProg.run(r.word_id, r.stage, r.status, r.due, r.fsrs_state_json, r.reps, r.lapses, r.last_review_at, r.created_at, r.updated_at);
      progressIdByWord.set(r.word_id, info.lastInsertRowid);
    }
    const insRev = db.prepare("INSERT INTO word_review_log (progress_id, rating, stage, reviewed_at) VALUES (?,?,?,?)");
    for (const r of reviewRows) {
      const pid = progressIdByWord.get(r.word_id);
      if (pid) insRev.run(pid, r.rating, r.stage, r.reviewed_at);
    }

    const insJou = db.prepare(`INSERT INTO study_journals
      (journal_date, period, content, ai_summary_json, created_at, updated_at) VALUES (?,?,?,?,?,?)`);
    for (const r of journalRows) insJou.run(r.journal_date, r.period, r.content, r.ai_summary_json, r.created_at, r.updated_at);
  });
  tx();

  for (const t of ["study_activities", "study_journals", "typing_sessions", "writing_sessions", "reading_progress", "word_progress", "word_review_log"])
    console.log(`${t}: ${db.prepare(`SELECT COUNT(*) n FROM ${t}`).get().n}`);
  console.log("完成(备份于 data/app.db.bak-demostudy-*)");
  db.close();
}

main();
