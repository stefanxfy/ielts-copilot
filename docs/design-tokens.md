# 设计 tokens(M3-1 工程版视觉一致地基)

> 把 prototype 抽出的视觉常量集中到 `src/app/globals.css` 的 `:root` 与 `@theme` 中,
> 让工程版 `/`(仪表盘) / `/papers`(题库) / `/settings` 与 prototype 视觉对齐。
>
> 战略选择:**复用 shadcn 默认主题结构 + 用我们的蓝覆盖关键 token** —— 避免重写整个 shadcn 主题。
> 颜色映射(prototype → 工程版 CSS 变量名):`--blue` → `--brand` / `--primary`;`--blue-d` → `--brand-deep`;`--blue-bg` → `--brand-bg`。

## 颜色(原型 `:root{}` 抽出的 11 个变量,完全对齐)

| 原型变量 | 值 | 用途 | 工程版 CSS 变量(globals.css) |
|---|---|---|---|
| `--blue` | `#1a6feb` | 主色 / 顶栏渐变起点 | `--brand` + 覆盖 `--primary` |
| `--blue-d` | `#0d4fa8` | 主色深 / 顶栏渐变终点 | `--brand-deep` |
| `--blue-bg` | `#e8f0fe` | 主色浅背景(选中态/高亮)| `--brand-bg` |
| `--ink` | `#1c2330` | 文本主色 | `--ink`(同) + 覆盖 `--foreground` |
| `--ink-2` | `#5b6574` | 文本次色 | `--ink-2` |
| `--ink-3` | `#8a93a2` | 文本三级 | `--ink-3` |
| `--line` | `#dfe4ec` | 边框/分隔线 | `--line` + 覆盖 `--border` |
| `--bg` | `#f4f6fa` | 页面背景 | `--bg` + 覆盖 `--background` |
| `--card` | `#ffffff` | 卡片背景 | `--card`(同) |
| `--green` | `#18925c` | 正确/绿色 | `--green` |
| `--red` | `#d33c3c` | 错误/红色 | `--red` + 覆盖 `--destructive` |
| `--amber` | `#c07d10` | 警告 | `--amber` |

## 字体(M3 用,与原型一致)

```css
font-family: -apple-system, BlinkMacSystemFont, "PingFang SC",
             "Microsoft YaHei", sans-serif;
```

工程版 layout.tsx 已用 Geist + Geist_Mono;M3-1 不强求统一字体(显示效果肉眼一致即可)。

## 圆角 / 间距

shadcn 默认 `--radius: 0.625rem` 与原型的 `12px` 卡圆角近似;沿用默认。

## 顶栏渐变(原型 `linear-gradient(180deg, #1a6feb 0%, #0d4fa8 100%)`)

工程版不重写顶栏(M3-4 才需要);M3-1 只把 tokens 抽出来。

## 验收

- 打开 `/`、`/papers`、`/settings` 三个页面,肉眼可见与 prototype 对应页面**同色调**(蓝主色 + 灰边框 + 白卡片)
- dev 控制台无报错(主题切换 OK)
- lint + typecheck + build 全绿