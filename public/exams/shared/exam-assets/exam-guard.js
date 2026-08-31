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
      // 同时给本层打标记:交卷后不再拦截刷新快捷键(否则看成绩时按
      // Cmd+R 还会被弹"放弃考试?"确认框)
      window.IELTS_EXAM_FINISHED = true;
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

    /* ============ 刷新快捷键拦截(焦点在 iframe 内也能拦) ============
       为什么必须在这里拦:用户答题时焦点在 iframe 内,键盘事件直接
       派发给 iframe 的 document,不会传播到顶层 window —— 顶层
       exam-guard.tsx 那个 keydown(capture)永远收不到 F5/Cmd+R,
       浏览器按默认行为直接刷新 → 只弹 Chrome 原生 beforeunload 窗,
       我们自定义的英文 confirm 从不出现(日志里也确实没有
       "[exam-guard][top] 拦截刷新快捷键")。
       因此这里在 capture 阶段抢先 preventDefault 掐掉浏览器默认刷新,
       再 postMessage 交顶层统一弹确认;顶层或 iframe 只需一份生效,
       顶层那份保留用于焦点在顶栏/徽标时的场景。 */
    var onReloadKeys = function (e) {
      if (window.IELTS_EXAM_FINISHED) return; // 已交卷:不拦,放行刷新
      var key = (e.key || '').toLowerCase();
      var isF5 = key === 'f5';
      var isReloadCombo = key === 'r' && (e.metaKey || e.ctrlKey);
      if (!isF5 && !isReloadCombo) return;
      e.preventDefault();
      e.stopPropagation();
      console.warn('[exam-guard][iframe] 拦截刷新快捷键(' + (isF5 ? 'F5' : 'Cmd/Ctrl+R') + '),转顶层弹确认');
      try {
        window.parent.postMessage({
          type: 'ielts-reload-request',
          via: isF5 ? 'F5' : 'Cmd/Ctrl+R'
        }, '*');
      } catch (err) {}
    };
    // capture 阶段:早于卷页自身脚本(jQuery 等)的处理器
    document.addEventListener('keydown', onReloadKeys, true);
    window.addEventListener('keydown', onReloadKeys, true);

    /* ============ 连考场次注入(P4) ============
       顶层壳发来 {type:'ielts-session', sessionId} → 存入 window.IELTS_SESSION_ID,
       供 scoring.js 交卷上报时带上,归入对应 exam_sessions 场次。 */
    window.addEventListener('message', function (ev) {
      var d = ev.data;
      if (!d || d.type !== 'ielts-session' || !d.sessionId) return;
      window.IELTS_SESSION_ID = d.sessionId;
      console.log('[exam-guard][iframe] 已注入场次:', d.sessionId);
    });

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

    /* ============ 回看模式:回填答题卡 + inline 批改(P3) ============
       顶层壳发来 {type:'ielts-review-record', values:{题号:作答串}}。
       把 DB 里的作答灌回卷面控件(填空/单选/多选/块题/下拉),再调
       scoring.js 的 gradeInline —— 与交卷时刻同一条渲染路径:✓/✗ 标注、
       标准答案、题号板染色、成绩条全部还原。 */
    window.addEventListener('message', function (ev) {
      var d = ev.data;
      if (!d || d.type !== 'ielts-review-record' || !d.values) return;

      // 等待 scoring.js 就绪(它在 DOMContentLoaded 之前同步注入,一般已到位)
      var waited = 0;
      (function waitForScoring() {
        if (window.IELTS_SCORING) { fillAndGrade(d.values); return; }
        if (++waited > 50) { console.warn('[exam-guard][iframe] scoring.js 未就绪,放弃回看回填'); return; }
        setTimeout(waitForScoring, 100);
      })();

      function fillAndGrade(values) {
        var filled = 0;
        Object.keys(values).forEach(function (n) {
          var user = String(values[n] || '');
          if (!user) return;
          // 1) 单选/多选/块题:radio/checkbox 按 name 匹配勾选
          var checks = document.querySelectorAll('input[name="q-' + n + '"]');
          if (checks.length) {
            var picked = user.replace(/\s/g, '').split(',');
            for (var i = 0; i < checks.length; i++) {
              checks[i].checked = picked.indexOf(checks[i].value) >= 0;
            }
            filled++;
            return;
          }
          // 2) 填空/下拉:input/select 按 data-num 匹配赋值
          var els = document.querySelectorAll('[data-num="' + n + '"]');
          for (var j = 0; j < els.length; j++) {
            var el = els[j];
            if (el.tagName === 'SELECT' && user) { el.value = user; filled++; break; }
            if (el.tagName === 'INPUT' && (el.type === 'text' || el.type === 'textarea')) {
              el.value = user; filled++;
            }
          }
        });
        console.log('[exam-guard][iframe] 回看回填完成:' + filled + ' 题已灌入,触发批改渲染');
        try {
          window.IELTS_SCORING.gradeInline(true);
        } catch (e) {
          console.warn('[exam-guard][iframe] 批改渲染失败:', e);
        }
      }
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
