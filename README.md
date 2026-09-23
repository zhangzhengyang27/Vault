# AI 导航 Vault

一站式中文 AI 门户：聚合 AI 工具、提示词、知识库、资讯、MCP/Skills 与社区，
内容以「AI 自动采集 + 人工审核」为核心生产方式。

## 仓库结构

| 目录 | 说明 | 技术栈 | 默认端口 |
| --- | --- | --- | --- |
| `vault-portal/` | 前台门户（含早期内嵌后台 `/admin`） | Next.js 16 (App Router) / React 19 / Tailwind 4 | 3000 |
| `vault-portal-api/` | 后端 API（认证/内容/采集/审核/通知） | NestJS 11 / TypeORM / PostgreSQL | 3001 |
| `vault-portal-admin/` | 独立管理后台（自前台拆出，独立部署） | Vue 3 / Element Plus / Vite | 5173 |

前端通过 `next.config.ts` 的 rewrites 将 `/api/*`、`/uploads/*` 代理到后端，
前后端同源，会话依赖 HttpOnly cookie（无 token 暴露在 JS 侧）。

## 快速开始

```bash
# 1. 后端（需要 PostgreSQL 13+，先复制 vault-portal-api/.env.example 为 .env 并填写）
cd vault-portal-api
pnpm install
pnpm migration:run        # 执行数据库迁移
pnpm start:dev            # http://localhost:3001/api

# 创建管理员（或配置 ADMIN_USERNAME/ADMIN_PASSWORD 由启动引导创建）
pnpm cli:create-admin --username=admin --password=你的密码

# 2. 前端（先复制 vault-portal/.env.example 为 .env.local，可全部使用默认值）
cd vault-portal
pnpm install
pnpm dev                  # http://localhost:3000

# 3. 独立管理后台（可选，需后端已启动）
cd vault-portal-admin
pnpm install              # 需 pnpm 10.23.0（corepack pnpm@10.23.0 install）
pnpm dev                  # http://localhost:5173
```

### 关键环境变量

| 变量 | 位置 | 说明 |
| --- | --- | --- |
| `DATABASE_URL` | api | PostgreSQL 连接串（必填，缺失时启动失败） |
| `JWT_SECRET` | api | JWT 签名密钥（必填，`openssl rand -hex 32`） |
| `SEED_DEMO=true` | api | 空库时创建 demo/demo1234 演示管理员（仅限本地演示） |
| `BACKEND_URL` | portal | 后端地址（默认 `http://localhost:3001`） |
| `NEXT_PUBLIC_SITE_URL` | portal | 站点公开地址（生产必填，用于 sitemap/RSS/OG） |
| `TRUST_PROXY` | api | 反向代理部署时设置，保证限流拿到真实客户端 IP |

## 常用命令

```bash
# 后端
pnpm build / pnpm test        # 构建 / 单元测试
pnpm migration:run|revert     # 迁移执行/回滚
pnpm cli:create-admin         # 创建或提升管理员

# 前端
pnpm build / pnpm lint

# 管理后台
pnpm typecheck / pnpm lint / pnpm build
```

## 内容状态约定

内容统一使用状态机：`published`（前台可见）/ `draft` / `pending`（采集与投稿待审）/
`rejected` / `archived`。公开接口只返回 `published`，后台接口可见全部状态并支持上下架。
