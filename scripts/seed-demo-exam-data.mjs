/**
 * scripts/seed-demo-exam-data.mjs — 演示数据种子:清空真题模拟记录并生成仿真考试记录
 *
 * 用途:为仪表盘宣传截图准备好看的数据(2026-09-13)。一次性工具,可重复执行(幂等:
 * 每次执行都是先清后插,产出同一批记录)。
 *
 * 产出:
 *   - 2 套完整真题场次(gt-vol1 / a-2025sep-test2,各 3 科 SUBMITTED 记录 + COMPLETED 场次)
 *   - 单科独立考试:听力 2 / 阅读 2 / 写作 2,分布在 8 个不同日期(近三周,成绩稳步上升趋势)
 *
 * 仿真原则:
 *   - 客观卷答题卡由试卷真实的 questions_json/answers_json 驱动:按目标 raw 分
 *     随机挑对题,正确题 value = 标准答案,错误题填错选项或留空(未作答)
 *   - band 由各卷自己的 band_table_json 换算,与真实判分同一口径
 *   - 写作卷 answer_sheet 带 AI 批改全结构(TR/CC/LR/GRA 四维 + 总评 + 改写范文)
 *
 * ⚠ 破坏性:执行时先整库备份(scripts/lib/prune-db-backups.mjs,tag=demoseed),
 *   再 DELETE exam_records / exam_sessions(其他表不动:打卡/打字/背词/写作仿真均保留)。
 */
import Database from "better-sqlite3";
import { pruneDbBackups } from "../scripts/lib/prune-db-backups.mjs";
import { randomInt } from "node:crypto";

/** [0,1) 随机浮点(node:crypto 无 random,用 Math.random 即可,种子数据不需要密码学强度) */
const random = () => Math.random();

const DRY = process.argv.includes("--dry");
const DB_PATH = new URL("../data/app.db", import.meta.url).pathname;

