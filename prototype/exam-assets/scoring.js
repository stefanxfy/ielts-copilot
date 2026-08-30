/*
 * IELTS 本地机考 · 通用判分引擎 scoring.js（inline 批改版）
 * 适配换皮机考页（原 ieltsonlinetests 结构）：
 *  - 采集作答：input[data-num]（填空）、radio input[name=q-N]（单选）、select[data-num]（下拉）
 *  - 点右上「交卷」→ 阻止原站确认弹窗 → 当前页直接批改：
 *      · 顶部成绩汇总条（Band / 答对 / 答错 / 未答 / 用时 + 答案速查 + 重做）
 *      · 每题旁 ✓/✗/未答 标注（错题显示应填答案），输入框染色并锁定
 *      · 底部题号板按对错染色
 *      · header「交卷」按钮移除（重做/答案速查入口在成绩条上）
 *  - 时间到自动交卷同样触发 inline 批改
 * 依赖：先加载 answers-<exam-id>.js 定义 window.IELTS_EXAM
 */
(function () {
  'use strict';
  var EXAM = window.IELTS_EXAM;
  if (!EXAM) { console.warn('[scoring] 缺少答案数据 window.IELTS_EXAM'); return; }

  /* ---------- 工具 ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function norm(s) { return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim(); }
  function isLetterAns(a) { return /^[a-d](,[a-d])?$/i.test(a); }
  function setEq(a, b) {
    return norm(a).replace(/\s/g, '').split(',').sort().join(',') ===
           norm(b).replace(/\s/g, '').split(',').sort().join(',');
  }
  /* 文本题备选答案：'x/y' 任一匹配即可；'(括号)' 内容视为可选（如 "(heavy) import duties"） */
  function textEq(user, correct) {
    var u = norm(user);
    var cands = [norm(correct)];
    norm(correct).split('/').forEach(function (p) { if (p.trim()) cands.push(p); });
    var all = cands.slice();
    cands.forEach(function (cd) {
      all.push(cd.replace(/\([^)]*\)/g, ''));
      all.push(cd.replace(/[()]/g, ''));
    });
    for (var i = 0; i < all.length; i++) {
      var v = all[i].replace(/\s+/g, ' ').trim();
      if (v && v === u) return true;
    }
    return false;
  }
  function isOk(q) {
    if (!q.user) return false;
    return q.isLetter ? setEq(q.user, q.correct) : textEq(q.user, q.correct);
  }

  /* 原始分 → band：bandTable 为 [最低原始分, band] 二维数组，从高到低，取第一个满足 raw>=min 的档位 */
  function rawToBand(raw) {
    var t = EXAM.bandTable;
    for (var i = 0; i < t.length; i++) {
      if (raw >= t[i][0]) return String(t[i][1]);
    }
    return raw > 0 ? '1' : '0';
  }

  /* ---------- 采集作答 ---------- */
  function formEls(n) {
    // 只认表单元素（data-num 会同时匹配到题号 <span> 等非表单节点）
    var els = $$('[data-num="' + n + '"]').concat($$('input[name="q-' + n + '"]'));
    var seen = {}, out = [];
    els.forEach(function (el) {
      if (!/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) return;
      var key = el.tagName + '|' + el.type + '|' + el.name + '|' + el.id;
      if (seen[key]) return;
      seen[key] = 1;
      out.push(el);
    });
    return out;
  }
  function collect() {
    var res = {};
    for (var n = 1; n <= EXAM.total; n++) {
      var ans = EXAM.answers[String(n)] || EXAM.answers[n];
      var els = formEls(n);
      var user = '', type = '';
      for (var i = 0; i < els.length; i++) {
        var el = els[i];
        if (el.type === 'radio') {
          type = 'radio';
          if (el.checked) { user = el.value; break; }
        } else if (el.tagName === 'SELECT') {
          type = 'select';
          if (el.value) { user = el.value; break; }
        } else {
          type = 'text';
          if (el.value && el.value.trim()) { user = el.value.trim(); break; }
        }
      }
      if (type === 'text' && els.length > 1 && isLetterAns(ans)) {
        var picked = [];
        for (var j = 0; j < els.length; j++) {
          var v = els[j].value.trim();
          if (v) picked.push(v.replace(/[^a-d]/gi, '').toUpperCase());
        }
        user = picked.join(',');
      }
      res[n] = { user: user, correct: ans, isLetter: isLetterAns(ans), type: type };
    }
    // 勾选块题型（如 Questions 18-22 共用一组 checkbox）：整块作答，答案为字母集合
    (EXAM.blocks || []).forEach(function (b) {
      var picked = $$('input[name="' + b.name + '"]').filter(function (el) { return el.checked; })
        .map(function (el) { return el.value; });
      var user = picked.sort().join(',');
      for (var n = b.from; n <= b.to; n++) {
        res[n] = { user: user, correct: b.answer, isLetter: true, type: 'block' };
      }
    });
    return res;
  }

  /* ---------- 判分（含块题型：按得分点计，块内 hit = |用户选集 ∩ 正确集|） ---------- */
  function judge(res) {
    var raw = 0, blankPts = 0, totalPts = 0, wrong = [], blank = [];
    var inBlock = {};
    (EXAM.blocks || []).forEach(function (b) {
      var size = b.to - b.from + 1, q = res[b.from];
      totalPts += size;
      for (var i = b.from; i <= b.to; i++) inBlock[i] = 1;
      if (!q.user) {
        blankPts += size;
        for (var j = b.from; j <= b.to; j++) blank.push(j);
        return;
      }
      var key = String(q.correct).replace(/\s/g, '').split(',');
      var hit = key.filter(function (k) { return q.user.split(',').indexOf(k) >= 0; }).length;
      raw += hit;
      if (hit < size) for (var j2 = b.from; j2 <= b.to; j2++) wrong.push(j2);
    });
    for (var n in res) {
      if (inBlock[n]) continue;
      var q = res[n];
      totalPts++;
      if (!q.user) { blankPts++; blank.push(+n); continue; }
      if (isOk(q)) raw++; else wrong.push(+n);
    }
    return { raw: raw, wrong: wrong, blank: blank,
             wrongPts: totalPts - raw - blankPts, blankPts: blankPts };
  }

  /* ---------- 用时 ---------- */
  function usedTime() {
    var el = $('.realtest-header__time-val');
    var t = el ? el.textContent.trim() : '';
    var leftSec = 0;
    var mmss = t.match(/^([0-9]+):([0-9]+)$/);   // 「分:秒」显示
    var mmonly = t.match(/^([0-9]+)$/);          // 兼容旧版纯分钟显示
    if (mmss) leftSec = (+mmss[1]) * 60 + (+mmss[2]);
    else if (mmonly) leftSec = (+mmonly[1]) * 60;
    var used = Math.max(0, EXAM.duration * 60 - leftSec);
    return Math.floor(used / 60) + ' 分 ' + (used % 60) + ' 秒';
  }

  /* ---------- inline 批改 ---------- */
  var graded = false;

  function gradeInline(auto) {
    if (graded) return; graded = true;
    var res = collect(), j = judge(res), band = rawToBand(j.raw);
    markQuestions(res);
    markPalette(res);
    showBar(j, band, auto);
    removeSubmitButton();
    freezeTimer();
    console.log('[scoring] 批改完成：', j.raw + '/' + EXAM.total, '· band', band);
  }

  /* 每题标注 + 锁定 */
  function markQuestions(res) {
    /* 勾选块题型（如 Q18-22 共用一组 checkbox）：整块在标题旁打一个 X/N 标记，
       逐项 checkbox 用正确/错误着色后禁用，避免与单题渲染重复 */
    var blockKeys = {};
    (EXAM.blocks || []).forEach(function (b) {
      var size = b.to - b.from + 1;
      var boxEls = $$('input[name="' + b.name + '"]');
      var q = res[b.from];
      var correctSet = String(b.answer).replace(/\s/g, '').split(',');
      var userArr = q.user ? q.user.split(',') : [];
      var hit = userArr.filter(function (k) { return correctSet.indexOf(k) >= 0; }).length;
      var allHit = hit === size && userArr.length === size;
      var blockCls = !q.user ? 'blank' : (allHit ? 'ok' : 'no');
      var badge = document.createElement('span');
      badge.className = 'sc-mark sc-mark-block ' + blockCls;
      badge.textContent = q.user
        ? (allHit ? '✓ 命中 ' + hit + '/' + size : '✗ 命中 ' + hit + '/' + size + ' · 应选：' + b.answer)
        : '未答 · 应选：' + b.answer;
      var title = $$('.test-panel__question-title').filter(function (t) {
        return (t.textContent || '').indexOf('Questions ' + b.from) >= 0
          && (b.to === b.from || (t.textContent || '').indexOf('Questions ' + b.from + '-' + b.to) >= 0);
      })[0];
      if (title && title.parentNode) title.parentNode.appendChild(badge);
      boxEls.forEach(function (el) {
        var v = el.value;
        var isCorrect = correctSet.indexOf(v) >= 0;
        var isPicked = userArr.indexOf(v) >= 0;
        el.disabled = true;
        if (isCorrect) el.classList.add('sc-cb-correct');
        if (isPicked && !isCorrect) el.classList.add('sc-cb-wrong');
      });
      for (var n2 = b.from; n2 <= b.to; n2++) blockKeys[n2] = 1;
    });
    for (var n = 1; n <= EXAM.total; n++) {
      if (blockKeys[n]) continue;                       // 块题整块渲染，跳过逐题
      var q = res[n], els = formEls(n);
      if (!els.length) continue;
      var ok = !!q.user && isOk(q);
      var cls = !q.user ? 'blank' : (ok ? 'ok' : 'no');
      var isRadio = els[0].type === 'radio';
      var badge = document.createElement('span');
      badge.className = 'sc-mark ' + cls;
      badge.textContent = cls === 'ok' ? '✓' :
        (cls === 'no'
          ? (isRadio ? '✗ 你选：' + q.user + ' · 应填：' + q.correct : '✗ 应填：' + q.correct)
          : '未答 · 应填：' + q.correct);
      var first = els[0];
      if (isRadio) {
        var lastLabel = els[els.length - 1].closest('label') || els[els.length - 1];
        lastLabel.parentNode.insertBefore(badge, lastLabel.nextSibling);
        // 答错/未答时给正确选项加绿色圆环，方便对照
        if (cls !== 'ok') {
          var correctVal = String(q.correct).trim().toUpperCase();
          els.forEach(function (el) {
            if (el.value.toUpperCase() === correctVal) el.classList.add('sc-radio-correct');
          });
        }
      } else {
        first.parentNode.insertBefore(badge, first.nextSibling);
      }
      els.forEach(function (el) {
        el.disabled = true;
        el.classList.add('sc-input-' + cls);
      });
    }
  }

  /* 题号板染色 */
  function markPalette(res) {
    /* 块题（如 18-22）整块共享一个色 + 命中 X/N 提示 */
    var blockRanges = {};
    (EXAM.blocks || []).forEach(function (b) {
      var q = res[b.from];
      var size = b.to - b.from + 1;
      var correctSet = String(b.answer).replace(/\s/g, '').split(',');
      var userArr = q.user ? q.user.split(',') : [];
      var hit = userArr.filter(function (k) { return correctSet.indexOf(k) >= 0; }).length;
      var allHit = hit === size && userArr.length === size;
      var cls = !q.user ? 'sc-p-blank' : (allHit ? 'sc-p-ok' : 'sc-p-no');
      var label = q.user
        ? (allHit ? '命中 ' + hit + '/' + size : '命中 ' + hit + '/' + size + ' · 应选：' + b.answer)
        : '未答 · 应选：' + b.answer;
      for (var n2 = b.from; n2 <= b.to; n2++) blockRanges[n2] = { cls: cls, label: label };
    });
    $$('.question-palette__item').forEach(function (chip) {
      var n = parseInt((chip.textContent || '').trim(), 10);
      if (!n || !res[n]) return;
      var q = res[n];
      var cls, title;
      if (blockRanges[n]) {
        cls = blockRanges[n].cls;
        title = blockRanges[n].label;
      } else {
        var ok = !!q.user && isOk(q);
        cls = !q.user ? 'sc-p-blank' : (ok ? 'sc-p-ok' : 'sc-p-no');
        title = !q.user ? ('未答 · 应填：' + q.correct) : (ok ? '答对' : '答错 · 应填：' + q.correct);
      }
      chip.classList.add(cls);
      chip.title = title;
    });
  }

  /* 顶部成绩汇总条 */
  function showBar(j, band, auto) {
    var answersHref = EXAM.answersUrl || 'gt-reading-answers.html';
    var bar = document.createElement('div');
    bar.id = 'ieltshome-grade-bar';
    bar.innerHTML =
      '<div class="gb-main">' +
      '<span class="gb-band">Band <b>' + band + '</b></span>' +
      '<span class="gb-item ok">答对 ' + j.raw + '</span>' +
      '<span class="gb-item no">答错 ' + j.wrong.length + '</span>' +
      '<span class="gb-item blank">未答 ' + j.blank.length + '</span>' +
      '<span class="gb-item">共 ' + EXAM.total + ' 题 · 用时 ' + usedTime() + (auto ? '（时间到自动交卷）' : '') + '</span>' +
      '</div>' +
      '<div class="gb-ops">' +
      '<a class="gb-link" href="' + answersHref + '" target="_blank">答案速查</a>' +
      '<button class="gb-retake" type="button">↻ 重做本卷</button>' +
      '</div>';
    document.body.appendChild(bar);
    var page = $('.page');
    if (page) page.style.paddingTop = '132px';
    bar.querySelector('.gb-retake').addEventListener('click', function () { location.reload(); });
  }

  /* 交卷后移除 header 的交卷按钮（重做/答案速查入口都在顶部成绩条，避免两处重复） */
  function removeSubmitButton() {
    var btn = $('.realtest-header__bt-submit');
    if (btn && btn.parentNode) btn.parentNode.removeChild(btn);
  }

  /* 定格计时器：站点倒计时实例被闭包包住（window.timer 拿不到），交卷后
     自排期循环仍在跑、每秒重写 #time-clock。轮询回写会与之打架导致闪烁，
     所以改用节点替换：把 #time-clock 换成去掉 id 的静态克隆——站点闭包里
     的旧引用继续写游离节点（无害），可见时钟从此定格。 */
  function freezeTimer() {
    // clock-sec.js 接管可见时钟后，#time-clock 已无 id，改为停掉它的秒级渲染
    if (window.IELTS_CLOCK_SEC_STOP) { window.IELTS_CLOCK_SEC_STOP(); return; }
    var clock = document.getElementById('time-clock');
    if (!clock) return;
    var frozen = clock.cloneNode(true);
    frozen.removeAttribute('id');
    clock.parentNode.replaceChild(frozen, clock);
  }

  /* ---------- 注入样式 ---------- */
  var css = document.createElement('style');
  css.textContent = [
    /* 顶部汇总条 */
    '#ieltshome-grade-bar{position:fixed;top:60px;left:0;right:0;z-index:998;height:56px;background:#fff;border-bottom:1px solid #dfe4ec;box-shadow:0 6px 24px rgba(28,35,48,.08);display:flex;align-items:center;justify-content:space-between;padding:0 26px;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Segoe UI",Roboto,sans-serif;animation:gbIn .3s ease}',
    '@keyframes gbIn{from{transform:translateY(-100%);opacity:0}}',
    '#ieltshome-grade-bar .gb-main{display:flex;align-items:center;gap:16px;flex-wrap:wrap}',
    '#ieltshome-grade-bar .gb-band{font-size:14px;color:#5a6472;background:#e8f0fe;border-radius:8px;padding:5px 12px}',
    '#ieltshome-grade-bar .gb-band b{font-size:21px;color:#1a6feb;margin-left:4px}',
    '#ieltshome-grade-bar .gb-item{font-size:13px;color:#5a6472}',
    '#ieltshome-grade-bar .gb-item.ok{color:#18925c;font-weight:600}',
    '#ieltshome-grade-bar .gb-item.no{color:#d33c3c;font-weight:600}',
    '#ieltshome-grade-bar .gb-item.blank{color:#8a93a3;font-weight:600}',
    '#ieltshome-grade-bar .gb-ops{display:flex;align-items:center;gap:10px}',
    '#ieltshome-grade-bar .gb-link{font-size:13px;color:#1a6feb;text-decoration:none;border:1px solid #bcd4fb;border-radius:8px;padding:7px 14px}',
    '#ieltshome-grade-bar .gb-link:hover{background:#e8f0fe}',
    '#ieltshome-grade-bar .gb-retake{font-size:13px;font-weight:600;color:#fff;background:linear-gradient(180deg,#1a6feb,#0d4fa8);border:none;border-radius:8px;padding:8px 16px;cursor:pointer}',
    '#ieltshome-grade-bar .gb-retake:hover{opacity:.92}',
    /* 逐题标注 */
    '.sc-mark{display:inline-block;margin:0 8px;font-size:12px;font-weight:600;border-radius:12px;padding:2px 10px;vertical-align:middle;white-space:nowrap}',
    '.sc-mark.ok{background:#e6f7ef;color:#18925c;border:1px solid #bfe5d2}',
    '.sc-mark.no{background:#fdf1f1;color:#d33c3c;border:1px solid #f3c6c6}',
    '.sc-mark.blank{background:#f2f4f8;color:#8a93a3;border:1px dashed #dfe4ec}',
    /* 背景染色只用于填空/下拉；radio 的选中圆点是 background 画的，染色会抹掉选中态 */
    '.sc-input-ok:not([type=radio]){border-color:#18925c!important;background:#f2fbf6!important}',
    '.sc-input-no:not([type=radio]){border-color:#d33c3c!important;background:#fdf6f6!important}',
    '.sc-input-blank:not([type=radio]){border-color:#c9d2df!important;background:#f6f8fb!important}',
    /* 单选题：选中项画实心圆点（答对绿 / 答错红），未选项只染边框 */
    'input[type=radio].sc-input-ok{border-color:#18925c!important}',
    'input[type=radio].sc-input-no{border-color:#d33c3c!important}',
    'input[type=radio].sc-input-blank{border-color:#c9d2df!important}',
    'input[type=radio].sc-input-ok:checked{background:#18925c!important;background-clip:content-box!important;padding:2px!important}',
    'input[type=radio].sc-input-no:checked{background:#d33c3c!important;background-clip:content-box!important;padding:2px!important}',
    /* 正确选项提示圆环（答错/未答时） */
    'input[type=radio].sc-radio-correct{border-color:#18925c!important;box-shadow:0 0 0 3px rgba(24,146,92,.25)!important}',
    /* 块题标题旁的整体得分标记 */
    '.sc-mark-block{margin-left:12px;vertical-align:middle}',
    /* 块题内 checkbox：正确项画绿描边，选中但错的画红删掉 */
    '.checkbox-iot.sc-cb-correct + .checkmark{box-shadow:0 0 0 3px rgba(24,146,92,.35)!important;border-color:#18925c!important}',
    '.checkbox-iot.sc-cb-wrong + .checkmark + .cb-label{color:#d33c3c!important;text-decoration:line-through}',
    '.checkbox-iot.sc-cb-correct:not(:checked) + .checkmark{background:#f2fbf6!important}',
    /* 权重需盖过 sc-input-no/blank 的边框色（同权重靠源顺序，本条在后） */
    /* 题号板染色 */
    '.question-palette__item.sc-p-ok{background:#18925c!important;color:#fff!important;border-color:#18925c!important}',
    '.question-palette__item.sc-p-no{background:#d33c3c!important;color:#fff!important;border-color:#d33c3c!important}',
    '.question-palette__item.sc-p-blank{background:#eef1f6!important;color:#8a93a3!important}'
  ].join('');
  document.head.appendChild(css);

  /* ---------- 拦截交卷 ---------- */
  // 捕获阶段拦截：header「交卷」直接批改（阻止原站确认弹窗）
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('button, .iot-grbt, a');
    if (!btn) return;
    // header 交卷按钮 → 直接 inline 批改
    if (btn.classList.contains('realtest-header__bt-submit')) {
      e.preventDefault(); e.stopPropagation();
      gradeInline(false);
      return;
    }
    // 兜底：原站确认弹窗内的确认按钮（若弹窗经由其他路径打开）
    var inModal = btn.closest('.modal-submit-test, .modal-time-up');
    if (inModal) {
      e.preventDefault(); e.stopPropagation();
      closeModal(inModal);
      gradeInline(inModal.classList.contains('modal-time-up'));
    }
  }, true);

  function closeModal(m) {
    m.classList.remove('in');
    m.style.display = 'none';
    m.setAttribute('aria-hidden', 'true');
    $$('.modal-backdrop').forEach(function (b) { b.remove(); });
  }

  // 时间到：原站自动弹 time-up modal → 关掉并批改；
  // 交卷后站点倒计时其实还在闭包里跑，若之后到 0 仍会弹窗，这里一并关掉（不再重复批改）
  var watchedTimeup = false;
  setInterval(function () {
    var timeup = $('.modal-time-up.in') || $$('.modal-time-up').filter(function (m) {
      return m.style && m.style.display === 'block';
    })[0];
    if (!timeup) return;
    closeModal(timeup);
    if (!graded && !watchedTimeup) {
      watchedTimeup = true;
      gradeInline(true);
    }
  }, 500);

  window.IELTS_SCORING = { collect: collect, judge: judge, rawToBand: rawToBand, gradeInline: gradeInline };
  console.log('[scoring] 判分引擎就绪（inline 批改模式）·', EXAM.id);
})();
