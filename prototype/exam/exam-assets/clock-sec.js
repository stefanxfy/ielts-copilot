/**
 * clock-sec.js — 机考倒计时到秒（mm:ss）显示接管（阅读/写作/听力机考页通用）
 *
 * 原站逻辑：timeValue = minutes >= 1 ? minutes : seconds —— 整分钟显示，最后一分钟才跳秒。
 * 产品要求（2026-08-30 用户确认）：倒计时必须精确到秒。
 *
 * 实现手法与 scoring.js 的 freezeTimer 同款「克隆去 id」：
 * 把 #time-clock 替换为去掉 id 的静态克隆放回原位 —— 原站闭包持旧引用继续写游离节点，
 * 可见时钟由本脚本接管，每秒渲染 mm:ss（墙钟差值计算，不累积漂移）。
 * 交卷/时间到后由 scoring.js / writing-note.js 调 window.IELTS_CLOCK_SEC_STOP() 冻结。
 *
 * 延期启动模式（2026-08-30 听力 Test sound 改造引入）：
 * - URL 含 ?clockdefer=1 或 localStorage.ielts_clock_defer=1 时，渲染 total 但不启动计时
 *   （防止考生点 Continue 前 Test sound 阶段已经开始耗时间）
 * - 调 window.IELTS_CLOCK_SEC_START() 显式启动
 * - test-sound.html 跳主体页时清掉标记 + 主体页加载后由 test-sound 在跳转前用
 *   setTimeout 异步触发（实际语义：跳页瞬间启动，几乎无延迟）
 */
(function () {
  'use strict';
  if (window.IELTS_CLOCK_SEC) return; // 防重复注入
  window.IELTS_CLOCK_SEC = true;

  var clock = document.getElementById('time-clock');
  if (!clock) return;
  var total = parseInt(clock.getAttribute('data-time') || '3600', 10);
  if (!total || total <= 0) return;

  // 接管：克隆节点（去 id）替换原节点，原站计时闭包从此写游离节点
  var taken = clock.cloneNode(true);
  taken.removeAttribute('id');
  clock.parentNode.replaceChild(taken, clock);

  var valEl = taken.querySelector('.realtest-header__time-val');
  var txtEl = taken.querySelector('.realtest-header__time-text');
  if (!valEl) return;
  if (txtEl) txtEl.style.display = 'none'; // 原「minutes remaining」文案对 mm:ss 无意义

  // 延期模式：URL ?clockdefer=1 或 localStorage.ielts_clock_defer=1 触发（前者覆盖后者）
  // test-sound.html Continue 时清 localStorage 标记,所以「跨页」场景由调用方负责清除
  var deferByUrl = /[?&]clockdefer=1\b/.test(location.search);
  var deferByStorage = false;
  try { deferByStorage = localStorage.getItem('ielts_clock_defer') === '1'; } catch (e) {}
  var deferred = deferByUrl || deferByStorage;
  if (deferByUrl) {
    // URL 模式：清 storage 避免刷新时残留
    try { localStorage.removeItem('ielts_clock_defer'); } catch (e) {}
  }

  var start = Date.now(), stopped = false, started = !deferred, timer = null;

  function fmt(sec) {
    sec = Math.max(0, sec);
    var m = Math.floor(sec / 60), s = sec % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function render() {
    var left = started ? total - Math.floor((Date.now() - start) / 1000) : total;
    valEl.textContent = fmt(left);
    // PRD §3.4：≤10 分钟转红（原站点在最后 1 分钟才变色，这里对齐产品要求）
    valEl.style.color = left <= 600 ? '#d64545' : '';
    valEl.style.fontWeight = left <= 600 ? '700' : '';
    if (started && left <= 0) stop();
  }

  function stop() {
    if (stopped) return;
    stopped = true;
    if (timer) window.clearInterval(timer);
  }

  function startClock() {
    if (started || stopped) return;
    started = true;
    start = Date.now();
    if (timer) window.clearInterval(timer);
    timer = window.setInterval(function () { if (!stopped) render(); }, 1000);
    render();
  }

  // 供交卷流程冻结可见时钟（scoring.js / writing-note.js 调用）
  window.IELTS_CLOCK_SEC_STOP = stop;
  // 供 Test sound 页 Continue 跳主体后显式启动（test-sound 跳页前清 localStorage 标记）
  window.IELTS_CLOCK_SEC_START = startClock;

  render();
  if (started) {
    timer = window.setInterval(function () { if (!stopped) render(); }, 1000);
  } else {
    /* defer 模式（同窗口跳转场景：test-sound 跳页前无法在新页调 START 触发，靠本页"加载即启动"）
       跨页 JS 全局对象重置，test-sound 没办法在新页加载时再调一次 startClock。
       语义：defer 标记 = "Continue 后立即启动" → "页面加载完" = 立即启动。
       setTimeout(0) 推迟到当前同步任务（DOM 构建 + 原站脚本初始化）之后,
       让原站把 #time-clock 的 data-time 等属性都准备好,避免极端时序下读到空 data。 */
    window.setTimeout(function () { if (!started && !stopped) startClock(); }, 0);
  }
})();
