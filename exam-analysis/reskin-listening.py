# -*- coding: utf-8 -*-
"""
听力卷换皮脚本（多卷配置驱动；复用 reskin-writing 骨架 + 听力专项处理）：
原 HTML 与 _files 资源原样保留（样式/交互 100% 原味），仅做：
1) 资源引用重定向到 exam-assets/（新资产拷入，已有则跳过；剔除追踪脚本 hm.js）
2) 【听力专项】音频本地化：拷 mp3 到 exam-assets，把 <source> 的远程 OSS 地址改接本地文件
3) 【听力专项】去除开场门槛：.take-test__click-play 是全屏 fixed 遮罩（"Click here to start
   the test"），静态页点不动 —— 用 display:none!important 强制隐藏（不删节点，防站点 JS
   初始化空引用崩溃）；遮罩消失 = 直接进入可用考试状态
4) 去站点冗余 + 去品牌 + 蓝主题 + 本地 patch（与写作卷同款）
5) 隐私：drupalSettings 里的 uid/email 置空
6) 注入 clock-sec.js（倒计时到秒）+ exam-note.js（听力口径练习提示：本套未附答案数据不判分）

用法：python3 reskin-listening.py           # 跑 JOBS 里全部卷
      python3 reskin-listening.py a-l1      # 只跑指定 key
新增一卷 = 在 JOBS 加一条配置。
"""
import re, os, shutil, sys

OUT_DIR = "/Users/fanyunxu/Desktop/myproject/ielts-copilot/prototype"
ASSET_DIR = os.path.join(OUT_DIR, "exam-assets")

JOBS = [
    {
        "key": "a-l1",
        "src_dir": "/Users/fanyunxu/Desktop/myproject/ielts-copilot/questions/听力/学术类/2025年/雅思真题试卷 一月 雅思听力真题 1",
        "src_html": "IELTS Mock Test 2025 January Listening Practice Test 1.html",
        "out": os.path.join(OUT_DIR, "a-listening-test.html"),
        "title": "IELTS 本地机考 · A类听力 · 2025 January Test 1",
        "brand": "A类 · 听力 · 2025 January Test 1",
        # 音频本地化：源 mp3 在卷目录（非 _files），拷为 exam-assets 下 ASCII 名并改接远程引用
        "audio_src": "Practice test 1.mp3",
        "audio_dst": "listening-a-2025jan-test1.mp3",
        # 听力引擎（存档页专属 hash 名）；会被 patch_engine 根除锁/门槛逻辑
        "engine": "js_cL_PFO-VMbqsEVuDp4_vRelXQxye5tq6S7PEmH1m998.js",
    },
]

DROP = {"hm.js"}
KEEP_EXT = (".css", ".js", ".svg", ".png", ".jpg", ".jpeg", ".woff2", ".html", ".ico")


ENGINE_PATCH_MARKER = "/*[ielts-local-patched] 锁/门槛逻辑已根除：见 exam-analysis/reskin-listening.py*/"


