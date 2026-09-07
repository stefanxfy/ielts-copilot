/**
 * src/lib/vocab-sfx.ts — 背单词 WebAudio 合成音效(零音频资产)
 *
 * 从 learn/page.tsx 抽出的共享层:页面侧(认词卡键入/判分)与设置侧(键入音效
 * 选择 + 试听)共用同一份实现与风格元数据。AudioContext 惰性单例;所有播报
 * 函数必须挂在用户手势事件里调用(keydown/click),input/change 不属于浏览器
 * "用户激活"事件,在其中的创建/resume 会被拒(Safari 必现)导致全部静音。
 */

let _actx: AudioContext | null = null;
function ctx(): AudioContext {
  _actx =
    _actx ??
    new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  if (_actx.state === "suspended") void _actx.resume();
  return _actx;
}

/** 单音(指数衰减包络) */
export function tone(freq: number, dur: number, delay = 0, type: OscillatorType = "sine", gain = 0.12) {
  try {
    if (typeof window === "undefined") return;
    const a = ctx();
    const t0 = a.currentTime + delay;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(a.destination);
    o.start(t0);
    o.stop(t0 + dur);
  } catch {
    /* 音频不可用则静默 */
  }
}

/** 带通滤波白噪声短脉冲(typewriter 咔嗒用) */
function toneNoise(dur: number, freq: number, gain = 0.05, delay = 0) {
  try {
    if (typeof window === "undefined") return;
    const a = ctx();
    const t0 = a.currentTime + delay;
    const n = Math.floor(a.sampleRate * dur);
    const buf = a.createBuffer(1, n, a.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < n; i++) ch[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource();
    src.buffer = buf;
    const bp = a.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = freq;
    bp.Q.value = 1.2;
    const g = a.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(bp).connect(g).connect(a.destination);
    src.start(t0);
  } catch {
    /* 音频不可用则静默 */
  }
}

/** 频率下扫(pop 用) */
function toneSweep(f1: number, f2: number, dur: number, gain = 0.09) {
  try {
    if (typeof window === "undefined") return;
    const a = ctx();
    const t0 = a.currentTime;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(f1, t0);
    o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(a.destination);
    o.start(t0);
    o.stop(t0 + dur);
  } catch {
    /* 音频不可用则静默 */
  }
}

/* ---------------- 键入音风格(设置页可选) ---------------- */

export type KeySfxStyle = "tick" | "thock" | "typewriter" | "pop" | "scale";

export const DEFAULT_KEY_SFX_STYLE: KeySfxStyle = "tick";

export const KEY_SFX_OPTIONS: { id: KeySfxStyle; label: string; desc: string }[] = [
  { id: "tick", label: "轻脆滴答", desc: "高频短促,久听不吵" },
  { id: "thock", label: "机械轴体", desc: "低频肉感,类红轴重按" },
  { id: "typewriter", label: "复古打字机", desc: "噪声咔嗒 + 低频衬底" },
  { id: "pop", label: "泡泡音", desc: "频率下扫,圆润游戏感" },
  { id: "scale", label: "音阶上行", desc: "五声音阶逐键爬升" },
];

export function isKeySfxStyle(v: unknown): v is KeySfxStyle {
  return typeof v === "string" && KEY_SFX_OPTIONS.some((o) => o.id === v);
}

/** 运行时风格(默认 tick;/learn 挂载时从偏好回填,设置页保存后即时覆写) */
let _keySfxStyle: KeySfxStyle = DEFAULT_KEY_SFX_STYLE;
export function setKeySfxStyle(s: KeySfxStyle): void {
  _keySfxStyle = s;
  _keySeq = 0;
}
export function getKeySfxStyle(): KeySfxStyle {
  return _keySfxStyle;
}

/** 每键计数(scale 风格逐键爬升用;换风格归零) */
let _keySeq = 0;
const PENTA_ST = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21]; // C 五声音阶半音序列

/** 键入音(认词卡拼写线每敲一个字母响一次;风格经 setKeySfxStyle 切换;可临时覆盖——设置页试听未保存风格用) */
export function sfxKey(styleOverride?: KeySfxStyle): void {
  _keySeq++;
  switch (styleOverride ?? _keySfxStyle) {
    case "tick":
      tone(1500, 0.05, 0, "sine", 0.1);
      tone(2600, 0.03, 0, "triangle", 0.05);
      break;
    case "thock":
      tone(170, 0.055, 0, "sine", 0.11);
      tone(640, 0.02, 0, "triangle", 0.03);
      break;
    case "typewriter":
      toneNoise(0.03, 2800, 0.06);
      tone(190, 0.03, 0, "sine", 0.05);
      break;
    case "pop":
      toneSweep(900, 320, 0.06, 0.08);
      break;
    case "scale": {
      const st = PENTA_ST[(_keySeq - 1) % PENTA_ST.length];
      tone(523.25 * 2 ** (st / 12), 0.07, 0, "sine", 0.06);
      break;
    }
  }
}

/** 拼写判对:上行大三度"叮咚"(与三键评分音区分) */
export const sfxSpellOk = () => {
  tone(784, 0.09, 0, "sine", 0.1);
  tone(1174.66, 0.16, 0.07, "sine", 0.1);
};
