/* ============ PES 2021 补丁下载站 · 统计模块 ============
 * 1) 访问量：不蒜子（零注册、开箱即用），在页脚显示累计 PV / UV
 * 2) 卡片点击 / 下载 / 搜索 / 筛选：百度统计事件埋点
 *
 * 使用方法：
 *   把 BAIDU_ID 留空 → 只有不蒜子访问量生效，事件统计自动跳过
 *   注册百度统计（https://tongji.baidu.com）→ 添加本站网址 →
 *   拿到 hm.js? 后面那串 ID 填进 BAIDU_ID → 事件统计立即生效
 */
(function () {
  "use strict";

  /* ====== 配置区 ====== */
  var BAIDU_ID = "";     // ← 填入百度统计 ID，例如 "0123456789abcdef"
  var AFDIAN_URL = "";   // ← 填入你的爱发电主页链接，例如 "https://afdian.com/a/你的用户名"，留空则入口隐藏
  /* ==================== */

  var enabled = !!BAIDU_ID;

  if (enabled) {
    window._hmt = window._hmt || [];
    (function () {
      var hm = document.createElement("script");
      hm.async = true;
      hm.src = "https://hm.baidu.com/hm.js?" + BAIDU_ID;
      var s = document.getElementsByTagName("script")[0];
      if (s && s.parentNode) s.parentNode.insertBefore(hm, s);
      else document.head.appendChild(hm);
    })();
  }

  function push(category, action, label, value) {
    if (!enabled || !window._hmt) return;
    try {
      window._hmt.push(["_trackEvent", category, action, String(label || ""), value || 1]);
    } catch (e) { /* 统计失败不影响页面 */ }
  }

  // 爱发电赞助入口：配置了链接才显示，并埋点统计点击
  (function renderSupport(){
    if (!AFDIAN_URL) return;
    var box = document.getElementById("supportBox");
    var link = document.getElementById("supportLink");
    if (!box || !link) return;
    link.href = AFDIAN_URL;
    box.hidden = false;
    link.addEventListener("click", function () {
      push("赞助支持", "点击", "爱发电", 1);
    });
  })();

  window.Stats = {
    cardClick: function (p) {
      if (!p) return;
      var cat = p.category && p.category.zh ? p.category.zh + " / " : "";
      push("补丁卡片", "点击详情", cat + p.title, 1);
    },
    downloadClick: function (p, host) {
      if (!p) return;
      push("下载链接", host || "其他", p.title, 1);
    },
    sourceLink: function (p) {
      if (!p) return;
      push("原始页面", "跳转", p.title, 1);
    },
    search: function (q) {
      if (q) push("站内搜索", "关键词", q, 1);
    },
    filter: function (cat) {
      push("分类筛选", "切换", cat || "all", 1);
    },
    loadMore: function () {
      push("加载更多", "点击", "补丁列表", 1);
    }
  };
})();
