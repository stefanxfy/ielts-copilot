# -*- coding: utf-8 -*-
"""
写作卷换皮脚本（多卷配置驱动；复用 reskin-v2 骨架）：
原 HTML 与 _files 资源原样保留（样式/交互 100% 原味），仅做：
1) 资源引用重定向到 exam-assets/（新资产拷入，已有则跳过；剔除追踪脚本 hm.js）
1b)【引擎补丁】交卷按钮 hover tooltip（原站 "not available" 提示）移除 —— 本地版交卷可用
2) 去站点冗余：Analytics(hm.js/_hmt)、远程 ie 兼容脚本、远程 404 JS、远程字体/favicon、站内跳转中和
3) 去对方品牌：logo 换自绘 SVG、标题/header 品牌块改为「IELTS 本地机考」
4) 主题覆盖层：原站色 → 原型蓝（含 --writing-gradient）+ 本地 patch（原生滚动/内联图标）
5) 隐私：drupalSettings 里的 uid/email 置空（存档页带出的账号信息）
6) 注入 clock-sec.js（倒计时到秒）+ writing-note.js（拦截交卷/保存/时间到，写作无客观判分）

用法：python3 reskin-writing.py            # 跑 JOBS 里全部卷（产物已存在也重新生成，幂等）
      python3 reskin-writing.py gt-w1      # 只跑指定 key
新增一卷 = 在 JOBS 加一条配置。
"""
import re, os, shutil, sys

OUT_DIR = "/Users/fanyunxu/Desktop/myproject/ielts-copilot/prototype"
ASSET_DIR = os.path.join(OUT_DIR, "exam-assets")
QUESTIONS_ROOT = "/Users/fanyunxu/Desktop/myproject/ielts-copilot/questions/写作"

JOBS = [
    {
        "key": "a-w1",
        "src_dir": os.path.join(QUESTIONS_ROOT),
        "out": os.path.join(OUT_DIR, "a-writing-test.html"),
        "title": "IELTS 本地机考 · A类写作 · 2025 January Test 1",
        "brand": "A类 · 写作 · 2025 January Test 1",
    },
    {
        "key": "gt-w1",
        "src_dir": os.path.join(QUESTIONS_ROOT, "培训类", "雅思真题试卷 一月 雅思写作真题 1"),
        "out": os.path.join(OUT_DIR, "gt-writing-test.html"),
        "title": "IELTS 本地机考 · G类写作 · 一月卷 Test 1",
        "brand": "G类 · 写作 · 一月卷 Test 1",
    },
]

DROP = {"hm.js"}
KEEP_EXT = (".css", ".js", ".svg", ".png", ".jpg", ".jpeg", ".woff2", ".html", ".ico")

# 写作引擎（存档页专属 hash 名,两卷共用同一副本）
WRITING_ENGINE = "js_99kWBb40amBkh-aKfGzc8uj0BHJ2j62AJQLYVc4Jdog.js"


def patch_writing_engine():
    """交卷按钮 hover tooltip（"This function is not available in the real IELTS
    on computer test"）移除：本地版交卷由 writing-note 拦截，该提示语义不成立。
    替换文本自身即 marker，幂等；引擎文件已被拷入 exam-assets 后才可补（缺失则跳过）。"""
    import re as _re
    path = os.path.join(ASSET_DIR, WRITING_ENGINE)
    if not os.path.exists(path):
        print("      ⚠ 写作引擎 %s 不在 exam-assets,跳过 tooltip 补丁" % WRITING_ENGINE[:16])
        return
    j = open(path, encoding="utf-8").read()
    needle = _re.compile(r"\$\('\.realtest-header__bt-submit'\)\.tooltip\(\{[\s\S]*?\}\);")
    patch = ("/*[ielts-local-patched] 交卷按钮 tooltip 移除:本地版交卷可用"
             "(scoring/exam-note 拦截),原站 not-available 提示不再出现*/;")
    n = len(needle.findall(j))
    if n:
        open(path, "w", encoding="utf-8").write(needle.sub(patch, j))
    print("      engine 交卷 tooltip 移除: %d 处%s" % (n, "" if n else " (已处理/无需)"))