def patch_engine(engine_path):
    """根除听力引擎的开场门槛逻辑（改 exam-assets 里的本地副本，幂等）：
    - $('body').addClass('disabled-controls')  → 删除（该类会锁死全页 pointer-events）
    - 门槛相关 .show()                          → .hide()（.take-test__click-play / #js-click-play /
                                                    .take-test__play-btn_click）
    - prev/next 按钮的 Part 级切换 handler     → noop（让位给引擎稍后注册的"题号逐题 + 跨 Part"
                                                    handler,跟用户期望一致:跨 Part 自动跳 +
                                                    题号重置 + palette 同步高亮）
    - prev 分支补题号逐题 + 跨 Part 跳上一 Part 末题 + disable 状态同步
    存档页缺 #listening-audio-player 锚点 → initListeningPlayer 加锁后 else{return} 早退,
    点击处理器从未绑定(门槛点不动、页面锁死的根因)。

    幂等:首行 marker(锁类)命中即 return。
    """
    j = open(engine_path, encoding="utf-8").read()
    if ENGINE_PATCH_MARKER in j:
        print("      engine already patched (lock marker hit), skip")
        return
    stats = {}
    stats = {}
    # 1) 删锁：整个表达式替换为加空类（保留语句结构，兼容分号/逗号上下文）。
    #    完全匹配不会碰 addClass('disabled-controls full-test-wrong') 的全测失败分支。
    LOCK = "$('body').addClass('disabled-controls')"
    stats["lock→noop"] = j.count(LOCK)
    j = j.replace(LOCK, "$('body').addClass('')")
    # 2) 门槛显示 → 隐藏
    for old, new in [
        ("$('.take-test__click-play').show()", "$('.take-test__click-play').hide()"),
        (".find('#js-click-play').show()", ".find('#js-click-play').hide()"),
        ("$('.take-test__play-btn_click').show()", "$('.take-test__play-btn_click').hide()"),
    ]:
        stats[old.split("'")[1][:24]] = j.count(old)
        j = j.replace(old, new)
    # 3) prev/next 的 Part 级切换 handler → noop（让位给题号逐题 handler）
    # 引擎里有两个 `buttons.click(function (event) {`:第一个按 Part 切(整体替换/触发 panel eq 切换),
    # 第二个按题号切(next 分支已经包含跨 Part 跳 + 题号重置 + palette 同步高亮 = 用户期望行为;
    # 但 prev 分支在原引擎里仍走 Part 级,见步骤 4)。
    # 两个 handler 都注册到 jQuery 同一个对象 → 第一个会先跑 → 第二个的题号逻辑失效。
    # 根修:把第一个 handler 整段从 `    buttons.click(function (event) {` 起到配对 `    });` 止
    # 替换为空函数。结束标记用其后的 `    $(document).on('click', '.question-palette__part'`,
    # 因为原站紧跟的是 part click 绑定(块边界天然稳定,引擎不会被未来 patch 误伤)。
    PART_HANDLER_START = "    buttons.click(function (event) {"
    PART_HANDLER_END_MARKER = "    $(document).on('click', '.question-palette__part'"
    start = j.find(PART_HANDLER_START)
    if start == -1:
        stats["part-handler→noop"] = 0
    else:
        end = j.find(PART_HANDLER_END_MARKER, start)
        if end == -1:
            stats["part-handler→noop"] = -1
        else:
            # 用空函数替换整段,保留缩进与换行节奏(让后续 part click 绑定依旧在 4 空格缩进)
            noop = "    buttons.click(function (event) { /*[ielts-local-patched] 整段让位给下方题号逐题 handler*/ });"
            j = j[:start] + noop + "\n\n    " + j[end + len("    "):]
            stats["part-handler→noop"] = 1

    # 4) prev 补题号逐题分支（对称 next 的逻辑，但跨 Part 跳上一 Part 末题而不是 Part 1）
    # 原引擎第二个 handler 的 else 分支仍是 Part 级退 → 需要把 `} else { nextPartIndex = currentPartIndex - 1; }`
    # 整段替换为：拿到当前 is-selected 题号,前移 1,若仍在本 Part → trigger click;若已跨 Part 边界
    # → 找上一 Part 的最后一个题号,trigger click 并切 Part。
    # 关键锚点：紧跟其后的 `if (nextPartIndex === totalTestPart || nextPartIndex < 0)` 是边界判断,
    # 它对 prev 也成立（Part 1 Q1 prev → nextPartIndex=-1 → event.preventDefault + return true）,
    # 但 prev 不需要"强制 disable"逻辑,这一行被替换为 noop 也没问题。
    PREV_NEEDLE = "      } else {\n        nextPartIndex = currentPartIndex - 1;\n      }"
    PREV_PATCH = (
        "      } else {\n"
        "        /*[ielts-local-patched] prev 改题号逐题 + 跨 Part 跳上一 Part 末题(对称 next 分支)*/\n"
        "        var part, element_question;\n"
        "        var part_active_prev = $('.question-palette__part.-active').attr('data-part');\n"
        "        var num_question_prev = $('.question-palette__item.is-selected').attr('data-num');\n"
        "        if (num_question_prev.toString().indexOf('-') !== -1) {\n"
        "          num_question_prev = num_question_prev.toString().split('-')[0];\n"
        "        }\n"
        "        num_question_prev--;\n"
        "        if (num_question_prev < 1) { return; }  /* Part 1 Q1 prev → 禁用 */\n"
        "        /* 当前 Part 内有前一题 → trigger click,不走跨 Part 分支 */\n"
        "        if ($('.question-palette__item[data-num=\"' + num_question_prev + '\"]').length) {\n"
        "          element_question = $('.question-palette__item[data-num=\"' + num_question_prev + '\"]');\n"
        "          part = element_question.closest('.question-palette__part').attr('data-part');\n"
        "          if (part === part_active_prev) {\n"
        "            element_question.trigger('click');\n"
        "            return;\n"
        "          }\n"
        "        }\n"
        "        /* 块题(MATCH)检测：找包含 num_question_prev 的 data-num-start..data-num-end 块 */\n"
        "        else if ($('.question-palette__item[data-num-end=\"' + num_question_prev + '\"]').length) {\n"
        "          element_question = $('.question-palette__item[data-num-end=\"' + num_question_prev + '\"]');\n"
        "          part = element_question.closest('.question-palette__part').attr('data-part');\n"
        "          if (part === part_active_prev) {\n"
        "            element_question.trigger('click');\n"
        "            return;\n"
        "          }\n"
        "        }\n"
        "        /* 跨 Part：找当前 Part 之前一 Part 的最后一道题,trigger click（engine palette click handler 会负责切 panel + 滚到题 + 高亮）*/\n"
        "        var prevPartIndex = currentPartIndex - 1;\n"
        "        if (prevPartIndex < 0) { return; }  /* 已经是 Part 1,prev 禁用 */\n"
        "        var prevPartLastItem = partPaletteElement.eq(prevPartIndex).find('.question-palette__item').last();\n"
        "        prevPartLastItem.trigger('click');\n"
        "        return;\n"
        "      }"
    )
    if PREV_NEEDLE in j:
        j = j.replace(PREV_NEEDLE, PREV_PATCH, 1)
        stats["prev→题号逐题"] = 1
    else:
        stats["prev→题号逐题"] = -1

    # 5) prev/next disable 状态集中维护
    # 原引擎只在 Part 切换时维护 prev/next disabled,题号逐题切换不维护 → Part 1 Q1 时 prev 没视觉禁用。
    # 在 next 分支已有"末题加 disabled"逻辑,prev 分支我们用同样的 in-place 模式:
    # Part 1 Q1 时 addClass disabled + early return,这样视觉跟原站 Part 0 一致。
    # 锚点:prev patch 末尾的"跨 Part 找上一 Part 末题 trigger click"那一行的 `return;\n      }` 前注入。
    PREV_DISABLE_NEEDLE = (
        "        var prevPartLastItem = partPaletteElement.eq(prevPartIndex).find('.question-palette__item').last();\n"
        "        prevPartLastItem.trigger('click');\n"
        "        return;\n"
        "      }"
    )
    PREV_DISABLE_PATCH = (
        "        var prevPartLastItem = partPaletteElement.eq(prevPartIndex).find('.question-palette__item').last();\n"
        "        prevPartLastItem.trigger('click');\n"
        "        /*[ielts-local-patched] 跨 Part 退完后,prev 看是否在 Part 1 决定是否禁用(原站仅在 Part 切换时维护)*/\n"
        "        var _curPartAfterPrev = $('.question-palette__part.-active').attr('data-part');\n"
        "        if (_curPartAfterPrev === '1') { $('#js-btn-previous').addClass('-disabled'); }\n"
        "        else { $('#js-btn-previous').removeClass('-disabled'); }\n"
        "        /* next 已在原分支里维护;切到非末 Part 时,next 一定可点,这里兜底去掉 disabled 防止残留 */\n"
        "        if (parseInt(_curPartAfterPrev) < totalTestPart) { $('#js-btn-next').removeClass('-disabled'); }\n"
        "        return;\n"
        "      }"
    )
    if PREV_DISABLE_NEEDLE in j:
        j = j.replace(PREV_DISABLE_NEEDLE, PREV_DISABLE_PATCH, 1)
        stats["prev→disable 同步"] = 1
    else:
        stats["prev→disable 同步"] = -1

    # prev Part 内逐题 / Part 1 Q1 early return 那条也要维护 disable
    # 原 prev patch 里 `if (num_question_prev < 1) { return; }` → 改成 addClass disabled + return
    PREV_Q1_NEEDLE = "        if (num_question_prev < 1) { return; }  /* Part 1 Q1 prev → 禁用 */"
    PREV_Q1_PATCH = (
        "        if (num_question_prev < 1) { $('#js-btn-previous').addClass('-disabled'); return; }  /* Part 1 Q1 prev → 禁用 */"
    )
    if PREV_Q1_NEEDLE in j:
        j = j.replace(PREV_Q1_NEEDLE, PREV_Q1_PATCH, 1)
        stats["prev→Q1 addClass"] = 1
    else:
        stats["prev→Q1 addClass"] = -1

    # Part 内逐题 trigger click 后也要维护 disable(可能从 Q2 prev 走到 Q1,Part 1 Q1 就要 addClass)
    # 锚点:prev Part 内逐题路径的两个 `element_question.trigger('click');\n            return;` 之前注入
    # 但 Part 内 prev 后,Part 没变,仅当到达 Part 1 Q1 才需要 addClass;否则维持现状
    # —— 用 `currentPartIndex === 0` 判断,这是 prevPartIndex===0 的隐式表达
    # 实际上 prevPartIndex = currentPartIndex - 1,Part 1 Q1 prev 时 currentPartIndex=0 → prevPartIndex=-1
    # 但这条 prev Part 内路径根本不会走(因为 num_question_prev > 0 且 part === part_active_prev)
    # 所以 Part 1 Q1 prev 的边界已经在 num_question_prev < 1 拦了,Part 内逐题 prev 不会到 Q1
    # —— 既然不会到 Q1,Part 内 prev trigger click 后不需要 addClass
    # 但从 Part 2 Q1 prev 跨 Part 退到 Part 1 Q10 后,Part 1 仍可继续 prev(到 Q9...Q1),
    # 每次都要 removeClass 保证 prev 可点(只在 Part 1 Q1 时 addClass) —— 跨 Part 那条已经处理
    # 唯一漏的:Part 2 Q11 prev 走 Part 内逐题 → Part 2 Q10,这是退到 Part 2 内,Part 2 不是 Part 1
    #   → 不需要 addClass,但需要 removeClass(因为可能从 Part 1 跨过来的残留)
    # 跨 Part 路径已经 removeClass;Part 内路径保险起见也加一次
    PREV_INTRA_NEEDLE = "        if (part === part_active_prev) {\n            element_question.trigger('click');\n            return;\n          }"
    PREV_INTRA_PATCH = (
        "        if (part === part_active_prev) {\n"
        "            element_question.trigger('click');\n"
        "            /*[ielts-local-patched] Part 内逐题 prev → prev 一定可点(未到 Part 1 Q1)*/\n"
        "            $('#js-btn-previous').removeClass('-disabled');\n"
        "            return;\n"
        "          }"
    )
    if PREV_INTRA_NEEDLE in j:
        # 出现 2 次(普通题 + MATCH 块),replace_all=True
        j = j.replace(PREV_INTRA_NEEDLE, PREV_INTRA_PATCH)
        stats["prev→Part 内 removeClass"] = j.count(PREV_INTRA_PATCH)
    else:
        stats["prev→Part 内 removeClass"] = -1

    j = ENGINE_PATCH_MARKER + "\n" + j
    open(engine_path, "w", encoding="utf-8").write(j)
    print("      engine patched:", ", ".join("%s x%d" % (k, v) for k, v in stats.items()))


