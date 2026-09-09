/* theme-follow.js — 真题卷面主题跟随
 * 卷面是独立静态文档(iframe 或独立标签),主题存在应用 DB(app_settings.ui_theme),
 * 这里负责:①载入时读当前皮肤(支持 ?__theme= 参数便于调试/截图) ②监听换肤广播实时切换。
 * 配套:theme-follow.css 按 html[data-theme] 覆盖卷面表面;src/lib/ui-theme.ts 切肤时广播。 */
(function () {
  var VALID = { wheat: 1, ink: 1, academia: 1, seasalt: 1, porcelain: 1, bamboo: 1, monet: 1, night: 1 };

  function apply(theme) {
    if (!VALID[theme]) return;
    var de = document.documentElement;
    if (theme === "wheat") de.removeAttribute("data-theme");
    else de.setAttribute("data-theme", theme);
  }

  /* 1) 初始皮肤:URL 参数(调试) > 应用 API */
  var m = location.search.match(/[?&]__theme=([a-z]+)/);
  if (m) {
    apply(m[1]);
  } else if (location.protocol === "http:" || location.protocol === "https:") {
    try {
      fetch("/api/ui-theme")
        .then(function (r) { return r.json(); })
        .then(function (d) { apply(d && d.theme); })
        .catch(function () {});
    } catch (e) {}
  }

  /* 2) 实时同步:应用壳 postMessage(同文档树 iframe)+ BroadcastChannel(跨标签) */
  window.addEventListener("message", function (e) {
    var d = e.data;
    if (d && d.type === "ielts-ui-theme") apply(d.theme);
  });
  try {
    var bc = new BroadcastChannel("ielts-ui-theme");
    bc.onmessage = function (ev) {
      var d = ev.data;
      if (d && d.type === "ielts-ui-theme") apply(d.theme);
    };
  } catch (e) {}
})();
