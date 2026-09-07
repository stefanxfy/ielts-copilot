/**
 * regen-dialog.tsx — 单词物料重生成弹窗(S2 词表浏览页)
 *
 * 三 tab:配图(5 风格缩略图选一,重生成/首次生成) · 单词读音(音色下拉+▶试听) ·
 * 例句读音(音色下拉,选哪条例句)。提交调 POST /api/vocab-regen 同步等待。
 *
 * 交互约定:成功后 onRegenerated() 让父页重拉数据;音频成功自动重播一次新音。
 * 主题铁律:全部语义 token,不写死色值、无 dark: 变体。
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DEFAULT_VOCAB_IMAGE_STYLE,
  VOCAB_IMAGE_STYLES,
  vocabImageStyleOptions,
  type VocabImageStyleId,
} from "@/lib/vocab-image-styles";
import { VOCAB_TTS_VOICES } from "@/lib/vocab-tts-voices";

type RegenTab = "image" | "audio-word" | "audio-sent";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 目标单词 */
  word: string;
  /** 例句数(audio-sent tab 的选择范围;0 则隐藏该 tab) */
  exampleCount: number;
  /** 当前是否已有配图(文案区分"重新生成"/"生成配图") */
  hasImage: boolean;
  /** 成功回调(父页重拉数据) */
  onRegenerated: (what: RegenTab, webPath?: string) => void;
}

const selectArrow =
  "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%23a8a29e' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")";

