/**
 * create-book-dialog.tsx — 「新建 / 导入词库」弹窗(#62)
 *
 * 对齐 prototype/vocab/book-list 原型(2026-09-03 二次核对逐项对齐):
 *   词表(粘贴/上传双 tab + 拖拽区 + format-hint 富文本框) → 词库名称 →
 *   核心词生图策略三选(radio 卡) → 配图风格五选(缩略图+默认标) →
 *   单词/例句音色分开选(下拉+▶试听+tag pill+试音结论框) →
 *   开始导入 → 进度页(big-num 大数字 + 四步动态文案 + 计数明细)。
 *
 * 主题铁律:全部语义 token,不写死色值、无 dark: 变体。
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  VOCAB_IMAGE_STYLES,
  DEFAULT_VOCAB_IMAGE_STYLE,
  vocabImageStyleOptions,
  type VocabImageStyleId,
} from "@/lib/vocab-image-styles";
import {
  DEFAULT_SENT_VOICE,
  DEFAULT_WORD_VOICE,
  VOCAB_TTS_VOICES,
} from "@/lib/vocab-tts-voices";

interface ImportTaskState {
  id: string;
  status: "running" | "done" | "error";
  phase: string;
  phaseLabel: string;
  /** 词库名称(服务端任务态回带;本地提交前以 name 输入为准) */
  name?: string;
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

  function onFile(f: File | undefined) {
    if (!f) return;
    if (!f.name.endsWith(".txt")) {
      toast.error("仅支持 .txt 文件");
      return;
    }
    void f.text().then((t) => {
      setText(t);
      // 同原型:读入后自动切到粘贴 tab 便于核对,且空名称时用文件名兜底
      setTab("paste");
      if (!name.trim()) setName(f.name.replace(/\.txt$/i, ""));
      toast.success(`已读入 ${f.name}`);
    });
  }

  // 拖拽态(原型 drop-zone dragover 高亮)
  const [dragOver, setDragOver] = useState(false);

  const step = task ? stepIndexOf(task.phase) : -1;
  const running = task?.status === "running";
  const inputCls =
    "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25";
  const labelCls = "mb-1.5 block text-[13px] font-semibold";
  const tipCls = "ml-1.5 text-[11.5px] font-normal text-muted-foreground";

  // 进度页动态文案(原型 step3Text/step4Text:音色名 / 风格名注入)
  const voiceWordName = VOCAB_TTS_VOICES.find((v) => v.id === voiceWord)?.name ?? voiceWord;
  const voiceSentName = VOCAB_TTS_VOICES.find((v) => v.id === voiceSent)?.name ?? voiceSent;
  const imageStyleLabel = VOCAB_IMAGE_STYLES[imageStyle].label;
  const stepTexts = [
    "解析词表 · 去重合并",
    "抓取释义 / 例句(百词斩数据源)",
    `合成发音音频(单词 ${voiceWordName} / 例句 ${voiceSentName},-8%)`,
    `核心词批量生图(${imageStyleLabel})`,
  ];
  /** 提交时锁定的生图规模文案(原型 progGenCount) */
  const genCountText =
    genStrategy === "none"
      ? "跳过"
      : genStrategy === "all"
        ? `全部 ${text.split("\n").filter((l) => l.trim() && !l.trim().startsWith("#")).length} 张`
        : "核心词若干";

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="max-h-[88vh] gap-0 overflow-y-auto p-5 sm:max-w-xl">
        {!task ? (
          <>
            <DialogHeader>
              <DialogTitle>新建 / 导入词库</DialogTitle>
              <DialogDescription>粘贴 / 上传 txt 词表(一行一词)即完成导入,释义 / 例句 / 音频 / 配图自动补全</DialogDescription>
            </DialogHeader>

            <div className="mt-3 space-y-3.5">
              {/* 单词来源(原型第一块:上传 tabs 在字段之上) */}
              <div>
                <div className="mb-2.5 flex gap-2">
                  {(["paste", "upload"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTab(t)}
                      className={`cursor-pointer rounded-full border px-3.5 py-1 text-xs transition-colors ${
                        tab === t
                          ? "border-primary bg-secondary font-semibold text-secondary-foreground"
                          : "border-border bg-card text-muted-foreground hover:border-ring"
                      }`}
                    >
                      {t === "paste" ? "粘贴文本" : "上传 txt 文件"}
                    </button>
                  ))}
                </div>
                {tab === "paste" ? (
                  <div>
                    <label className={labelCls}>词表内容</label>
                    {/* 导入格式提示框(原型 format-hint:secondary 底 + 虚线边) */}
                    <div className="mb-2 rounded-[10px] border border-dashed border-warning/50 bg-secondary px-3.5 py-2.5 text-[12.5px] leading-[1.8] text-secondary-foreground">
                      <b>导入格式</b>:每行一个单词,支持 <code className="rounded bg-white/75 px-1.5 py-px font-mono text-xs"># 注释行</code> 和空行(自动忽略)
                      <br />
                      <code className="rounded bg-white/75 px-1.5 py-px font-mono text-xs">abandon</code> → 自动抓取释义 / 例句 / 音标 / 发音音频
                      <br />
                      带屈折的行会按词根合并,如 <code className="rounded bg-white/75 px-1.5 py-px font-mono text-xs">abandoned</code> 记到 <code className="rounded bg-white/75 px-1.5 py-px font-mono text-xs">abandon</code>
                    </div>
                    <textarea
                      className={`${inputCls} min-h-[150px] resize-y font-mono text-[13px] leading-[1.8]`}
                      placeholder={"abandon\nabundant\naccomplish\nisolate\ndiscard\n# 一行一个词,# 开头为注释"}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                    />
                  </div>
                ) : (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => fileRef.current?.click()}
                    onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      void onFile(e.dataTransfer.files?.[0]);
                    }}
                    className={`mb-1.5 flex h-32 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-center text-[13px] transition-all ${
                      dragOver ? "border-ring bg-secondary" : "border-border text-muted-foreground hover:border-ring hover:bg-secondary"
                    }`}
                  >
                    拖拽 .txt 文件到此处,或点击选择文件
                    <span className="text-xs">格式同粘贴文本:每行一个单词</span>
                  </div>
                )}
                <input ref={fileRef} type="file" accept=".txt,text/plain" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
              </div>

              {/* 名称(原型在词表之后) */}
              <div>
                <label className={labelCls}>词库名称</label>
                <input className={inputCls} placeholder="例如:剑桥雅思词汇精选" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
              </div>

              {/* 生图策略(原型在风格/音色之前;radio 选项卡) */}
              <div>
                <label className={labelCls}>核心词生图策略</label>
                <div className="space-y-2">
                  {(
                    [
                      ["core", "仅核心词生图(推荐)", "collins ≥3 或 BNC 词频 ≤2000 的词自动生成配图,其余词学习时走听觉/语境卡。阈值可在设置中调整。"],
                      ["all", "全部生图", "所有词生成配图(耗时较长,按 100 词约 15 分钟估算)"],
                      ["none", "暂不生图", "先导入文本数据,配图之后在词库内按词手动生成"],
                    ] as const
                  ).map(([id, title, desc]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setGenStrategy(id)}
                      className={`flex w-full cursor-pointer items-start gap-2.5 rounded-[10px] border px-3 py-2.5 text-left transition-colors ${
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
                        <span className="block text-[13px] font-semibold">{title}</span>
                        <span className="mt-0.5 block text-xs leading-[1.55] text-muted-foreground">{desc}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 配图风格 */}
              <div>
                <label className={labelCls}>
                  配图风格 <span className={tipCls}>点缩略图选择 · 同一句词的实拍样图对比</span>
                </label>
                <div className="grid grid-cols-5 gap-2.5">
                  {vocabImageStyleOptions().map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setImageStyle(o.id)}
                      className={`overflow-hidden rounded-[10px] border-2 text-left transition-all ${
                        imageStyle === o.id ? "border-primary ring-[3px] ring-primary/30" : "border-border hover:border-ring"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/vocab/styles/${o.id}.png`} alt={`${o.label} 预览`} className="aspect-square w-full object-cover" />
                      <div className="px-2 pb-2 pt-1.5">
                        <div className="flex items-center gap-1 text-xs font-semibold">
                          {o.label}
                          {o.id === DEFAULT_VOCAB_IMAGE_STYLE && (
                            <span className="rounded-full bg-secondary px-1.5 text-[10px] font-medium text-secondary-foreground">默认</span>
                          )}
                        </div>
                        <div className="mt-0.5 text-[10.5px] leading-snug text-muted-foreground">{o.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 发音音色 */}
              <div>
                <label className={labelCls}>
                  发音音色 <span className={tipCls}>edge-tts 生成 · 点 ▶ 试听样音</span>
                </label>
                <div className="flex gap-3.5">
                  {(
                    [
                      ["单词读音", voiceWord, setVoiceWord],
                      ["例句读音", voiceSent, setVoiceSent],
                    ] as const
                  ).map(([label, value, set]) => (
                    <div key={label} className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="w-13 shrink-0 text-xs text-muted-foreground">{label}</span>
                      <select
                        value={value}
                        onChange={(e) => set(e.target.value)}
                        className="min-w-0 flex-1 cursor-pointer appearance-none rounded-lg border border-border bg-card py-[7px] pl-3 pr-[26px] text-xs outline-none transition-all hover:border-ring focus:border-primary focus:ring-[3px] focus:ring-primary/25"
                        style={{
                          backgroundImage:
                            "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%23a8a29e' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 10px center",
                        }}
                      >
                        {VOCAB_TTS_VOICES.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                            {v.id === DEFAULT_WORD_VOICE && label === "单词读音" ? "(默认)" : ""}
                            {v.id === DEFAULT_SENT_VOICE && label === "例句读音" ? "(默认)" : ""}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        title={`试听${label}`}
                        onClick={() => {
                          const v = VOCAB_TTS_VOICES.find((x) => x.id === value);
                          if (v) audition(v.name);
                        }}
                        className={`inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border text-[11px] transition-colors ${
                          playing === VOCAB_TTS_VOICES.find((x) => x.id === value)?.name
                            ? "border-ring bg-ring text-white"
                            : "border-border bg-secondary text-secondary-foreground hover:bg-ring hover:text-white"
                        }`}
                      >
                        {playing === VOCAB_TTS_VOICES.find((x) => x.id === value)?.name ? "■" : "▶"}
                      </button>
                    </div>
                  ))}
                </div>
                {/* 选中音色的描述标签(原型 voice-tag pill) */}
                <div className="mt-2 flex gap-2">
                  {(["单词", "例句"] as const).map((k) => {
                    const v = VOCAB_TTS_VOICES.find((x) => x.id === (k === "单词" ? voiceWord : voiceSent));
                    return (
                      <span key={k} className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] text-muted-foreground">
                        {k} {v?.tag}
                      </span>
                    );
                  })}
                </div>
                <div className="mt-2 rounded-[10px] border border-dashed border-warning/50 bg-secondary px-3.5 py-2.5 text-[12.5px] leading-[1.8] text-secondary-foreground">
                  默认:单词 <b>Andrew</b>(男·美音,节奏自然) / 例句 <b>Emma</b>(女·美音,停顿韵律最佳),例句统一放慢 8%。试音结论:Multilingual 系(Andrew/Emma/Ava/Brian)韵律优于经典英音 Neural 系。
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
              <DialogTitle>
                正在导入「{name.trim() || task.name || "未命名词库"}」
              </DialogTitle>
              <DialogDescription>导入在后台进行,关闭窗口不影响进度</DialogDescription>
            </DialogHeader>

            {/* 大数字进度(原型 big-num)+ 四步列表 */}
            <div className="py-4 text-center">
              <div className="text-[34px] font-extrabold text-primary">
                {task.done} / {task.total}
              </div>
              <div className="mx-auto mt-4 flex max-w-[360px] flex-col gap-2 text-left">
                {stepTexts.map((s, i) => {
                  const active = step === i && running;
                  const finished = step > i || task.status === "done";
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-2.5 text-[13px] ${
                        finished ? "text-foreground" : active ? "font-semibold text-secondary-foreground" : "text-muted-foreground"
                      }`}
                    >
                      <span
                        className={`inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[11px] ${
                          finished
                            ? "bg-success text-white"
                            : active
                              ? "bg-warning text-white"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {finished ? "✓" : i + 1}
                      </span>
                      {s}
                      {i === 3 && <span className="text-muted-foreground">({genCountText})</span>}
                      {active && <span className="animate-pulse text-xs text-primary">进行中…</span>}
                    </div>
                  );
                })}
              </div>
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
