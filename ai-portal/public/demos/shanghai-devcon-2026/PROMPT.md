# 上海开发者大会报名落地页 — 完整需求提示词

> 本文件由 `shanghai-devcon-2026/index.html` 反推而来，可作为「完整需求提示词」复用，复现或换肤同款落地页。
> 交付文件：`index.html`（单文件自包含，无构建步骤，打开即用，可部署到任意静态托管）

---

## 1. 任务目标

生成一张**「上海 3000 人开发者大会」报名落地页**：单文件自包含 HTML，科技感深色视觉，强转化设计（早鸟倒计时、底部固定报名栏、购票弹窗），覆盖大会信息展示到报名转化的完整链路。

## 2. 需求规格

### 2.1 大会信息（占位数据，后续可替换）

- 大会名：SH DevCon 2026 · 上海开发者大会（英文：Shanghai DevCon 2026）
- 主题口号：「智驱未来」/ Code the Next Decade
- 一句话定位：AI 原生时代的工程实践
- 时间：2026 年 11 月 14–15 日
- 地点：上海世博中心（浦东新区博成路 850 号）
- 规模：3000 人；关键数字：3000+ 开发者 / 50+ 嘉宾 / 40+ 议题 / 2 天

### 2.2 必须包含的板块（自上而下）

1. **顶部导航**：sticky、毛玻璃模糊、logo（`>_` 渐变方块）+ 锚点链接 +「立即报名」按钮；移动端折叠为汉堡菜单
2. **Hero 首屏**（100svh）：左侧 = 早鸟提示 tag + 主标题（"智驱未来"渐变字）+ 副标语 + 元数据（日期/地点/规模三图标）+ 双 CTA（立即报名 · 早鸟 ¥399 / 查看日程）；右侧 = 早鸟截止倒计时卡片（天/时/分/秒实时刷新，截止 2026-10-10，含 ¥399 划掉 ¥799 与抢购按钮）
3. **数据条**：4 项（3000+ / 50+ / 40+ / 2 天），数字渐变字 + 分隔竖线
4. **大会主题**：主题 banner（大字标语 + 水印代码符号）+ 4 个议题方向卡片（AI 工程 / 云原生 / 前端体验 / 数据与安全）
5. **嘉宾阵容**：8 位嘉宾卡片，头像 + 姓名 + 头衔 + 演讲主题；头像用 DiceBear 9.x adventurer 插画（透明背景，URL 直接引用，onerror 回退到姓氏首字母）
6. **日程**：双日 Tab（11.14 主论坛 / 11.15 分会场）；Day1 垂直时间轴（时间|议题|嘉宾|类型标签）；Day2 4 个并行会场卡片（每会场 4 场 session：时间|议题|讲师）
7. **票种**：4 档卡片（极客票 ¥199 已售罄 / 早鸟票 ¥399 限时 5 折 / 标准票 ¥799 / VIP 票 ¥1999），含权益 ✓/× 清单 + 抢购按钮 + 权益对比表（横排权益 × 竖排票种）
8. **赞助商**：4 级 logo 墙（战略/金牌/银牌/社区媒体），文字 logo + 英文小标，分级不同列数
9. **交通指引**：左侧地图占位（网格底 + 脉冲定位点 + 地名标签）+ 右侧地址 + 4 种交通方式卡片（地铁/公交/驾车停车/铁路航空）
10. **退票政策**：左侧阶梯退款表（30 天以上 100% / 15-30 天 70% / 7-14 天 50% / 7 天内不退 / 主办方取消全额）+ 右侧 FAQ（转让/到账/不可抗力/发票）
11. **CTA 大区**（居中渐变光晕 + 大按钮）+ **页脚**（品牌 + 链接 + 版权）

### 2.3 硬性要求

- 单文件、内联 CSS/JS、无外部框架依赖（字体/头像可用 CDN，需有 onerror 回退）
- 深色科技风，不要浅色/渐变白底
- 0 console 报错

## 3. 决策记录

