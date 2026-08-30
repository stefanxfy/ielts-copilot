/**
 * /papers/[slug]/test — 机考页(M3-3 + M3-4 合并落地)
 *
 * 调用 /api/papers/[slug]/start 拉开考 payload(不含 answers),
 * 用 M3-2 三套 React 组件(Header/Palette/Question)组装机考面。
 *
 * 简化(对齐粒度 A 视觉一致):
 *   - 倒计时:startSec - elapsed 倒排,到 0 高亮
 *   - palette 点题:滚动到对应题 + 高亮 active
 *   - 交卷:简单 confirm → 显示完成页(M3-5 完整化)
 *   - 听力 audio:用 audio-lock.js + 原型音频;M3-5 收口音量 UI
 *   - 写作:2 个 textarea + 字数统计(M3-5 收口)
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { TestHeader } from "@/components/test/header";
import { TestPalette } from "@/components/test/palette";
import { TestQuestion, type QuestionView } from "@/components/test/question";
import { Button } from "@/components/ui/button";

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
  questions: QuestionView[];
  writingTasks: Array<{ task_id: string; prompt_html: string; material_html: string | null; word_min: number; suggested_time_sec: number }>;
}

export default function TestPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const [data, setData] = useState<StartPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<number, string | string[]>>({});
  const [activeSection, setActiveSection] = useState(1);
  const [activeQ, setActiveQ] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
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

  // palette 数据
  const parts = useMemo(() => {
    if (!data) return [];
    return data.sections.map((s) => ({
      sectionNo: s.section_no,
      title: s.title ?? `Section ${s.section_no}`,
      questionNumbers: data.questions
        .filter((q) => q.sectionId === s.id)
        .map((q) => q.number),
    }));
  }, [data]);

  const sectionQuestions = data?.questions.filter((q) => {
    const s = data.sections.find((ss) => ss.id === q.sectionId);
    return s?.section_no === activeSection;
  }) ?? [];

  function pickQ(qNum: number) {
    setActiveQ(qNum);
    setActiveSection(data?.sections.find((s) => data.questions.find((q) => q.number === qNum)?.sectionId === s.id)?.section_no ?? 1);
    // 滚动
    const el = document.getElementById(`q-${qNum}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function setResp(qNum: number, value: string | string[]) {
    setResponses((r) => ({ ...r, [qNum]: value }));
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
        <h1 className="mb-2 text-xl font-semibold">已交卷</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          attempt #{data.attemptId} · 本地原型暂不联判分引擎(M3-5 收口)
        </p>
        <p className="text-sm">已作答:{Object.keys(responses).length} 题</p>
      </main>
    );
  }

  const isListening = data.paper.skill === "LISTENING";
  const isWriting = data.paper.skill === "WRITING";

  return (
    <>
      <TestHeader
        title={data.paper.title}
        brand={`${data.paper.category === "A" ? "A 类" : "G 类"} · ${data.paper.skill}`}
        remainingSec={remainingSec}
        totalSec={data.paper.durationSec}
        onSubmit={() => {
          if (confirm("确认交卷?(原型模式 — 不会真存判分)")) setSubmitted(true);
        }}
      />

      {/* 听力 audio 注入 */}
      {isListening && data.paper.audioUrl && (
        <audio
          id="ielts-local-audio"
          src={data.paper.audioUrl}
          preload="auto"
          autoPlay
          muted
          style={{ display: "none" }}
        />
      )}

      <main className="mx-auto max-w-7xl gap-6 p-6" style={{ display: "grid", gridTemplateColumns: "260px 1fr" }}>
        {/* Palette */}
        <TestPalette
          parts={parts}
          activeSection={activeSection}
          answered={responses}
          onPick={pickQ}
        />

        {/* Section + questions */}
        <div className="space-y-6">
          {data.sections.map((s) => {
            const qs = data.questions.filter((q) => q.sectionId === s.id);
            const isCurrent = s.section_no === activeSection;
            return (
              <section
                key={s.id}
                className="rounded-lg border p-5"
                style={{
                  background: "var(--card)",
                  borderColor: "var(--line)",
                  display: isCurrent ? "block" : "none",
                }}
              >
                <h2 className="mb-4 text-sm font-semibold text-[var(--ink-2)]">
                  {s.title ?? `Section ${s.section_no}`} · <span className="font-normal">{s.section_type}</span>
                </h2>
                {isWriting ? (
                  <div className="space-y-6">
                    {data.writingTasks.map((t, idx) => (
                      <div key={t.task_id} className="space-y-2">
                        <div className="text-xs font-semibold text-[var(--ink-2)]">Task {idx + 1} · 至少 {t.word_min} 词</div>
                        <div className="rounded border p-3 text-sm" style={{ borderColor: "var(--line)" }} dangerouslySetInnerHTML={{ __html: t.prompt_html }} />
                        {t.material_html && (
                          <div className="rounded border p-3 text-sm" style={{ borderColor: "var(--line)" }} dangerouslySetInnerHTML={{ __html: t.material_html }} />
                        )}
                        <textarea
                          className="w-full rounded border p-3 text-sm"
                          style={{ borderColor: "var(--line)", minHeight: 240 }}
                          placeholder={`在此输入你的作文 · ${t.word_min} words minimum`}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {qs.map((q) => (
                      <div key={q.number} id={`q-${q.number}`}>
                        <div className="mb-2 text-xs font-semibold text-[var(--ink-2)]">Question {q.number}</div>
                        <TestQuestion question={q} value={responses[q.number]} onChange={(v) => setResp(q.number, v)} />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}

          {/* 简单翻页按钮 */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              disabled={activeSection <= 1}
              onClick={() => setActiveSection((s) => Math.max(1, s - 1))}
            >
              ← 上一节
            </Button>
            <Button
              variant="outline"
              disabled={activeSection >= data.sections.length}
              onClick={() => setActiveSection((s) => Math.min(data.sections.length, s + 1))}
            >
              下一节 →
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}