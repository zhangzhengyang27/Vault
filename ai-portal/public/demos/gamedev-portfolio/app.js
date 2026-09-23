/* ============================================================
   PR0TO::DEV — 作品集交互脚本（纯原生 JS，零依赖）
   内容：游戏 / Game Jam / 博客数据驱动渲染
   交互：移动端导航、视频懒加载、滚动出现动效
   ============================================================ */
(function () {
  "use strict";

  /* ---------- 数据：Steam 游戏（占位，替换为真实项目） ---------- */
  var GAMES = [
    {
      id: "neon-drift",
      title: "霓虹狂飙 NEON DRIFT",
      badge: "已发售 · 好评如潮",
      meta: "Steam EA 2025 · 动作竞速 · 1.2 万评测",
      desc: "在赛博都市霓虹中贴地飞驰的摩托竞速游戏。核心是「氮气与墙蹭」的极限操控循环：用漂移积攒氮气，擦墙减速换取更高收益，在 60 FPS 的合成波世界里与幽灵车手同屏对飚。",
      tags: ["Unity", "C#", "HDRP", "FMOD"],
      image: "assets/game-neon-drift.jpg",
      videoId: "M7lc1UVf-VE", // 替换为真实预告片 YouTube ID
      steam: "https://store.steampowered.com/app/000000",
      demo: "https://yourname.itch.io/neon-drift-demo",
      tagLabel: "动作竞速"
    },
    {
      id: "skybound",
      title: "苍穹拾荒 SKYBOUND",
      badge: "已发售 · 特别好评",
      meta: "正式版 2024 · 冒险解谜 · 独立叙事",
      desc: "驾驶小飞船在漂浮岛屿间拾荒、改造与修复生态的冒险解谜游戏。没有战斗，只有探索与「让某个星球重新亮起来」的温柔目标。美术手绘，BGM 全部由合成器即兴录制。",
      tags: ["Godot", "GDScript", "Blender", "Reaper"],
      image: "assets/game-skybound.jpg",
      videoId: "jNQXAC9IVRw", // 替换为真实预告片 YouTube ID
      steam: "https://store.steampowered.com/app/000001",
      demo: "https://yourname.itch.io/skybound-demo",
      tagLabel: "冒险解谜"
    }
  ];

  /* ---------- 数据：Game Jam 原型 ---------- */
  var JAMS = [
    {
      title: "日光翻转 SOLAR FLIP",
      badge: "LD Jam 54 · Top 10",
      desc: "在微型小行星上翻转太阳能板，把恒星光芒导向沉睡的晶体。24 小时内完成的极简 puzzle-loop。",
      image: "assets/jam-solarflip.jpg",
      demo: "https://yourname.itch.io/solar-flip",
      repo: "https://github.com/yourname/solar-flip",
      stack: "Godot 4 · 2D"
    },
    {
      title: "隧道节拍 TUNNEL DRIVE",
      badge: "Global Game Jam 2025",
      desc: "跟着 BGM 的节拍在无限隧道中变道闪避，越听越上头。主打「音乐可视化」与手感调校。",
      image: "assets/jam-tunneldrive.jpg",
      demo: "https://yourname.itch.io/tunnel-drive",
      repo: "https://github.com/yourname/tunnel-drive",
      stack: "WebGL · Three.js"
    },
    {
      title: "迷失森林 LOST FOREST",
      badge: "GJ 48h · 最佳氛围奖",
      desc: "手提灯笼穿越迷雾森林，只凭光影判断方向。恐怖来自「看不清」，而不是跳吓。",
      image: "assets/jam-lostforest.jpg",
      demo: "https://yourname.itch.io/lost-forest",
      repo: "https://github.com/yourname/lost-forest",
      stack: "Unity · URP · 3D"
    }
  ];

  /* ---------- 数据：技术博客 ---------- */
  var POSTS = [
    {
      date: "2026-05-12",
      title: "从零手写 WebGL 2D 光照系统：让 Game Jam 画面质变的一夜",
      tag: "WEBGL / GLSL",
      href: "https://blog.example.com/webgl-2d-lighting"
    },
    {
      date: "2026-03-02",
      title: "Unity HDRP 性能排查清单：把 45 FPS 的都市修回稳定 60",
      tag: "UNITY / 优化",
      href: "https://blog.example.com/hdrp-performance"
    },
    {
      date: "2025-12-18",
      title: "独立游戏怎么做 Steam 愿望单：从 0 到 25k 的真实数据复盘",
      tag: "运营 / 数据",
      href: "https://blog.example.com/steam-wishlist-25k"
    },
    {
      date: "2025-09-06",
      title: "Godot vs Unity：两款游戏之后我为什么做了三次切换",
      tag: "引擎选型",
      href: "https://blog.example.com/godot-vs-unity"
    }
  ];

  /* ---------- DOM 工具 ---------- */
  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  /* ---------- 渲染 Steam 游戏 ---------- */
  function renderGames() {
    var list = document.getElementById("games-list");
    if (!list) return;
    GAMES.forEach(function (g) {
      var card = el("article", "game reveal");

      var media = el("div", "game__media");
      var img = el("img");
      img.src = g.image;
      img.alt = g.title + " 主视觉";
      img.loading = "lazy";
      media.appendChild(img);

      // 视频：点击后懒加载 iframe
      var videoBtn = el("button", "video-btn");
      videoBtn.type = "button";
      videoBtn.setAttribute("aria-label", "播放 " + g.title + " 预告片");
      var play = el("span", "video-btn__play", "▶");
      var label = el("span", "video-btn__label mono", "▶ 播放预告片 TRAILER");
      videoBtn.appendChild(play);
      videoBtn.appendChild(label);
      videoBtn.addEventListener("click", function () {
        var frame = el("iframe", "video-frame");
        frame.src = "https://www.youtube-nocookie.com/embed/" + g.videoId +
          "?autoplay=1&rel=0";
        frame.title = g.title + " 预告片";
        frame.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
        frame.allowFullscreen = true;
        frame.loading = "lazy";
        media.replaceChild(frame, videoBtn);
      });
      media.appendChild(videoBtn);
      card.appendChild(media);

      var body = el("div", "game__body");
      body.appendChild(el("span", "game__badge mono", g.badge));
      body.appendChild(el("h3", "game__title", g.title));
      body.appendChild(el("p", "game__meta mono", g.meta));
      body.appendChild(el("p", "game__desc", g.desc));

      var tags = el("ul", "game__tags");
      g.tags.forEach(function (t) { tags.appendChild(el("li", null, t)); });
      body.appendChild(tags);

      var links = el("div", "game__links");
      var steamBtn = el("a", "btn btn--primary btn--sm");
      steamBtn.href = g.steam;
      steamBtn.target = "_blank";
      steamBtn.rel = "noopener";
      steamBtn.textContent = "Steam 商店 →";
      var demoBtn = el("a", "btn btn--ghost btn--sm");
      demoBtn.href = g.demo;
      demoBtn.target = "_blank";
      demoBtn.rel = "noopener";
      demoBtn.textContent = "在线试玩 Demo";
      links.appendChild(steamBtn);
      links.appendChild(demoBtn);
      body.appendChild(links);

      card.appendChild(body);
      list.appendChild(card);
    });
  }

  /* ---------- 渲染 Game Jam ---------- */
  function renderJams() {
    var grid = document.getElementById("jam-list");
    if (!grid) return;
    JAMS.forEach(function (j) {
      var card = el("article", "jam-card reveal");

      var media = el("div", "jam-card__media");
      var img = el("img");
      img.src = j.image;
      img.alt = j.title + " 截图";
      img.loading = "lazy";
      media.appendChild(img);
      media.appendChild(el("span", "jam-card__badge mono", j.badge));
      card.appendChild(media);

      var body = el("div", "jam-card__body");
      body.appendChild(el("h3", "jam-card__title", j.title));
      body.appendChild(el("p", "jam-card__desc", j.desc));
      body.appendChild(el("p", "jam-card__meta mono muted", j.stack));

      var links = el("div", "jam-card__links");
      var demoLink = el("a");
      demoLink.href = j.demo;
      demoLink.target = "_blank";
      demoLink.rel = "noopener";
      demoLink.textContent = "▶ 试玩 Demo";
      var repoLink = el("a");
      repoLink.href = j.repo;
      repoLink.target = "_blank";
      repoLink.rel = "noopener";
      repoLink.textContent = "⌥ 源码 GitHub";
      links.appendChild(demoLink);
      links.appendChild(repoLink);
      body.appendChild(links);

      card.appendChild(body);
      grid.appendChild(card);
    });
  }

  /* ---------- 渲染博客 ---------- */
  function renderPosts() {
    var list = document.getElementById("blog-list");
    if (!list) return;
    POSTS.forEach(function (p) {
      var item = el("a", "blog-item reveal");
      item.href = p.href;
      item.target = "_blank";
      item.rel = "noopener";
      item.appendChild(el("span", "blog-item__date mono", p.date));
      item.appendChild(el("span", "blog-item__title", p.title));
      var meta = el("span", "blog-item__meta");
      meta.appendChild(el("span", "blog-item__tag mono", p.tag));
      meta.appendChild(el("span", "blog-item__arrow", "→"));
      item.appendChild(meta);
      list.appendChild(item);
    });
  }

  /* ---------- 移动端导航 ---------- */
  function initNav() {
    var burger = document.getElementById("nav-burger");
    var links = document.getElementById("nav-links");
    if (!burger || !links) return;
    burger.addEventListener("click", function () {
      var open = links.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    links.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        links.classList.remove("is-open");
        burger.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------- 平滑滚动锚点（关闭原生跳动） ---------- */
  function initScroll() {
    var anchors = document.querySelectorAll('[data-scroll]');
    anchors.forEach(function (a) {
      a.addEventListener("click", function (e) {
        var href = a.getAttribute("href");
        if (!href || href.charAt(0) !== "#") return;
        var target = document.querySelector(href);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  /* ---------- 滚动出现动效（IntersectionObserver） ---------- */
  function initReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      items.forEach(function (i) { i.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    items.forEach(function (i) { io.observe(i); });
  }

  /* ---------- 头部阴影（滚动后加描边） ---------- */
  function initHeader() {
    var header = document.getElementById("site-header");
    if (!header) return;
    function onScroll() {
      header.style.borderBottomColor = window.scrollY > 8
        ? "var(--line-strong)" : "var(--line)";
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- 启动 ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    renderGames();
    renderJams();
    renderPosts();
    initNav();
    initScroll();
    initReveal();
    initHeader();
  });
})();
