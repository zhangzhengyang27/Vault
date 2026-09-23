# AGENTS.md — vault-portal（前台门户）

给 AI 编码代理的本工程速览。人类向说明见 [README.md](./README.md)；
仓库总览见[根 README](../README.md)，部署细节见 [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md)。

## 定位

AI 导航 Vault 的前台门户：Next.js 16（App Router）+ React 19 + Tailwind 4，
开启 React Compiler。同仓库兄弟工程：`../vault-portal-api`（后端）、
`../vault-portal-admin`（独立管理后台）。

## 常用命令（改动后的最低验证）

```bash
pnpm dev      # http://localhost:3000（next dev -H 0.0.0.0）
pnpm build    # 生产构建
pnpm lint     # eslint（flat config + eslint-config-next）
```

- 无单测；改动后验证 = `pnpm lint` + `pnpm build`。后端离线时 build 也能过
  （首页等 ISR 页面以空板块呈现），这不叫构建失败。
- CI/并行构建用 `NEXT_DIST_DIR=...` 把 `.next` 输出隔离，避免干扰运行中的 dev server。

## 架构导览

- `src/app/` — App Router 页面。前台：tools / prompts / knowledge / mcp / skills /
  news / github / resources / spotlight / community / search / submit / profile /
  users 等；`src/app/admin/` 为内嵌后台页面（另有独立工程 `../vault-portal-admin`，
  两者并存）。
- `src/components/` — 通用组件（Nav、各列表/详情组件）。
- `src/lib/` — 数据获取与工具：`fetchList.ts`、`auth.tsx`（会话）、`admin.ts`、
  `markdown.ts` / `shiki-highlighter.ts`、各子站元信息（`*Meta.ts`、`site.ts`、
  `spotlights.ts`）、`safeUrl.ts` 等。
- `next.config.ts` — `/api/*`、`/uploads/*` rewrites 到 `BACKEND_URL`（默认
  `http://localhost:3001`）；基础安全响应头；`reactCompiler: true`；
  `allowedDevOrigins`（局域网调试用 `DEV_ORIGINS` 追加）。

## 约定与已知坑

- 会话只依赖 HttpOnly cookie；**前端代码不得持有/传输 JWT**（Bearer 双 token 只在
  独立管理后台用）。
- `NEXT_PUBLIC_SITE_URL`（sitemap/robots/RSS/canonical/OG）与 `BACKEND_URL`
  （rewrites）都是 **build 时**内联进产物，改值必须重新 build；生产漏配会输出 localhost。
- React Compiler 已开启：严格遵守 Hooks 规则（不要条件调用 hook、不要在渲染期
  变异入参），否则容易出现难排查的编译/行为问题。
- 内容状态机 `published/draft/pending/rejected/archived` 与后端统一；前台只渲染
  published（公开接口本身只返回 published）。
- 生产环境额外注入 X-Frame-Options/nosniff/Referrer-Policy/Permissions-Policy
  （`next.config.ts` 的 `securityHeaders`）；CSP 暂未启用，是有意的取舍。