def replace_dead_plyr(html, audio_dst):
    """存档页的 Plyr 播放器是死 DOM（引擎早退没初始化，控件无监听）。
    把整个 plyr 渲染块换成原生 <audio>（无 controls，纯音源,音量由自定义 UI 控制）——
    音频真正可播的最小干净路径。音量调节 UI 走 reskin 注入的 .ielts-vol 块
    （参考图样式：蓝色喇叭图标 + 蓝色水平进度条，audio-lock.js 双向同步 audio.volume）。

    边界：<div class="plyr plyr--full-ui plyr--audio…"> 到 </audio></div>（audio 是块内最后元素）。

    真考模式属性：autoplay(自动播放) + muted(规避 Chrome/Safari 自动播放策略,JS 拿到 play promise
    后立刻 muted=false 还原音量) + preload="auto"(缓冲全文件,跟真考一致不允许边下边播)。
    audio-lock.js 负责:首播约束、seeking 拦截、音量记忆、自定义 UI 同步、播完锁死。
    """
    import re as _re
    pattern = _re.compile(r'<div class="plyr plyr--full-ui plyr--audio[^"]*">[\s\S]*?</audio></div>')
    native = ('<audio id="ielts-local-audio" preload="auto" autoplay muted '
              'class="ielts-local-audio" '
              'style="display:none" '
              'title="IELTS 本地机考 · 听力音频（本地 · 真考模式：仅播一次）">'
              '<source src="./exam-assets/%s" type="audio/mp3"></audio>' % audio_dst)
    matches = pattern.findall(html)
    if len(matches) == 1:
        html = pattern.sub(native.replace("\\", "\\\\"), html, count=1)
        print("      dead plyr block → native <audio autoplay muted> (no controls, 1 处)")
    else:
        print("      ⚠ plyr 块匹配 %d 处（预期 1），跳过替换" % len(matches))
    return html


