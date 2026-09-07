/**
 * src/lib/dashboard.ts — 仪表盘成绩分析数据聚合(P6)
 *
 * 纯读侧:全部从既有 exam_sessions / exam_records / papers 聚合,无新表。
 * 目标分通过可空入参传入(P7 计划表建好后由 ACTIVE 计划提供;现恒为 null,
 * 曲线不出目标线、薄弱清单按 6.0 兜底判定)。
 *
 * 口径(P6.1 修订):
 * - 总分曲线数据点 = COMPLETED 完整套卷场次按 finishedAt 升序;同场次各科取
 *   最新一条已交卷记录的 band(与 computeSessionOverall 同一「按科目取最新」原则)
 * - 单科曲线 = 场次内该科成绩 + 单科散考交卷记录一并统计(每次交卷都是一个点,
 *   kind 区分 full/single,前端实线/虚线区分渲染)
 * - 雷达 = 各科最近成绩 vs 该科全部交卷记录均值(含散考;口语无数据不出维度)
 * - 薄弱清单 = 卷×科目粒度:该卷该科「最近一次 band」< 目标 − 0.5 → 列入
 */
import { and, desc, eq, isNotNull, isNull, or } from "drizzle-orm";
import { getDb } from "@/db";
import {
  examRecords,
  examSessions,
  examSets,
  papers,
  type Subject,
} from "@/db/schema";

/** 曲线/雷达可用的科目(口语无真题,不出维度) */
export const CHART_SUBJECTS = ["listening", "reading", "writing"] as const;
export type ChartSubject = (typeof CHART_SUBJECTS)[number];

export const SUBJECT_LABEL: Record<string, string> = {
  listening: "听力",
  reading: "阅读",
  writing: "写作",
  speaking: "口语",
};

/** 曲线一个数据点 */
export interface CurvePoint {
  /** 完整场次点为 sessionId;散考点为 null */
  sessionId: string | null;
  /** 散考点对应单科卷 examId;完整场次点 null */
  examId: string | null;
  /** 时间轴标签(M/D) */
  label: string;
  finishedAtMs: number;
  /** 仅完整场次有值;散考 null */
  overall: number | null;
  listening: number | null;
  reading: number | null;
  writing: number | null;
  /** tooltip 用:套卷名/单科卷名 */
  setTitle: string;
  /** full=完整套卷场次点;single=单科散考点 */
  kind: "full" | "single";
}

/** 薄弱清单一项(卷 × 科目) */
export interface WeakItem {
  examId: string;
  paperTitle: string;
  subject: Subject;
  /** 最近一次 band */
  latestBand: number;
  /** 已做次数 */
  attempts: number;
  /** 用于判定的目标分 */
  target: number;
  /** 目标差距(目标 − 最近,越大越靠前) */
  gap: number;
}

export interface DashboardData {
  /** ① 能力总览 */
  overview: {
    /** 最近一场总分;无场次 null */
    latestOverall: number | null;
    latestSessionId: string | null;
    /** 最近一场各科 band(缺科 null) */
    latestSubjects: Partial<Record<ChartSubject, number>>;
    /** 总分趋势 vs 上一场(±band,场次不足 2 场 null) */
    trend: number | null;
    /** 目标总分(P7 接线,现恒 null) */
    targetOverall: number | null;
    /** 累计完成场次 / 本周完成场次 / 累计总用时(秒) */
    totalSessions: number;
    weekSessions: number;
    totalUsedSec: number;
  };
  /** ② 分数曲线(升序;full=完整场次点,single=单科散考点) */
  curve: CurvePoint[];
  /** ③ 雷达:各科最近成绩 vs 该科全部交卷均值(含散考) */
  radar: {
    items: { subject: ChartSubject; latest: number; avg: number }[];
    /** 参与均值统计的记录总数(场次内成绩 + 散考) */
    sampleCount: number;
  };
  /** ④ 薄弱真题清单 */
  weakItems: WeakItem[];
  /** 判定用的目标总分(传入或 6.0 兜底),供 UI 显示口径说明 */
  effectiveTarget: number;
}

interface SessionRows {
  sessionId: string;
  finishedAtMs: number;
  overall: number;
  setTitle: string;
  subjects: Map<Subject, number>;
}

/**
 * 取全部 COMPLETED 场次,并按「科目取最新记录」补齐三科 band。
 * 集中一次查询,避免 N+1。
 */