| 决策项 | 选择 | 说明 |
|---|---|---|
| 视觉风格 | 科技感深色 | 深空蓝黑底 + 电光青/紫罗兰/粉三色渐变 |
| 字体 | Chakra Petch + JetBrains Mono | 英文标题/数字用 Chakra Petch；等宽标签/数据用 JetBrains Mono；中文系统黑体 |
| 背景氛围 | 4 层叠加 | 径向光晕 + 56px 网格线 + canvas 粒子网络 + SVG 噪点 |
| 卡片风格 | 玻璃拟态 | 半透明白底 + 1px 半透明边框 + hover 上浮提亮 |
| 移动端转化 | 底部固定报名栏 + 购票弹窗 | 强转化重点（见第 5 节） |
| 断点 | 1024 / 768 | ≤768 单列 + 固定栏启用 |
| 倒计时截止 | 2026-10-10 | 早鸟票销售截止 |

## 4. 视觉风格（设计系统）

### 4.1 配色（CSS 变量）

| 变量 | 值 | 用途 |
|---|---|---|
| `--bg0` | `#05070f` | 页面底色（深空蓝黑） |
| `--bg1` | `#080b17` | 次级底色 |
| `--bg2` | `#0c1220` | 弹窗/面板底色 |
| `--ink` | `#eaf2ff` | 主文字 |
| `--ink-dim` | `#9fb0c8` | 次级文字 |
| `--ink-faint` | `#6b7a93` | 弱化文字 |
| `--line` | `rgba(148,180,255,.12)` | 边框 |
| `--line-strong` | `rgba(148,180,255,.24)` | 强调边框 |
| `--cyan` | `#2dd4ff` | 主色（电光青） |
| `--cyan-dim` | `rgba(45,212,255,.14)` | 主色淡底 |
| `--violet` | `#8b7bff` | 次色（紫罗兰） |
| `--violet-dim` | `rgba(139,123,255,.16)` | 次色淡底 |
| `--pink` | `#ff6ad5` | 点缀（粉） |
| `--green` | `#3ddc97` | 成功/勾选 |
| `--grad` | `linear-gradient(120deg,#2dd4ff 0%,#8b7bff 55%,#ff6ad5 120%)` | 主渐变（标题/按钮/数字） |
| `--panel` | `rgba(255,255,255,.028)` | 卡片底 |
| `--panel-2` | `rgba(255,255,255,.05)` | 卡片 hover/次级底 |

### 4.2 字体

| 变量 | 字体栈 | 用途 |
|---|---|---|
| `--display` | `Chakra Petch, PingFang SC, Microsoft YaHei, sans-serif` | 英文标题、数字、价格 |
| `--mono` | `JetBrains Mono, SFMono-Regular, Consolas, monospace` | 标签、时间、数据、订单号 |
| `--sans` | `PingFang SC, Microsoft YaHei, -apple-system, sans-serif` | 中文正文 |

> Google Fonts 引入：`Chakra+Petch:wght@500;600;700` + `JetBrains+Mono:wght@400;500;700`，`display=swap`。禁止 Inter / Arial / 系统默认英文字体做标题。

### 4.3 背景氛围层（叠加顺序）

1. `.bg` 固定层：三处径向光晕（青 16%/-8%、紫 86%/6%、粉 50%/108%）
2. `.bg::after`：56px 网格线 `rgba(148,180,255,.05)` + `radial-gradient` mask 顶部渐隐
3. `#net` canvas：70 个粒子，距离 <110px 连线，颜色 `rgba(90,160,255,α)` 随距离衰减
4. `.grain`：SVG feTurbulence 噪点，opacity 0.05

### 4.4 圆角 / 阴影 / 尺寸

- 卡片圆角 `--radius: 16px`；Hero 倒计时/CTA 大区 `22–26px`
- 卡片阴影 `--shadow: 0 20px 60px -20px rgba(0,0,0,.7)`
- 固定导航高 `--nav-h: 68px`；`scroll-padding-top: nav-h + 16px`

## 5. 交互与转化组件

### 5.1 早鸟倒计时
- 目标时间 `new Date('2026-10-10T23:59:59+08:00')`，`setInterval` 1s 刷新
- 输出 `#cd-d / #cd-h / #cd-m / #cd-s`，个位数补零

