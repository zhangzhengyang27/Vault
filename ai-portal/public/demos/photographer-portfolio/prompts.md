# 筑光 ZHU·GUANG — 建筑摄影师作品集 · 完整需求提示词

> 本文件是 `photographer-portfolio` 整个静态站点项目的**完整生成提示词 / 规格说明**。
> 可直接交给 AI 编码助手，按此复刻整页（结构、设计系统、文案、交互、数据与图片资源）。
> 项目已本地化离线：图片在 `images/`，字体在 `fonts/`（见第 7 节）。

---

## 1. 任务目标

生成一个**建筑摄影师「林栖」的个人作品集单页网站**，品牌名「筑光 ZHU·GUANG」。以光为笔，记录上海老建筑、深圳天际线与室内空间。纯 `index.html` 单文件交付，无构建步骤、无第三方依赖；深色背景 + 暖金强调色 + 衬线/无衬线混排，追求高级感与科技感。

## 2. 需求规格

### 2.1 页面结构（DOM 顺序）

1. **顶部固定导航** `.site-header`（id `siteHeader`）
   - 品牌「筑光 / ZHU·GUANG」；桌面导航：作品 / 关于 / 询价；CTA「商业询价」圆角描边按钮；移动端汉堡 `.nav-toggle`（三条线，打开时变 ✕）
   - 滚动超过 20px 加 `.scrolled`（半透明毛玻璃 + 底边线）
2. **Hero 全屏** `.hero`（id `top`，`min-height:100svh`）
   - `.hero-bg` 绝对定位大图（`<img>` 轻微放大 `scale(1.06)`），上覆渐变遮罩
   - 文案层：小标 `ARCHITECTURAL PHOTOGRAPHER · SHANGHAI`、主标题（含 `<em>光</em>` 强调）、副文案、三个标签胶囊、右侧竖排 `SCROLL` 提示
3. **作品集** `.section`（id `portfolio`）
   - 区头（eyebrow `Selected Works` + 标题「精选作品」+ 简介）
   - 筛选按钮组（全部 / 上海老建筑 / 深圳天际线 / 室内空间）
   - `.gallery` 12 列网格，JS 动态渲染 12 张卡片 `.work`（含图片、hover 遮罩、分类/标题/年份地点信息、右上角跳转提示）
4. **关于** `.section`（id `about`，背景 `--bg-2`）
   - 两栏：左侧摄影师肖像图（带偏移描边装饰框），右侧文案 + 三项数据（10 年 / 120+ 项目 / 3 系列）
5. **联系 / 询价** `.section`（id `contact`）
   - 两栏：左侧信息列表（邮箱/电话/坐标/档期），右侧表单（姓名、邮箱、项目类型、预算、项目说明 + 发送按钮 + 状态提示）
6. **页脚** `.site-footer`：品牌 / 版权（年份自动）/ 城市
7. **Lightbox 大图浏览** `.lightbox`（默认 `display:none`，打开加 `.open`）
   - 毛玻璃背景、左右切换按钮、关闭按钮、图片、底部 caption（分类/标题/年份地点/描述/计数 `n / N`）

### 2.2 关键文案（中文，照抄即可）

- Hero 小标：`ARCHITECTURAL PHOTOGRAPHER · SHANGHAI`
- Hero 主标题：`以<em>光</em>为笔，<br>筑构空间的语言`
- Hero 副文案：`我是林栖，一名专注建筑与空间的摄影师。在钢筋与砖石之间寻找光线，为历史街区、城市天际线与室内空间留下被人记住的瞬间。`
- Hero 标签：`上海老建筑` / `深圳天际线` / `室内空间`
- 作品集区头：eyebrow `Selected Works`，标题「精选作品」，简介「三组持续拍摄的长期项目。每一张都是关于光、结构与时间的观察。」
- 关于标题「关于摄影师」：
  - 段1：`我拍摄建筑已有十年。从上海石库门里弄的斑驳砖墙，到深圳玻璃幕墙映射的天际线，再到一间只有一扇窗的安静房间——我始终在寻找同一样东西：光线如何让空间有了情绪。`
  - 段2：`每个项目都始于一次现场勘察，终于一个可以反复观看的瞬间。我服务于地产、设计事务所与文化机构，也接洽个人委托。`
  - 数据：`10` 年拍摄经验 / `120+` 完成项目 / `3` 长期系列
- 联系标题「商业询价」：
  - 引导：`无论是地产楼书、设计作品集，还是品牌空间的影像记录，告诉我你的项目，我们聊聊如何用光表达它。`
  - 信息项：邮箱 `studio@zhuguang.photo` / 电话 `+86 138 0000 0000` / 坐标 `上海 · 深圳 · 全国` / 档期 `当前可接 2026 年秋季项目`
  - 表单字段：姓名、邮箱、项目类型（下拉：上海老建筑 / 历史保护、深圳天际线 / 城市景观、室内空间 / 样板间、其他委托）、预计预算、项目说明；按钮「发送询价」