function loadCompletedSessions(): SessionRows[] {
  const db = getDb();
  const sessions = db
    .select({
      sessionId: examSessions.sessionId,
      finishedAt: examSessions.finishedAt,
      startedAt: examSessions.startedAt,
      overallBand: examSessions.overallBand,
      setTitle: examSets.title,
    })
    .from(examSessions)
    .leftJoin(examSets, eq(examSets.examSetId, examSessions.examSetId))
    .where(eq(examSessions.status, "COMPLETED"))
    .orderBy(desc(examSessions.startedAt))
    .all();
  if (!sessions.length) return [];

  const ids = sessions.map((s) => s.sessionId);
  // 场次下已交卷记录(带 band 的才有意义;写作批改后 band 必有)
  const bandExpr = isNotNull(examRecords.bandScore);
  const inExpr = or(
    ...ids.map((id) => eq(examRecords.sessionId, id)),
  );
  const rows = db
    .select({
      sessionId: examRecords.sessionId,
      subject: examRecords.subject,
      bandScore: examRecords.bandScore,
      submittedAt: examRecords.submittedAt,
    })
    .from(examRecords)
    .where(and(bandExpr, inExpr))
    .all();

  // 按「科目取最新一条」归并
  const subjectMaps = new Map<string, Map<Subject, number>>();
  const latestTs = new Map<string, Map<Subject, number>>();
  for (const r of rows) {
    if (r.bandScore == null || !r.sessionId) continue;
    let m = subjectMaps.get(r.sessionId);
    if (!m) {
      m = new Map();
      subjectMaps.set(r.sessionId, m);
      latestTs.set(r.sessionId, new Map());
    }
    const ts = r.submittedAt?.getTime() ?? 0;
    const prev = latestTs.get(r.sessionId)!.get(r.subject);
    if (prev == null || ts > prev) {
      latestTs.get(r.sessionId)!.set(r.subject, ts);
      m.set(r.subject, r.bandScore);
    }
  }

  return sessions.map((s) => ({
    sessionId: s.sessionId,
    finishedAtMs: (s.finishedAt ?? s.startedAt).getTime(),
    overall: s.overallBand ?? 0,
    setTitle: s.setTitle ?? s.sessionId,
    subjects: subjectMaps.get(s.sessionId) ?? new Map(),
  }));
}

/**
 * 取全部单科散考交卷记录(session_id 为空,即未走完整套卷流程的单科练习)。
 * 与场次内成绩一起构成单科曲线/雷达的数据源。
 */
function loadStandaloneRecords(): {
  examId: string;
  subject: Subject;
  bandScore: number;
  submittedAtMs: number;
  title: string;
}[] {
  const db = getDb();
  const rows = db
    .select({
      examId: examRecords.examId,
      subject: examRecords.subject,
      bandScore: examRecords.bandScore,
      submittedAt: examRecords.submittedAt,
      title: papers.title,
    })
    .from(examRecords)
    .leftJoin(papers, eq(papers.examId, examRecords.examId))
    .where(
      and(
        isNull(examRecords.sessionId),
        isNotNull(examRecords.bandScore),
        or(eq(examRecords.status, "SUBMITTED"), eq(examRecords.status, "COMPLETED")),
      ),
    )
    .orderBy(desc(examRecords.submittedAt))
    .all();
  return rows.map((r) => ({
    examId: r.examId,
    subject: r.subject,
    bandScore: r.bandScore as number,
    submittedAtMs: r.submittedAt?.getTime() ?? 0,
    title: r.title ?? r.examId,
  }));
}

const pad = (n: number) => String(n).padStart(2, "0");

