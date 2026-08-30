/**
 * audio-lock.js — 听力页音频真考模式控制（自动播 + 一次锁 + 不可拖 + 音量记忆 + 自定义 UI）
 *
 * 决策（2026-08-30 用户确认）：
 *  - 进听力题页后音频自动从头播放（真考模式）
 *  - 不可拖动不可重听
 *  - 播完一次后 + 刷新页面 → 全量锁死（sessionStorage 标记）
 *  - 音量记忆到 localStorage（跨会话跨刷新都保留）
 *  - 浏览器自动播放策略被拒时静默降级（不弹引导页）
 *  - 2026-08-30 新增：自定义音量调节 UI（蓝色喇叭 + 蓝色水平进度条,参考图同款）
 *    放在 notepad 按钮左侧；与 audio.volume 双向同步；锁死后 UI 变灰
 *
 * 配套:reskin-listening.py 的 replace_dead_plyr 给 audio 加了 autoplay muted 属性,
 * autoplay + muted 是绕过 Chrome/Safari 自动播放策略的关键组合(无 muted 的 autoplay 必拒);
 * 本脚本在拿到 play promise 后立刻 muted=false 还原音量,实现"自动播且有声"。
 *
 * audio 元素本身 display:none —— 原生控件不渲染,所有播放/音量控制走本脚本。
 */
