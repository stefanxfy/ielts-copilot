#!/usr/bin/env python3
"""
Task #47: 硬编码 hex 色值 → Tailwind 语义类名 机械替换
只在 src/**/*.tsx 的 className 字符串里做 token 级替换，语义映射见 REPLACE_TABLE。
recharts 的 JS 内联 fill/stroke 不在此处理（后续单独接 CSS 变量）。
"""
import re
from pathlib import Path

SRC = Path("/Users/fanyunxu/Desktop/myproject/ielts-copilot/src")

# 顺序敏感：先替换复合色（含 hover:），再替换单色
REPLACE_TABLE = [
    # —— 按钮主色 hover 对 ——
    ("bg-[#1a6feb] hover:bg-[#0d4fa8]", "bg-primary hover:bg-primary/90"),
    ("bg-[#1a6feb] hover:bg-[#155fd0]", "bg-primary hover:bg-primary/90"),
    ("hover:bg-[#0d4fa8]", "hover:bg-primary/90"),
    ("hover:bg-[#155fd0]", "hover:bg-primary/90"),
    ("bg-[#0d4fa8]", "bg-primary"),
    ("text-[#0d4fa8]", "text-primary"),
    # —— 品牌蓝 ——
    ("border-[#1a6feb]", "border-primary"),
    ("ring-[#1a6feb]", "ring-primary"),
    ("text-[#1a6feb]", "text-primary"),
    ("bg-[#1a6feb]", "bg-primary"),
    ("accent-[#1a6feb]", "accent-primary"),
    ("bg-[#e8f0fe]", "bg-primary/10"),
    ("bg-[#eef3fb]", "bg-primary/10"),
    ("bg-[#eef4ff]", "bg-primary/10"),
    ("bg-[#e8f7f0]", "bg-success/10"),
    # —— 边框/底色 ——
    ("border-[#dfe4ec]", "border-border"),
    ("bg-[#fafbfc]", "bg-muted/50"),
    ("bg-[#f7f9fc]", "bg-muted/60"),
    ("bg-[#f2f5f9]", "bg-secondary"),
    ("hover:bg-[#e6edf6]", "hover:bg-accent"),
    ("bg-[#f1f4f9]", "bg-secondary"),
    ("hover:bg-[#f1f4f9]", "hover:bg-accent"),
    ("bg-[#fdeeec]", "bg-destructive/10"),
    ("hover:text-[#d5453c]", "hover:text-destructive"),
    ("border-[#c9d2e0]", "border-border"),
    ("border-[#c9d7f5]", "border-primary/30"),
    ("border-[#cde8da]", "border-success/30"),
    ("border-[#cde8da]", "border-success/30"),
    # —— 文字灰阶 ——
    ("text-[#1c2330]", "text-foreground"),
    ("text-[#5b6574]", "text-muted-foreground"),
    ("text-[#8a93a2]", "text-muted-foreground"),
    ("text-[#c3cad4]", "text-muted-foreground/50"),
    # —— 成功/警告/错误 ——
    ("text-[#18925c]", "text-success"),
    ("text-[#1a9e5c]", "text-success"),
    ("bg-[#1a9e5c]", "bg-success"),
    ("bg-[#18925c]", "bg-success"),
    ("bg-[#eefaf3]", "bg-success/10"),
    ("bg-[#e8f7f0]", "bg-success/10"),
    ("text-[#c0392b]", "text-destructive"),
    ("bg-[#fdf1f1]", "bg-destructive/10"),
    ("border-[#fde8e8]", "border-destructive/30"),
    ("text-[#a06a12]", "text-warning"),
    ("text-[#c07d10]", "text-warning"),
    ("text-[#f0a03c]", "text-warning"),
    ("bg-[#f0a03c]", "bg-warning"),
    ("outline-[#f0a03c]", "outline-warning"),
    # —— 顶栏旧深蓝（残留兜底）——
    ("bg-[#10233f]", "bg-card"),
    ("text-[#7db2ff]", "text-primary"),
    ("text-[#10233f]", "text-foreground"),
    # —— 卡片 hover 阴影里的深蓝 rgba ——
    ("hover:shadow-[0_3px_10px_rgba(16,35,63,0.08)]", "hover:shadow-lg hover:shadow-primary/10"),
    ("hover:border-[#1a6feb]", "hover:border-primary"),
    ("hover:text-[#1a6feb]", "hover:text-primary"),
]

changed = {}
for path in SRC.rglob("*.tsx"):
    if path.name == "cute-icons.tsx":
        continue
    text = path.read_text(encoding="utf-8")
    original = text
    for old, new in REPLACE_TABLE:
        text = text.replace(old, new)
    if text != original:
        path.write_text(text, encoding="utf-8")
        changed[str(path.relative_to(SRC))] = sum(
            original.count(o) for o, _ in REPLACE_TABLE
        )

print(f"changed files: {len(changed)}")
for k in sorted(changed):
    print(f"  {k}")

# 校验：还有没有漏网硬编码
leftover = []
for path in SRC.rglob("*.tsx"):
    if path.name == "cute-icons.tsx":
        continue
    for m in re.finditer(
        r"#(1a6feb|0d4fa8|155fd0|dfe4ec|8a93a2|5b6574|1c2330|10233f|7db2ff|18925c|1a9e5c|e8871e|f0a03c|c0392b|e8f0fe|eef3fb|eef4ff|eefaf3|e8f7f0|fdf1f1|fdeeec|f1f4f9|f2f5f9|f7f9fc|fafbfc|e6edf6|c9d2e0|c9d7f5|cde8da|c3cad4|a06a12|c07d10|d5453c)",
        path.read_text(encoding="utf-8"),
    ):
        leftover.append(f"{path.relative_to(SRC)}: {m.group(0)}")
print(f"\nleftover hardcoded: {len(leftover)}")
for l in leftover[:40]:
    print(f"  {l}")
