# vault-portal-api — AI 门户后端服务

AI 导航 Vault 的后端 API：NestJS 11 + TypeORM + PostgreSQL 13+，为前台门户
（[vault-portal](../vault-portal)）与独立管理后台（[vault-portal-admin](../vault-portal-admin)）
提供认证、内容、采集审核、社区等全部接口。仓库总览见[根 README](../README.md)。

## 功能模块

| 模块 | 说明 |
| --- | --- |
| `auth` | 注册/登录，JWT + refresh token（入库哈希、轮换、重用检测） |
| `modules/tools` `prompts` `articles` `news` `repos` `mcps` `resources` | 七类核心内容的 CRUD 与公开接口 |
| `modules/categories` | 分类树管理 |
| `modules/search` | pg_trgm 模糊搜索 |
| `modules/posts` `comments` `messages` `follows` `subscriptions` `notifications` | 社区与消息 |
| `favorites` | 收藏 |
| `modules/crawler` | 采集源管理、Firecrawl 抓取（托管 API / 自托管）、采集审核 |
| `modules/submissions` `reports` | 用户投稿与举报 |
| `modules/users` | 用户、封禁、角色变更 |
| `modules/admin` | 管理后台聚合接口（统计、内容管理、批量审核），`@Roles('admin')` |
| `uploads` | 文件上传（本地磁盘 `uploads/`，单文件 10MB 限制） |
| `logs` | 登录日志、操作日志、在线用户（30 分钟窗口） |

## 快速开始

```bash
cp .env.example .env      # 必填 DATABASE_URL、JWT_SECRET（openssl rand -hex 32）
pnpm install
pnpm migration:run        # 执行数据库迁移
pnpm start:dev            # http://localhost:3001/api
```

创建管理员（二选一）：

```bash
# 方式一：CLI
pnpm cli:create-admin --username=admin --password=你的密码
# 提升已有用户为管理员（保留原密码）：pnpm cli:create-admin --username=xxx
# 提升并重置密码：pnpm cli:create-admin --username=xxx --reset-password --password=新密码

# 方式二：.env 配 ADMIN_USERNAME / ADMIN_PASSWORD（可选 ADMIN_EMAIL），
#         应用启动时自动创建或提升；本地演示可 SEED_DEMO=true（空库建 demo/demo1234）
```

前端接本服务：门户经 Next rewrites 代理 `/api`、`/uploads`（同源无需 CORS）；
管理后台 dev 走 vite 代理。

## 常用命令

```bash
pnpm start:dev                          # watch 开发
pnpm build                              # nest build → dist/
pnpm start:prod                         # node dist/src/main（生产建议 --enable-source-maps）
pnpm test                               # jest 单元测试
pnpm test:e2e                           # e2e（启动完整 AppModule，依赖 .env 的数据库）
pnpm lint                               # eslint --fix
pnpm migration:generate ./migrations/Xxx  # 由实体差异生成迁移，生成后人工检查 SQL
pnpm migration:run / migration:revert   # 迁移执行 / 回滚
```

## 架构要点

- 全局前缀 `api`；全局 ValidationPipe、AllExceptionsFilter、Throttler 限流
  （全局 100/min，登录 10/min；账号维度 15 分钟内失败 10 次锁定 15 分钟）。
- 认证双轨：HttpOnly cookie 会话（门户）+ Bearer access/refresh 双 token（管理后台）。
  refresh token 入库（SHA-256）、每次刷新轮换、重用检测即全量作废；
  改密码/管理员强退撤销该用户全部 refresh token。生产默认禁用 MCP stdio 探测。
- 内容统一状态机：`published`（前台可见）/ `draft` / `pending`（采集与投稿待审）/
  `rejected` / `archived`。公开接口只返回 `published`；后台接口可见全部状态并支持上下架。
- pg_trgm GIN 搜索索引由每次启动的 `ensureGinTrgmIndexes`（`src/main.ts`）确保；
  TypeORM synchronize 不认识 `gin_trgm_ops` 会删这类索引，故生产保持
  `synchronize=false`，schema 变更一律走 `migrations/`。
- `sql/` 存一次性维护 SQL 与全量 dump 参考流程；`scripts/` 存数据导入/修复脚本
  （.mjs / .py）；`content/` 为知识库语料（配套 `scripts/import-kb*.mjs` 入库）。

## 部署

见 [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md)：生产环境变量（CORS_ORIGINS、
TRUST_PROXY、COOKIE_SECURE）、全量 dump 与迁移的关系、安全机制清单。
