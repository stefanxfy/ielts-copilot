"use client";

/**
 * /learn/reading/libraries — 阅读库管理(原型: docs/阅读库原型.html)
 *
 * 库卡片网格(一个来源一个库,进度条=已读占比) + 三步导入向导:
 *   1 选择方式(真题 ✅ / 网页 URL 🔜 / 手动粘贴 ✅)
 *   2 配置(来源细节 + 目标库/新建库 + 自动执行选项)
 *   3 导入进度(逐篇驱动 POST /api/reading/import,完成清单)
 *
 * 本期边界(2026-09-09 定稿):TTS 音频暂不生成;词库命中打开文章时实时计算。
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface LibraryItem {
  /** 数字主键——导入 POST 的 libraryId 用它(不是字符串 libraryId) */
  id: number;
  libraryId: string;
  name: string;
  description: string | null;
  source: string;
  articleCount: number;
}
interface ArticleRow {
  libraryId: string;
  status: "IN_PROGRESS" | "COMPLETED" | null;
}
interface PaperRow {
  examId: string;
  examSetId: string;
  title: string;
  importedPassages: number[];
}
interface PassagePreview {
  passageNo: number;
  title: string | null;
  wordCount: number;
  paraCount: number;
  imported: boolean;
}
interface ImportResult {
  articleId: string;
  title: string;
  paraCount: number;
  wordCount: number;
  translatedCount: number;
  failedCount: number;
  duplicated?: boolean;
}

/** 库卡片封面色池(无 coverImage 时按序取色,与原型一致的低饱和深色) */
const LIB_COLORS = ["#0f6e56", "#534ab7", "#185fa5", "#854f0b", "#993556", "#1d9e75"];

type Way = "paper" | "url" | "paste";