/** 组装仪表盘全部数据。targetOverall 来自 ACTIVE 备考计划(P7),可空。 */
export function getDashboardData(targetOverall: number | null = null): DashboardData {
  const sessions = loadCompletedSessions();
  const standalones = loadStandaloneRecords();
  const now = Date.now();
  const weekAgo = now - 7 * 86400_000;

  // 全部交卷记录统计(含单科随缘练习)
  const db = getDb();
  const allSubmitted = db
    .select({
      usedSec: examRecords.usedSec,
      startedAt: examRecords.startedAt,
      submittedAt: examRecords.submittedAt,
    })
    .from(examRecords)
    .where(or(eq(examRecords.status, "SUBMITTED"), eq(examRecords.status, "COMPLETED")))
    .all();
  const totalUsedSec = allSubmitted.reduce((a, r) => a + (r.usedSec ?? 0), 0);
  const weekSessions = sessions.filter((s) => s.finishedAtMs >= weekAgo).length;

  // ① 总览
  const latest = sessions[0]; // startedAt 降序,首个即最近
  const prev = sessions[1];
  const latestSubjects: Partial<Record<ChartSubject, number>> = {};
  if (latest) {
    for (const s of CHART_SUBJECTS) {
      const v = latest.subjects.get(s);
      if (v != null) latestSubjects[s] = v;
    }
  }

  // ② 曲线(按时间升序)。总分维度只认完整场次点;单科维度两类点都画。
  const fullPoints: CurvePoint[] = [...sessions]
    .sort((a, b) => a.finishedAtMs - b.finishedAtMs)
    .map((s) => {
      const d = new Date(s.finishedAtMs);
      return {
        sessionId: s.sessionId,
        examId: null,
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        finishedAtMs: s.finishedAtMs,
        overall: s.overall,
        listening: s.subjects.get("listening") ?? null,
        reading: s.subjects.get("reading") ?? null,
        writing: s.subjects.get("writing") ?? null,
        setTitle: s.setTitle,
        kind: "full" as const,
      };
    });
  const singlePoints: CurvePoint[] = standalones
    .map((r) => {
      const d = new Date(r.submittedAtMs);
      return {
        sessionId: null,
        examId: r.examId,
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        finishedAtMs: r.submittedAtMs,
        overall: null,
        listening: r.subject === "listening" ? r.bandScore : null,
        reading: r.subject === "reading" ? r.bandScore : null,
        writing: r.subject === "writing" ? r.bandScore : null,
        setTitle: r.title,
        kind: "single" as const,
      };
    })
    .sort((a, b) => a.finishedAtMs - b.finishedAtMs);
  const curve: CurvePoint[] = [...fullPoints, ...singlePoints].sort(
    (a, b) => a.finishedAtMs - b.finishedAtMs,
  );

  // ③ 雷达:各科最近成绩 vs 该科全部交卷均值(场次内成绩 + 散考一并统计)。
  // 最近成绩 = 场次与散考合并后该科时间最新的 band;均值同样跨两类记录。
  const bandTimeSeries = new Map<ChartSubject, { band: number; ts: number }[]>();
  for (const p of fullPoints) {
    for (const s of CHART_SUBJECTS) {
      const v = p[s];
      if (v == null) continue;
      if (!bandTimeSeries.has(s)) bandTimeSeries.set(s, []);
      bandTimeSeries.get(s)!.push({ band: v, ts: p.finishedAtMs });
    }
  }
  for (const p of singlePoints) {
    for (const s of CHART_SUBJECTS) {
      const v = p[s];
      if (v == null) continue;
      if (!bandTimeSeries.has(s)) bandTimeSeries.set(s, []);
      bandTimeSeries.get(s)!.push({ band: v, ts: p.finishedAtMs });
    }
  }
  const radarItems: DashboardData["radar"]["items"] = [];
  let radarSampleCount = 0;
  for (const s of CHART_SUBJECTS) {
    const series = bandTimeSeries.get(s) ?? [];
    if (!series.length) continue;
    radarSampleCount += series.length;
    const latestVal = series.reduce((a, b) => (b.ts >= a.ts ? b : a)).band;
    const avg =
      Math.round((series.reduce((a, b) => a + b.band, 0) / series.length) * 10) / 10;
    radarItems.push({ subject: s, latest: latestVal, avg });
  }
  radarItems.sort((a, b) => a.subject.localeCompare(b.subject));

  // ④ 薄弱清单(卷×科目:最近一次 band < 目标−0.5;仅已交卷且有 band 的记录)
  const effectiveTarget = targetOverall ?? 6.0;
  const threshold = effectiveTarget - 0.5;
  const weakRows = db
    .select({
      examId: examRecords.examId,
      subject: examRecords.subject,
      bandScore: examRecords.bandScore,
      submittedAt: examRecords.submittedAt,
      paperTitle: papers.title,
    })
    .from(examRecords)
    .leftJoin(papers, eq(papers.examId, examRecords.examId))
    .where(
      and(
        isNotNull(examRecords.bandScore),
        or(eq(examRecords.status, "SUBMITTED"), eq(examRecords.status, "COMPLETED")),
      ),
    )
    .all();

  interface Agg {
    title: string;
    latestBand: number;
    latestTs: number;
    attempts: number;
  }
  const agg = new Map<string, Agg>();
  for (const r of weakRows) {
    if (r.bandScore == null) continue;
    const key = `${r.examId}::${r.subject}`;
    const ts = r.submittedAt?.getTime() ?? 0;
    let a = agg.get(key);
    if (!a) {
      a = {
        title: r.paperTitle ?? r.examId,
        latestBand: r.bandScore,
        latestTs: ts,
        attempts: 0,
      };
      agg.set(key, a);
    }
    a.attempts += 1;
    if (ts > a.latestTs) {
      a.latestTs = ts;
      a.latestBand = r.bandScore;
    }
  }
  const weakItems: WeakItem[] = [];
  for (const [key, a] of agg) {
    if (a.latestBand >= threshold) continue;
    const [examId, subject] = [key.slice(0, key.indexOf("::")), key.slice(key.indexOf("::") + 2)];
    weakItems.push({
      examId,
      subject: subject as Subject,
      paperTitle: a.title,
      latestBand: a.latestBand,
      attempts: a.attempts,
      target: effectiveTarget,
      gap: Math.round((effectiveTarget - a.latestBand) * 10) / 10,
    });
  }
  weakItems.sort((a, b) => b.gap - a.gap);

  return {
    overview: {
      latestOverall: latest?.overall ?? null,
      latestSessionId: latest?.sessionId ?? null,
      latestSubjects,
      trend:
        latest && prev ? Math.round((latest.overall - prev.overall) * 10) / 10 : null,
      targetOverall,
      totalSessions: sessions.length,
      weekSessions,
      totalUsedSec,
    },
    curve,
    radar: { items: radarItems, sampleCount: radarSampleCount },
    weakItems,
    effectiveTarget,
  };
}

export { pad };
