/* ============ PES 2021 补丁下载站 · 交互逻辑 ============ */
(function(){
  "use strict";

  var DATA = window.PATCH_DATA || {patches:[],categories:[],updatedAt:""};
  var patches = DATA.patches || [];
  var PAGE_SIZE = 24;

  var state = {
    category: "all",
    query: "",
    sort: "newest",
    visible: PAGE_SIZE
  };

  var el = {
    grid: document.getElementById("grid"),
    chips: document.getElementById("categoryChips"),
    cntAll: document.getElementById("cnt-all"),
    resultCount: document.getElementById("resultCount"),
    updateTime: document.getElementById("updateTime"),
    search: document.getElementById("searchInput"),
    clearSearch: document.getElementById("clearSearch"),
    sort: document.getElementById("sortSelect"),
    loadMore: document.getElementById("loadMore"),
    loadMoreWrap: document.getElementById("loadMoreWrap"),
    empty: document.getElementById("emptyState"),
    statTotal: document.getElementById("statTotal"),
    statCats: document.getElementById("statCats"),
    statUpdated: document.getElementById("statUpdated"),
    modal: document.getElementById("modal"),
    modalContent: document.getElementById("modalContent")
  };

  // ---------- 日期解析 ----------
  function parseDate(p){
    var raw = p.isoDate || p.date || "";
    var t = Date.parse(raw);
    if(!isNaN(t)) return t;
    // dd.mm.yyyy
    var m = String(raw).match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if(m) return new Date(+m[3], +m[2]-1, +m[1]).getTime();
    return 0;
  }
  function formatDate(p){
    var raw = p.date || "";
    var m = String(raw).match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if(m) return m[3]+"-"+m[2].padStart(2,"0")+"-"+m[1].padStart(2,"0");
    if(p.isoDate) return p.isoDate.slice(0,10);
    return raw;
  }

  // ---------- 初始化 ----------
  function init(){
    // 统计
    el.statTotal.textContent = patches.length;
    var cats = (DATA.categories||[]).filter(function(c){return patches.some(function(p){return p.category && p.category.key===c.key});});
    el.statCats.textContent = cats.length;
    var upd = DATA.updatedAt ? DATA.updatedAt.slice(0,10) : "--";
    el.statUpdated.textContent = upd;
    el.updateTime.textContent = "数据更新：" + upd;
    el.cntAll.textContent = patches.length;

    // 分类chips
    cats.forEach(function(c){
      var n = patches.filter(function(p){return p.category && p.category.key===c.key}).length;
      var b = document.createElement("button");
      b.className = "filter-chip";
      b.setAttribute("data-cat", c.key);
      b.innerHTML = escapeHtml(c.zh) + ' <span class="chip-count">'+n+'</span>';
      b.addEventListener("click", function(){
        state.category = c.key;
        state.visible = PAGE_SIZE;
        document.querySelectorAll(".filter-chip").forEach(function(x){x.classList.remove("active")});
        b.classList.add("active");
        // sync the "all" chip
        render();
      });
      el.chips.appendChild(b);
    });

    // "全部" chip click
    var allChip = document.querySelector('.filter-chip[data-cat="all"]');
    allChip.addEventListener("click", function(){
      state.category="all"; state.visible=PAGE_SIZE;
      document.querySelectorAll(".filter-chip").forEach(function(x){x.classList.remove("active")});
      allChip.classList.add("active");
      render();
    });

    // 搜索
    var t;
    el.search.addEventListener("input", function(){
      el.clearSearch.classList.toggle("show", !!el.search.value);
      clearTimeout(t);
      t = setTimeout(function(){
        state.query = el.search.value.trim().toLowerCase();
        state.visible = PAGE_SIZE;
        render();
      }, 180);
    });
    el.clearSearch.addEventListener("click", function(){
      el.search.value=""; state.query=""; el.clearSearch.classList.remove("show");
      state.visible=PAGE_SIZE; render();
    });

    // 排序
    el.sort.addEventListener("change", function(){
      state.sort=el.sort.value; state.visible=PAGE_SIZE; render();
    });

    // 加载更多
    el.loadMore.addEventListener("click", function(){
      state.visible += PAGE_SIZE; render();
    });

    document.addEventListener("keydown", function(e){
      if(e.key==="Escape") closeModal();
    });

    render();
  }

  // ---------- 过滤 + 排序 ----------
  function getFiltered(){
    var q = state.query;
    var list = patches.filter(function(p){
      var catOk = state.category==="all" || (p.category && p.category.key===state.category);
      if(!catOk) return false;
      if(!q) return true;
      var hay = [p.title,p.summary,p.summaryZh,p.author,
                 p.category&&p.category.zh,p.category&&p.category.en].join(" ").toLowerCase();
      return hay.indexOf(q)!==-1;
    });
    list.sort(function(a,b){
      if(state.sort==="oldest") return parseDate(a)-parseDate(b);
      if(state.sort==="title") return a.title.localeCompare(b.title);
      if(state.sort==="category"){
        var c=(a.category&&a.category.zh||"").localeCompare(b.category&&b.category.zh||"");
        return c!==0?c:parseDate(b)-parseDate(a);
      }
      return parseDate(b)-parseDate(a); // newest
    });
    return list;
  }

  // ---------- 渲染 ----------
  function render(){
    var list = getFiltered();
    el.resultCount.textContent = list.length;
    el.empty.hidden = list.length!==0;
    var shown = list.slice(0,state.visible);
    el.grid.innerHTML = shown.map(cardHtml).join("");
    el.loadMoreWrap.style.display = list.length>state.visible ? "block":"none";
    if(list.length>state.visible){
      el.loadMore.textContent = "加载更多补丁（还有 "+(list.length-state.visible)+" 个）↓";
    }
    // 绑定卡片点击
    Array.prototype.forEach.call(el.grid.querySelectorAll(".card"), function(card){
      card.addEventListener("click", function(){ openModal(card.getAttribute("data-id")); });
    });
  }

  function cardHtml(p){
    var id = patches.indexOf(p);
    var img = p.image || "";
    var imgHtml = img
      ? '<img class="card-img" src="'+escapeAttr(img)+'" alt="'+escapeAttr(p.title)+'" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">'+ '<div class="card-img-fallback" style="display:none">⚽</div>'
      : '<div class="card-img-fallback">⚽</div>';
    var dlCount = (p.downloads||[]).length;
    var cat = p.category ? p.category.zh : "补丁";
    var src = p.sourceSite || "pes-files.com";
    var srcShort = src.replace(".com", "").replace(".uk", "");
    var dateStr = formatDate(p);
    return ''+
      '<article class="card" data-id="'+id+'">'+
        '<div class="card-img-wrap">'+imgHtml+
          (dateStr && dateStr !== '--' ? '<span class="card-date">'+escapeHtml(dateStr)+'</span>' : '')+
          '<span class="card-cat">'+escapeHtml(cat)+'</span>'+
          '<span class="card-src">'+escapeHtml(srcShort)+'</span>'+
        '</div>'+
        '<div class="card-body">'+
          '<h3 class="card-title">'+escapeHtml(p.title)+'</h3>'+
          '<p class="card-summary">'+escapeHtml(p.summaryZh || p.summary || "暂无简介")+'</p>'+
          '<div class="card-foot">'+
            '<span class="download-count">'+ (dlCount? '<b>'+dlCount+'</b> 个下载源':'查看详情') +'</span>'+
            '<button class="btn-download">查看并下载 →</button>'+
          '</div>'+
        '</div>'+
      '</article>';
  }

  // ---------- 弹窗 ----------
  function openModal(id){
    var p = patches[+id];
    if(!p) return;
    var cat = p.category ? p.category.zh : "补丁";
    var imgHtml = p.image
      ? '<img class="modal-hero" src="'+escapeAttr(p.image)+'" alt="'+escapeAttr(p.title)+'" onerror="this.style.display=\'none\'">'
      : '';
    var dlHtml = (p.downloads||[]).map(function(d){
      var host = d.host || "";
      var icon = hostIcon(host);
      return ''+
        '<div class="download-item">'+
          '<div>'+
            '<div class="dl-host"><span class="host-icon">'+icon+'</span>'+escapeHtml(host)+'</div>'+
            '<div class="dl-label">'+escapeHtml((d.label||"下载").slice(0,40))+'</div>'+
          '</div>'+
          '<a class="dl-btn" href="'+escapeAttr(d.url)+'" target="_blank" rel="noopener noreferrer">前往下载 ↗</a>'+
        '</div>';
    }).join("");
    if(!dlHtml) dlHtml = '<p style="font-size:13px;color:var(--muted)">暂无直接下载链接，请前往原页面查看。</p>';
    var pwdHtml = p.password
      ? '<div class="password-box">🔑 压缩包密码：<code>'+escapeHtml(p.password)+'</code>（点击可选中复制）</div>'
      : '';
    var content = ''+
      imgHtml+
      '<div class="modal-content">'+
        '<span class="modal-cat">'+escapeHtml(cat)+'</span>'+
        '<h2>'+escapeHtml(p.title)+'</h2>'+
        '<div class="modal-meta">'+
          (formatDate(p) && formatDate(p) !== '--' ? '<span>📅 '+escapeHtml(formatDate(p))+'</span>' : '')+
          (p.author?'<span>✍️ '+escapeHtml(p.author)+'</span>':'')+
          (p.sourceSite?'<span>🌐 来源：'+escapeHtml(p.sourceSite)+'</span>':'')+
        '</div>'+
        '<div class="modal-summary">'+escapeHtml(p.summaryZh||p.summary||"暂无简介")+
          (p.summary && p.summaryZh!==p.summary ? '<small>原文：'+escapeHtml(p.summary)+'</small>':'')+
        '</div>'+
        '<div class="modal-section-title">⬇️ 直达下载链接（'+(p.downloads||[]).length+'）</div>'+
        '<div class="download-list">'+dlHtml+'</div>'+
        pwdHtml+
        '<p class="modal-note">本站仅聚合公开信息，不托管任何文件。资源版权归原作者所有。若链接失效，可前往 <a class="modal-source-link" href="'+escapeAttr(p.url)+'" target="_blank" rel="noopener noreferrer">原始页面 ↗</a> 查看更新。</p>'+
      '</div>';
    el.modalContent.innerHTML = content;
    el.modal.hidden = false;
    document.body.style.overflow = "hidden";
  }
  window.openModal = openModal;
  window.closeModal = function(){
    el.modal.hidden = true;
    document.body.style.overflow = "";
  };
  window.resetFilters = function(){
    state.query=""; state.category="all"; state.visible=PAGE_SIZE;
    el.search.value=""; el.clearSearch.classList.remove("show");
    document.querySelectorAll(".filter-chip").forEach(function(x){x.classList.remove("active")});
    document.querySelector('.filter-chip[data-cat="all"]').classList.add("active");
    render();
  };

  function hostIcon(host){
    host = (host||"").toLowerCase();
    if(host.indexOf("mediafire")>-1) return "📦";
    if(host.indexOf("modsfire")>-1) return "🔥";
    if(host.indexOf("sharemods")>-1) return "📁";
    if(host.indexOf("mega")>-1) return "☁️";
    if(host.indexOf("drive.google")>-1) return "💾";
    return "🔗";
  }

  function escapeHtml(s){
    return String(s==null?"":s).replace(/[&<>"']/g,function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }
  function escapeAttr(s){ return escapeHtml(s); }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init);
  else init();
})();
