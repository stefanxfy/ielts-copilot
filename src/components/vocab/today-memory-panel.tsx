"use client";

/**
 * TodayMemoryPanel — 今日单词记忆轨迹面板(共享组件)
 *
 * 同一份内容在三种宿主里复用(用户约束:不跳新页面、不与当前页割裂):
 *   1. /learn 复习页右侧抽屉(默认态,可放大到页面级覆盖层);
 *   2. /learn 复习完成页中央弹窗(默认态,可放大);
 *   3. /learn/today 独立页(整页版式)。
 *
 * 内容:顶部一行统计(已记住/模糊/不认识/待复习)+ 轨迹词列表(仅今日学过的词,
 * 按下次到期升序、已到期同组最难在前——服务端排好序),每词可展开遗忘曲线
 * 时间线(S/D 演变)。
 */
import { useCallback, useEffect, useState } from "react";

/* ---------------- 类型(对齐 /api/vocab-memory) ---------------- */

export interface TrailPoint {
  t: number;
  rating: number;
  stage: string;
  gapMs: number | null;
  nextDue: number;
  state: number;
  stability: number;
  difficulty: number;
}
export interface TodayWordItem {
  progressId: number;
  wordId: number;
  word: string;
  phoneticUk: string | null;
  reps: number;
  lapses: number;
  due: number;
  state: number;
  stateName: string;
  stability: number;
  difficulty: number;
  difficultyLabel: string;
  todayCount: number;
  lastRating: 1 | 2 | 3 | null;
  trail: TrailPoint[];
}
export interface TodayMemory {
  date: string;
  now: number;
  stats: {
    remembered: number;
    fuzzy: number;
    forgot: number;
    dueNow: number;
    todayReviewed: number;
  };
  words: TodayWordItem[];
}

/* ---------------- 工具 ---------------- */

const RATING_META: Record<number, { label: string; cls: string }> = {
  1: { label: "不认识", cls: "tmr-again" },
  2: { label: "模糊", cls: "tmr-hard" },
  3: { label: "认识", cls: "tmr-good" },
};
const STATE_NAME = ["新词", "学习中", "复习中", "重学中"] as const;
const DIFF_LABEL = (d: number) =>
  !d || d <= 0 ? "未定级" : d >= 8 ? "很难" : d >= 6.5 ? "偏难" : d >= 4 ? "中等" : d >= 2.5 ? "偏易" : "容易";

