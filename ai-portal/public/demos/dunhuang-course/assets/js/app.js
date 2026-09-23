/* 敦煌课程门户 · 公共运行时 */
(function () {
  const D = window.DUNHUANG;
  window.D = D;

  /* ---------- 通用工具 ---------- */
  window.$ = (s, r) => (r || document).querySelector(s);
  window.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  /* 图片失败回退到风格化 SVG 占位 */
  window.imgFallback = function (el, label) {
    if (el.dataset.fb) return;
    el.dataset.fb = "1";
    const t = encodeURIComponent(label || "敦煌");
    el.src = "data:image/svg+xml;utf8," + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#2a4c55"/><stop offset=".5" stop-color="#3f6f7a"/>' +
      '<stop offset="1" stop-color="#a4552f"/></linearGradient></defs>' +
      '<rect width="800" height="600" fill="url(#g)"/>' +
      '<circle cx="400" cy="240" r="130" fill="none" stroke="#c8a24b" stroke-width="3" opacity=".6"/>' +
      '<text x="400" y="430" text-anchor="middle" font-family="serif" font-size="40" fill="#e8d5a3">' + t + '</text>' +
      '</svg>');
  };
  document.addEventListener('error', function (e) {
    if (e.target && e.target.tagName === 'IMG') imgFallback(e.target, e.target.alt || '敦煌');
  }, true);

  /* ---------- 页面外壳：导航 / 页脚 / 背景乐 / 讲解员 ---------- */
  const NAV = [
    ["index.html", "首页"], ["chapters.html", "课程章节"], ["map.html", "丝路地图"],
    ["gallery.html", "文物长廊"], ["archive.html", "课程档案"]
  ];
  window.renderShell = function (active, opts) {
    opts = opts || {};
    document.body.classList.toggle('dark-body', !!opts.dark);

    /* 导航 */
    const header = document.createElement('header');
    header.className = 'site-header';
    header.innerHTML =
      '<div class="nav-inner">' +
        '<a class="brand" href="index.html"><span class="mark">敦</span>' +
          '<span class="brand-name">敦煌艺术与丝路文明<small>丝路数字课程</small></span></a>' +
        '<nav class="nav-links">' + NAV.map(function (n) {
          const cur = (location.pathname.split('/').pop() || 'index.html') === n[0];
          const cls = (active && n[0] === active) || cur ? 'active' : '';
          return '<a class="' + cls + '" href="' + n[0] + '">' + n[1] + '</a>';
        }).join('') + '</nav>' +
        '<button class="music-toggle" id="musicToggle" title="背景乐开关">' +
          '<span class="mt-ico">♫</span><span class="mt-txt">埙笛·背景乐</span></button>' +
      '</div>';
    document.body.prepend(header);

    /* 页脚 */
    const footer = document.createElement('footer');
    footer.className = 'site-footer';
    footer.innerHTML =
      '<div class="brand-name">敦煌艺术与丝路文明</div>' +
      '<div>沉浸式数字课程门户 · 暗金 / 石青 / 赭石 · 中文留白</div>' +
      '<div style="margin-top:6px;opacity:.7">AI 生成风格化视觉 · 内容供通识教学参考</div>' +
      '<div style="margin-top:4px;opacity:.6;font-size:.8rem">章节短片部分素材来自 Wikimedia Commons（CC BY / CC BY-SA / 公有领域），详见 <a href="docs.html#credits" style="text-decoration:underline">素材署名</a></div>';
    document.body.appendChild(footer);

    /* 背景乐 */
    initMusic();

    /* AI 讲解员 */
    if (typeof window.initTutor === 'function') window.initTutor();
  };

  /* ---------- 背景乐管理 ---------- */
  let audio = null, musicReady = false;
  function initMusic() {
    const btn = $('#musicToggle');
    if (!btn) return;
    if (!audio) {
      audio = new Audio('assets/media/bgm.mp3');
      audio.loop = true;
      audio.volume = 0.28;
      audio.preload = 'none';
      audio.addEventListener('error', function () {
        musicReady = false;
        btn.classList.add('muted');
        btn.querySelector('.mt-txt').textContent = '背景乐暂不可用';
      });
    }
    /* 首次交互后尝试播放（浏览器自动播放策略） */
    const tryPlay = function () {
      if (!musicReady) {
        audio.play().then(() => { musicReady = true; btn.classList.remove('muted'); }).catch(() => {});
      }
    };
    btn.addEventListener('click', function () {
      if (musicReady) {
        if (audio.paused) { audio.play(); btn.classList.remove('muted'); }
        else { audio.pause(); btn.classList.add('muted'); }
      } else { tryPlay(); }
    });
    document.addEventListener('pointerdown', tryPlay, { once: true });
  }

  /* ---------- 飞天粒子（首页） ---------- */
  window.spawnApsaras = function (container, n) {
    n = n || 26;
    for (let i = 0; i < n; i++) {
      const p = document.createElement('span');
      p.className = 'apsara';
      p.style.left = (Math.random() * 100) + '%';
      p.style.animationDuration = (7 + Math.random() * 12) + 's';
      p.style.animationDelay = (Math.random() * 10) + 's';
      p.style.transform = 'scale(' + (0.5 + Math.random()) + ')';
      container.appendChild(p);
    }
  };

  /* ---------- 滚动显现 ---------- */
  window.bindReveal = function () {
    if (!('IntersectionObserver' in window)) {
      $$('.reveal').forEach(el => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: .12 });
    $$('.reveal').forEach(el => io.observe(el));
  };

  /* ---------- 公用：章节卡片 ---------- */
  window.renderChapterCards = function (root) {
    root.innerHTML = D.chapters.map(function (c) {
      return '<a class="chapter-card reveal" href="chapter.html?id=' + c.id + '">' +
        '<div class="cover"><img src="' + c.cover + '" alt="' + c.title + '" loading="lazy" onerror="imgFallback(this,\'' + c.title + '\')"></div>' +
        '<span class="num">' + (c.num < 10 ? '0' + c.num : c.num) + '</span>' +
        '<div class="body"><h3>' + c.title + '</h3><div class="era">' + c.era + '</div>' +
        '<p>' + c.summary + '</p></div></a>';
    }).join('');
  };
})();