def normalize_initial_part(html):
    """存档页会固化退出时的 Part 状态（本卷是 Part 4 active + 只显示第 4 块题面）。
    通用归位到 Part 1：
    - .test-panel 按文档序：第 0 块 display:block，其余 display:none
    - **同时修复 inline `overflow-y: hidden` → `overflow-y: auto`**
      （存档页是 nicescroll 接管退出时的状态,inline 设了 hidden 锁死滚动;
      配合 inject_nicescroll_hook 让 niceScroll 调用 noop,容器就能原生滚,
      对齐 gt-reading-test.html 的滚动手感）
    - palette 的 -active 全部摘掉，挂到 data-part="1"
    - prev 导航按钮初始禁用（Part 1 无上一页）；data-part-show 引擎侧已是 0
    """
    import re as _re
    panels = list(_re.finditer(r'<section class="test-panel" style="[^"]*"', html))
    if panels:
        for i, m in reversed(list(enumerate(panels))):
            disp = "block" if i == 0 else "none"
            repl = _re.sub(r'display:\s*[a-z]+', 'display: ' + disp, m.group(0))
            # 修复 nicescroll 接管残留的 inline overflow-y: hidden → auto(原生滚接管)
            repl = _re.sub(r'overflow-y:\s*hidden', 'overflow-y: auto', repl)
            html = html[:m.start()] + repl + html[m.end():]
        print("      panels 归位: 第1块显示, 其余 %d 块隐藏; overflow-y: hidden→auto 修复" % (len(panels) - 1))
    else:
        print("      ⚠ 未找到 .test-panel，跳过归位")
    html = _re.sub(r'<div class="question-palette__part -active" data-part="(\d+)"',
                   r'<div class="question-palette__part" data-part="\1"', html)
    html = html.replace('<div class="question-palette__part" data-part="1"',
                        '<div class="question-palette__part -active" data-part="1"', 1)
    html = html.replace('<button class="test-panel__nav-btn -prev" id="js-btn-previous">',
                        '<button class="test-panel__nav-btn -prev -disabled" id="js-btn-previous">', 1)
    return html


