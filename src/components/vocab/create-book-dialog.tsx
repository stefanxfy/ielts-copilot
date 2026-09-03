/**
 * create-book-dialog.tsx — 「新建 / 导入词库」弹窗(#62)
 *
 * 对齐 prototype/vocab/book-list 原型:
 *   单词来源粘贴/上传双 tab → 配图风格五选(缩略图预览) → 单词/例句音色分开选
 *   (带试听) → 生图策略三选 → 提交 POST /api/vocab-book/import 轮询四步进度。
 *
 * 主题铁律:全部语义 token,不写死色值、无 dark: 变体。
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DEFAULT_VOCAB_IMAGE_STYLE,
  vocabImageStyleOptions,
  type VocabImageStyleId,
} from "@/lib/vocab-image-styles";
import {
  DEFAULT_SENT_VOICE,
  DEFAULT_WORD_VOICE,
  VOCAB_TTS_VOICES,
} from "@/lib/vocab-tts-voices";

const FORMAT_HINT = "一行一词;# 开头为注释;大小写/屈折形式(复数、过去式)自动归并";

interface ImportTaskState {
  id: string;
  status: "running" | "done" | "error";
  phase: string;
  phaseLabel: string;
  total: number;
  done: number;
  hitCount: number;
  missWords: string[];
  audioWordOk: number;
  audioWordFail: number;
  audioSentOk: number;
  audioSentFail: number;
  imageTotal: number;
  imageOk: number;
  imageFail: number;
  error?: string;
}

/** 任务 phase → 原型四步(1 解析 2 释义 3 音频 4 生图) */
function stepIndexOf(phase: string): number {
  if (phase === "parse") return 0;
  if (phase === "bcz" || phase === "ecdict" || phase === "db") return 1;
  if (phase === "tts") return 2;
  if (phase === "image") return 3;
  return 4; // done
}

