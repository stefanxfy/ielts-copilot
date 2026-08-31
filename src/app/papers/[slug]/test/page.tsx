/**
 * /papers/[slug]/test — 机考页(M4 整合)
 *
 *  - READING:左栏 passage(s)+ 右栏 question,palette 侧栏
 *  - LISTENING:audio player + 单列 question
 *  - WRITING:Task1/Task2 双列 + 实时字数统计
 *  - 交卷:POST /api/papers/[slug]/submit → 写 responses → 返回 band,跳转完成页
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { TestHeader } from "@/components/test/header";
import { TestPalette } from "@/components/test/palette";
import { TestQuestion, type QuestionView } from "@/components/test/question";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface StartPayload {
  attemptId: number;
  paper: {
    id: number;
    slug: string;
    title: string;
    category: string;
    skill: string;
    durationSec: number;
    audioUrl: string | null;
  };
  sections: Array<{ id: number; section_no: number; section_type: string; title: string | null; question_count: number }>;
  passages: Array<{
    section_id: number;
    order_index: number;
    title: string | null;
    subtitle: string | null;
    body_html: string | null;
    image_url: string | null;
  }>;
  groups: Array<{
    id: number; section_id: number; score_mode: string;
    min_select: number | null; max_select: number | null;
    order_index: number; instruction_html: string | null;
  }>;
  questions: QuestionView[];
  writingTasks: Array<{ task_id: string; prompt_html: string; material_html: string | null; word_min: number; suggested_time_sec: number }>;
}

interface SubmitResult {
  bandScore: number;
  correctCount: number;
  totalCount: number;
  writingPending: boolean;
}

function countWords(s: string): number {
  // IELTS 写作计词:按空白分隔,过滤空串
  return s.trim().split(/\s+/).filter(Boolean).length;
}

export default function TestPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const [data, setData] = useState<StartPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<number, string | string[]>>({});
  const [writingTexts, setWritingTexts] = useState<Record<string, string>>({});
  const [activeSection, setActiveSection] = useState(1);
  const [submitted, setSubmitted] = useState<SubmitResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const startedAt = useRef<number>(Date.now());

  // 开考
  useEffect(() => {
    if (!slug) return;
    void fetch(`/api/papers/${encodeURIComponent(slug)}/start`, { method: "POST" })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!ok) {
          setError(j?.message ?? "开考失败");
          return;
        }
        setData(j);
        startedAt.current = Date.now();
      })
      .catch((e) => setError(String(e)));
  }, [slug]);

  // 倒计时:按 elapsed 算 remaining
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const remainingSec = data
    ? Math.max(0, data.paper.durationSec - Math.floor((Date.now() - startedAt.current) / 1000))
    : 0;

  // palette 数据(按 section_no 分组,按题号排序)
  const parts = useMemo(() => {
    if (!data) return [];
    return data.sections.map((s) => ({
      sectionNo: s.section_no,
      title: s.title ?? `Section ${s.section_no}`,
      questionNumbers: data.questions
        .filter((q) => q.sectionId === s.id)
        .map((q) => q.number)
        .sort((a, b) => a - b),
    }));
  }, [data]);

  // 当前 section 的题
  const sectionQuestions = useMemo(() => {
    if (!data) return [];
    const s = data.sections.find((ss) => ss.section_no === activeSection);
    if (!s) return [];
    return data.questions
      .filter((q) => q.sectionId === s.id)
      .sort((a, b) => a.number - b.number);
  }, [data, activeSection]);

  // 当前 section 的 passages(READING 用)
  const sectionPassages = useMemo(() => {
    if (!data) return [];
    const s = data.sections.find((ss) => ss.section_no === activeSection);
    if (!s) return [];
    return data.passages.filter((p) => p.section_id === s.id);
  }, [data, activeSection]);

  // 当前 section 的 group instruction(块题顶部说明)
  const sectionGroupInstr = useMemo(() => {
    if (!data) return [];
    const s = data.sections.find((ss) => ss.section_no === activeSection);
    if (!s) return [];
    const seen = new Set<string>();
    return data.groups
      .filter((g) => g.section_id === s.id)
      .filter((g) => {
        if (seen.has(g.instruction_html ?? "")) return false;
        seen.add(g.instruction_html ?? "");
        return !!g.instruction_html;
      });
  }, [data, activeSection]);

  function pickQ(qNum: number) {
    const target = data?.questions.find((q) => q.number === qNum);
    if (!target) return;
    const s = data?.sections.find((s) => s.id === target.sectionId);
    if (s) setActiveSection(s.section_no);
    setTimeout(() => {
      document.getElementById(`q-${qNum}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function setResp(qNum: number, value: string | string[]) {
    setResponses((r) => ({ ...r, [qNum]: value }));
  }

  async function submit() {
    if (!data) return;
    if (!confirm("确认交卷?(M4 v1 — 听/阅真判分,写作不评)")) return;
    setSubmitting(true);
    try {
      const r = await fetch(`/api/papers/${encodeURIComponent(slug)}/submit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          attemptId: data.attemptId,
          responses,
          writingTexts,
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        alert(`交卷失败:${j?.message ?? r.status}`);
        return;
      }
      setSubmitted(j);
    } catch (e) {
      alert(`交卷失败:${String(e)}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (error) {
    return <p className="p-8 text-sm text-destructive">{error}</p>;
  }
  if (!data) {
    return <p className="p-8 text-sm text-muted-foreground">加载机考页中…</p>;
  }
  if (submitted) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <Card>
          <CardHeader>
            <CardTitle>已交卷 · {data.paper.title}</CardTitle>
            <CardDescription>attempt #{data.attemptId}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-md border p-3">
                <div className="text-2xl font-semibold tabular-nums">{submitted.correctCount}</div>
                <div className="text-xs text-[var(--ink-3)]">正确题数</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-2xl font-semibold tabular-nums">{submitted.totalCount}</div>
                <div className="text-xs text-[var(--ink-3)]">总题数</div>
              </div>
              <div className="rounded-md border p-3" style={{ background: "var(--brand-bg)" }}>
                <div className="text-3xl font-semibold tabular-nums" style={{ color: "var(--brand-deep)" }}>
                  {submitted.bandScore}
                </div>
                <div className="text-xs text-[var(--ink-3)]">Band 得分</div>
              </div>
            </div>
            {submitted.writingPending && (
              <p className="text-sm text-[var(--ink-3)]">
                写作已提交,V1 不评写作;M5 起调 MiniMax LLM 三维评分。
              </p>
            )}
            <div className="flex gap-2 pt-2">
              <Button nativeButton={false} render={<a href="/papers" />}>返回题库</Button>
              <Button variant="outline" nativeButton={false} render={<a href="/" />}>回首页</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  const isListening = data.paper.skill === "LISTENING";
  const isWriting = data.paper.skill === "WRITING";

  // header rightSlot — listening audio player
  const audioPlayer = isListening && data.paper.audioUrl ? (
    <ListeningPlayer audioUrl={data.paper.audioUrl} />
  ) : null;

  return (
    <>
      <TestHeader
        title={data.paper.title}
        brand={`${data.paper.category === "A" ? "A 类" : "G 类"} · ${data.paper.skill}`}
        remainingSec={remainingSec}
        totalSec={data.paper.durationSec}
        onSubmit={submit}
        rightSlot={audioPlayer}
      />

      <main className="mx-auto max-w-[1400px] p-6" style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 24 }}>
        {/* Palette */}
        <div>
          <TestPalette
            parts={parts}
            activeSection={activeSection}
            answered={responses}
            onPick={pickQ}
          />
          <div className="mt-3 flex flex-col gap-2">
            {data.sections.map((s) => (
              <Button
                key={s.id}
                size="sm"
                variant={s.section_no === activeSection ? "default" : "outline"}
                onClick={() => setActiveSection(s.section_no)}
              >
                {s.title ?? `Section ${s.section_no}`}
              </Button>
            ))}
          </div>
        </div>

        {/* Section + questions */}
        <div className="space-y-6">
          {/* 组 instruction(块题顶部) */}
          {sectionGroupInstr.length > 0 && (
            <Card>
              <CardContent className="space-y-2 pt-4">
                {sectionGroupInstr.map((g) => (
                  <div
                    key={g.id}
                    className="rounded-md bg-[var(--brand-bg)] px-3 py-2 text-[13px] leading-relaxed text-[var(--brand-deep)]"
                    dangerouslySetInnerHTML={{ __html: g.instruction_html ?? "" }}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {/* READING 双栏:左 passage,右 questions */}
          {data.paper.skill === "READING" ? (
            <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 1fr" }}>
              {/* 左:passage(s) */}
              <div className="space-y-4">
                {sectionPassages.length === 0 ? (
                  <Card>
                    <CardContent className="text-sm text-[var(--ink-3)]">
                      本节无独立文章(题型不需要文章上下文)
                    </CardContent>
                  </Card>
                ) : (
                  sectionPassages.map((p) => (
                    <Card key={p.order_index}>
                      <CardHeader>
                        <CardTitle className="text-[14px]">{p.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <article
                          className="prose prose-sm max-w-none text-[13px] leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: p.body_html ?? "" }}
                        />
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {/* 右:questions */}
              <div className="space-y-5">
                {sectionQuestions.length === 0 ? (
                  <p className="text-sm text-[var(--ink-3)]">本节无题</p>
                ) : (
                  sectionQuestions.map((q) => (
                    <div key={q.number} id={`q-${q.number}`} className="rounded-md border p-3">
                      <div className="mb-2 text-xs font-semibold text-[var(--ink-2)]">Question {q.number}</div>
                      <TestQuestion question={q} value={responses[q.number]} onChange={(v) => setResp(q.number, v)} />
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : isWriting ? (
            /* WRITING 双 task */
            <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
              {data.writingTasks.map((t, idx) => {
                const text = writingTexts[t.task_id] ?? "";
                const wc = countWords(text);
                const ok = wc >= t.word_min;
                return (
                  <Card key={t.task_id}>
                    <CardHeader>
                      <CardTitle className="text-sm">Task {idx + 1}</CardTitle>
                      <CardDescription>
                        最少 {t.word_min} 词 · {t.suggested_time_sec ? `${Math.round(t.suggested_time_sec / 60)} 分钟` : ""}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {t.material_html && (
                        <div
                          className="rounded border p-2 text-[12px]"
                          style={{ borderColor: "var(--line)" }}
                          dangerouslySetInnerHTML={{ __html: t.material_html }}
                        />
                      )}
                      <div
                        className="rounded border p-3 text-[13px] leading-relaxed"
                        style={{ borderColor: "var(--line)", background: "var(--bg)" }}
                        dangerouslySetInnerHTML={{ __html: t.prompt_html }}
                      />
                      <textarea
                        className="w-full rounded border p-3 text-sm focus:border-[var(--brand)] focus:outline-none"
                        style={{ borderColor: "var(--line)", minHeight: 320 }}
                        placeholder={`在此输入你的作文 · ${t.word_min} words minimum`}
                        value={text}
                        onChange={(e) => setWritingTexts((w) => ({ ...w, [t.task_id]: e.target.value }))}
                      />
                      <div className="flex items-center justify-between text-xs">
                        <span className={ok ? "text-[var(--green)]" : "text-[var(--ink-3)]"}>
                          {wc} / {t.word_min} 词{ok ? " ✓ 达到要求" : ""}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            /* LISTENING 单列 */
            <div className="space-y-5">
              {sectionQuestions.length === 0 ? (
                <p className="text-sm text-[var(--ink-3)]">本节无题</p>
              ) : (
                sectionQuestions.map((q) => (
                  <div key={q.number} id={`q-${q.number}`} className="rounded-md border p-3">
                    <div className="mb-2 text-xs font-semibold text-[var(--ink-2)]">Question {q.number}</div>
                    <TestQuestion question={q} value={responses[q.number]} onChange={(v) => setResp(q.number, v)} />
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

/** 听力底部播放器(M4-4):播放/暂停 + 进度条 + 当前时间 */
function ListeningPlayer({ audioUrl }: { audioUrl: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setCurrent(a.currentTime);
    const onMeta = () => setDuration(a.duration || 0);
    const onEnd = () => setPlaying(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("ended", onEnd);
    };
  }, []);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      void a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  }

  function onSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Number(e.target.value);
    setCurrent(a.currentTime);
  }

  function fmt(s: number) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  }

  return (
    <div className="flex items-center gap-2 rounded bg-white/15 px-3 py-1.5 text-white">
      <button
        type="button"
        onClick={toggle}
        className="rounded bg-white/25 px-2 py-0.5 text-[12px] hover:bg-white/40"
      >
        {playing ? "暂停" : "播放"}
      </button>
      <span className="tabular-nums text-[11px] opacity-90">{fmt(current)}</span>
      <input
        type="range"
        min={0}
        max={duration || 1}
        step={0.1}
        value={current}
        onChange={onSeek}
        className="h-1 w-32 cursor-pointer accent-white"
      />
      <span className="tabular-nums text-[11px] opacity-90">{fmt(duration)}</span>
      <audio ref={audioRef} src={audioUrl} preload="auto" />
    </div>
  );
}