def inject_nicescroll_hook(html):
    """在 jquery.nicescroll.min.js 加载后、引擎 JS 运行前,注入 inline hook,
    把 jQuery 上的 niceScroll / getNiceScroll / :nicescroll 伪选择器全部 noop。

    目的:让听力题面区走原生滚动(对齐 gt-reading-test.html),不论引擎何时调 niceScroll,
    调用都变 no-op → inline `overflow-y: hidden` 不会再被设,容器走原生。
    `overflow-y: hidden` 残留由 normalize_initial_part 修。

    notepad 也走原生滚动条,但功能不受影响(notepad 默认空 + contenteditable 与
    nicescroll 解耦,见 plan §2)。
    """
    NICE_SCROLL_HOOK = (
        '<script>'
        '/*[ielts-local-patched] nicescroll 接管已根除:让题目区走原生滚动,对齐 gt-reading-test.html'
        '(阅读引擎本就不调 niceScroll);notepad 也走原生滚动条,但核心功能不受影响.*/'
        '(function(){if(!window.jQuery)return;var $=jQuery;'
        '$.fn.niceScroll=function(){return this;};'
        '$.fn.getNiceScroll=function(){return false;};'
        '$.expr.pseudos.nicescroll=function(){return false;};})();'
        '</script>'
    )
    needle = '<script src="./exam-assets/jquery.nicescroll.min.js"'
    if needle in html:
        idx = html.find(needle)
        end = html.find('</script>', idx)
        if end != -1:
            insert_at = end + len('</script>')
            html = html[:insert_at] + NICE_SCROLL_HOOK + html[insert_at:]
            print("      nicescroll hook: 注入成功(在 nicescroll.min.js 之后,引擎 JS 之前)")
        else:
            print("      ⚠ nicescroll.min.js script 标签未闭合,跳过 hook")
    else:
        print("      ⚠ 未找到 nicescroll.min.js 引用,跳过 hook(可能路径已变)")
    return html