- 页脚：`筑光 ZHU·GUANG` / `© {年份} 林栖 · 建筑摄影` / `SHANGHAI — SHENZHEN`

## 3. 决策记录

| 决策项 | 选择 | 说明 |
|---|---|---|
| 交付形式 | 纯单文件 `index.html` | 内联 `<style>` 与 `<script>`，无构建、无依赖 |
| 视觉基调 | 深色 + 暖金 | 高级感与科技感；强调色 `oklch(74% 0.12 78)` |
| 字体 | Fraunces（衬线）+ Instrument Sans（无衬线） | 标题/品牌/数据用衬线，正文/UI 用无衬线 |
| 配色 | OKLCH 感知均匀色 | 全部 `oklch()`，统一色相 65 |
| 图片资源 | 生图 + 本地化 | 14 张图（hero/about + 12 作品）存 `images/`，支持离线 |
| 字体资源 | 本地化 woff2 | 5 个 woff2 下载至 `fonts/`，`google-fonts.css` 改本地路径 |
| 响应式断点 | 900px / 560px | 移动优先降级 |

## 4. 视觉风格（设计系统）

### 4.1 配色（全部 `oklch`，色相统一 65 暖调）

| Token | 值 | 用途 |
|---|---|---|
| `--bg` | `oklch(14% 0.012 65)` | 页面主背景 |
| `--bg-2` | `oklch(17% 0.013 65)` | 次级背景（关于区、输入框） |
| `--surface` | `oklch(21% 0.014 65)` | 表面 |
| `--surface-2` | `oklch(25% 0.015 65)` | 表面高亮 |
| `--line` | `oklch(30% 0.016 65)` | 边框线 |
| `--line-soft` | `oklch(26% 0.015 65)` | 柔和边框线 |
| `--text` | `oklch(93% 0.012 65)` | 主文字 |
| `--text-dim` | `oklch(70% 0.014 65)` | 次要文字 |
| `--text-faint` | `oklch(58% 0.015 65)` | 弱化文字 |
| `--accent` | `oklch(74% 0.12 78)` | 暖金强调色 |
| `--accent-strong` | `oklch(82% 0.13 80)` | 更强强调色 |
| `--accent-ink` | `oklch(20% 0.03 70)` | 强调色上的深色文字 |

### 4.2 字体与排印

- `--serif: "Fraunces", "Songti SC", "Noto Serif SC", Georgia, serif;`
- `--sans: "Instrument Sans", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;`
- 标题类 `.h-display`（衬线、clamp 响应式字号、负字距）、`.hero-title`（超大衬线，`<em>` 用强调色斜体）
- 间距尺度：`--space-1..9` = `4, 8, 12, 16, 24, 32, 48, 64, 96` px
- 缓动：`--ease-out: cubic-bezier(0.22,1,0.36,1)`；`--ease-soft: cubic-bezier(0.25,1,0.5,1)`
- 导航高度 `--nav-h: 72px`；容器 `width: min(1200px, 92vw)` 居中

## 5. 交互（JS）

- **数据**：`CATS` 分类名映射（shanghai→上海老建筑 等）；`WORKS` 数组（12 项，见第 6 节）
- **图片地址**：本地化后 `LOCAL_IMAGES` 数组 + `imgUrl(w)` 返回 `"images/" + LOCAL_IMAGES[WORKS.indexOf(w)]`
- **画廊渲染**：遍历 `WORKS` 用 `workCard()` 生成 `<article class="work">`，写入 `dataset.cat/index`、`tabIndex`、`aria-*`，`innerHTML` 含 `<img loading="lazy">` + 信息层；点击/回车打开 Lightbox
- **筛选**：点击 `.filter-btn` 切换 `activeFilter`，对每个 `.work` 显隐并加 `.revealed`（带递增 `transition-delay` 的入场动画）
- **Lightbox**：`openLightbox(i)` / `renderLightbox(i)` / `closeLightbox()`；左右切换、键盘 `ArrowLeft/ArrowRight` 翻页、`Escape` 关闭、点击背景关闭；计数 `current+1 / 列表长度`；只展示当前筛选下的可见作品
- **滚动揭示**：`IntersectionObserver`（threshold 0.15）给 `.reveal` 与 `.work` 加 `.in` 触发淡入上移
- **导航**：滚动监听切换 `.scrolled`；移动端汉堡切换 `.mobile` 菜单与 `aria-expanded`
- **表单校验**：姓名必填、邮箱正则 `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`；不通过则对应字段加 `.error` 并显示红字提示；通过则模拟 900ms 提交成功，重置表单并显示「已收到您的询价，我会在 1 个工作日内回复。」
- **页脚年份**：`document.getElementById("year").textContent = new Date().getFullYear()`
- 无障碍：`prefers-reduced-motion`（关闭动画与过渡）；导航、作品卡片、Lightbox 均有键盘可达性（`tabindex`、`role`、`aria-*`、Enter/Space/Esc/方向键）