function fmtDue(due: number, now: number): string {
  const diff = due - now;
  if (diff <= 0) return "已到期";
  const m = Math.round(diff / 60000);
  if (m < 1) return "不到 1 分钟";
  if (m < 60) return `${m} 分钟后`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时 ${m % 60} 分后`;
  const day = new Date(due);
  return `${day.getMonth() + 1}/${day.getDate()} 到期`;
}
function fmtGap(ms: number): string {
  const m = Math.round(ms / 60000);
  if (m < 1) return "刚刚";
  if (m < 60) return `${m} 分钟`;
  if (m < 1440) return `${(m / 60).toFixed(1)} 小时`;
  return `${(m / 1440).toFixed(1)} 天`;
}
function fmtTime(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

/* ---------------- 统计行 ---------------- */

function StatsRow({ stats, now }: { stats: TodayMemory["stats"]; now: number }) {
  const cells = [
    { label: "已记住", n: stats.remembered, cls: "tms-good" },
    { label: "模糊", n: stats.fuzzy, cls: "tms-hard" },
    { label: "不认识", n: stats.forgot, cls: "tms-again" },
    { label: "待复习", n: stats.dueNow, cls: "tms-due" },
  ];
  return (
    <div className="tm-stats">
      {cells.map((c) => (
        <div key={c.label} className={`tm-stat ${c.cls}`}>
          <b>{c.n}</b>
          <span>{c.label}</span>
        </div>
      ))}
      <div className="tm-stat tm-stat-wide">
        <b>{stats.todayReviewed}</b>
        <span>今日评分 · {fmtTime(now)} 更新</span>
      </div>
    </div>
  );
}

/* ---------------- 遗忘曲线时间线 ---------------- */

function TrailTimeline({ item, now }: { item: TodayWordItem; now: number }) {
  const trail = item.trail;
  if (!trail || trail.length === 0) {
    return (
      <div className="tm-trail-empty">
        今天还没背过这个词——它在计划里,到期后会出现在复习队列。
      </div>
    );
  }
  const d0 = trail[0].difficulty;
  const d1 = trail[trail.length - 1].difficulty;
  const diffDelta = Math.round((d1 - d0) * 100) / 100;
  return (
    <div className="tm-trail">
      <div className="tm-trail-note">
        记忆状态 {STATE_NAME[trail[trail.length - 1].state] ?? "—"} ·
        难度 D {d0 || "—"} → {d1 || "—"}
        {trail.length > 1 && (
          <b className={diffDelta > 0 ? "tm-diff-up" : "tm-diff-down"}>
            {diffDelta > 0 ? ` ↑${diffDelta}` : ` ↓${-diffDelta}`}
          </b>
        )}
        {" "}· 稳定度 S {trail[trail.length - 1].stability} · 下次 {fmtDue(trail[trail.length - 1].nextDue, now)}
      </div>
      <ol className="tm-trail-list">
        {trail.map((p, i) => {
          const meta = RATING_META[p.rating];
          return (
            <li key={i} className="tm-trail-item">
              <span className={`tm-dot ${meta.cls}`} />
              <span className="tm-trail-time">{fmtTime(p.t)}</span>
              <span className={`tm-trail-rating ${meta.cls}`}>{meta.label}</span>
              <span className="tm-trail-gap">{i === 0 ? "首次学习" : `距上次 ${fmtGap(p.gapMs!)}`}</span>
              <span className="tm-trail-next">→ {fmtGap(p.nextDue - p.t)}后到期</span>
              <span className="tm-trail-sd">
                D {p.difficulty} · S {p.stability}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ---------------- 词行(可展开) ---------------- */

function WordRow({ item, now }: { item: TodayWordItem; now: number }) {
  const [open, setOpen] = useState(false);
  const last = item.lastRating != null ? RATING_META[item.lastRating] : null;
  return (
    <li className="tm-word">
      <button
        type="button"
        className="tm-word-row"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={`tm-caret${open ? " tm-caret-open" : ""}`} aria-hidden="true">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </span>
        <span className="tm-word-name">
          {item.word}
          {item.phoneticUk && <i className="tm-phon">{item.phoneticUk}</i>}
        </span>
        <span className="tm-word-badges">
          {last ? (
            <span className={`tm-badge ${last.cls}`}>{last.label}</span>
          ) : (
            <span className="tm-badge tm-badge-dim">今日未学</span>
          )}
          {item.reps > 0 ? (
            <span className="tm-badge tm-badge-dim" title={`累计答题 ${item.reps} 次 · 答错 ${item.lapses} 次`}>
              {DIFF_LABEL(item.difficulty)} · {item.difficulty}
            </span>
          ) : (
            <span className="tm-badge tm-badge-dim">新词</span>
          )}
        </span>
        <span className="tm-word-due">{fmtDue(item.due, now)}</span>
      </button>
      {open && <TrailTimeline item={item} now={now} />}
    </li>
  );
}

/* ---------------- 主面板 ---------------- */

export default function TodayMemoryPanel(props: {
  /** 外部已拉好的数据;组件不自持请求——由宿主控制刷新时机 */
  data: TodayMemory | null;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}) {
  const { data, loading, error, onRefresh } = props;
  if (error) {
    return <div className="tm-panel"><div className="tm-error">加载失败:{error}</div></div>;
  }
  if (!data) {
    return (
      <div className="tm-panel">
        <div className="tm-loading">{loading === false ? "暂无数据" : "加载中…"}</div>
      </div>
    );
  }
  return (
    <div className="tm-panel">
      <StatsRow stats={data.stats} now={data.now} />
      {data.words.length === 0 ? (
        <div className="tm-loading">今天还没有学习记录——先去复习几个词吧。</div>
      ) : (
        <ul className="tm-list">
          {data.words.map((w) => (
            <WordRow key={w.progressId} item={w} now={data.now} />
          ))}
        </ul>
      )}
      {onRefresh && (
        <div className="tm-footer">
          <button type="button" className="tm-refresh" onClick={onRefresh}>
            {loading ? "刷新中…" : "刷新数据"}
          </button>
        </div>
      )}
    </div>
  );
}

/** 拉今日记忆数据的钩子(宿主共用;avoidEffect 依赖抖动:仅在 open 翻转时拉取) */
export function useTodayMemory(open: boolean) {
  const [data, setData] = useState<TodayMemory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/vocab-memory");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setData((await r.json()) as TodayMemory);
    } catch (e) {
      setError(e instanceof Error ? e.message : "网络错误");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    // async IIFE:effect 体内不同步 setState,规避 set-state-in-effect
    void (async () => {
      await load();
    })();
  }, [open, load]);

  return { data, loading, error, reload: load };
}
