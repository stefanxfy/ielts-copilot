/**
 * src/lib/ui-theme.ts — 皮肤元数据(client 安全,不依赖 DB/Node API)
 *
 * id 与 globals.css 中 html[data-theme=…] 变量块一一对应。
 * "wheat"(麦田琥珀)是 glearn 同源默认,已固化在 :root——应用它 = 移除 data-theme 属性,
 * 因此 CSS 里没有 wheat 块。「夜读·灯下」是暗色皮肤(纯变量覆盖,无 .dark class)。
 */

export const UI_THEME_IDS = [
  "wheat",
  "ink",
  "academia",
  "seasalt",
  "porcelain",
  "bamboo",
  "monet",
  "night",
] as const;

export type UiThemeId = (typeof UI_THEME_IDS)[number];

export const DEFAULT_UI_THEME: UiThemeId = "wheat";

export interface UiThemeMeta {
  id: UiThemeId;
  label: string;
  dark: boolean;
  /** 选择卡色条(还原 glearn 主题卡观感): [底色, 品牌色, 点缀色] */
  swatch: [string, string, string];
}

export const UI_THEMES: readonly UiThemeMeta[] = [
  { id: "wheat", label: "麦田琥珀", dark: false, swatch: ["#fafaf9", "#d97706", "#f59e0b"] },
  { id: "ink", label: "水墨·砚池", dark: false, swatch: ["#f7f5f0", "#a83d29", "#44433d"] },
  { id: "academia", label: "牛津·学院", dark: false, swatch: ["#f8f4ea", "#3a5f4b", "#b28f4a"] },
  { id: "seasalt", label: "海盐·地中海", dark: false, swatch: ["#f5f8f7", "#38708f", "#c26a44"] },
  { id: "porcelain", label: "青花·瓷影", dark: false, swatch: ["#f6f8f9", "#315d84", "#6f9db4"] },
  { id: "bamboo", label: "竹里·空山", dark: false, swatch: ["#f6f8f2", "#467552", "#a89858"] },
  { id: "monet", label: "莫奈·雾紫", dark: false, swatch: ["#f6f5f9", "#656195", "#6f8f7a"] },
  { id: "night", label: "夜读·灯下", dark: true, swatch: ["#171412", "#b07312", "#dda038"] },
];

export function isUiThemeId(v: unknown): v is UiThemeId {
  return typeof v === "string" && (UI_THEME_IDS as readonly string[]).includes(v);
}

/**
 * 把皮肤应用到 <html data-theme>。
 * wheat = 移除属性(:root 即麦田琥珀);其余设置属性。即时生效,持久化由调用方负责。
 */
export function applyUiTheme(id: UiThemeId): void {
  if (typeof document === "undefined") return;
  if (id === "wheat") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", id);
  }
}

/** 当前 <html> 上的皮肤(无属性 = wheat) */
export function currentUiTheme(): UiThemeId {
  if (typeof document === "undefined") return DEFAULT_UI_THEME;
  const v = document.documentElement.getAttribute("data-theme");
  return isUiThemeId(v) ? v : DEFAULT_UI_THEME;
}