### 5.2 底部固定报名栏（移动端核心）
- 结构 `.sticky-bar > .bar-inner > .bar-card`（价格 + 倒计时文案 + 立即报名按钮）
- 显示逻辑（`scroll/resize` 触发）：`hero 底部 < 视口 15%` 且 `footer 顶部 > 视口 55%` 时滑入
- `transform: translateY(110%) → 0`，`transition .35s cubic-bezier(.22,1,.36,1)`
- ≤768px 才启用；`env(safe-area-inset-bottom)` 适配

### 5.3 购票弹窗
- `.modal-mask.open` + `.modal`（移动端底部弹起，桌面居中）
- 票种单选 `.t-opt`（`.selected` 高亮 + radio 圆点）；数量 `#qtyPlus/#qtyMinus`（1–20）
- 表单校验：手机 `/^1[3-9]\d{9}$/`、邮箱标准正则、姓名非空
- 总价联动 `#totalPrice`；提交成功 `.success-box` 显示订单号 `SD2026-<时间戳后8位>`
- 关闭：`#modalClose` / 点遮罩 / Esc

### 5.4 其他动效
- 内容块 `IntersectionObserver`（threshold .08）进入视口上浮渐入（opacity 0→1 + translateY 24px→0，stagger）
- 主 CTA `.btn-primary::after` 扫光动画（hover translateX）；所有卡片 hover 上浮
- 锚点平滑滚动，`scroll-padding` 适配固定导航高度

## 6. 响应式断点

| 断点 | 变化 |
|---|---|
| `≤1024px` | Hero 单列；倒计时卡 max-width 560；议题 2 列；嘉宾 3 列；票种 2 列；会场 2 列；logo 墙 3 列 |
| `≤768px` | 汉堡菜单展开；嘉宾 2 列；票种/会场/地图/政策/表单 单列；数据条 2 列；CTA 双按钮各 50%；**底部固定栏启用** |
| `≥769px` | 弹窗居中（`align-items:center`） |

## 7. 占位数据清单（替换指引）

| 数据 | 当前占位值 | 替换位置 |
|---|---|---|
| 大会名称 | SH DevCon 2026 · 上海开发者大会 | `<title>`、`.brand .name`、Hero |
| 主题口号 | 智驱未来 / Code the Next Decade | Hero `h1`、主题 banner |
| 日期 | 2026.11.14–15 | Hero 元数据、日程 Tab、倒计时目标 |
| 地点 | 上海世博中心 · 博成路 850 号 | Hero 元数据、交通板块 |
| 规模 | 3000 人 | Hero 元数据、数据条 |
| 嘉宾 | 8 位虚构（林远/陈曦/王澍/张墨/苏秦/何若/Kevin Lin/沈知行） | `#speakersGrid`，头像 seed 同步改 |
| 票种 | 极客 199 / 早鸟 399 / 标准 799 / VIP 1999 | `.ticket-grid` + `.compare` + 弹窗 `.t-opt` |
| 赞助商 | 深擎科技/量子云/元启智能 等虚构 | `.logo-grid` |
| 邮箱 | biz@ / sponsor@ / support@shdevcon.cn | 票种注释、赞助商、退票、页脚 |
| 头像 | DiceBear `adventurer` seed（LinYuan…ShenZhixing） | `.ava-img` 的 `src` |

> 若换风格：`.ava-img` 的 URL 改 `adventurer` → `notionists`（黑白线条）/ `bottts`（机器人），或换 `https://randomuser.me/api/portraits/men/32.jpg` 等真人照片（需自行保证版权）。

## 8. 交付物与验收

- `index.html` — 单文件成品（内联 CSS + JS）
- 验收方式：
  - 打开页面各板块完整渲染，0 console 报错；倒计时每秒刷新至 2026-10-10
  - ≤768px 时底部固定报名栏滚过 Hero 滑入、到页脚隐藏；购票弹窗选票/数量/表单校验/总价联动/订单号成功态全链路可用
  - 移动端 `env(safe-area-inset-bottom)` 适配正常
- 本地预览：
  ```bash
  cd /Users/xiaoye/Desktop/test/shanghai-devcon-2026
  python3 -m http.server 8080 --bind 127.0.0.1
  # 访问 http://127.0.0.1:8080/index.html
  ```
