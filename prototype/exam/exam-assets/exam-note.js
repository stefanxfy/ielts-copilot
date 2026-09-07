/**
 * exam-note.js — 机考页本地练习提示（原型阶段，写作/听力页通用）
 *
 * 按 body class 自适配文案：listening-test → 听力口径；默认写作口径。
 * 与阅读页 scoring.js 的分工差异：写作/听力页不接判分引擎（写作无客观答案；
 * 听力卷源未附答案数据），本脚本把原站的「交卷/保存/时间到」行为拦截为本地练习语义：
 *  - 交卷 / 时间到 → 停掉听力音频（若有）、定格计时器、锁定作答控件、收起提交/保存按钮、给出对应提示
 *  - 保存 → 提示本地练习模式无需保存
 *  - 表单 submit 兜底拦截（原站 action 已被换皮脚本中和为 #，此处防手滑）
 *
 * 实现手法与 scoring.js 对齐：document 捕获阶段拦截 click、500ms 轮询时间到弹窗。
 */
(function () {
  'use strict';
  if (window.IELTS_EXAM_NOTE) return; // 防重复注入
  window.IELTS_EXAM_NOTE = true;

  var IS_LISTENING = document.body.classList.contains('listening-test');

  /* ---------- 样式注入（不动原站 CSS） ---------- */
  var css = [
    '.ieltswn-bar{position:fixed;top:64px;left:50%;transform:translateX(-50%);z-index:99999;',
    'max-width:92%;box-shadow:0 4px 18px rgba(13,52,96,.18);border-radius:10px;',
    'background:#fff;border:1px solid #d8e3f5;border-left:4px solid #1a6feb;',
    'padding:12px 18px;font-size:13px;line-height:1.6;color:#1c2330;',
    'font-family:-apple-system,PingFang SC,Microsoft YaHei,sans-serif;text-align:center}',
    '.ieltswn-bar b{color:#1a6feb}',
    '.ieltswn-bar.is-persistent{background:#f0f6ff}',
    '.ieltswn-fade{opacity:0;transition:opacity .4s}'
  ].join('');
  var styleEl = document.createElement('style');
  styleEl.id = 'ieltswn-style';
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  var bar = null, hideTimer = null;
  function notice(html, persistent) {
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'ieltswn-bar';
      document.body.appendChild(bar);
    }
    window.clearTimeout(hideTimer);
    bar.className = 'ieltswn-bar' + (persistent ? ' is-persistent' : '');
    bar.classList.remove('ieltswn-fade');
    bar.innerHTML = html;
    if (!persistent) {
      hideTimer = window.setTimeout(function () {
        bar.classList.add('ieltswn-fade');
        window.setTimeout(function () { if (bar) bar.remove(), bar = null; }, 450);
      }, 6000);
    }
  }

  /* ---------- 通用动作 ---------- */
  // 计时器定格：clock-sec.js 接管可见时钟后停其秒级渲染；否则回退为节点替换
  // （站点倒计时实例被闭包包住，把 #time-clock 换成去 id 的静态克隆即可定格）
  function freezeTimer() {
    if (window.IELTS_CLOCK_SEC_STOP) { window.IELTS_CLOCK_SEC_STOP(); return; }
    var clock = document.getElementById('time-clock');
    if (!clock) return;
    var frozen = clock.cloneNode(true);
    frozen.removeAttribute('id');
    frozen.style.opacity = '.65';
    clock.parentNode.replaceChild(frozen, clock);
  }

  // 收起顶栏「交卷/保存」按钮（交卷后不允许重做，重练 = 刷新页面，与阅读页口径一致）
  function removeHeaderButtons() {
    ['.realtest-header__bt-submit', '.realtest-header__bt-save'].forEach(function (sel) {
      var el = document.querySelector(sel);
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });
  }

  // 锁定作答控件
  function lockEditors() {
    if (IS_LISTENING) {
      // 听力：文本/单选/下拉等作答控件（与 scoring.js collect 同源选择器）
      document.querySelectorAll('input[data-num], select[data-num], input[name^="q-"]').forEach(function (el) { el.disabled = true; });
    } else {
      document.querySelectorAll('.writing-box__answer').forEach(function (ta) { ta.disabled = true; });
    }
  }

  // 关闭 bootstrap 弹窗（去 .in、清 backdrop）
  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('in');
    modal.style.display = 'none';
    document.querySelectorAll('.modal-backdrop').forEach(function (bd) { bd.parentNode && bd.parentNode.removeChild(bd); });
    document.body.classList.remove('modal-open');
  }

  // 交卷终态文案（听力/写作两套口径）
  function finishTitle(source) {
    var lead = source === 'timeup' ? '时间到 · 已自动交卷' : '已交卷';
    if (IS_LISTENING) {
      return '<b>' + lead + '</b><br>本套听力卷源未附答案数据，本地原型暂不判分；' +
        '正式版（V2）将提供听力机考判分（音频只播一遍、不可回拖）。<br>重新练习请刷新页面。';
    }
    return '<b>' + lead + '</b><br>' +
      '写作没有客观标准答案，本地原型不做判分；' +
      '正式版会把 Task 1 / Task 2 送 <b>AI 四维批改（TR · CC · LR · GRA）</b>并给出改写范文。<br>' +
      '重新练习请刷新页面。';
  }

  // 听力页：交卷/时间到即停真考音频（写作页无 #ielts-local-audio，自动 no-op）。
  // body.audio_locked 让 .ielts-vol 音量 UI 变灰不可拖（audio-lock-style 里的既有终态样式）。
  function stopLocalAudio() {
    var audio = document.getElementById('ielts-local-audio');
    if (!audio) return;
    try { audio.pause(); } catch (e) {}
    document.body.classList.add('audio_locked');
  }

  // 交卷终态
  function finish(source) {
    if (window.IELTS_EXAM_NOTE_DONE) return;
    window.IELTS_EXAM_NOTE_DONE = true;
    stopLocalAudio();
    freezeTimer();
    lockEditors();
    removeHeaderButtons();
    notice(finishTitle(source), true);
    if (window.IELTS_EXAM_GUARD_OFF) window.IELTS_EXAM_GUARD_OFF(); // 考试结束,解除离开防护
  }

  /* ---------- 事件拦截（捕获阶段，先于原站 handlers） ---------- */
  document.addEventListener('click', function (ev) {
    var t = ev.target;
    if (!(t && t.closest)) return;

    if (t.closest('.realtest-header__bt-submit')) {
      ev.preventDefault(); ev.stopPropagation();
      finish('submit');
      return;
    }
    if (t.closest('.realtest-header__bt-save')) {
      ev.preventDefault(); ev.stopPropagation();
      notice('<b>本地练习模式</b>：作答保留在本页（刷新前有效），无需保存。');
      return;
    }
    var inSubmitModal = t.closest('.modal-submit-test');
    var inTimeupModal = t.closest('.modal-time-up');
    if (inSubmitModal || inTimeupModal) {
      ev.preventDefault(); ev.stopPropagation();
      closeModal(inSubmitModal || inTimeupModal);
      finish(inTimeupModal ? 'timeup' : 'submit');
    }
  }, true);

  // 表单 submit 兜底（原站 action 已中和为 #，这里防手滑触发表单默认跳转）
  document.addEventListener('submit', function (ev) {
    ev.preventDefault(); ev.stopPropagation();
    notice('<b>本地练习模式</b>：不向任何服务器提交数据。');
  }, true);

  /* ---------- 时间到弹窗轮询（原站到点自动弹 .modal-time-up.in） ---------- */
  var watchedTimeup = false;
  window.setInterval(function () {
    if (window.IELTS_EXAM_NOTE_DONE || watchedTimeup) return;
    var up = document.querySelector('.modal-time-up.in');
    if (up) {
      watchedTimeup = true;
      closeModal(up);
      finish('timeup');
    }
  }, 500);
})();
