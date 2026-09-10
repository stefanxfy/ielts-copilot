#!/usr/bin/env python3
"""扫描 2023 失败套听力/阅读源目录里的 <1KB 图片，生成 HTML 审查画廊。"""
import base64, json, os, re
from pathlib import Path

ROOT = Path("/Users/fanyunxu/Desktop/myproject/ielts-copilot")
BATCH5 = ROOT / "scripts/_batch5.mjs"
OUT = ROOT / "tmp/2023-problem-images.html"
OUT.parent.mkdir(parents=True, exist_ok=True)

# 1. 解析 SOURCE，建 slug -> (月标签, 套号, 科) 反向映射
src = BATCH5.read_text()
block = re.search(r"const\s+SOURCE\s*=\s*\{([\s\S]*?)\n\};", src).group(1)
# 逐行解析，避免整体 JSON 化
MONTH_LABEL = {
    "january": "1月", "february": "2月", "march": "3月", "april": "4月",
    "may": "5月", "june": "6月", "july": "7月", "august": "8月",
    "september": "9月", "october": "10月", "november": "11月", "december": "12月",
}
slug_map = {}  # slug -> "1月 T1 听力"
cur_month = None
for line in block.splitlines():
    m = re.match(r"\s*(january|february|march|april|may|june|july|august|september|october|november|december)\s*:\s*\{", line)
    if m:
        cur_month = m.group(1)
        continue
    if cur_month is None:
        continue
    # test 行: "  1: { listening: "...", reading: "...", ... }"
    tm = re.match(r"\s*(\d+)\s*:\s*\{", line)
    if tm:
        cur_test = tm.group(1)
        # 抓取同一行的 listening/reading slug（若同行）
        inline = line
    # 抓取 listening / reading 值
    lm = re.search(r"listening:\s*\"([^\"]*)\"", line)
    rm = re.search(r"reading:\s*\"([^\"]*)\"", line)
    if lm and lm.group(1):
        slug_map[lm.group(1)] = f"{MONTH_LABEL[cur_month]} T{cur_test} 听力"
    if rm and rm.group(1):
        slug_map[rm.group(1)] = f"{MONTH_LABEL[cur_month]} T{cur_test} 阅读"

# 2. 扫描全部 <1KB 图片
items = []
for subj_dir in ["听力", "阅读"]:
    base = ROOT / "questions" / subj_dir / "2023"
    if not base.exists():
        continue
    for slug_dir in sorted(base.iterdir()):
        if not slug_dir.is_dir():
            continue
        slug = slug_dir.name
        label = slug_map.get(slug)
        if not label:
            continue
        if slug == "202301listen01":  # 已批准修复的 1月T1听力
            continue
        img_dir = slug_dir / "img"
        if not img_dir.exists():
            continue
        for img in sorted(img_dir.iterdir()):
            if not img.is_file():
                continue
            if img.suffix.lower() not in (".png", ".jpg", ".jpeg"):
                continue
            size = img.stat().st_size
            if size >= 1000:
                continue
            b64 = base64.b64encode(img.read_bytes()).decode()
            ext = img.suffix.lower().lstrip(".")
            if ext == "jpg":
                ext = "jpeg"
            items.append({
                "label": label,
                "slug": slug,
                "filename": img.name,
                "size": size,
                "data_url": f"data:image/{ext};base64,{b64}",
            })

# 3. 生成 HTML
parts = [
    "<!DOCTYPE html><html><head><meta charset='utf-8'><title>2023 问题图片审查</title>",
    "<style>body{font-family:-apple-system,sans-serif;background:#f6f7f9;color:#222;padding:20px}",
    "h1{font-size:22px;margin:0 0 6px}.stats{color:#666;margin-bottom:18px}",
    ".grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}",
    ".card{background:#fff;border-radius:10px;padding:14px;box-shadow:0 1px 3px rgba(0,0,0,.08)}",
    ".card h3{margin:0 0 4px;font-size:14px;color:#c0392b}",
    ".meta{color:#888;font-size:12px;margin-bottom:8px}",
    ".imgbox{background:#fafafa;border:1px solid #eee;border-radius:6px;padding:10px;text-align:center}",
    ".imgbox img{max-width:100%;max-height:240px;height:auto}",
    "</style></head><body>",
    f"<h1>2023 失败套 · 听力/阅读 &lt;1KB 问题图片</h1>",
    f"<div class='stats'>共 {len(items)} 张（已排除已批准的 1月T1听力）。点击图片放大查看。</div>",
    "<div class='grid'>",
]
for it in items:
    parts.append(f"<div class='card'><h3>{it['label']}</h3>")
    parts.append(f"<div class='meta'>{it['slug']} / {it['filename']} · {it['size']} bytes</div>")
    parts.append(f"<div class='imgbox'><img src='{it['data_url']}' alt='{it['filename']}'></div></div>")
parts += ["</div></body></html>"]
OUT.write_text("\n".join(parts))
print(f"生成: {OUT} ({len(items)} 张)")
# 也打印分组清单
from collections import Counter
c = Counter(i["label"] for i in items)
print("按套分布:")
for k, v in sorted(c.items()):
    print(f"  {k}: {v} 张")