const STEPS = ["解析去重", "抓取释义 / 例句", "合成发音音频", "核心词生图"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

export function CreateBookDialog({ open, onOpenChange, onImported }: Props) {
  // ===== 表单态 =====
  const [name, setName] = useState("");
  const [tab, setTab] = useState<"paste" | "upload">("paste");
  const [text, setText] = useState("");
  const [genStrategy, setGenStrategy] = useState<"core" | "all" | "none">("core");
  const [imageStyle, setImageStyle] = useState<VocabImageStyleId>(DEFAULT_VOCAB_IMAGE_STYLE);
  const [voiceWord, setVoiceWord] = useState(DEFAULT_WORD_VOICE);
  const [voiceSent, setVoiceSent] = useState(DEFAULT_SENT_VOICE);
  const fileRef = useRef<HTMLInputElement>(null);

  // ===== 试听 =====
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  function audition(voiceName: string) {
    if (playing === voiceName) {
      audioRef.current?.pause();
      setPlaying(null);
      return;
    }
    audioRef.current?.pause();
    const a = new Audio(`/vocab/voices/${voiceName}.mp3`);
    audioRef.current = a;
    a.onended = () => setPlaying(null);
    void a.play().then(() => setPlaying(voiceName)).catch(() => toast.error("试听播放失败"));
  }
  useEffect(() => () => audioRef.current?.pause(), []);

  // ===== 任务态 =====
  const [task, setTask] = useState<ImportTaskState | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 轮询
  useEffect(() => {
    if (!task || task.status !== "running") return;
    const t = setInterval(() => {
      void (async () => {
        try {
          const resp = await fetch(`/api/vocab-book/import?id=${task.id}`, { cache: "no-store" });
          if (resp.ok) {
            const next = (await resp.json()) as ImportTaskState;
            setTask(next);
            if (next.status === "done") {
              toast.success("词库导入完成");
              onImported();
            } else if (next.status === "error") {
              toast.error(next.error ?? "导入失败");
            }
          }
        } catch {
          /* 下一轮再取 */
        }
      })();
    }, 900);
    return () => clearInterval(t);
  }, [task, onImported]);

  function reset() {
    setName("");
    setText("");
    setTab("paste");
    setGenStrategy("core");
    setTask(null);
    setSubmitting(false);
  }

  function close() {
    if (task?.status === "running") {
      toast.info("导入任务在后台继续跑,可稍后刷新列表查看");
    }
    onOpenChange(false);
    // 任务运行中不重置(重开还能看到);空闲才清表单
    if (task?.status !== "running") setTimeout(reset, 200);
  }

  async function submit() {
    const words = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));
    if (words.length === 0) {
      toast.error("请先填入至少一个单词");
      return;
    }
    setSubmitting(true);
    try {
      const resp = await fetch("/api/vocab-book/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          words,
          genStrategy,
          imageStyle,
          voiceWord,
          voiceSent,
        }),
      });
      const data = (await resp.json()) as { id?: string; error?: string };
      if (!resp.ok || !data.id) {
        toast.error(data.error ?? "创建导入任务失败");
        setSubmitting(false);
        return;
      }
      setTask({
        id: data.id,
        status: "running",
        phase: "parse",
        phaseLabel: "解析词表 · 去重合并",
        total: words.length,
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
      });
    } catch {
      toast.error("网络错误");
      setSubmitting(false);
    }
  }

  async function onFile(f: File | undefined) {
    if (!f) return;
    const t = await f.text();
    setText(t);
    toast.success(`已读入 ${f.name}`);
  }

  const step = task ? stepIndexOf(task.phase) : -1;
  const running = task?.status === "running";
  const inputCls =
    "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25";

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="max-h-[88vh] gap-0 overflow-y-auto p-5 sm:max-w-xl">
        {!task ? (
          <>
            <DialogHeader>
              <DialogTitle>新建 / 导入词库</DialogTitle>
              <DialogDescription>txt 一行一词即可,其余信息自动补全(释义 / 例句 / 音频 / 核心词配图)</DialogDescription>
            </DialogHeader>

            <div className="mt-3 space-y-4">
              {/* 名称 */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">词库名称</label>
                <input className={inputCls} placeholder="不填则用「未命名词库」" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
              </div>

              {/* 单词来源 */}
              <div>
                <div className="mb-1.5 flex items-center gap-2">
                  <div className="flex rounded-lg border border-border p-0.5">
                    {(["paste", "upload"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTab(t)}
                        className={`rounded-md px-3 py-1 text-xs ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        {t === "paste" ? "粘贴单词" : "上传 txt"}
                      </button>
                    ))}
                  </div>
                </div>
                {tab === "paste" ? (
                  <textarea
                    className={`${inputCls} h-32 resize-y font-mono text-[13px] leading-relaxed`}
                    placeholder={"abandon\nability\n# 注释行会被忽略"}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex h-32 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-foreground"
                  >
                    <span className="text-lg">📄</span>
                    点击选择 .txt 文件(一行一词)
                  </button>
                )}
                <input ref={fileRef} type="file" accept=".txt,text/plain" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
                <p className="mt-1.5 text-[11px] text-muted-foreground">{FORMAT_HINT}</p>
              </div>

              {/* 配图风格 */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  配图风格 <span className="font-normal">· 同一句提示词的 abandon 实拍样图</span>
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {vocabImageStyleOptions().map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setImageStyle(o.id)}
                      className={`overflow-hidden rounded-lg border-2 text-left transition-colors ${imageStyle === o.id ? "border-primary ring-2 ring-primary/25" : "border-border hover:border-ring"}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/vocab/styles/${o.id}.png`} alt={o.label} className="aspect-square w-full object-cover" />
                      <div className="px-1.5 py-1">
                        <div className="flex items-center gap-1 text-[11px] font-semibold">
                          {o.label}
                          {o.id === DEFAULT_VOCAB_IMAGE_STYLE && (
                            <span className="rounded-full bg-secondary px-1 text-[9px] font-normal text-secondary-foreground">默认</span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 发音音色 */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  发音音色 <span className="font-normal">· edge-tts 生成 · 点 ▶ 试听</span>
                </label>
                <div className="flex gap-3">
                  {(
                    [
                      ["单词读音", voiceWord, setVoiceWord],
                      ["例句读音", voiceSent, setVoiceSent],
                    ] as const
                  ).map(([label, value, set]) => (
                    <div key={label} className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
                      <select
                        value={value}
                        onChange={(e) => set(e.target.value)}
                        className="min-w-0 flex-1 cursor-pointer appearance-none rounded-lg border border-border bg-card py-1.5 pl-2.5 pr-7 text-xs outline-none transition-colors hover:border-ring focus:border-primary focus:ring-2 focus:ring-primary/25"
                        style={{
                          backgroundImage:
                            "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%23a8a29e' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 8px center",
                        }}
                      >
                        {VOCAB_TTS_VOICES.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                            {v.id === DEFAULT_WORD_VOICE && label === "单词读音" ? "（默认）" : ""}
                            {v.id === DEFAULT_SENT_VOICE && label === "例句读音" ? "（默认）" : ""}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        title="试听"
                        onClick={() => {
                          const v = VOCAB_TTS_VOICES.find((x) => x.id === value);
                          if (v) audition(v.name);
                        }}
                        className={`inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border text-[10px] transition-colors ${
                          playing === VOCAB_TTS_VOICES.find((x) => x.id === value)?.name
                            ? "border-primary bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground hover:bg-ring hover:text-ring-foreground"
                        }`}
                      >
                        {playing === VOCAB_TTS_VOICES.find((x) => x.id === value)?.name ? "■" : "▶"}
                      </button>
                    </div>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">例句统一放慢 8%,停顿更自然</p>
              </div>

              {/* 生图策略 */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">核心词生图策略</label>
                <div className="space-y-1.5">
                  {(
                    [
                      ["core", "仅核心词生图（推荐）", "collins ≥3 或 BNC ≤2000 的词生成配图,其余词走听觉/语境卡"],
                      ["all", "全部生图", "所有词生成配图(耗时较长,100 词约 15 分钟)"],
                      ["none", "暂不生图", "先导入文本数据,之后在设置里按词手动生成"],
                    ] as const
                  ).map(([id, title, desc]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setGenStrategy(id)}
                      className={`flex w-full cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 text-left transition-colors ${
                        genStrategy === id ? "border-primary bg-primary/5" : "border-border hover:border-ring"
                      }`}
                    >
                      <span
                        className={`mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border ${
                          genStrategy === id ? "border-primary" : "border-ring"
                        }`}
                      >
                        {genStrategy === id && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                      </span>
                      <span>
                        <span className="block text-xs font-semibold">{title}</span>
                        <span className="block text-[11px] text-muted-foreground">{desc}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={close} className="cursor-pointer rounded-lg border border-border px-4 py-2 text-sm hover:bg-secondary">
                取消
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={submitting}
                className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "创建中…" : "开始导入"}
              </button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>导入{running ? "进行中" : task.status === "done" ? "完成" : "失败"}</DialogTitle>
              <DialogDescription>
                {name.trim() || "未命名词库"} · 共 {task.total} 词
              </DialogDescription>
            </DialogHeader>

            {/* 四步进度 */}
            <div className="mt-3 space-y-2">
              {STEPS.map((s, i) => {
                const active = step === i && running;
                const finished = step > i || task.status === "done";
                return (
                  <div key={s} className="flex items-center gap-2.5 text-sm">
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${
                        finished
                          ? "bg-primary text-primary-foreground"
                          : active
                            ? "border border-primary text-primary"
                            : "border border-border text-muted-foreground"
                      }`}
                    >
                      {finished ? "✓" : i + 1}
                    </span>
                    <span className={finished || active ? "text-foreground" : "text-muted-foreground"}>{s}</span>
                    {active && <span className="animate-pulse text-xs text-primary">进行中…</span>}
                  </div>
                );
              })}
            </div>

            {/* 计数明细 */}
            <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              <div>
                百词斩命中 <b className="text-foreground">{task.hitCount}</b> / {task.total}
                {task.missWords.length > 0 && <> · 未命中(仅 ECDICT 兜底) <b className="text-foreground">{task.missWords.length}</b> 词</>}
              </div>
              <div className="mt-1">
                音频:单词 <b className="text-foreground">{task.audioWordOk}</b>
                {task.audioWordFail > 0 && <> · 失败 {task.audioWordFail}</>} · 例句 <b className="text-foreground">{task.audioSentOk}</b>
                {task.audioSentFail > 0 && <> · 失败 {task.audioSentFail}</>}
              </div>
              {task.imageTotal > 0 && (
                <div className="mt-1">
                  生图 <b className="text-foreground">{task.imageOk}</b> / {task.imageTotal}
                  {task.imageFail > 0 && <> · 失败 {task.imageFail}</>}
                </div>
              )}
              {task.status === "done" && task.missWords.length > 0 && (
                <div className="mt-1.5 border-t border-border pt-1.5">
                  缺料词:{task.missWords.slice(0, 20).join("、")}
                  {task.missWords.length > 20 && " …"}
                </div>
              )}
              {task.status === "error" && <div className="mt-1.5 text-destructive">{task.error}</div>}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              {task.status === "done" ? (
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    setTimeout(reset, 200);
                  }}
                  className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  完成
                </button>
              ) : (
                <button type="button" onClick={close} className="cursor-pointer rounded-lg border border-border px-4 py-2 text-sm hover:bg-secondary">
                  {running ? "后台运行" : "关闭"}
                </button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