## 6. 作品数据 `WORKS`（12 条）

> `p` 为生图提示词，`size` 为 `image_size` 参数。顺序即文件命名 `work-01.jpg … work-12.jpg`。

| # | 标题 | 分类 | 年份·地点 | size | 描述 |
|---|---|---|---|---|---|
| 01 | 石库门 · 晨光里的里弄 | shanghai | 2025·上海黄浦 | landscape_4_3 | 清晨第一束光斜切进石库门的弄堂…… |
| 02 | 外滩万国建筑 · 蓝调时刻 | shanghai | 2024·上海外滩 | landscape_4_3 | 傍晚蓝调时刻的外滩历史建筑群…… |
| 03 | 武康大楼 · 街角几何 | shanghai | 2024·上海徐汇 | landscape_4_3 | 武康大楼的船头造型在街角形成的锐利几何…… |
| 04 | 石库门夕阳 · 砖墙质感 | shanghai | 2023·上海静安 | landscape_4_3 | 夕阳把暗红色的墙面染成琥珀色…… |
| 05 | 深圳湾 · 天际线长卷 | shenzhen | 2025·深圳南山 | landscape_16_9 | 从深圳湾公园回望，后海摩天楼暮色亮起…… |
| 06 | 平安金融中心 · 利刃入云 | shenzhen | 2024·深圳福田 | landscape_4_3 | 低机位仰拍，塔身利剑般刺入云层…… |
| 07 | 玻璃幕墙 · 城市镜像 | shenzhen | 2024·深圳福田 | landscape_4_3 | 相邻两栋楼互为镜像，天际线折叠进画面…… |
| 08 | 后海夜景 · 霓虹长曝 | shenzhen | 2023·深圳南山 | landscape_16_9 | 雨后灯光在湿漉漉路面拖出长条光带…… |
| 09 | 天窗书房 · 一束光 | interior | 2025·上海私宅 | portrait_3_4 | 只有一扇天窗的房间，正午光束落下…… |
| 10 | 旋转楼梯 · 螺旋秩序 | interior | 2024·上海展厅 | portrait_3_4 | 白色旋转楼梯顶光下的螺旋秩序感…… |
| 11 | 清水混凝土 · 材质的沉默 | interior | 2024·深圳美术馆 | portrait_3_4 | 漫射光下安静克制的清水混凝土质感…… |
| 12 | 床边日落 · 温暖一隅 | interior | 2023·深圳私宅 | portrait_3_4 | 傍晚余晖透过落地窗洒进卧室…… |

> 完整英文生图提示词见原 `.bak` 文档第 6 节（每条含场景/光线/风格限定词，如 `photorealistic architectural photography`）。

### Hero 与 About 图片

- **Hero 背景** `images/hero.jpg`（`landscape_16_9`）：上海外滩装饰艺术风格天际线蓝调时刻，暖窗光、戏剧云层
- **About 肖像** `images/about.jpg`（`portrait_4_3`）：摄影师站在明亮中庭仰头拍摄的剪影

## 7. 资源本地化（离线）

- **图片**：全部 14 张（hero/about + 12 作品）下载至 `images/`，HTML 中 `preload`、`hero <img>`、`about <img>` 及 JS `imgUrl()` 均改为本地相对路径
- **字体**：Google Fonts 的 5 个 woff2（Fraunces 的 vietnamese/latin-ext 共用 + latin；Instrument Sans 的 latin-ext + 400 latin + 500 latin）下载至 `fonts/`，生成 `fonts/google-fonts.css`（URL 改本地），并移除两条 `preconnect` 外链
- 生图接口（如需重生成图片）：`https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt={encodeURIComponent(p)}&image_size={size}`，需带浏览器 `User-Agent`，会 301 跳转到 CDN 返回 JPEG

## 8. 交付物与验收

- `index.html` — 单文件成品（内联样式与脚本）+ `images/`（14 图）+ `fonts/`（5 woff2 + 本地 css）
- 验收方式：
  - 断点 `≤900px`：汉堡菜单、作品网格调整、关于/联系单列；`≤560px`：作品单列、表单单列、Lightbox 内边距收窄
  - 筛选 / Lightbox 翻页 / 键盘可达 / 表单校验全链路可用；离线打开图片字体正常
  - 开启 reduced-motion 后无动画
