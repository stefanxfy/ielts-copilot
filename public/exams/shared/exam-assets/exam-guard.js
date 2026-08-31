/**
 * exam-guard.js — 考试页离开防护（阅读/听力/写作机考页通用）
 *
 * 触发场景（全部弹原生 confirm 拦截，提示为英文，对齐真考 UI 语言习惯）：
 *   - 刷新页面（F5 / Cmd+R / 地址栏回车）
 *   - 关闭标签页 / 关闭浏览器窗口
 *   - 点击浏览器后退按钮（popstate 拦截）
 *   - 页面内跳离考试（点击外链等 beforeunload 场景）
 *
 * 行为：
 *   - 「确定/OK」= 继续离开/刷新（作答不保存，视为放弃本次考试）
 *   - 「取消/Cancel」= 留在考试页继续作答
 *   - 交卷完成后自动解除防护（scoring.js 的 gradeInline / writing 页提交后
 *     调 window.IELTS_EXAM_GUARD_OFF()）
 *   - 听力卷：刷新/离开视为放弃 → 额外清掉 sessionStorage 已播标记，
 *     下次进入可重新播放音频（真考锁随"放弃考试"重置）
 *
 * 注：beforeunload 的提示文案由浏览器渲染（各浏览器自定义样式，
 *     我们只能提供 direction），popstate 与页面内链接拦截用 confirm 弹窗。
 */
(function () {
  'use strict';
  if (window.IELTS_EXAM_GUARD) return; // 防重复注入
  window.IELTS_EXAM_GUARD = true;

  var armed = true;
  var PLAYED_KEY = 'ielts_audio_played';

  /* ---------- 1) 刷新 / 关闭页面 / 外链跳离：beforeunload 拦截 ---------- */
  window.addEventListener('beforeunload', function (e) {
    if (!armed) return;
    // 听力卷离开时清已播标记：离开即放弃，下次进入音频可重播
    try { sessionStorage.removeItem(PLAYED_KEY); } catch (err) {}
    e.preventDefault();          // Chrome/Edge/Safari 标准触发方式
    e.returnValue = '';          // 老版 Firefox 触发方式
    return '';                   // 兜底
  });

  /* ---------- 2) 浏览器后退按钮：popstate 拦截 + confirm ---------- */
  // 先推一个哨兵历史记录,后退时弹 confirm;「取消」则把用户推回考试页
  history.pushState({ ieltsGuard: 1 }, '', location.href);
  window.addEventListener('popstate', function (e) {
    if (!armed) return;
    var leave = window.confirm(
      'You are about to leave the exam.\n\n' +
      'Your answers will NOT be saved.\n\n' +
      'Click OK to abandon the exam, or Cancel to continue.'
    );
    if (leave) {
      // 视为放弃:清听力已播标记,并回退到上一页(仪表盘/须知页)
      try { sessionStorage.removeItem(PLAYED_KEY); } catch (err) {}
      history.back();
    } else {
      // 继续考试:推回考试页
      history.pushState({ ieltsGuard: 1 }, '', location.href);
    }
  });

  /* ---------- 3) 交卷后解除（由 scoring.js / writing 页调用） ---------- */
  window.IELTS_EXAM_GUARD_OFF = function () {
    armed = false;
    console.log('[exam-guard] 防护已解除(考试已结束)');
  };

  console.log('[exam-guard] 考试离开防护已启用');
})();
