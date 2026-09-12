"use client";

/**
 * /writing — 写作仿真编辑器(W1,docs/写作仿真数据模型与交互设计.md v1.1)
 *
 * 仿真三无:无拼写检查红线、无自动纠正/联想、无词数封顶——机考就是一块白板。
 * 进入默认 A 类 Task 2 随机抽题(未练优先);交卷才入库,刷新即弃(与真机考一致)。
 * 倒计时提示制:到点红字继续计超时,不强制收卷(2026-09-12 定案)。
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { TASK2_MAX_WORDS, countParagraphs, countWords } from "@/lib/writing/text";
import type { AiGrading } from "@/db/schema";
import "./writing.css";

interface PromptItem {
  promptId: string;
  taskNo: number;
  category: string;
  promptText: string;
  minWords: number;
  timeSuggest: number;
  imageUrl: string | null;
  sourceRefJson: { examId: string; paperTitle?: string };
  practiced: number;
  lastWords: number | null;
}

interface SubmitResult {
  wordCount: number;
  reachedMin: boolean;
  durSec: number;
  paras: number;
  overtimeSec: number;
}

/** W2 历史流水(列表项,不含正文;aiBand=批改完成的综合分,W4) */
interface HistItem {
  id: number;
  promptId: string;
  wordCount: number;
  durationSec: number;
  speed: number;
  reachedMin: boolean;
  finishedAt: number | null;
  aiBand: number | null;
  promptText: string;
  minWords: number;
  taskNo: number;
}

/** W2 单条回看(含正文与批改结果) */
interface FullSess extends HistItem {
  content: string;
  timeSuggest: number;
  sourceRefJson: { examId: string; paperTitle?: string };
  /** W4 批改结果(未批改为 null) */
  ai?: AiGrading | null;
}

const DIM_SHORT: Record<string, string> = { TR: "任务回应", CC: "连贯衔接", LR: "词汇", GRA: "语法" };
const ISSUE_LABEL: Record<string, string> = {
  grammar: "语法",
  vocabulary: "词汇",
  cohesion: "衔接",
  task: "任务回应",
  other: "其他",
};

