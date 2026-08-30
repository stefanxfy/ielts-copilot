# -*- coding: utf-8 -*-
"""
v2 换皮方案：原 HTML 与 _files 资源全部原样保留（样式/交互 100% 原味），
仅做三件事：
1) 主题覆盖层（CSS 变量重定义 + 少量品牌元素替换）：原阅读绿 → 我们原型蓝
2) 去对方品牌：logo 换成自绘 SVG、标题/语言元信息改掉
3) 去站点冗余：Analytics(hm.js/baidu)、远程 ie 兼容脚本、外部远程 JS(404)、字体远程引用
产出：gt-reading-test.html（引用同目录 exam-assets/ 下的原资源）
"""
import re, os, shutil

SRC_DIR = "/Users/fanyunxu/Desktop/雅思真题html"
SRC_HTML = os.path.join(SRC_DIR, "雅思真题试卷 一月 雅思阅读真题 1.html")
SRC_FILES = os.path.join(SRC_DIR, "雅思真题试卷 一月 雅思阅读真题 1_files")
OUT_DIR = "/Users/fanyunxu/WorkBuddy/2026-08-28-15-08-37/prototype"
ASSET_DIR = os.path.join(OUT_DIR, "exam-assets")
OUT = os.path.join(OUT_DIR, "gt-reading-test.html")

# ---- 0. 资源目录：拷贝原 _files（全部原样复制，逐字节一致），仅剔除追踪脚本 hm.js ----
os.makedirs(ASSET_DIR, exist_ok=True)
DROP = {"hm.js"}  # 百度统计，属追踪而非功能
KEEP_EXT = (".css", ".js", ".svg", ".png", ".jpg", ".jpeg", ".woff2", ".html", ".ico")
copied = []
for f in sorted(os.listdir(SRC_FILES)):
    if f in DROP or f.startswith(".") or not f.endswith(KEEP_EXT):
        continue
    dst = os.path.join(ASSET_DIR, f)
    if not os.path.exists(dst):
        shutil.copy2(os.path.join(SRC_FILES, f), dst)
    copied.append(f)
print("assets copied:", len(copied), "skipped:", sorted(set(os.listdir(SRC_FILES)) - set(copied)))

html = open(SRC_HTML, encoding="utf-8").read()
ORIG_FILES_REF = "./雅思真题试卷 一月 雅思阅读真题 1_files/"

# ---- 1. 资源引用重定向到 exam-assets/ ----
html = html.replace(ORIG_FILES_REF, "./exam-assets/")

# ---- 2. 删除远程/追踪引用 ----
# baidu analytics inline snippet + hm.js 引用（追踪脚本，功能无关）
html = re.sub(r'<script>\s*var _hmt[\s\S]*?</script>', '', html)
html = re.sub(r'<script src="[^"]*/hm\.js"></script>', '', html)
# 远程 ie 兼容脚本（本地离线无意义）
html = html.replace('<script src="https://oss.maxcdn.com/libs/html5shiv/3.7.0/html5shiv.js"></script>', '')
html = html.replace('<script src="https://oss.maxcdn.com/libs/respond.js/1.4.2/respond.min.js"></script>', '')
# 远程绝对路径 JS（未随保存页落地，本地必 404）
html = re.sub(r'<script src="/sites/default/files/js/[^"]*"></script>', '', html)
# 远程字体（离线场景删除引用，CSS 已有 fallback 字体栈）
html = re.sub(r'<link rel="preload"[^>]*fontawesome-webfont\.woff2[^>]*>', '', html)
html = re.sub(r'<link[^>]*https://ieltsonlinetests\.com/themes/iot/favicon\.ico[^>]*>', '', html)
# 语言 alternate / canonical / devel / delete 等站点元链接（对本地无意义且暴露来源）
html = re.sub(r'<link rel="[^"]*"[^>]*href="https://ieltsonlinetests\.com[^>]*>', '', html)
# 正文中残留的站内跳转 <a>（交卷后的引导链接等）改为 #
html = re.sub(r'href="https://ieltsonlinetests\.com[^"]*"', 'href="#"', html)
# 表单 action（笔记搜索/订单表单）本地中和，防误触外跳
html = re.sub(r'action="https://ieltsonlinetests\.com[^"]*"', 'action="#"', html)

# ---- 3. 品牌替换 ----
# 3a. 标题
html = re.sub(r'<title>[\s\S]*?</title>', '<title>IELTS 本地机考 · G类阅读 · 一月卷 Test 1</title>', html)
# 3b. logo → 自绘 SVG（蓝色圆角方块 + 雅），并让 header 显示我们的产品名
LOGO_SVG = ('<svg class="realtest-header__logo" style="height:38px;width:38px" viewBox="0 0 38 38" '
            'xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">'
            '<stop offset="0" stop-color="#1a6feb"/><stop offset="1" stop-color="#0d4fa8"/></linearGradient></defs>'
            '<rect width="38" height="38" rx="9" fill="url(#lg)"/><text x="19" y="25.5" font-size="16" '
            'font-weight="700" fill="#fff" text-anchor="middle" font-family="PingFang SC, sans-serif">雅</text></svg>')
