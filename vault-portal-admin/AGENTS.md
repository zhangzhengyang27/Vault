# AGENTS.md — vault-portal-admin（独立管理后台）

给 AI 编码代理的本工程速览。人类向说明见 [README.md](./README.md)；
部署细节见 [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md)。

## 定位

vue-element-plus-admin 模板改造的 Vue 3 + Element Plus + Vite 管理后台，
对接 `../vault-portal-api`（Bearer 双 token）。dev 经 vite 代理 `/api`、`/uploads`
到 `http://localhost:3001`，无跨域问题。

⚠️ **源码是重建品（2026-09）**：NAS 备份只有构建产物（dist），现存源码是以存留
文件为契约、按 vue-element-plus-admin v2.9 模式重建的。改动前先理解现存契约
（如 `src/views/content/ContentManager.vue` 的 ContentTypeConfig props 驱动四个
内容管理页面），不要假设存在模板之外的隐藏依赖。

## 常用命令（定位三件套 + 构建）

```bash
pnpm typecheck   # vue-tsc --noEmit --skipLibCheck —— 类型问题首选定位入口
pnpm lint        # eslint --cache --max-warnings 0（flat config）
pnpm build       # 清 dist 后 vite build（8G heap）
pnpm dev         # vite，默认 http://localhost:5173
```

- dev 端口默认 5173；用户本地习惯用 `npx vite --port 5174` 起（与其浏览器书签
  一致）。不要改 `vite.config.ts` 里的默认端口。
- pnpm 锁定 10.23.0（`corepack pnpm@10.23.0 install`；preinstall 已 only-allow pnpm）。

## 架构导览

- `src/api/` — 接口封装（admin / community / monitor / user / routes）。
- `src/router/` — `modules/` 静态路由；`utils.ts` 动态路由装配：菜单的 component
  字符串 → 真实 views 组件（`import.meta.glob` + `componentAliasMap` 处理文件名
  不一致的映射）。
- `src/views/` — 页面。内容管理（工具/提示词/文章/资讯）统一复用
  `views/content/ContentManager.vue`，由 `configs.ts` 的 ContentTypeConfig 提供
  props 契约。
- `src/layout/` — 壳（页签栏 multiTags、KeepAlive 页面缓存等）；`src/store/` pinia；
  `src/utils/http/` axios 封装（双 token 无感换发）；`src/utils/tree.ts` 树处理。

## 约定与已知坑

- **路由判根约定**：`parentId == null` 才算根节点。`utils/tree.ts` 的
  buildHierarchyTree 必须给根节点写 `parentId: null`（历史上赋 0 导致
  formatTwoStageRoutes 把全部路由拍空、页面渲染不出）；formatFlatteningRoutes
  前必须先过 buildHierarchyTree。改路由相关代码时牢记这条。
- 动态路由叶子统一包一层「以路由名命名的同步组件」，KeepAlive 的 include 按路由名
  匹配、页签栏也按路由名联动——改路由 name 时注意 keep-alive 与页签缓存。
- 认证链：登录拿 access/refresh 双 token → axios 拦截器带 `Authorization: Bearer`
  → 过期自动 `POST /api/auth/refresh` 无感换发 → 失败清登录态回登录页。refresh
  token 带 `typ=refresh` 声明，后端拒绝其冒充 access token。
- `vite.config.ts` 有 icons-news-compat 补丁：当前 @element-plus/icons-vue 版本
  缺 `News` 导出，构建时以 Document 补位——升级图标库后可尝试移除该补丁及其
  esbuild 分支。
- 构建压缩：`createCompressionPlugins`（vite.config.ts）按 `VITE_COMPRESSION`
  （gzip / brotli / both，`-clear` 变体删原文件，none 关闭）用 vite-plugin-compression2
  产出 .gz/.br，供 nginx `gzip_static` 使用；改压缩相关代码后构建验证产物。
- 非管理员登录被后端直接拒绝；前端不做权限放行判断，所有业务接口靠后端
  `@Roles('admin')` 守卫兜底。