def reskin(cfg):
    src_html = os.path.join(cfg["src_dir"], cfg["src_html"])
    base = cfg["src_html"][:-5] if cfg["src_html"].endswith(".html") else cfg["src_html"]
    src_files = os.path.join(cfg["src_dir"], base + "_files")  # 存档页 _files 目录不带 .html 后缀
    orig_ref = "./" + base + "_files/"

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

    # ---- 0b. 音频本地化 ----
    audio_dst = os.path.join(ASSET_DIR, cfg["audio_dst"])
    audio_src_path = os.path.join(cfg["src_dir"], cfg["audio_src"])
    if not os.path.exists(audio_dst):
        shutil.copy2(audio_src_path, audio_dst)
        fresh.append(cfg["audio_dst"])
    print("[%s] assets present: %d, newly copied: %s, skipped: %s"
          % (cfg["key"], len(copied), fresh or "无",
             sorted(set(os.listdir(src_files)) - set(copied))))

    # ---- 0c. 引擎补丁：根除锁/门槛逻辑（幂等） ----
    if "engine" in cfg:
        print("[%s] patching engine:" % cfg["key"])
        patch_engine(os.path.join(ASSET_DIR, cfg["engine"]))

    html = open(src_html, encoding="utf-8").read()

    # ---- 1. 资源引用重定向 ----
    html = html.replace(orig_ref, "./exam-assets/")

    # ---- 2. 音频远程 OSS → 本地 ----
    n_audio = len(re.findall(r'https?://ieltsonlinetests\.oss[^"\']*\.mp3', html))
    html = re.sub(r'https?://ieltsonlinetests\.oss[^"\']*\.mp3',
                  './exam-assets/' + cfg["audio_dst"], html)
    print("[%s] audio rewired: %d 处 → %s" % (cfg["key"], n_audio, cfg["audio_dst"]))

    # ---- 2a. nicescroll 接管根除:在 nicescroll.min.js 之后注入 inline hook ----
    # 必须在 replace_dead_plyr / normalize_initial_part 之前跑(后者可能产生新的 <script> 引用)
    html = inject_nicescroll_hook(html)

    # ---- 2b. 死 Plyr 播放器块 → 原生 <audio controls> ----
    # 存档页缺 #listening-audio-player 锚点 → 引擎 initListeningPlayer 加锁后早退，
    # 存下来的 Plyr 控件 DOM 没有任何监听器（点了没反应）。换成原生控件才是可播的根修。
    html = replace_dead_plyr(html, cfg["audio_dst"])

    # ---- 2c. 初始 Part 归位到 Part 1(存档固化的是退出时的 Part 状态)----
    # 同步修复 inline `overflow-y: hidden` → `auto`(存档页是 nicescroll 接管时设的)
    html = normalize_initial_part(html)

    # ---- 3. 删除远程/追踪引用 ----
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

    # ---- 4. 品牌替换 ----
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

    # ---- 5. 主题覆盖层 + 本地 patch + 听力门槛隐藏 ----
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
/* 【听力专项】开场门槛遮罩（"Click here to start the test"）强制隐藏：
   原站 JS 初始化后会显示它、点击后才开考，静态页该点击无效 —— 隐藏即直接进入可用状态。
   不删节点（防原站初始化空引用），!important 压过任何行内显示 */