html = re.sub(r'<img src="[^"]*IOT_ShortLogo[^"]*"[^>]*>', LOGO_SVG, html)
# 3c. header 品牌名：在 logo 后插入产品标识（原 header 只有 logo+计时+按钮，插入一个品牌块）
BRAND_BLOCK = ('<div class="ieltshome-brand" style="display:flex;flex-direction:column;justify-content:center;'
               'margin-right:10px;line-height:1.25"><span style="font-size:14px;font-weight:700;color:#1c2330">'
               'IELTS 本地机考</span><span style="font-size:11px;color:#5a6472">G类 · 阅读 · 一月卷 Test 1</span></div>')
html = html.replace('</svg><div class="realtest-header__time ', '</svg>' + BRAND_BLOCK + '<div class="realtest-header__time ', 1)

# ---- 4. 主题覆盖层：原阅读绿系 → 原型蓝系 ----
OVERRIDE = '''
<!-- ===== 主题覆盖层（自有品牌，覆盖原站配色，不动布局与交互） ===== -->
<style id="ieltshome-theme">
:root{
  /* 原站：--reading-gradient 绿 / --main-color #37854D / --bg-gradient 绿 */
  --blue:#1a6feb; --blue-d:#0d4fa8;
  --reading-gradient:linear-gradient(180deg,#1a6feb 0%,#0d4fa8 100%)!important;
  --listening-gradient:linear-gradient(180deg,#1a6feb 0%,#0d4fa8 100%)!important;
  --writing-gradient:linear-gradient(180deg,#1a6feb 0%,#0d4fa8 100%)!important;
  --speaking-gradient:linear-gradient(180deg,#1a6feb 0%,#0d4fa8 100%)!important;
  --bg-gradient:linear-gradient(180deg,#1a6feb 0%,#0d4fa8 100%)!important;
  --main-gradient:linear-gradient(180deg,#1a6feb 0%,#0d4fa8 100%)!important;
  --main-color:#1a6feb!important;
}
/* 顶栏提交按钮 */
.realtest-header__bt-submit{background:linear-gradient(180deg,#1a6feb 0%,#0d4fa8 100%)!important}
/* 计时器图标与文字色 */
.realtest-header__time:before{color:#1a6feb!important}
.realtest-header__time-val{color:#1c2330!important;font-weight:600!important}
.realtest-header__time-text{color:#5a6472!important}
/* 高亮笔颜色（原绿改蓝） */
mark, .highlight, [class*="highlight"]{--highlight-color:#bod}
/* 输入框聚焦/选中态统一蓝 */
input:focus,select:focus{outline-color:#1a6feb!important}
.iot-radio input[type=radio]:checked+* , .iot-radio input:checked{accent-color:#1a6feb}
input[type=radio]{accent-color:#1a6feb!important}
input[type=checkbox]{accent-color:#1a6feb!important}
/* 题号板选中态 */
.question-palette__item.is-selected{background:#1a6feb!important;color:#fff!important;border-color:#1a6feb!important}
/* 下拉框 */
select.iot-dropdown{accent-color:#1a6feb}
/* 滚动条 */
*::-webkit-scrollbar-thumb{background:#c9d2df!important;border-radius:4px!important}
/* 弹窗按钮 */
.iot-grbt.-main-color{background:linear-gradient(180deg,#1a6feb 0%,#0d4fa8 100%)!important}
</style>
'''
# 注入位置：紧随最后一个 </head> 前的样式之后 —— 放在 </head> 前保证覆盖优先级
html = html.replace('</head>', OVERRIDE + '</head>', 1)

# ---- 5. 判分引擎接入：答案数据 + 判分脚本（交卷后自动判分算 band） ----
SCORING_TAGS = ('\n<!-- 倒计时到秒 + 判分引擎：答案数据 + 通用判分（本地） -->\n'
                '<script src="./exam-assets/clock-sec.js"></script>\n'
                '<script src="./exam-assets/answers-gt-vol1-test1.js"></script>\n'
                '<script src="./exam-assets/scoring.js"></script>\n')
html = html.replace('</body>', SCORING_TAGS + '</body>', 1)

with open(OUT, "w", encoding="utf-8") as f:
    f.write(html)
print("written:", OUT, f"{os.path.getsize(OUT)/1024:.0f} KB")

# 快速自检
chk = open(OUT, encoding="utf-8").read()
print("exam-assets refs:", chk.count("./exam-assets/"))
print("ieltsonlinetests refs left:", len(re.findall(r'ieltsonlinetests', chk)))
print("IOT logo left:", chk.count("IOT_ShortLogo"))
print("baidu analytics left:", chk.count("_hmt"))
print("remote js left:", len(re.findall(r'src="/sites/', chk)))
