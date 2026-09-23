# vault-portal — 前台门户与后台管理

AI 导航站前端：Next.js 16（App Router）+ React 19 + Tailwind 4。

## 页面结构

- 前台：`/`（首页聚合）、`/tools`、`/prompts`、`/knowledge`、`/mcp`、`/skills`、
  `/news`、`/github`、`/resources`、`/spotlight`（专题）、`/community`（社区）、
  `/search`、`/users/[username]`（用户主页）、`/profile`（个人中心）、`/submit`（投稿）
- 后台：`/admin/*`（统计、内容管理、数据源、审核、用户、分类），仅 `admin` 角色可见可访问
  （layout 路由守卫 + 页内双保险 + 后端接口强校验）
- 管理后台另有独立工程 [vault-portal-admin](../vault-portal-admin)（自前台拆出，生产部署为
  独立站点，见 [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md)）；本目录的内嵌后台仍保留可用

## 与后端的连接

- `next.config.ts` 将 `/api/*` 与 `/uploads/*` 反向代理到后端
  （`BACKEND_URL`，默认 `http://localhost:3001`），前后端同源。
- 会话完全依赖 HttpOnly cookie，前端不持有/不传输 JWT。

## 环境变量

复制 `.env.example` 为 `.env.local`：

- `BACKEND_URL` — 后端地址（本地开发用默认值即可）
- `NEXT_PUBLIC_SITE_URL` — 站点公开地址（生产必填，用于 sitemap / robots / RSS / OpenGraph）

## 开发

```bash
pnpm install
pnpm dev     # http://localhost:3000（局域网访问需 DEV_ORIGINS 追加来源）
pnpm build   # 生产构建（后端离线时首页等 ISR 页面以空板块呈现，不会失败）
pnpm lint
```
