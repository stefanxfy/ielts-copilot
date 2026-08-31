/**
 * exam-guard.js — 考试页离开防护(顶层壳 + 静态卷页双层配合)
 *
 * 本脚本运行在两层,职责不同:
 *
 * 【顶层(React 机考页壳注入)】—— 防护主阵地
 *   - beforeunload:拦截刷新/关闭标签页/关闭浏览器/跳离
 *   - popstate + 历史哨兵:拦截浏览器后退,弹英文 confirm
 *   - 交卷信号:iframe 内 postMessage({type:'ielts-exam-finished'})
 *     到顶层后解除防护
 *
 * 【iframe 内(静态卷页注入)】—— 只负责信号
 *   - 交卷(scoring.gradeInline / exam-note.finish)后向顶层
 *     postMessage 解除防护;若顶层同源可直达 window.parent
 *
 * 为什么防护必须在顶层:浏览器的后退/刷新/关闭操作的是顶层文档,
 * iframe 内部的 popstate/beforeunload 对顶层导航无能为力。
 * (旧版把哨兵推在 iframe history 里,后退根本触发不到,已废弃)
 */
(function () {
  'use strict';
  if (window.IELTS_EXAM_GUARD) return;
  window.IELTS_EXAM_GUARD = true;

  var IS_TOP = window === window.top;
  var PLAYED_KEY = 'ielts_audio_played';

  /* ============ iframe 内(静态卷页):交卷信号 + 用户激活上报 ============ */
  if (!IS_TOP) {
    // 静态卷页交卷完成 → 通知顶层解除防护
    window.IELTS_EXAM_GUARD_OFF = function () {
      try {
        window.parent.postMessage({ type: 'ielts-exam-finished' }, '*');
      } catch (e) {}
      console.log('[exam-guard][iframe] 已通知顶层:考试结束,防护解除');
    };

    // 卷页内任意点击 → 上报顶层(激活徽标即时更新;激活本身按规范也会
    // 传播到顶层使 beforeunload 弹窗有资格,这里只是让可观测性更及时)
    document.addEventListener('pointerdown', function () {
      try {
        window.parent.postMessage({ type: 'ielts-user-active' }, '*');
      } catch (e) {}
    }, { capture: true });

    /* ============ 错题锚点跳转(P3,成绩页回看) ============
       顶层壳 ExamJump 发来 {type:'ielts-jump-anchor', anchor:'q-23'},
       按 id 直找控件;找不到再按 name / data-num 回退(块题/单选组等
       多个控件共享同一锚点的情况,滚到第一个)。 */
    window.addEventListener('message', function (ev) {
      var d = ev.data;
      if (!d || d.type !== 'ielts-jump-anchor' || !d.anchor) return;
      var el =
        document.getElementById(d.anchor) ||
        document.querySelector('[name="' + d.anchor + '"]') ||
        document.querySelector('[data-num="' + d.anchor.replace(/^q-/, '') + '"]');
      if (!el) {
        console.warn('[exam-guard][iframe] 锚点未找到:', d.anchor);
        return;
      }
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // 短暂高亮提示定位(纯视觉,2 秒后淡出)
      try {
        var prevBg = el.style.boxShadow;
        el.style.boxShadow = '0 0 0 3px rgba(26,111,235,0.55)';
        el.style.transition = 'box-shadow 0.6s ease 1.4s';
        setTimeout(function () {
          el.style.boxShadow = prevBg;
        }, 2000);
      } catch (e) {}
      console.log('[exam-guard][iframe] 已定位锚点:', d.anchor);
    });

    console.log('[exam-guard][iframe] 静态卷页信号模式已启用(防护在顶层壳)');
    return;
  }

  /* ============ 顶层(机考页壳):防护主阵地 ============ */
  var armed = true;

  // 1) 刷新 / 关闭页面 / 跳离:beforeunload 拦截
  //    注:Chrome 要求页面先发生过用户交互才弹;iframe 内答题交互也算,
  //    但保险起见顶层也监听一次 click 以激活弹窗资格
  window.addEventListener('beforeunload', function (e) {
    if (!armed) return;
    // 听力卷离开即放弃:清已播标记,下次进入音频可重播
    try { sessionStorage.removeItem(PLAYED_KEY); } catch (err) {}
    console.warn('[exam-guard][top] 拦截到刷新/关闭/跳离,armed=' + armed);
    e.preventDefault();
    e.returnValue = '';
    return '';
  });

  // 2) 浏览器后退:popstate 拦截 + 英文 confirm
  history.pushState({ ieltsGuard: 1 }, '', location.href);
  window.addEventListener('popstate', function () {
    if (!armed) { console.log('[exam-guard][top] popstate:已交卷,放行'); return; }
    console.warn('[exam-guard][top] 拦截到后退,弹确认');
    var leave = window.confirm(
      'You are about to leave the exam.\n\n' +
      'Your answers will NOT be saved.\n\n' +
      'Click OK to abandon the exam, or Cancel to continue.'
    );
    if (leave) {
      try { sessionStorage.removeItem(PLAYED_KEY); } catch (err) {}
      console.log('[exam-guard][top] 用户选择放弃:清已播标记并回退');
      history.back();
    } else {
      console.log('[exam-guard][top] 用户选择继续考试:推回哨兵');
      history.pushState({ ieltsGuard: 1 }, '', location.href);
    }
  });

  // 3) iframe 交卷信号 → 解除防护
  window.addEventListener('message', function (ev) {
    if (ev.data && ev.data.type === 'ielts-exam-finished') {
      armed = false;
      console.log('[exam-guard][top] 收到 iframe 交卷信号,防护解除');
    }
  });

  window.IELTS_EXAM_GUARD_OFF = function () {
    armed = false;
    console.log('[exam-guard][top] 防护已解除(顶层直调)');
  };

  console.log('[exam-guard][top] 顶层防护已启用(beforeunload + 后退拦截)');
})();