/** W4 批改结果渲染(交卷统计卡与历史回看共用) */
function ReviewBlock({ ai, onRetry, retrying }: { ai: AiGrading; onRetry?: () => void; retrying?: boolean }) {
  if (ai.status === "RUNNING") {
    return <div className="airev-loading">⏳ AI 批改进行中,完成后自动显示(通常 10–60 秒)…</div>;
  }
  if (ai.status === "FAILED") {
    return (
      <div className="airev-err">
        批改失败:{ai.error ?? "原因未知"}
        {onRetry && (
          <button type="button" className="btn" disabled={retrying} onClick={onRetry}>
            {retrying ? "提交中…" : "重试"}
          </button>
        )}
      </div>
    );
  }
  if (ai.status !== "DONE" || !ai.dimensions) return null;
  return (
    <div className="airev">
      <div className="ahead">
        <span className="aband">AI 评分 Band {ai.overall?.toFixed(1) ?? "?"}</span>
        <span className="ameta">
          {ai.wordCount ? `${ai.wordCount} 词 · ` : ""}
          {ai.model ?? ""}
          {ai.tokens ? ` · ${ai.tokens} tokens` : ""}
          {ai.retryCount ? ` · 重试 ${ai.retryCount} 次` : ""}
        </span>
      </div>
      <div className="adims">
        {ai.dimensions.map((d) => (
          <div key={d.name} className="adim">
            <div className="adim-h">
              <b>
                {d.name}
                <span> {DIM_SHORT[d.name] ?? ""}</span>
              </b>
              <em>{d.band.toFixed(1)}</em>
            </div>
            {d.comment && <p>{d.comment}</p>}
            {d.evidence.length > 0 && (
              <ul>
                {d.evidence.map((ev, i) => (
                  <li key={i}>“{ev}”</li>
                ))}
              </ul>
            )}
            {d.improvement && <div className="aimp">建议:{d.improvement}</div>}
          </div>
        ))}
      </div>
      {(ai.strengths?.length ?? 0) + (ai.weaknesses?.length ?? 0) > 0 && (
        <div className="asw">
          {ai.strengths?.length ? (
            <div className="asw-col">
              <b className="ok">亮点</b>
              <ul>
                {ai.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {ai.weaknesses?.length ? (
            <div className="asw-col">
              <b className="warn">不足</b>
              <ul>
                {ai.weaknesses.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
      {(ai.flaggedIssues?.length ?? 0) > 0 && (
        <div className="aflags">
          <b>问题标注({ai.flaggedIssues!.length})</b>
          {ai.flaggedIssues!.map((f, i) => (
            <div key={i} className="afitem">
              <span className="aftag">{ISSUE_LABEL[f.type] ?? f.type}</span>
              {f.quote && <s>{f.quote}</s>}
              {f.quote && f.suggestion && <span className="afarr">→</span>}
              {f.suggestion && <span className="afix">{f.suggestion}</span>}
            </div>
          ))}
        </div>
      )}
      {ai.rewrittenSample && (
        <details className="asample">
          <summary>查看同题高分改写范文</summary>
          <pre>{ai.rewrittenSample}</pre>
        </details>
      )}
    </div>
  );
}

const fmtClock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

const fmtDate = (ts: number | null) => {
  if (!ts) return "—";
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

/** W2 趋势图:输出速度(词/分)按练习时间正序,纸感 SVG 柱状 */
function TrendChart({ items, avgSpeed }: { items: HistItem[]; avgSpeed: number }) {
  if (items.length < 2) return null;
  const W = 640;
  const H = 150;
  const PAD = { l: 34, r: 8, t: 10, b: 20 };
  const cw = (W - PAD.l - PAD.r) / items.length;
  const maxV = Math.max(avgSpeed, ...items.map((s) => s.speed), 40) * 1.15;
  const y = (v: number) => PAD.t + (H - PAD.t - PAD.b) * (1 - v / maxV);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="trend">
      {[0, Math.round(maxV / 2), Math.round(maxV)].map((v) => (
        <g key={v}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="var(--wline)" strokeWidth="1" />
          <text x={PAD.l - 5} y={y(v) + 3.5} textAnchor="end" fontSize="9" fill="var(--wink3)">
            {v}
          </text>
        </g>
      ))}
      {avgSpeed > 0 && (
        <line
          x1={PAD.l}
          x2={W - PAD.r}
          y1={y(avgSpeed)}
          y2={y(avgSpeed)}
          stroke="var(--wamber)"
          strokeWidth="1"
          strokeDasharray="4 3"
        />
      )}
      {items.map((s, i) => {
        const x = PAD.l + i * cw + cw * 0.18;
        const w = cw * 0.64;
        const d = s.finishedAt ? new Date(s.finishedAt) : null;
        const lab = d ? `${d.getMonth() + 1}/${d.getDate()}` : "";
        return (
          <g key={s.id}>
            <rect
              x={x}
              y={y(s.speed)}
              width={w}
              height={H - PAD.b - y(s.speed)}
              rx="2.5"
              fill={s.reachedMin ? "var(--waccent)" : "var(--wamber)"}
              opacity="0.9"
            >
              <title>{`${fmtDate(s.finishedAt)} · ${s.speed} 词/分 · ${s.wordCount} 词${s.reachedMin ? "" : " · 未达标"}`}</title>
            </rect>
            {(items.length <= 12 || i % Math.ceil(items.length / 12) === 0) && (
              <text x={x + w / 2} y={H - 6} textAnchor="middle" fontSize="9" fill="var(--wink3)">
                {lab}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function WritingPage() {
  const [list, setList] = useState<PromptItem[]>([]);
  const [curId, setCurId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  /* W2 历史区状态 */
  const [hist, setHist] = useState<HistItem[]>([]);
  const [histSum, setHistSum] = useState<{ total: number; totalWords: number; avgSpeed: number; reachedCount: number } | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [viewData, setViewData] = useState<FullSess | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  /* W3 任务类型(A 类 Task 2 议论文 / Task 1 图表) */
  const [taskNo, setTaskNo] = useState(1);

  /* W4 AI 批改状态 */
  const [lastSessionId, setLastSessionId] = useState<number | null>(null);
  const [reviewAi, setReviewAi] = useState<AiGrading | null>(null);
  const [reviewTriggering, setReviewTriggering] = useState(false);
  const reviewTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const toastRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<number | null>(null);
  const rvRef = useRef<HTMLDivElement>(null);
  const edRef = useRef<HTMLTextAreaElement>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cur = list.find((p) => p.promptId === curId) ?? null;

  const toast = useCallback((msg: string) => {
    const t = toastRef.current;
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => t.classList.remove("show"), 2200);
  }, []);

  const stopTimer = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const loadPrompts = useCallback(
    (keepId?: string | null, tn = 1) => {
      return fetch(`/api/writing/prompts?taskNo=${tn}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d: { current: PromptItem; list: PromptItem[] }) => {
          setList(d.list);
          setCurId((prev) => keepId ?? prev ?? d.current.promptId);
        })
        .catch(() => toast("题库加载失败,请刷新重试"));
    },
    [toast],
  );

  /** W3 切换任务类型:换题库 + 清空编辑器(切任务等于换题) */
  const switchTask = (tn: number) => {
    if (tn === taskNo) return;
    stopTimer();
    setTaskNo(tn);
    setText("");
    setStartedAt(null);
    setResult(null);
    setLastSessionId(null);
    setReviewAi(null);
    setCurId(null);
    setLoading(true);
    void loadPrompts(null, tn).finally(() => setLoading(false));
  };

  /* ---------- W4 AI 批改 ---------- */
  const stopReviewPoll = useCallback(() => {
    if (reviewTimerRef.current) {
      clearInterval(reviewTimerRef.current);
      reviewTimerRef.current = null;
    }
  }, []);

  const pollReview = useCallback((sessionId: number) => {
    stopReviewPoll();
    reviewTimerRef.current = setInterval(() => {
      fetch(`/api/writing/review?sessionId=${sessionId}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { ai: AiGrading | null } | null) => {
          if (!d) return;
          setReviewAi(d.ai);
          if (d.ai?.status === "DONE" || d.ai?.status === "FAILED") stopReviewPoll();
        })
        .catch(() => {});
    }, 4000);
  }, [stopReviewPoll]);

  /** 触发 AI 批改(交卷统计卡内);已在跑时 POST 幂等 */
  const triggerReview = (force = false) => {
    if (!lastSessionId || reviewTriggering) return;
    setReviewTriggering(true);
    fetch("/api/writing/review", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId: lastSessionId, force }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => null))?.error ?? `HTTP ${r.status}`);
        return r.json();
      })
      .then(() => {
        setReviewAi((prev) =>
          prev?.status === "DONE" && !force ? prev : { status: "RUNNING", retryCount: 0 },
        );
        pollReview(lastSessionId);
      })
      .catch((e: Error) => toast(`批改触发失败:${e.message}`))
      .finally(() => setReviewTriggering(false));
  };

  useEffect(() => stopReviewPoll, [stopReviewPoll]);

  /* ---------- W2 历史区 ---------- */
  const loadHistory = useCallback(() => {
    return fetch("/api/writing/sessions", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { summary: { total: number; totalWords: number; avgSpeed: number; reachedCount: number }; list: HistItem[] } | null) => {
        if (!d) return;
        setHist(d.list);
        setHistSum(d.summary);
        // 回看中的记录若已被删(理论不会),顺手收起
        setOpenId((oid) => (oid && d.list.some((s) => s.id === oid) ? oid : null));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    void loadPrompts().finally(() => setLoading(false));
    void loadHistory();
    return stopTimer;
  }, [loadPrompts, loadHistory, stopTimer]);

  /** 点历史行:展开回看(按需拉正文),再点收起 */
  const toggleReview = (id: number) => {
    if (openId === id) {
      setOpenId(null);
      setViewData(null);
      return;
    }
    setOpenId(id);
    setViewData(null);
    setViewLoading(true);
    fetch(`/api/writing/sessions?id=${id}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: { session: FullSess }) => setViewData(d.session))
      .catch(() => {
        setOpenId(null);
        toast("回看加载失败,请重试");
      })
      .finally(() => setViewLoading(false));
  };

  /* 首键起算,500ms 心跳刷新倒计时/速度 */
  const onEdit = (v: string) => {
    if (result) return;
    setText(v);
    if (!startedAt && v.trim()) {
      const t0 = Date.now();
      setStartedAt(t0);
      stopTimer();
      tickRef.current = setInterval(() => setNow(Date.now()), 500);
    }
  };

  const resetPrompt = (id: string = curId ?? "") => {
    stopTimer();
    stopReviewPoll();
    setText("");
    setStartedAt(null);
    setResult(null);
    setLastSessionId(null);
    setReviewAi(null);
    setCurId(id);
    setTimeout(() => edRef.current?.focus(), 60);
  };

  /** 换一题:未练过的优先,避开当前题 */
  const randomPick = () => {
    const pool = list.filter((p) => !p.practiced && p.promptId !== curId);
    const fallback = list.filter((p) => p.promptId !== curId);
    const arr = pool.length ? pool : fallback;
    if (!arr.length) return;
    resetPrompt(arr[Math.floor(Math.random() * arr.length)].promptId);
    toast("已换题,直接开写");
  };

  const submit = () => {
    if (!cur || result || submitting) return;
    if (!text.trim()) {
      toast("还没写内容——先写再交卷");
      return;
    }
    const durSec = startedAt ? Math.max(1, Math.round((Date.now() - startedAt) / 1000)) : 1;
    setSubmitting(true);
    fetch("/api/writing/sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ promptId: cur.promptId, durationSec: durSec, content: text }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => null))?.error ?? `HTTP ${r.status}`);
        return r.json();
      })
      .then((d: { sessionId: number; wordCount: number; reachedMin: boolean }) => {
        stopTimer();
        setLastSessionId(d.sessionId);
        setReviewAi(null);
        setResult({
          wordCount: d.wordCount,
          reachedMin: d.reachedMin,
          durSec,
          paras: countParagraphs(text),
          overtimeSec: startedAt ? Math.max(0, Math.round((Date.now() - startedAt - cur.timeSuggest * 60_000) / 1000)) : 0,
        });
        toast(`已交卷 · ${d.wordCount} 词`);
        // 刷新清单排序/练过标记(保留当前题展示) + 刷新历史区
        void loadPrompts(cur.promptId);
        void loadHistory();
        setTimeout(() => rvRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 80);
      })
      .catch((e: Error) => toast(`交卷失败:${e.message}`))
      .finally(() => setSubmitting(false));
  };

  /* ---------- 渲染 ---------- */
  const words = countWords(text);
  const paras = countParagraphs(text);
  const elapsedMs = startedAt && now ? Math.max(0, now - startedAt) : 0;
  const remainMs = cur ? cur.timeSuggest * 60_000 - elapsedMs : 0;
  const overtime = remainMs < 0;
  const speed = startedAt && elapsedMs > 8_000 ? Math.round(words / (elapsedMs / 60_000)) : 0;
  const maxWords = cur?.taskNo === 2 ? TASK2_MAX_WORDS : 180;

  let wordState = { txt: "未开始", color: "var(--wink3)" };
  if (result) wordState = { txt: "已交卷", color: "var(--waccent)" };
  else if (startedAt && cur) {
    if (words > maxWords) wordState = { txt: "写多了——考场上这是时间风险", color: "var(--wamber)" };
    else if (words >= cur.minWords) wordState = { txt: "达标", color: "var(--waccent)" };
    else wordState = { txt: "写作中", color: "var(--wink2)" };
  }

  const barRatio = cur ? Math.min(1, words / cur.minWords) : 0;
  const barColor = cur && words >= cur.minWords ? "var(--waccent)" : "var(--wink3)";

  const note = (() => {
    if (!cur || !result) return "";
    if (result.wordCount > maxWords)
      return `⚠️ 词数超出建议区间(>${maxWords} 词)——考场上超写挤占留给检查的时间,控制在 ${maxWords} 词以内更稳。`;
    if (!result.reachedMin)
      return `词数低于最低要求(${cur.minWords} 词)——考场上这会直接压低 Task Response 分档,尽量写满 ${cur.minWords} 词。`;
    return "✅ 词数达标。本环境无拼写/语法检查——考场上交卷前的检查就是你的安全网,记得留 3 分钟通读。";
  })();

  return (
    <div className="writing-root">
      <div className="phead">
        <h1>写作仿真</h1>
        <span className="meta">机考同款环境 · 无拼写检查 · 无自动纠正</span>
      </div>

      {/* 题目卡 */}
      <div className="pcard">
        {!cur || loading ? (
          <div className="ptext" style={{ color: "var(--wink3)" }}>
            题库加载中…
          </div>
        ) : (
          <>
            <div className="row1">
              <div className="seg" role="tablist">
                <button type="button" className={taskNo === 1 ? "on" : ""} onClick={() => switchTask(1)}>
                  Task 1 · 图表
                </button>
                <button type="button" className={taskNo === 2 ? "on" : ""} onClick={() => switchTask(2)}>
                  Task 2 · 议论文
                </button>
              </div>
              <span className="badge">{cur.category === "A" ? "Academic" : "General Training"}</span>
              <span className="badge plain">Task {cur.taskNo} · {cur.taskNo === 2 ? "议论文" : "图表/书信"}</span>
              <span className="badge plain">≥ {cur.minWords} 词</span>
              <span className="badge plain">建议 {cur.timeSuggest} 分钟</span>
              {cur.practiced > 0 && (
                <span className="badge done">
                  练过 {cur.practiced} 次 · 上次 {cur.lastWords ?? "?"} 词
                </span>
              )}
              <div className="swap">
                <select value={curId ?? ""} onChange={(e) => resetPrompt(e.target.value)}>
                  {list.map((p) => (
                    <option key={p.promptId} value={p.promptId}>
                      {p.sourceRefJson.paperTitle?.replace(/^A类 写作 · /, "") ?? p.sourceRefJson.examId} · Task {p.taskNo}
                      {p.practiced ? ` · 练过 ${p.practiced} 次` : ""}
                    </option>
                  ))}
                </select>
                <button type="button" className="btn main" onClick={randomPick}>
                  🎲 换一题
                </button>
              </div>
            </div>
            <div className="ptext">{cur.promptText}</div>
            {cur.imageUrl && <img className="pimg" src={cur.imageUrl} alt="Writing Task 1 chart" />}
            <div className="psrc">
              Source · {cur.sourceRefJson.paperTitle ?? cur.sourceRefJson.examId}(真题)
            </div>
          </>
        )}
      </div>

      {/* 实时条 */}
      <div className="hud">
        <div className="hcard">
          <span className="lab">
            字数<span className="state" style={{ color: wordState.color }}>{wordState.txt}</span>
          </span>
          <b>
            {words}
            <span style={{ fontSize: 13, color: "var(--wink3)" }}> / {cur?.minWords ?? 250} 词</span>
          </b>
          <div className="pbar">
            <i style={{ width: `${barRatio * 100}%`, background: barColor }} />
          </div>
        </div>
        <div className="hcard">
          <span className="lab">倒计时</span>
          <b style={{ color: overtime ? "var(--wred)" : undefined, fontSize: overtime ? 17 : 22 }}>
            {overtime ? `超时 +${fmtClock(-remainMs)}` : fmtClock(remainMs)}
          </b>
          {!startedAt && <span className="sub">首键起算</span>}
        </div>
        <div className="hcard">
          <span className="lab">段落数</span>
          <b>{paras}</b>
        </div>
        <div className="hcard">
          <span className="lab">输出速度</span>
          <b>{speed}</b>
          <span style={{ fontSize: 12, color: "var(--wink3)" }}>词/分</span>
        </div>
      </div>

      {/* 编辑器 */}
      <div className="ewrap">
        <textarea
          ref={edRef}
          className="editor"
          value={text}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          disabled={!!result || loading}
          onChange={(e) => onEdit(e.target.value)}
          placeholder="Type your essay here.."
        />
        <div className="foot">
          <span className="tip">Enter 分段 · 交卷才计数 · 刷新页面即放弃(与真机考一致)</span>
          <span className={`donetag ${result ? "show" : ""}`}>已交卷入库 ✓</span>
          <div className="btns">
            <button type="button" className="btn" onClick={() => cur && resetPrompt(cur.promptId)}>
              重置
            </button>
            <button type="button" className="btn main" onClick={submit} disabled={!!result || submitting}>
              {submitting ? "交卷中…" : "交卷"}
            </button>
          </div>
        </div>
      </div>

      {/* 统计卡(交卷后内联展开) */}
      <div ref={rvRef} className={`rvsec ${result ? "show" : ""}`}>
        <div className="panel">
          <div className="rvhead">
            <h3>练习统计</h3>
          </div>
          {result && cur && (
            <>
              <div className="cards">
                <div className={`rcard ${result.reachedMin ? "ok" : "warn"}`}>
                  <b>{result.wordCount} 词</b>
                  <span>词数</span>
                </div>
                <div className="rcard">
                  <b>{fmtClock(result.durSec * 1000)}</b>
                  <span>用时</span>
                </div>
                <div className="rcard">
                  <b>{Math.round(result.wordCount / Math.max(1, result.durSec / 60))} 词/分</b>
                  <span>输出速度</span>
                </div>
                <div className="rcard">
                  <b>{result.paras} 段</b>
                  <span>段落数</span>
                </div>
                <div className={`rcard ${result.reachedMin ? "ok" : "warn"}`}>
                  <b>{result.reachedMin ? "达标" : "未达标"}</b>
                  <span>最低 {cur.minWords} 词</span>
                </div>
              </div>
              {result.overtimeSec > 0 && (
                <div className="note" style={{ color: "var(--wred)" }}>
                  ⏱ 超时 {Math.floor(result.overtimeSec / 60)} 分 {result.overtimeSec % 60} 秒——考场上到点会自动收卷,注意压缩构思时间。
                </div>
              )}
              <div className="note">{note}</div>

              {/* W4 AI 批改(未配置 LLM 时触发会在 toast 里给出明确提示) */}
              {result && (
                <div className="aisec">
                  {!reviewAi && (
                    <div className="airow">
                      <span className="aihint">AI 按雅思官方四维标准(TR/CC/LR/GRA)批改,给出分数、逐维诊断与高分范文。</span>
                      <button type="button" className="btn main" disabled={reviewTriggering} onClick={() => triggerReview(false)}>
                        {reviewTriggering ? "提交中…" : "✨ AI 批改"}
                      </button>
                    </div>
                  )}
                  {reviewAi && <ReviewBlock ai={reviewAi} onRetry={reviewAi.status === "FAILED" ? () => triggerReview(true) : undefined} retrying={reviewTriggering} />}
                </div>
              )}

              <div className="rvbtns">
                <button type="button" className="btn" onClick={() => cur && resetPrompt(cur.promptId)}>
                  重写本题
                </button>
                <button type="button" className="btn main" onClick={randomPick}>
                  再写一篇(换题)
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* W2 练习历史:趋势 + 流水 + 正文回看 */}
      <div className="histsec">
        <div className="panel">
          <div className="rvhead hhead">
            <h3>练习历史</h3>
            {histSum && histSum.total > 0 && (
              <span className="hsum">
                共 {histSum.total} 篇 · 累计 {histSum.totalWords} 词 · 均速 {histSum.avgSpeed} 词/分 · 达标 {histSum.reachedCount}/{histSum.total}
              </span>
            )}
          </div>
          {hist.length === 0 ? (
            <div className="hempty">还没交过卷——写完一篇，这里会出现输出速度趋势和每一篇的回看。</div>
          ) : (
            <>
              <div className="trendwrap">
                <div className="tlab">
                  输出速度趋势(词/分,左旧右新){hist.length < 2 && " · 再练一篇出趋势"}
                  <span className="tlegend">
                    <i className="dot ok" /> 达标
                    <i className="dot warn" /> 未达标
                    <i className="dash" /> 均速
                  </span>
                </div>
                <TrendChart items={[...hist].reverse()} avgSpeed={histSum?.avgSpeed ?? 0} />
              </div>
              <div className="hlist">
                {hist.map((s) => (
                  <div key={s.id} className={`hrow ${openId === s.id ? "open" : ""}`} onClick={() => toggleReview(s.id)}>
                    <div className="hrow-main">
                      <span className="htime">{fmtDate(s.finishedAt)}</span>
                      <span className="htitle">{s.promptText.length > 46 ? `${s.promptText.slice(0, 46)}…` : s.promptText}</span>
                      <span className={`htag ${s.reachedMin ? "ok" : "warn"}`}>{s.reachedMin ? "达标" : "未达标"}</span>
                      {s.aiBand != null && <span className="htag band">Band {s.aiBand.toFixed(1)}</span>}
                      <span className="hstat">{s.wordCount} 词</span>
                      <span className="hstat">{fmtClock(s.durationSec * 1000)}</span>
                      <span className="hstat strong">{s.speed} 词/分</span>
                      <span className="chev">{openId === s.id ? "▾" : "▸"}</span>
                    </div>
                    {openId === s.id && (
                      <div className="hreview" onClick={(e) => e.stopPropagation()}>
                        {viewLoading || !viewData ? (
                          <div className="hloading">正文加载中…</div>
                        ) : (
                          <>
                            <div className="hprompt">{viewData.promptText}</div>
                            <div className="hcontent">{viewData.content}</div>
                            <div className="hmeta">
                              Task {viewData.taskNo} · 最低 {viewData.minWords} 词 · 建议 {viewData.timeSuggest} 分钟 · Source · {viewData.sourceRefJson.paperTitle ?? viewData.sourceRefJson.examId}
                            </div>
                            {viewData.ai && viewData.ai.status !== "PENDING" && (
                              <ReviewBlock ai={viewData.ai} />
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div ref={toastRef} className="ttoast" />
    </div>
  );
}