.take-test__click-play{display:none!important;pointer-events:none!important}
.realtest-header__bt-submit,.realtest-header__bt-save{background:linear-gradient(180deg,#1a6feb 0%,#0d4fa8 100%)!important}
.realtest-header__time:before{color:#1a6feb!important}
.realtest-header__time-val{color:#1c2330!important;font-weight:600!important}
.realtest-header__time-text{color:#5a6472!important}
input:focus,select:focus,textarea:focus{outline-color:#1a6feb!important}
input[type=radio]{accent-color:#1a6feb!important}
input[type=checkbox]{accent-color:#1a6feb!important}
.question-palette__item.is-selected{background:#1a6feb!important;color:#fff!important;border-color:#1a6feb!important}
.iot-grbt.-main-color{background:linear-gradient(180deg,#1a6feb 0%,#0d4fa8 100%)!important}
*::-webkit-scrollbar-thumb{background:#c9d2df!important;border-radius:4px!important}
</style>
<!-- ===== 本地 patch：原生滚动条外观（对齐原 nicescroll 视觉） ===== -->
<style id="native-scroll-patch">
.test-contents::-webkit-scrollbar,.test-panel::-webkit-scrollbar{width:8px;height:8px}
.test-contents::-webkit-scrollbar-thumb,.test-panel::-webkit-scrollbar-thumb{background:#dfdfdf;border-radius:6px}
.test-contents::-webkit-scrollbar-thumb:hover,.test-panel::-webkit-scrollbar-thumb:hover{background:#c9c9c9}
.test-contents::-webkit-scrollbar-track,.test-panel::-webkit-scrollbar-track{background:transparent}
.test-contents,.test-panel{scrollbar-width:thin;scrollbar-color:#dfdfdf transparent}
.test-contents,.test-panel{scroll-behavior:smooth}</style>
<!-- ===== 本地 patch：header 图标字体本地缺失，改内联 SVG ===== -->
<style id="header-icons-patch">
.realtest-header__icon.-note:after,.realtest-header__icon.-full-screen:after{content:none}
.realtest-header__icon.-note{width:22px;height:22px;margin-left:16px;background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23294563' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'/><path d='M18.4 2.6a2.1 2.1 0 1 1 3 3L12 15l-4 1 1-4Z'/></svg>") center/contain no-repeat}
.realtest-header__icon.-full-screen{width:22px;height:22px;margin-left:16px;background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23294563' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M8 3H5a2 2 0 0 0-2 2v3'/><path d='M21 8V5a2 2 0 0 0-2-2h-3'/><path d='M3 16v3a2 2 0 0 0 2 2h3'/><path d='M16 21h3a2 2 0 0 0 2-2v-3'/></svg>") center/contain no-repeat}
.realtest-header__icon.-full-screen.active{background-image:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23294563' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M8 3v3a2 2 0 0 1-2 2H3'/><path d='M21 8h-3a2 2 0 0 1-2-2V3'/><path d='M3 16h3a2 2 0 0 1 2 2v3'/><path d='M16 21v-3a2 2 0 0 1 2-2h3'/></svg>")}
.realtest-header__icon.-note:hover,.realtest-header__icon.-full-screen:hover{opacity:.7}</style>
<!-- ===== 本地 patch：页面级 ioticon-* 图标字体本地缺失（'iot-fonts' 没拷进来），
       清掉 :before content 避免空圈/方框占位，内联 SVG 补回视觉 =====
     受影响：ioticon-prev-icon / ioticon-next-icon（底栏 Part 导航圆按钮）、
             ioticon-check-v2（已保存标记）、ioticon-send-v2（提交按钮）、
             ioticon-x（弹窗关闭）、ioticon-search（搜索框） -->
<style id="page-icons-fallback">
/* 圆按钮内的 prev/next：父 .test-panel__nav-btn 是 40×40 圆，图标铺满 */
.test-panel__nav-btn [class^="ioticon-"]:before,.test-panel__nav-btn [class*=" ioticon-"]:before{content:none}
.test-panel__nav-btn .ioticon-prev-icon,.test-panel__nav-btn .ioticon-next-icon{display:inline-block;width:16px;height:16px;background-repeat:no-repeat;background-position:center;background-size:contain}
.test-panel__nav-btn .ioticon-prev-icon{background-image:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='15 18 9 12 15 6'/></svg>")}
.test-panel__nav-btn .ioticon-next-icon{background-image:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='9 18 15 12 9 6'/></svg>")}
/* 禁用态：父按钮已把 currentColor 降到 40% 透明，SVG 跟着继承，无需额外规则 */
/* 其余页面级图标：尽量克制，不抢视觉，能不补就不补 —— 仅对用得到的三个兜底 */
.ioticon-check-v2:before,.ioticon-send-v2:before,.ioticon-search:before,.ioticon-x:before{content:none}
.ioticon-check-v2{display:inline-block;width:14px;height:14px;vertical-align:middle;background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2337854D' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'><polyline points='20 6 9 17 4 12'/></svg>") center/contain no-repeat}
.ioticon-send-v2{display:inline-block;width:14px;height:14px;vertical-align:middle;background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23fff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><line x1='22' y1='2' x2='11' y2='13'/><polygon points='22 2 15 22 11 13 2 9 22 2'/></svg>") center/contain no-repeat}
.ioticon-search{display:inline-block;width:16px;height:16px;vertical-align:middle;background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23294563' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='11' cy='11' r='8'/><line x1='21' y1='21' x2='16.65' y2='16.65'/></svg>") center/contain no-repeat}
.ioticon-x{display:inline-block;width:20px;height:20px;background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23294563' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/></svg>") center/contain no-repeat}
</style>
<!-- ===== 本地 patch：听力音频真考模式（自定义音量 UI + 全量锁死） ===== -->
<style id="audio-lock-style">
/* 音频元素本身隐藏 —— 纯音源,所有控制走 audio-lock.js 注入的 .ielts-vol 自定义 UI */
audio.ielts-local-audio{display:none!important}
/* 自定义音量 UI:参考图同款 —— 蓝色喇叭 + 蓝色水平进度条,放在 notepad 左侧 */
.ielts-vol{display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 4px 0 6px;user-select:none}
/* 喇叭按钮:蓝色图标,点击切换 mute */
.ielts-vol__btn{width:28px;height:28px;border:0;background:transparent;padding:0;cursor:pointer;color:#17AFC4;display:flex;align-items:center;justify-content:center;border-radius:4px;transition:opacity .15s}
.ielts-vol__btn:hover{opacity:.75}
.ielts-vol__btn svg{width:20px;height:20px}
.ielts-vol__btn[disabled]{cursor:not-allowed;opacity:.4}
/* 进度条 track:浅灰底,140px 宽(可改) */
.ielts-vol__track{position:relative;width:140px;height:6px;background:#dde5f0;border-radius:3px;cursor:pointer;outline:none}
.ielts-vol__track:focus-visible{box-shadow:0 0 0 2px rgba(23,175,196,.4)}
/* 进度条 fill:蓝色填充,跟参考图同款色 */
.ielts-vol__fill{position:absolute;top:0;left:0;height:100%;width:100%;background:linear-gradient(90deg,#17AFC4 0%,#1a8fa3 100%);border-radius:3px;pointer-events:none}
/* 进度条 thumb:白色圆点(参考图是大白圆),让用户看到当前位置 */
.ielts-vol__thumb{position:absolute;top:50%;left:100%;width:14px;height:14px;background:#fff;border:2px solid #17AFC4;border-radius:50%;transform:translate(-50%,-50%);pointer-events:none;box-shadow:0 1px 2px rgba(13,52,96,.15)}
/* 全量锁死后:UI 变灰 + 不可拖 */
body.audio_locked .ielts-vol{opacity:.4;pointer-events:none;cursor:not-allowed}
body.audio_locked .ielts-vol__track{cursor:not-allowed}
</style>
'''
    html = html.replace('</head>', OVERRIDE + '</head>', 1)

    # ---- 6. 隐私：uid/email 置空 ----
    n_uid = len(re.findall(r'"uid":"\d+"', html))
    n_mail = len(re.findall(r'"email":"[^"]*"', html))
    html = re.sub(r'"uid":"\d+"', '"uid":"0"', html)
    html = re.sub(r'"email":"[^"]*"', '"email":""', html)
    print("[%s] privacy scrubbed: uid x%d, email x%d" % (cfg["key"], n_uid, n_mail))

    # ---- 7. 注入 clock-sec.js + exam-note.js + audio-lock.js ----
    # 注：锁/门槛已在引擎补丁（patch_engine）根除，无需运行时解锁脚本
    # audio-lock.js 负责：自动播放 + 一次锁死 + 不可拖 + 音量记忆
    NOTE_TAG = ('\n<!-- 倒计时到秒 + 练习提示（听力口径：未附答案数据不判分，拦截原站交卷） -->\n'
                '<script src="./exam-assets/clock-sec.js"></script>\n'
                '<script src="./exam-assets/exam-note.js"></script>\n'
                '<script src="./exam-assets/audio-lock.js"></script>\n')
    html = html.replace('</body>', NOTE_TAG + '</body>', 1)

    with open(cfg["out"], "w", encoding="utf-8") as f:
        f.write(html)

    # 自检
    chk = open(cfg["out"], encoding="utf-8").read()
    print("[%s] written: %s (%.0f KB) | assets-refs=%d iot-refs=%d logo=%d _hmt=%d remotejs=%d email=%d audio-local=%d gate-guard=%d" % (
        cfg["key"], cfg["out"], os.path.getsize(cfg["out"]) / 1024,
        chk.count("./exam-assets/"), len(re.findall(r'ieltsonlinetests', chk)),
        chk.count("IOT_ShortLogo"), chk.count("_hmt"),
        len(re.findall(r'src="/sites/', chk)), len(re.findall(r'cvte\.com', chk)),
        chk.count(cfg["audio_dst"]),
        chk.count(".take-test__click-play{display:none!important")))


if __name__ == "__main__":
    only = sys.argv[1] if len(sys.argv) > 1 else None
    for cfg in JOBS:
        if only and cfg["key"] != only:
            continue
        reskin(cfg)