export default function ReadingLibrariesPage() {
  const router = useRouter();
  const [libraries, setLibraries] = useState<LibraryItem[] | null>(null);
  const [readStats, setReadStats] = useState<Map<string, number>>(new Map());

  // 弹窗状态
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [way, setWay] = useState<Way>("paper");
  // 配置:真题
  const [papers, setPapers] = useState<PaperRow[] | null>(null);
  const [examId, setExamId] = useState("");
  const [passages, setPassages] = useState<PassagePreview[] | null>(null);
  const [checkedPassages, setCheckedPassages] = useState<number[]>([]);
  // 配置:粘贴
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteText, setPasteText] = useState("");
  // 公共
  const [targetLib, setTargetLib] = useState<string>("");
  const [newLibName, setNewLibName] = useState("");
  const [doTranslate, setDoTranslate] = useState(true);
  // 进度
  const [jobs, setJobs] = useState<Array<{ label: string; status: "queued" | "running" | "ok" | "err"; note?: string }>>([]);
  const [phase, setPhase] = useState("");
  const [importing, setImporting] = useState(false);
  const [doneSummary, setDoneSummary] = useState<string | null>(null);

  const loadLibraries = useCallback(async () => {
    try {
      const resp = await fetch("/api/reading", { cache: "no-store" });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = (await resp.json()) as { libraries: LibraryItem[]; articles: ArticleRow[] };
      setLibraries(data.libraries);
      const stats = new Map<string, number>();
      for (const a of data.articles) {
        if (a.status) stats.set(a.libraryId, (stats.get(a.libraryId) ?? 0) + 1);
      }
      setReadStats(stats);
    } catch {
      setLibraries([]);
    }
  }, []);

  useEffect(() => {
    // IIFE 异步取数(与列表页同款写法,避免 set-state-in-effect)
    (async () => {
      await loadLibraries();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openModal = () => {
    setStep(0);
    setWay("paper");
    setPapers(null);
    setExamId("");
    setPassages(null);
    setCheckedPassages([]);
    setPasteTitle("");
    setPasteText("");
    setNewLibName("");
    setJobs([]);
    setDoneSummary(null);
    // 目标库默认选第一个已有库,减少一步操作(仍可切换/新建)
    if (libraries && libraries.length > 0) setTargetLib(String(libraries[0].id));
    else setTargetLib("");
    setImporting(false);
    setModalOpen(true);
  };

  // 进入配置页:真题方式需要先拉卷清单
  const gotoCfg = async (w: Way) => {
    setWay(w);
    setStep(1);
    if (w === "paper" && !papers) {
      try {
        const resp = await fetch("/api/reading/import", { cache: "no-store" });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = (await resp.json()) as { papers: PaperRow[] };
        setPapers(data.papers);
        if (data.papers.length) {
          setExamId(data.papers[0].examId);
          void loadPassages(data.papers[0].examId);
        }
      } catch {
        toast.error("真题卷清单加载失败");
      }
    }
  };

  const loadPassages = async (id: string) => {
    setPassages(null);
    setCheckedPassages([]);
    try {
      const resp = await fetch(`/api/reading/import?examId=${encodeURIComponent(id)}`, { cache: "no-store" });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = (await resp.json()) as { passages: PassagePreview[] };
      setPassages(data.passages);
      setCheckedPassages(data.passages.filter((p) => p.title && !p.imported).map((p) => p.passageNo));
    } catch {
      toast.error("该卷阅读页面解析失败");
      setPassages([]);
    }
  };

  const targetLibraries = useMemo(
    () => (libraries ?? []).map((l) => ({ id: l.id, name: l.name })),
    [libraries],
  );

  /** 开始导入:逐篇驱动,每篇一次 POST(进度条按篇数推进) */
  const startImport = async () => {
    if (!targetLib) {
      toast.error("请先选择目标库(或选「＋ 新建库…」)");
      return;
    }
    const libId = targetLib === "__new__" ? undefined : Number(targetLib);
    if (targetLib !== "__new__" && !Number.isInteger(libId)) {
      toast.error("目标库无效,请重新选择");
      return;
    }
    if (targetLib === "__new__" && !newLibName.trim()) {
      toast.error("请填写新库名称");
      return;
    }

    type Job = { label: string; status: "queued" | "running" | "ok" | "err"; note?: string; run: () => Promise<string> };
    const jobList: Job[] = [];

    if (way === "paste") {
      if (!pasteTitle.trim() || !pasteText.trim()) {
        toast.error("请填写标题和正文");
        return;
      }
      jobList.push({
        label: pasteTitle.trim(),
        status: "queued",
        run: () =>
          runImport({
            way: "paste",
            title: pasteTitle.trim(),
            text: pasteText,
            libraryId: libId,
            newLibraryName: targetLib === "__new__" ? newLibName.trim() : undefined,
            translate: doTranslate,
          }),
      });
    } else {
      const picked = (passages ?? []).filter((p) => checkedPassages.includes(p.passageNo));
      if (!picked.length) {
        toast.error("请至少选择一篇 passage");
        return;
      }
      for (const p of picked) {
        jobList.push({
          label: `P${p.passageNo} · ${p.title ?? "未命名"}`,
          status: "queued",
          run: () =>
            runImport({
              way: "paper",
              examId,
              passageNo: p.passageNo,
              libraryId: libId,
              newLibraryName: targetLib === "__new__" ? newLibName.trim() : undefined,
              translate: doTranslate,
            }),
        });
      }
    }

    setJobs(jobList.map(({ label, status }) => ({ label, status })));
    setDoneSummary(null);
    setImporting(true);
    setStep(2);

    const total = jobList.length;
    let done = 0;
    const notes: string[] = [];
    for (let i = 0; i < jobList.length; i++) {
      setPhase(`导入中(第 ${i + 1}/${total} 篇)${doTranslate ? " · LLM 逐段翻译" : ""}`);
      setJobs((prev) => prev.map((j, k) => (k === i ? { ...j, status: "running" } : j)));
      try {
        const note = await jobList[i].run();
        notes.push(`${jobList[i].label}: ${note}`);
        setJobs((prev) => prev.map((j, k) => (k === i ? { ...j, status: "ok", note } : j)));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        notes.push(`${jobList[i].label}: 失败 — ${msg}`);
        setJobs((prev) => prev.map((j, k) => (k === i ? { ...j, status: "err", note: msg } : j)));
      }
      done++;
      setPhase(`已完成 ${done}/${total} 篇`);
    }

    const okCount = jobList.length - notes.filter((n) => n.includes("失败")).length;
    setPhase("全部完成");
    setDoneSummary(`导入完成:成功 ${okCount} 篇 · 失败 ${total - okCount} 篇${doTranslate ? " · 译文已生成" : ""}`);
    setImporting(false);
    void loadLibraries();
  };

  const runImport = async (body: Record<string, unknown>): Promise<string> => {
    const resp = await fetch("/api/reading/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await resp.json()) as ImportResult & { error?: string; duplicated?: boolean };
    if (!resp.ok) throw new Error(data.error ?? `HTTP ${resp.status}`);
    if (data.duplicated) throw new Error(data.error ?? "该 passage 已导入");
    const fail = data.failedCount ? ` · 译文失败 ${data.failedCount} 段` : "";
    return `${data.paraCount} 段 / ${data.wordCount} 词${fail}`;
  };

  const pct = (lib: LibraryItem) =>
    lib.articleCount ? Math.round(((readStats.get(lib.libraryId) ?? 0) / lib.articleCount) * 100) : 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <Link
        href="/learn/reading"
        className="mb-3 inline-flex items-center gap-1 rounded-full border bg-card px-3.5 py-1 text-[13px] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        ← 返回阅读学习
      </Link>
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-semibold">阅读库</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            一个来源一个库 · {libraries?.length ?? 0} 个库 · 点击库查看文章,右上「导入」新增内容
          </p>
        </div>
        <button
          className="rounded-full bg-primary px-4.5 py-2 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
          onClick={openModal}
        >
          ＋ 导入
        </button>
      </div>

      <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
        {(libraries ?? []).map((lib, i) => (
          <button
            key={lib.libraryId}
            onClick={() => router.push(`/learn/reading/libraries/${encodeURIComponent(lib.libraryId)}`)}
            className="relative cursor-pointer rounded-2xl border bg-card p-4 text-left transition-colors hover:border-primary"
          >
            <span className="absolute top-3.5 right-3.5 text-muted-foreground">›</span>
            <div
              className="flex h-10 w-10 items-center justify-center rounded-[10px] text-[15px] font-semibold text-white"
              style={{ backgroundColor: LIB_COLORS[i % LIB_COLORS.length] }}
            >
              {lib.name.slice(0, 1)}
            </div>
            <div className="mt-2.5 text-[14.5px] font-semibold">{lib.name}</div>
            {lib.description && <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{lib.description}</div>}
            <div className="mt-2 text-xs text-muted-foreground">
              {lib.articleCount} 篇 · 已读 {readStats.get(lib.libraryId) ?? 0} 篇 ·{" "}
              {lib.source === "past_paper" || lib.source === "builtin" ? "真题" : "自定义"}
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
              <i className="block h-full bg-primary" style={{ width: `${pct(lib)}%` }} />
            </div>
          </button>
        ))}
        <button
          onClick={openModal}
          className="flex min-h-39 cursor-pointer flex-col items-center justify-center rounded-2xl border-[1.5px] border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <b className="text-xl font-normal">＋</b>
          新建库 / 导入文章
        </button>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-40 flex items-start justify-center overflow-auto bg-black/35 px-4 py-10">
          <div className="w-full max-w-145 rounded-2xl bg-card p-6">
            <div className="flex items-center">
              <h2 className="flex-1 text-base font-semibold">{step === 2 ? "导入进度" : "导入文章"}</h2>
              <button
                className="cursor-pointer px-2 text-muted-foreground hover:text-foreground"
                onClick={() => !importing && setModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="my-3 flex gap-2">
              {["1 选择方式", "2 配置", "3 导入进度"].map((label, i) => (
                <div
                  key={label}
                  className={`flex-1 border-b-2 pb-2 text-center text-xs ${
                    i === step ? "border-primary font-semibold text-primary" : "border-border text-muted-foreground"
                  }`}
                >
                  {label}
                </div>
              ))}
            </div>

            {step === 0 && (
              <div className="flex flex-col gap-2.5">
                <button className="flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-left transition-colors hover:border-primary hover:bg-accent/40" onClick={() => void gotoCfg("paper")}>
                  <div className="flex h-9 w-9 flex-none items-center justify-center rounded-[9px] bg-primary/10 text-xs font-semibold text-primary">真题</div>
                  <div>
                    <b className="block text-sm font-semibold">从雅思真题导入</b>
                    <span className="text-xs text-muted-foreground">选择已有套卷的阅读文章,自动解析分段、标注出处</span>
                  </div>
                </button>
                <button className="flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-left transition-colors hover:border-primary hover:bg-accent/40" onClick={() => void gotoCfg("paste")}>
                  <div className="flex h-9 w-9 flex-none items-center justify-center rounded-[9px] bg-primary/10 text-xs font-semibold text-primary">粘贴</div>
                  <div>
                    <b className="block text-sm font-semibold">手动粘贴文本</b>
                    <span className="text-xs text-muted-foreground">直接粘贴英文正文,按空行分段</span>
                  </div>
                </button>
                <div className="flex items-start gap-3 rounded-xl border p-3.5 opacity-50">
                  <div className="flex h-9 w-9 flex-none items-center justify-center rounded-[9px] bg-muted text-xs font-semibold">URL</div>
                  <div>
                    <b className="block text-sm font-semibold">从网页导入</b>
                    <span className="text-xs text-muted-foreground">Aeon / New Scientist 等 · 即将支持</span>
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div>
                {way === "paper" && (
                  <div>
                    <label className="mb-1 mt-1 block text-xs text-muted-foreground">套卷</label>
                    <select
                      className="w-full rounded-lg border bg-background px-2.5 py-2 text-[13px]"
                      value={examId}
                      onChange={(e) => {
                        setExamId(e.target.value);
                        void loadPassages(e.target.value);
                      }}
                    >
                      {(papers ?? []).map((p) => (
                        <option key={p.examId} value={p.examId}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                    <label className="mb-1 mt-3.5 block text-xs text-muted-foreground">选择阅读文章(Passage)</label>
                    <div className="flex flex-wrap gap-3.5">
                      {(passages ?? []).map((p) => (
                        <label key={p.passageNo} className={`flex items-center gap-1.5 text-[13px] ${p.imported ? "opacity-50" : ""}`}>
                          <input
                            type="checkbox"
                            disabled={!p.title || p.imported}
                            checked={checkedPassages.includes(p.passageNo)}
                            onChange={(e) =>
                              setCheckedPassages((prev) =>
                                e.target.checked ? [...prev, p.passageNo] : prev.filter((x) => x !== p.passageNo),
                              )
                            }
                          />
                          {p.title ? `P${p.passageNo} · ${p.title}` : `P${p.passageNo} · 解析失败`}
                          <span className="text-xs text-muted-foreground">
                            {p.title ? `(${p.wordCount} 词 · ${p.paraCount} 段${p.imported ? " · 已导入" : ""})` : ""}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                {way === "paste" && (
                  <div>
                    <label className="mb-1 mt-1 block text-xs text-muted-foreground">文章标题</label>
                    <input
                      type="text"
                      className="w-full rounded-lg border bg-background px-2.5 py-2 text-[13px]"
                      placeholder="给文章起个标题"
                      value={pasteTitle}
                      onChange={(e) => setPasteTitle(e.target.value)}
                    />
                    <label className="mb-1 mt-3.5 block text-xs text-muted-foreground">英文正文(空行分段)</label>
                    <textarea
                      className="min-h-22 w-full resize-y rounded-lg border bg-background px-2.5 py-2 text-[13px]"
                      placeholder="Paste the article text here…"
                      value={pasteText}
                      onChange={(e) => setPasteText(e.target.value)}
                    />
                  </div>
                )}

                <label className="mb-1 mt-3.5 block text-xs text-muted-foreground">导入到库</label>
                <select
                  className="w-full rounded-lg border bg-background px-2.5 py-2 text-[13px]"
                  value={targetLib}
                  onChange={(e) => setTargetLib(e.target.value)}
                >
                  <option value="">选择库…</option>
                  {targetLibraries.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}(已有 · 追加)
                    </option>
                  ))}
                  <option value="__new__">＋ 新建库…</option>
                </select>
                {targetLib === "__new__" && (
                  <div>
                    <label className="mb-1 mt-3.5 block text-xs text-muted-foreground">新库名称</label>
                    <input
                      type="text"
                      className="w-full rounded-lg border bg-background px-2.5 py-2 text-[13px]"
                      placeholder="如:The Economist 精选"
                      value={newLibName}
                      onChange={(e) => setNewLibName(e.target.value)}
                    />
                  </div>
                )}

                <label className="mb-1 mt-3.5 block text-xs text-muted-foreground">导入时自动执行</label>
                <div className="flex flex-wrap gap-3.5">
                  <label className="flex cursor-pointer items-center gap-1.5 text-[13px]">
                    <input type="checkbox" checked={doTranslate} onChange={(e) => setDoTranslate(e.target.checked)} />
                    LLM 逐段中文翻译
                  </label>
                  <label className="flex items-center gap-1.5 text-[13px] opacity-50" title="2026-09-09 定稿:本期暂不生成音频">
                    <input type="checkbox" disabled />
                    逐段 TTS 音频合成(暂不支持)
                  </label>
                  <label className="flex items-center gap-1.5 text-[13px] opacity-50" title="词库命中在打开文章时实时计算,无需预计算">
                    <input type="checkbox" disabled />
                    词库命中预计算(实时计算,无需预计算)
                  </label>
                </div>

                <div className="mt-5 flex justify-end gap-2.5">
                  <button className="cursor-pointer rounded-full border bg-card px-4.5 py-2 text-[13px] text-muted-foreground hover:text-foreground" onClick={() => setStep(0)}>
                    上一步
                  </button>
                  <button className="cursor-pointer rounded-full bg-primary px-4.5 py-2 text-[13px] font-medium text-primary-foreground hover:opacity-90" onClick={() => void startImport()}>
                    开始导入
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="h-1.5 overflow-hidden rounded bg-muted">
                  <i
                    className="block h-full bg-primary transition-[width] duration-300"
                    style={{
                      width: `${jobs.length ? (jobs.filter((j) => j.status === "ok" || j.status === "err").length / jobs.length) * 100 : 0}%`,
                    }}
                  />
                </div>
                <div className="mt-1.5 text-xs text-muted-foreground">{phase || "准备中…"}</div>
                <div className="mt-1.5">
                  {jobs.map((j, i) => (
                    <div key={i} className="flex items-center gap-2.5 border-b border-dashed py-2 text-[13px]">
                      <span className="flex-1">
                        {j.label}
                        {j.note && <span className="ml-1 text-xs text-muted-foreground">· {j.note}</span>}
                      </span>
                      <span className={`text-xs ${j.status === "ok" ? "text-primary" : j.status === "err" ? "text-destructive" : "text-muted-foreground"}`}>
                        {j.status === "queued" ? "排队中" : j.status === "running" ? "处理中…" : j.status === "ok" ? "完成 ✓" : "失败 ✕"}
                      </span>
                    </div>
                  ))}
                </div>
                {doneSummary && (
                  <div className="mt-2.5 rounded-[10px] bg-primary/10 px-4 py-3 text-[13px] text-primary">{doneSummary}</div>
                )}
                <div className="mt-5 flex justify-end gap-2.5">
                  <button
                    disabled={importing}
                    className="cursor-pointer rounded-full border bg-card px-4.5 py-2 text-[13px] text-muted-foreground hover:text-foreground disabled:opacity-50"
                    onClick={() => setModalOpen(false)}
                  >
                    {importing ? "导入中…" : "稍后再说"}
                  </button>
                  <button
                    disabled={importing}
                    className="cursor-pointer rounded-full bg-primary px-4.5 py-2 text-[13px] font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                    onClick={() => {
                      setModalOpen(false);
                      router.push("/learn/reading");
                    }}
                  >
                    查看文章列表
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