def reskin(cfg):
    src_html = os.path.join(cfg["src_dir"], "参加测试 _ IELTS Online Tests.html")
    src_files = os.path.join(cfg["src_dir"], "参加测试 _ IELTS Online Tests_files")
    orig_ref = "./参加测试 _ IELTS Online Tests_files/"

    # ---- 0. 资源：拷贝原 _files（逐字节一致），已有跳过；剔除追踪脚本 ----
    os.makedirs(ASSET_DIR, exist_ok=True)
    copied, fresh = [], []
    for f in sorted(os.listdir(src_files)):
        if f in DROP or f.startswith(".") or not f.endswith(KEEP_EXT):
            continue
        dst = os.path.join(ASSET_DIR, f)
        if not os.path.exists(dst):
            shutil.copy2(os.path.join(src_files, f), dst)
            fresh.append(f)
        copied.append(f)
    print("[%s] assets present: %d, newly copied: %s, skipped: %s"
          % (cfg["key"], len(copied), fresh or "无",
             sorted(set(os.listdir(src_files)) - set(copied))))

    # ---- 0b. 引擎补丁：交卷按钮 tooltip 移除（幂等） ----
    print("[%s] patching engine:" % cfg["key"])
    patch_writing_engine()

    html = open(src_html, encoding="utf-8").read()

    # ---- 1. 资源引用重定向 ----
    html = html.replace(orig_ref, "./exam-assets/")

    # ---- 2. 删除远程/追踪引用 ----
    html = re.sub(r'<script>\s*var _hmt[\s\S]*?</script>', '', html)
    html = re.sub(r'<script[^>]*src="[^"]*/hm\.js[^"]*"[^>]*></script>', '', html)
    html = html.replace('<script src="https://oss.maxcdn.com/libs/html5shiv/3.7.0/html5shiv.js"></script>', '')
    html = html.replace('<script src="https://oss.maxcdn.com/libs/respond.js/1.4.2/respond.min.js"></script>', '')
    html = re.sub(r'<script src="/sites/default/files/js/[^"]*"></script>', '', html)
    html = re.sub(r'<link rel="preload"[^>]*fontawesome-webfont\.woff2[^>]*>', '', html)
    html = re.sub(r'<link[^>]*ieltsonlinetests\.com/themes/iot/favicon\.ico[^>]*>', '', html)
    html = re.sub(r'<link rel="[^"]*"[^>]*href="https://[a-z]*\.?ieltsonlinetests\.com[^>]*>', '', html)
    html = re.sub(r'href="https://[a-z]*\.?ieltsonlinetests\.com[^"]*"', 'href="#"', html)
    html = re.sub(r'action="https://[a-z]*\.?ieltsonlinetests\.com[^"]*"', 'action="#"', html)

    # ---- 3. 品牌替换 ----
    html = re.sub(r'<title>[\s\S]*?</title>', '<title>%s</title>' % cfg["title"], html, count=1)
    LOGO_SVG = ('<svg class="realtest-header__logo" style="height:38px;width:38px" viewBox="0 0 38 38" '
                'xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">'
                '<stop offset="0" stop-color="#1a6feb"/><stop offset="1" stop-color="#0d4fa8"/></linearGradient></defs>'
                '<rect width="38" height="38" rx="9" fill="url(#lg)"/><text x="19" y="25.5" font-size="16" '
                'font-weight="700" fill="#fff" text-anchor="middle" font-family="PingFang SC, sans-serif">雅</text></svg>')
    html = re.sub(r'<img src="[^"]*IOT_ShortLogo[^"]*"[^>]*>', LOGO_SVG, html)
    BRAND_BLOCK = ('<div class="ieltshome-brand" style="display:flex;flex-direction:column;justify-content:center;'
                   'margin-right:10px;line-height:1.25"><span style="font-size:14px;font-weight:700;color:#1c2330">'
                   'IELTS 本地机考</span><span style="font-size:11px;color:#5a6472">%s</span></div>' % cfg["brand"])
    html = html.replace('</svg><div class="realtest-header__time ',
                        '</svg>' + BRAND_BLOCK + '<div class="realtest-header__time ', 1)

    # ---- 4. 主题覆盖层 + 本地 patch ----
    OVERRIDE = '''
<!-- ===== 主题覆盖层（自有品牌，覆盖原站配色，不动布局与交互） ===== -->
<style id="ieltshome-theme">
:root{
  --blue:#1a6feb; --blue-d:#0d4fa8;
  --reading-gradient:linear-gradient(180deg,#1a6feb 0%,#0d4fa8 100%)!important;
  --listening-gradient:linear-gradient(180deg,#1a6feb 0%,#0d4fa8 100%)!important;
  --writing-gradient:linear-gradient(180deg,#1a6feb 0%,#0d4fa8 100%)!important;
  --speaking-gradient:linear-gradient(180deg,#1a6feb 0%,#0d4fa8 100%)!important;
  --bg-gradient:linear-gradient(180deg,#1a6feb 0%,#0d4fa8 100%)!important;
  --main-gradient:linear-gradient(180deg,#1a6feb 0%,#0d4fa8 100%)!important;
  --main-color:#1a6feb!important;
}
.realtest-header__bt-submit,.realtest-header__bt-save{background:linear-gradient(180deg,#1a6feb 0%,#0d4fa8 100%)!important}
.realtest-header__time:before{color:#1a6feb!important}
.realtest-header__time-val{color:#1c2330!important;font-weight:600!important}
.realtest-header__time-text{color:#5a6472!important}
/* 写作编辑器聚焦与字数统计 */
.writing-box__answer:focus{outline:none!important;border-color:#1a6feb!important;box-shadow:0 0 0 2px rgba(26,111,235,.18)!important}
.writing-box__words-num{color:#1a6feb!important;font-weight:700!important}
.writing-box__words-count{color:#5a6472!important}
/* 输入控件统一蓝 */
input:focus,select:focus,textarea:focus{outline-color:#1a6feb!important}
input[type=radio]{accent-color:#1a6feb!important}
input[type=checkbox]{accent-color:#1a6feb!important}
/* 题号板选中态 */
.question-palette__item.is-selected{background:#1a6feb!important;color:#fff!important;border-color:#1a6feb!important}
/* 弹窗按钮 */
.iot-grbt.-main-color{background:linear-gradient(180deg,#1a6feb 0%,#0d4fa8 100%)!important}
*::-webkit-scrollbar-thumb{background:#c9d2df!important;border-radius:4px!important}
</style>
<!-- ===== 本地 patch：原生滚动条外观（对齐原 nicescroll 视觉） ===== -->
<style id="native-scroll-patch">
.test-contents::-webkit-scrollbar,.test-panel::-webkit-scrollbar,.writing-box__answer-wrapper::-webkit-scrollbar{width:8px;height:8px}
.test-contents::-webkit-scrollbar-thumb,.test-panel::-webkit-scrollbar-thumb,.writing-box__answer-wrapper::-webkit-scrollbar-thumb{background:#dfdfdf;border-radius:6px}
.test-contents::-webkit-scrollbar-thumb:hover,.test-panel::-webkit-scrollbar-thumb:hover,.writing-box__answer-wrapper::-webkit-scrollbar-thumb:hover{background:#c9c9c9}
.test-contents::-webkit-scrollbar-track,.test-panel::-webkit-scrollbar-track,.writing-box__answer-wrapper::-webkit-scrollbar-track{background:transparent}
.test-contents,.test-panel,.writing-box__answer-wrapper{scrollbar-width:thin;scrollbar-color:#dfdfdf transparent}</style>
<!-- ===== 本地 patch：header 图标字体本地缺失，改内联 SVG ===== -->
<style id="header-icons-patch">
.realtest-header__icon.-note:after,.realtest-header__icon.-full-screen:after{content:none}
.realtest-header__icon.-note{width:22px;height:22px;margin-left:16px;background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23294563' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'/><path d='M18.4 2.6a2.1 2.1 0 1 1 3 3L12 15l-4 1 1-4Z'/></svg>") center/contain no-repeat}
.realtest-header__icon.-full-screen{width:22px;height:22px;margin-left:16px;background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23294563' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M8 3H5a2 2 0 0 0-2 2v3'/><path d='M21 8V5a2 2 0 0 0-2-2h-3'/><path d='M3 16v3a2 2 0 0 0 2 2h3'/><path d='M16 21h3a2 2 0 0 0 2-2v-3'/></svg>") center/contain no-repeat}
.realtest-header__icon.-full-screen.active{background-image:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23294563' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M8 3v3a2 2 0 0 1-2 2H3'/><path d='M21 8h-3a2 2 0 0 1-2-2V3'/><path d='M3 16h3a2 2 0 0 1 2 2v3'/><path d='M16 21v-3a2 2 0 0 1 2-2h3'/></svg>")}
.realtest-header__icon.-note:hover,.realtest-header__icon.-full-screen:hover{opacity:.7}</style>
'''
    html = html.replace('</head>', OVERRIDE + '</head>', 1)

    # ---- 5. 隐私：uid/email 置空 ----
    n_uid = len(re.findall(r'"uid":"\d+"', html))
    n_mail = len(re.findall(r'"email":"[^"]*"', html))
    html = re.sub(r'"uid":"\d+"', '"uid":"0"', html)
    html = re.sub(r'"email":"[^"]*"', '"email":""', html)
    print("[%s] privacy scrubbed: uid x%d, email x%d" % (cfg["key"], n_uid, n_mail))

    # ---- 6. 注入 clock-sec.js + exam-note.js（写作/听力通用练习提示） ----
    NOTE_TAG = ('\n<!-- 倒计时到秒 + 练习提示：拦截原站交卷/保存行为（写作无客观判分，正式版走 AI 四维批改） -->\n'
                '<script src="./exam-assets/clock-sec.js"></script>\n'
                '<script src="./exam-assets/exam-note.js"></script>\n')
    html = html.replace('</body>', NOTE_TAG + '</body>', 1)

    with open(cfg["out"], "w", encoding="utf-8") as f:
        f.write(html)

    # 自检
    chk = open(cfg["out"], encoding="utf-8").read()
    print("[%s] written: %s (%.0f KB) | assets-refs=%d iot-refs=%d logo=%d _hmt=%d remotejs=%d email=%d note=%d" % (
        cfg["key"], cfg["out"], os.path.getsize(cfg["out"]) / 1024,
        chk.count("./exam-assets/"), len(re.findall(r'ieltsonlinetests', chk)),
        chk.count("IOT_ShortLogo"), chk.count("_hmt"),
        len(re.findall(r'src="/sites/', chk)), len(re.findall(r'cvte\.com', chk)),
        chk.count("writing-note.js")))


if __name__ == "__main__":
    only = sys.argv[1] if len(sys.argv) > 1 else None
    for cfg in JOBS:
        if only and cfg["key"] != only:
            continue
        reskin(cfg)