export function RegenDialog({ open, onOpenChange, word, exampleCount, hasImage, onRegenerated }: Props) {
  const [tab, setTab] = useState<RegenTab>("image");
  const [style, setStyle] = useState<VocabImageStyleId>(DEFAULT_VOCAB_IMAGE_STYLE);
  const [voice, setVoice] = useState(VOCAB_TTS_VOICES[0]?.id ?? "en-US-AndrewMultilingualNeural");
  const [sentIdx, setSentIdx] = useState(0);
  const [busy, setBusy] = useState(false);

  // 每次打开重置到配图 tab(setTimeout(0) 过 react-hooks/set-state-in-effect)
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      setTab("image");
      setSentIdx(0);
      setBusy(false);
    }, 0);
    return () => clearTimeout(t);
  }, [open]);

  // 试听(样音 mp3,与导入弹窗同源)
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  useEffect(() => () => audioRef.current?.pause(), []);
  function audition(voiceId: string) {
    const v = VOCAB_TTS_VOICES.find((x) => x.id === voiceId);
    if (!v) return;
    if (playing === v.name) {
      audioRef.current?.pause();
      setPlaying(null);
      return;
    }
    audioRef.current?.pause();
    const a = new Audio(`/vocab/voices/${v.name}.mp3`);
    audioRef.current = a;
    a.onended = () => setPlaying(null);
    void a.play().then(() => setPlaying(v.name)).catch(() => toast.error("试听播放失败"));
  }

  async function submit() {
    setBusy(true);
    try {
      const body: Record<string, unknown> = { word, kind: tab };
      if (tab === "image") body.style = style;
      else body.voice = voice;
      if (tab === "audio-sent") body.sentIdx = sentIdx;

      const resp = await fetch("/api/vocab-regen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await resp.json()) as { ok?: boolean; webPath?: string; error?: string };
      if (!resp.ok || !data.ok) {
        toast.error(data.error ?? "重生成失败");
        return;
      }
      if (tab === "image") {
        toast.success(`配图已生成(${VOCAB_IMAGE_STYLES[style].label})`);
      } else {
        toast.success(tab === "audio-word" ? "单词读音已重新合成" : "例句读音已重新合成");
        // 新音频直接试听(带时间戳参数破缓存)
        audioRef.current?.pause();
        const a = new Audio(`${data.webPath}?t=${Date.now()}`);
        audioRef.current = a;
        void a.play().catch(() => undefined);
      }
      onRegenerated(tab, data.webPath);
      onOpenChange(false);
    } catch {
      toast.error("网络错误");
    } finally {
      setBusy(false);
    }
  }

  const tabs: { id: RegenTab; label: string; hide?: boolean }[] = [
    { id: "image", label: hasImage ? "重新生成配图" : "生成配图" },
    { id: "audio-word", label: "单词读音" },
    { id: "audio-sent", label: "例句读音", hide: exampleCount === 0 },
  ];
  const selectCls =
    "min-w-0 flex-1 cursor-pointer appearance-none rounded-lg border border-border bg-card py-[7px] pl-3 pr-[26px] text-xs outline-none transition-all hover:border-ring focus:border-primary focus:ring-[3px] focus:ring-primary/25";

  const busyText =
    tab === "image" ? "正在生图(约 5~15 秒)…" : "正在合成音频(约 1~3 秒)…";

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-h-[88vh] overflow-y-auto p-5 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            物料重生成 · <span className="font-mono">{word}</span>
          </DialogTitle>
          <DialogDescription>
            配图重新选择风格生成;单词 / 例句读音分别选择音色重新合成
          </DialogDescription>
        </DialogHeader>

        {/* tab 行 */}
        <div className="mt-2 flex gap-2">
          {tabs
            .filter((t) => !t.hide)
            .map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`cursor-pointer rounded-full border px-3.5 py-1 text-xs transition-colors ${
                  tab === t.id
                    ? "border-primary bg-secondary font-semibold text-secondary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-ring"
                }`}
              >
                {t.label}
              </button>
            ))}
        </div>

        <div className="mt-4">
          {tab === "image" && (
            <div>
              <div className="mb-2 text-[13px] font-semibold">
                配图风格 <span className="ml-1.5 text-[11.5px] font-normal text-muted-foreground">点击缩略图选择</span>
              </div>
              <div className="grid grid-cols-5 gap-2.5">
                {vocabImageStyleOptions().map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setStyle(o.id)}
                    className={`overflow-hidden rounded-[10px] border-2 text-left transition-all ${
                      style === o.id ? "border-primary ring-[3px] ring-primary/30" : "border-border hover:border-ring"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/vocab/styles/${o.id}.png`} alt={`${o.label} 预览`} className="aspect-square w-full object-cover" />
                    <div className="px-1.5 pb-1.5 pt-1">
                      <div className="flex items-center gap-1 text-[11px] font-semibold">
                        {o.label}
                        {o.id === DEFAULT_VOCAB_IMAGE_STYLE && (
                          <span className="rounded-full bg-secondary px-1 text-[9px] font-medium text-secondary-foreground">默认</span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-2 text-[11.5px] leading-[1.6] text-muted-foreground">
                {VOCAB_IMAGE_STYLES[style].desc}。已有配图会被覆盖;生成约需 5~15 秒。
              </div>
            </div>
          )}

          {tab === "audio-word" && (
            <div>
              <div className="mb-2 text-[13px] font-semibold">单词读音音色</div>
              <div className="flex items-center gap-2">
                <select
                  value={voice}
                  onChange={(e) => setVoice(e.target.value)}
                  className={selectCls}
                  style={{
                    backgroundImage: selectArrow,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 10px center",
                  }}
                >
                  {VOCAB_TTS_VOICES.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} · {v.tag}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  title="试听样音"
                  onClick={() => audition(voice)}
                  className={`inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border text-[11px] transition-colors ${
                    playing === VOCAB_TTS_VOICES.find((x) => x.id === voice)?.name
                      ? "border-ring bg-ring text-white"
                      : "border-border bg-secondary text-secondary-foreground hover:bg-ring hover:text-white"
                  }`}
                >
                  {playing === VOCAB_TTS_VOICES.find((x) => x.id === voice)?.name ? "■" : "▶"}
                </button>
              </div>
              <div className="mt-2 text-[11.5px] leading-[1.6] text-muted-foreground">
                覆盖原单词读音 mp3,完成即自动试播新音色。
              </div>
            </div>
          )}

          {tab === "audio-sent" && (
            <div className="space-y-3">
              <div>
                <div className="mb-2 text-[13px] font-semibold">选择例句</div>
                <select
                  value={sentIdx}
                  onChange={(e) => setSentIdx(Number(e.target.value))}
                  className={`${selectCls} w-full`}
                  style={{
                    backgroundImage: selectArrow,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 10px center",
                  }}
                >
                  {Array.from({ length: exampleCount }, (_, i) => (
                    <option key={i} value={i}>
                      例句 {i + 1}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="mb-2 text-[13px] font-semibold">例句读音音色</div>
                <div className="flex items-center gap-2">
                  <select
                    value={voice}
                    onChange={(e) => setVoice(e.target.value)}
                    className={selectCls}
                    style={{
                      backgroundImage: selectArrow,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 10px center",
                    }}
                  >
                    {VOCAB_TTS_VOICES.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} · {v.tag}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    title="试听样音"
                    onClick={() => audition(voice)}
                    className={`inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border text-[11px] transition-colors ${
                      playing === VOCAB_TTS_VOICES.find((x) => x.id === voice)?.name
                        ? "border-ring bg-ring text-white"
                        : "border-border bg-secondary text-secondary-foreground hover:bg-ring hover:text-white"
                    }`}
                  >
                    {playing === VOCAB_TTS_VOICES.find((x) => x.id === voice)?.name ? "■" : "▶"}
                  </button>
                </div>
              </div>
              <div className="text-[11.5px] leading-[1.6] text-muted-foreground">
                例句统一放慢 8% 合成;完成即自动试播新音色。
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          {busy && <span className="mr-auto animate-pulse text-xs text-primary">{busyText}</span>}
          <button
            type="button"
            disabled={busy}
            onClick={() => onOpenChange(false)}
            className="cursor-pointer rounded-lg border border-border px-4 py-2 text-sm hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "处理中…" : tab === "image" ? (hasImage ? "重新生成" : "生成配图") : "重新合成"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