/* ---------- 时间工具:daysAgo 天前的本地时刻 → unix 秒 ---------- */
function at(daysAgo, h, m) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(h, m, randomInt(0, 59), 0);
  return Math.floor(d.getTime() / 1000);
}
const ymd = (sec) => {
  const d = new Date(sec * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const roundBand = (x) => Math.round(x * 2) / 2;

/* ---------- 客观卷:按目标 raw 分生成答题卡 ---------- */
function buildObjectiveSheet(paper, aimRaw) {
  const questions = JSON.parse(paper.questions_json);
  const answers = JSON.parse(paper.answers_json ?? "{}");
  const entries = Object.entries(questions).filter(
    ([, q]) => q.anchor && q.type !== "WRITING_TASK",
  );
  // 洗牌后贪心挑题:得分点累加 ≤ aimRaw,保证 raw 不超目标档
  const shuffled = entries
    .map(([n, q]) => [n, q, random(0, 1)])
    .sort((a, b) => a[2] - b[2])
    .map(([n, q]) => [n, q]);
  let raw = 0;
  const correctSet = new Set();
  for (const [n, q] of shuffled) {
    const pts = q.max ?? 1;
    if (raw + pts <= aimRaw) {
      correctSet.add(q.anchor);
      raw += pts;
    }
  }
  const sheet = {};
  for (const [n, q] of entries) {
    const ans = answers[q.anchor] ?? "";
    const ok = correctSet.has(q.anchor);
    let value;
    if (ok) value = ans;
    else if (/^[A-D](\s*,\s*[A-D])?$/.test(ans)) {
      // 选择题填一个不同的错选项
      const letters = ["A", "B", "C", "D"].filter((l) => !ans.split(",").map((s) => s.trim()).includes(l));
      value = letters[randomInt(0, letters.length)];
    } else value = null; // 填空题留空 = 未作答
    sheet[q.anchor] = {
      number: Number(n),
      part: q.part,
      type: q.type,
      value,
      correct: ok,
      points: ok ? (q.max ?? 1) : 0,
    };
  }
  return { sheet, correctCount: raw };
}

/** raw → band:与 src/lib/scoring.ts rawToBand 同语义 */
function rawToBand(raw, table) {
  for (const [min, band] of table) if (raw >= min) return band;
  return raw > 0 ? 1 : 0;
}

/* ---------- 写作卷:AI 批改全结构答题卡 ---------- */
function writingEntry(task, essay, dims, overall, gradedAt) {
  const names = { TR: "任务回应", CC: "连贯衔接", LR: "词汇资源", GRA: "语法多样" };
  return {
    task,
    type: "WRITING_TASK",
    value: essay,
    correct: null,
    points: null,
    ai: {
      status: "DONE",
      model: "MiniMax-M3",
      tokens: randomInt(1800, 2600),
      latencyMs: randomInt(9000, 18000),
      retryCount: 0,
      error: null,
      gradedAt,
      bands: { TR: dims.TR, CC: dims.CC, LR: dims.LR, GRA: dims.GRA },
      overall,
      dimensions: ["TR", "CC", "LR", "GRA"].map((k) => ({
        name: k,
        band: dims[k],
        comment: W_COMMENTS[dims[k]][k].replace("TASK", task === "T1" ? "小作文" : "大作文"),
        evidence: W_EVIDENCE[task],
        improvement: W_IMPROVE[dims[k]][k],
      })),
      strengths: W_STRENGTHS[dims.TR],
      weaknesses: W_WEAK[dims.TR],
      rewrittenSample: task === "T1" ? SAMPLE_T1 : SAMPLE_T2,
    },
  };
}

/* 评语按档位组织(5.5 / 6.0 两档,够这批种子用) */
const W_COMMENTS = {
  5.5: {
    TR: "对TASK要求的覆盖基本完整,但细节挖掘不足:关键信息有遗漏,数据引用偏少,概述段的特征概括较为笼统,整体像是「安全牌」作答。",
    CC: "段落划分合理,但衔接手段单一,通篇依赖 firstly/In addition 等机械连接词,句间逻辑多靠读者自行补全,指代衔接(this trend/these measures)使用不足。",
    LR: "词汇量足以应付话题,但拼写与搭配有小瑕疵,低频词汇出现密度低,部分表达重复率偏高(如important 连用三次)。",
    GRA: "简单句占比过高,复杂句式尝试了定语从句但时态控制不稳,存在主谓一致与冠词遗漏等小错,未影响理解但拉低精度印象。",
  },
  6: {
    TR: "TASK各部分要求覆盖完整,观点明确且有展开,细节与数据引用到位;若能在概述中进一步突出最显著特征对比,回应会更有力。",
    CC: "段落组织清晰,推进连贯,机械连接词之外已出现指代与替换衔接;个别句间转折略生硬,可通过更自然的逻辑词优化。",
    LR: "话题词汇运用准确,有意识的搭配升级(如 a dramatic increase)是亮点;个别词汇重复,可再替换同义表达提升多样性。",
    GRA: "句式有变化:简单句、复合句与被动语态搭配使用,准确率较高;少量长句出现悬垂结构,注意句尾的一致性即可。",
  },
};
const W_IMPROVE = {
  5.5: {
    TR: "概述段用一句话点出最突出的 2 个特征,正文每段至少引用 2 处具体数据支撑。",
    CC: "减少 firstly/secondly 的堆叠,改用指代衔接与语义推进让句子自然相连。",
    LR: "建立同义替换清单,同一概念在文中至少准备两种表达,避免关键名词反复出现。",
    GRA: "每段刻意安排 1-2 个复杂句(条件句/让步句),写完检查主谓一致与冠词。",
  },
  6: {
    TR: "在开头段之后加一句 overview,点明全局趋势或最值对比,增强回应高度。",
    CC: "让步转折处用 while/whereas 替代 but,句间用 this/such 指代前句核心词。",
    LR: "对重复率最高的 3 个词各准备一个高级替换,如 significant → substantial。",
    GRA: "长句写完回读一遍,消除悬垂修饰;穿插一个强调句或倒装句提升多样性。",
  },
};
const W_EVIDENCE = {
  T1: ["increased significantly over the period", "the figure for 2010 was higher"],
  T2: ["Some people believe that technology has changed the way we work", "In conclusion, both views have merits"],
};
const W_STRENGTHS = {
  5.5: ["作答态度认真,结构完整", "能覆盖题目基本要求"],
  6: ["结构清晰,论证有层次", "话题词汇运用准确,搭配有亮点", "句式变化意识明显"],
};
const W_WEAK = {
  5.5: ["关键数据引用不足,论证支撑偏弱", "衔接手段单一,依赖基础连接词", "部分词汇重复率偏高"],
  6: ["概述高度可再提升", "个别长句存在语法瑕疵"],
};

const SAMPLE_T1 =
  "The line graph compares the proportion of urban residents in four Asian countries between 1990 and 2020.\n\nOverall, urbanisation rose in all four countries over the three decades, with Country A experiencing by far the most dramatic growth, while Country D remained the least urbanised throughout the period.\n\nIn 1990, roughly 30% of Country A's population lived in cities, a figure that climbed steadily to around 45% in 2005 and then surged to approximately 70% by 2020. Country B followed a similar but gentler trajectory, rising from 40% to just over 55%. By contrast, Country C's urban share grew only marginally, from 25% to 33%, and Country D saw an increase of a mere five percentage points, reaching 20% at the end of the period.\n\nIt is also worth noting that the gap between the most and least urbanised countries widened considerably, from about 15 percentage points in 1990 to 50 points in 2020.";
const SAMPLE_T2 =
  "Some people argue that remote work benefits both employers and employees, while others believe it undermines collaboration and productivity.\n\nAdvocates of remote work point to the flexibility it offers. Employees save considerable commuting time and can arrange their schedules around personal responsibilities, which often translates into higher job satisfaction. Employers, meanwhile, can reduce office costs and recruit talent regardless of location. Several technology companies have reported maintained or even improved output after shifting to hybrid arrangements.\n\nCritics, however, contend that physical presence fosters cohesion that video calls cannot replicate. Informal exchanges by the coffee machine frequently spark ideas, and new employees learn faster by observing colleagues. Prolonged isolation may also blur the boundary between work and life, leading to burnout rather than greater efficiency.\n\nIn my view, the ideal arrangement is a hybrid one: offices should serve as collaboration hubs where teams gather for creative and social purposes, while focused individual tasks are best completed at home. The key lies in deliberate management—companies must redesign workflows and communication norms rather than simply relocating them.\n\nIn conclusion, remote work is neither a universal remedy nor a passing fad. Organisations that adapt deliberately to its dual nature are likely to reap its benefits while containing its risks.";

/* ---------- 种子计划 ---------- */
/** 目标 raw 分按 band 档取窗口中位附近,保证落档稳定 */
function rawForBand(table, band) {
  const idx = table.findIndex(([, b]) => b === band);
  const min = table[idx][0];
  const nextMin = idx > 0 ? table[idx - 1][0] : min + 4;
  return Math.floor((min + nextMin - 1) / 2);
}

async function main() {
  const db = new Database(DB_PATH);
  const papers = (ids) =>
    Object.fromEntries(
      ids.map((id) => {
        const p = db.prepare("SELECT * FROM papers WHERE exam_id = ?").get(id);
        if (!p) throw new Error(`paper 不存在: ${id}`);
        return [id, p];
      }),
    );

  /* 试卷清单 */
  const P = papers([
    "gt-vol1-listening-test1", "gt-vol1-reading-test1", "gt-vol1-writing-test1",
    "a-2025sep-test2-listening-test2", "a-2025sep-test2-reading-test2", "a-2025sep-test2-writing-test2",
    "a-2025mar-listening-test1", "a-2025jul-listening-test2",
    "a-2025jan-reading-test2", "a-2025aug-test2-reading-test2",
    "a-2025jun-writing-test2", "a-2025sep-test2-writing-test2",
  ]);

  /* 计划:每天一条主线(时间错开,近三周,成绩缓升) */
  const plan = [];
  const session = (daysAgo, h, m, setId, items) => ({ kind: "session", daysAgo, h, m, setId, items });
  const single = (daysAgo, h, m, examId, spec) => ({ kind: "single", daysAgo, h, m, examId, ...spec });

  plan.push(
    session(13, 19, 32, "gt-vol1", [
      { pid: "gt-vol1-listening-test1", raw: rawForBand(JSON.parse(P["gt-vol1-listening-test1"].band_table_json), 6.5), used: 1710 },
      { pid: "gt-vol1-reading-test1", raw: rawForBand(JSON.parse(P["gt-vol1-reading-test1"].band_table_json), 6.0), used: 2860 },
      { pid: "gt-vol1-writing-test1", band: 6.0, used: 3320 },
    ]),
    single(11, 20, 10, "a-2025mar-listening-test1", { raw: rawForBand(JSON.parse(P["a-2025mar-listening-test1"].band_table_json), 6.0), used: 1650 }),
    single(9, 19, 5, "a-2025jan-reading-test2", { raw: rawForBand(JSON.parse(P["a-2025jan-reading-test2"].band_table_json), 5.5), used: 2980 }),
    session(7, 19, 30, "a-2025sep-test2", [
      { pid: "a-2025sep-test2-listening-test2", raw: rawForBand(JSON.parse(P["a-2025sep-test2-listening-test2"].band_table_json), 7.0), used: 1780 },
      { pid: "a-2025sep-test2-reading-test2", raw: rawForBand(JSON.parse(P["a-2025sep-test2-reading-test2"].band_table_json), 6.5), used: 2690 },
      { pid: "a-2025sep-test2-writing-test2", band: 6.0, used: 3150 },
    ]),
    single(5, 20, 40, "a-2025jul-listening-test2", { raw: rawForBand(JSON.parse(P["a-2025jul-listening-test2"].band_table_json), 6.5), used: 1580 }),
    single(3, 19, 50, "a-2025aug-test2-reading-test2", { raw: rawForBand(JSON.parse(P["a-2025aug-test2-reading-test2"].band_table_json), 6.5), used: 2740 }),
    single(1, 20, 20, "a-2025sep-test2-writing-test2", { band: 6.0, used: 3040 }),
  );

  /* 预演:打印计划与换算 band */
  console.log(`== 计划预演(${DRY ? "DRY" : "APPLY"}) ==`);
  const built = [];
  for (const item of plan) {
    const date = at(item.daysAgo, item.h, item.m);
    if (item.kind === "session") {
      let totalUsed = 0;
      let lastSub = date;
      const recs = item.items.map((it) => {
        const p = P[it.pid];
        const start = date + totalUsed + randomInt(60, 180); // 科间休息 1-3 分钟
        const sub = start + it.used;
        totalUsed += it.used;
        lastSub = sub;
        let band, correctCount = null, sheet;
        if (p.subject === "writing") {
          band = it.band;
          const dims1 = band <= 5.5 ? { TR: 5.5, CC: 5.5, LR: 5, GRA: 5.5 } : { TR: 6, CC: 6, LR: 6, GRA: 5.5 };
          const dims2 = band <= 5.5 ? { TR: 5.5, CC: 5, LR: 5.5, GRA: 5.5 } : { TR: 6, CC: 5.5, LR: 6, GRA: 6 };
          const gradedAt = new Date((sub + randomInt(30, 90)) * 1000).toISOString();
          sheet = {
            T1: writingEntry("T1", SAMPLE_T1, dims1, roundBand((dims1.TR + dims1.CC + dims1.LR + dims1.GRA) / 4), gradedAt),
            T2: writingEntry("T2", SAMPLE_T2, dims2, roundBand((dims2.TR + dims2.CC + dims2.LR + dims2.GRA) / 4), gradedAt),
          };
          band = it.band;
        } else {
          const { sheet: s, correctCount: cc } = buildObjectiveSheet(p, it.raw);
          sheet = s;
          correctCount = cc;
          band = rawToBand(cc, JSON.parse(p.band_table_json));
        }
        return { p, start, sub, used: it.used, correctCount, band, sheet: JSON.stringify(sheet) };
      });
      const overall = roundBand(recs.reduce((s, r) => s + r.band, 0) / recs.length);
      const setIdForSid = item.setId;
      const d = new Date(date * 1000);
      const sid = `${setIdForSid}-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}${String(d.getSeconds()).padStart(2, "0")}`;
      console.log(`[场次] ${sid} overall=${overall} used=${totalUsed}s @${ymd(date)}`);
      for (const r of recs) console.log(`   ${r.p.subject.padEnd(10)} raw=${r.correctCount ?? "-"} band=${r.band} used=${r.used}s`);
      built.push({ type: "session", sid, setId: item.setId, date, lastSub, totalUsed, overall, recs });
    } else {
      const p = P[item.examId];
      const start = date;
      const sub = start + item.used;
      let band, correctCount = null, sheet;
      if (p.subject === "writing") {
        band = item.band;
        const dims = item.band <= 5.5 ? { TR: 5.5, CC: 5, LR: 5.5, GRA: 5.5 } : { TR: 6, CC: 6, LR: 5.5, GRA: 6 };
        const gradedAt = new Date((sub + 60) * 1000).toISOString();
        sheet = {
          T1: writingEntry("T1", SAMPLE_T1, dims, roundBand((dims.TR + dims.CC + dims.LR + dims.GRA) / 4), gradedAt),
          T2: writingEntry("T2", SAMPLE_T2, dims, roundBand((dims.TR + dims.CC + dims.LR + dims.GRA) / 4), gradedAt),
        };
      } else {
        const { sheet: s, correctCount: cc } = buildObjectiveSheet(p, item.raw);
        sheet = s;
        correctCount = cc;
        band = rawToBand(cc, JSON.parse(p.band_table_json));
      }
      console.log(`[单科] ${item.examId} raw=${correctCount ?? "-"} band=${band} @${ymd(date)}`);
      built.push({ type: "single", p, start, sub, used: item.used, correctCount, band, sheet: JSON.stringify(sheet) });
    }
  }

  if (DRY) {
    console.log("dry-run 结束,未写库。加 --apply 执行。");
    return;
  }

  /* 备份 → 清空 → 写入 */
  console.log("备份整库…");
  pruneDbBackups(DB_PATH, "demoseed", 3);
  const { copyFileSync } = await import("node:fs");
  copyFileSync(DB_PATH, `${DB_PATH}.bak-demoseed-${Date.now()}`);

  const tx = db.transaction(() => {
    db.prepare("DELETE FROM exam_records").run();
    db.prepare("DELETE FROM exam_sessions").run();
    for (const b of built) {
      if (b.type === "session") {
        db.prepare(
          "INSERT INTO exam_sessions (session_id, exam_set_id, status, started_at, finished_at, total_used_sec, overall_band, created_at) VALUES (?,?,?,?,?,?,?,?)",
        ).run(b.sid, b.setId, "COMPLETED", b.date, b.lastSub, b.totalUsed, b.overall, b.date);
        for (const r of b.recs) {
          db.prepare(
            "INSERT INTO exam_records (exam_id, subject, session_id, status, started_at, submitted_at, used_sec, correct_count, band_score, answer_sheet_json, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
          ).run(r.p.exam_id, r.p.subject, b.sid, "SUBMITTED", r.start, r.sub, r.used, r.correctCount, r.band, r.sheet, r.start);
        }
      } else {
        db.prepare(
          "INSERT INTO exam_records (exam_id, subject, session_id, status, started_at, submitted_at, used_sec, correct_count, band_score, answer_sheet_json, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        ).run(b.p.exam_id, b.p.subject, null, "SUBMITTED", b.start, b.sub, b.used, b.correctCount, b.band, b.sheet, b.start);
      }
    }
  });
  tx();

  const nRec = db.prepare("SELECT COUNT(*) n FROM exam_records").get().n;
  const nSes = db.prepare("SELECT COUNT(*) n FROM exam_sessions").get().n;
  console.log(`完成:exam_sessions=${nSes} exam_records=${nRec}(备份于 data/app.db.bak-demoseed-*)`);
}

main();