(function () {
  'use strict';
  if (window.IELTS_AUDIO_LOCK) return; // 防重复注入
  window.IELTS_AUDIO_LOCK = true;

  var audio = document.getElementById('ielts-local-audio');
  if (!audio) return;

  var VOL_KEY = 'ielts_audio_volume';
  var PLAYED_KEY = 'ielts_audio_played';
  var DEFAULT_VOL = 1;

  /* ---------- 1) 注入自定义音量 UI（蓝色喇叭 + 蓝色水平进度条） ---------- */
  // 锚点：notepad 按钮的父容器是 .realtest-header__btn-group
  // 把音量 UI 插入到 notepad 之前,跟其他按钮在同一 flex 行内
  var notepad = document.getElementById('js-bt-notepad');
  if (notepad && notepad.parentNode) {
    var volUI = document.createElement('div');
    volUI.className = 'ielts-vol';
    volUI.innerHTML =
      '<button type="button" class="ielts-vol__btn" aria-label="音量">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>' +
          '<path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>' +
          '<path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>' +
        '</svg>' +
      '</button>' +
      '<div class="ielts-vol__track" role="slider" aria-label="音量调节" aria-valuemin="0" aria-valuemax="100">' +
        '<div class="ielts-vol__fill"></div>' +
        '<div class="ielts-vol__thumb"></div>' +
      '</div>';
    notepad.parentNode.insertBefore(volUI, notepad);
  }

  var volTrack = document.querySelector('.ielts-vol__track');
  var volFill = document.querySelector('.ielts-vol__fill');
  var volThumb = document.querySelector('.ielts-vol__thumb');
  var volBtn = document.querySelector('.ielts-vol__btn');
  var volUIEl = document.querySelector('.ielts-vol');

  /* ---------- 2) 音量记忆(读 → UI 同步 → 监听 audio.volumechange → 写) ---------- */
  var savedVol = parseFloat(localStorage.getItem(VOL_KEY));
  if (isNaN(savedVol) || savedVol < 0 || savedVol > 1) savedVol = DEFAULT_VOL;
  try { audio.volume = savedVol; } catch (e) {}
  renderVol(savedVol);

  function renderVol(v) {
    if (volFill) volFill.style.width = (v * 100).toFixed(1) + '%';
    if (volThumb) volThumb.style.left = (v * 100).toFixed(1) + '%';
    if (volTrack) volTrack.setAttribute('aria-valuenow', Math.round(v * 100));
  }

  // audio.volume 变化 → UI 同步（用户调原生控件、JS 设置、未来可能接入其他入口都覆盖到）
  audio.addEventListener('volumechange', function () {
    var v = audio.volume;
    if (v >= 0 && v <= 1) {
      try { localStorage.setItem(VOL_KEY, String(v)); } catch (e) {}
      renderVol(v);
    }
  });

  /* ---------- 3) 自定义 UI 拖动/点击 → 改 audio.volume ---------- */
  // 拖动逻辑：mousedown 在 track → 计算位置比例 → 持续更新；mouseup 解除
  // 也支持键盘左右键(原生 input[type=range] 行为)
  var dragging = false;
  function volFromEvent(e) {
    if (!volTrack) return 0;
    var rect = volTrack.getBoundingClientRect();
    var clientX = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
    var ratio = (clientX - rect.left) / rect.width;
    return Math.max(0, Math.min(1, ratio));
  }
  if (volTrack) {
    volTrack.addEventListener('mousedown', function (e) {
      dragging = true;
      var v = volFromEvent(e);
      try { audio.volume = v; } catch (err) {}
      e.preventDefault();
    });
    // mouseup/mousemove 绑在 document(防止鼠标拖出 track 丢失)
    document.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      var v = volFromEvent(e);
      try { audio.volume = v; } catch (err) {}
    });
    document.addEventListener('mouseup', function () { dragging = false; });
    // 键盘调节
    volTrack.addEventListener('keydown', function (e) {
      var step = e.shiftKey ? 0.1 : 0.05;
      var v = audio.volume;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') v = Math.max(0, v - step);
      else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') v = Math.min(1, v + step);
      else if (e.key === 'Home') v = 0;
      else if (e.key === 'End') v = 1;
      else return;
      try { audio.volume = v; } catch (err) {}
      e.preventDefault();
    });
    volTrack.setAttribute('tabindex', '0');
  }

  // 喇叭按钮：mute/unmute 切换
  if (volBtn) {
    volBtn.addEventListener('click', function () {
      if (audio.muted) {
        try { audio.muted = false; } catch (e) {}
        // 解静音后用上次的音量(0 也行),或者 0.5 兜底
        try { audio.volume = parseFloat(localStorage.getItem(VOL_KEY)) || 0.5; } catch (e) {}
      } else {
        try { audio.muted = true; } catch (e) {}
      }
    });
  }

  /* ---------- 4) 真考模式:全量锁死检查(本会话已播过 → 直接锁,不播) ---------- */
  var alreadyPlayed = false;
  try { alreadyPlayed = sessionStorage.getItem(PLAYED_KEY) === '1'; } catch (e) {}

  if (alreadyPlayed) {
    lockHard();
    return;
  }

  /* ---------- 5) 首播:auto play(autoplay muted 在浏览器里默认可过),拿到 promise 后解静音 ---------- */
  var playPromise;
  try { playPromise = audio.play(); } catch (e) { playPromise = null; }

  function unmuteAndMark() {
    try { audio.muted = false; } catch (e) {}
    try { sessionStorage.setItem(PLAYED_KEY, '1'); } catch (e) {}
  }

  if (playPromise && typeof playPromise.then === 'function') {
    playPromise.then(function () {
      unmuteAndMark();
    }).catch(function () {
      // 静默降级,仍标记 played(刷新后锁死)
      unmuteAndMark();
    });
  } else {
    unmuteAndMark();
  }

  /* ---------- 6) 不可拖不可重听(JS 层拦截) ---------- */
  audio.addEventListener('seeking', function () {
    if (audio.currentTime > 0.5) {
      audio.currentTime = 0;
    }
  });
  audio.addEventListener('play', function () {
    if (alreadyPlayed) {
      audio.pause();
    }
  });
  audio.addEventListener('ended', function () {
    lockHard();
  });

  /* ---------- 7) 全量锁死的兜底函数(本页内播完/本会话已播/自动播放被拒 都用) ---------- */
  function lockHard() {
    document.body.classList.add('audio_locked');
    try { audio.pause(); } catch (e) {}
    try { audio.muted = true; } catch (e) {}
    try { audio.currentTime = 0; } catch (e) {}
    // UI 不可拖
    if (volTrack) {
      volTrack.setAttribute('aria-disabled', 'true');
      volTrack.removeAttribute('tabindex');
    }
    if (volBtn) volBtn.setAttribute('disabled', 'true');
  }
})();
