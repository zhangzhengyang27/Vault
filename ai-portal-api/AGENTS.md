# AGENTS.md — ai-portal-api（后端服务）

给 AI 编码代理的本工程速览。人类向说明见 [README.md](./README.md)；
仓库总览见[根 README](../README.md)，部署细节见 [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md)。

## 定位

NestJS 11 + TypeORM + PostgreSQL 后端，全局前缀 `/api`。服务对象：
`../ai-portal`（门户，cookie 会话，经 rewrites 代理）与 `../ai-portal-admin`
（管理后台，Bearer 双 token）。

## 常用命令（改动后的最低验证）

```bash
pnpm lint     # eslint --fix
pnpm build    # nest build
pnpm test     # jest 单测
```

`test:e2e`（`test/`）会启动完整 AppModule，需要 `.env` 里可用的 `DATABASE_URL`。

## 架构导览

- `src/modules/<domain>/` — 业务域（tools/prompts/articles/news/repos/mcps/resources/
  categories/search/posts/comments/crawler/submissions/reports/users/admin/...），
  每域 module/controller/service。
- `src/auth/` 认证；`src/favorites/`、`src/uploads/`、`src/logs/`、`src/seed/`、
  `src/cli/`（create-admin）、`src/common/`（过滤器等）独立于 modules；
  `src/entities/` 为 TypeORM 实体。
- `src/main.ts` — 全局前缀、helmet、ValidationPipe、`ensureGinTrgmIndexes` 启动自愈。
- `data-source.ts` — 迁移用 DataSource；`migrations/` 增量迁移；`sql/` 一次性维护 SQL；
  `scripts/` 数据导入/修复脚本；`content/` 知识库语料（`scripts/import-kb*.mjs` 入库）。

## 约定与已知坑

- **schema 变更一律走迁移**：改 `src/entities/` →
  `pnpm migration:generate ./migrations/Xxx` → 检查生成 SQL → `pnpm migration:run`。
  不要开 `TYPEORM_SYNCHRONIZE`（会删 pg_trgm GIN 索引，生产禁止）。
- 部署用全量 dump 必须与实体同步维护：实体加列后若只靠增量迁移，历史 dump 缺列
  会导致启动崩溃（2026-09 `news.category` 教训，见 DEPLOYMENT.md）。
- 内容状态机 `published/draft/pending/rejected/archived` 全仓统一；公开接口只返回
  `published`；新增管理接口记得 `@Roles('admin')`（JwtAuthGuard + RolesGuard）。
- 改 `auth/` 时保持三条性质：refresh token 入库（SHA-256）、每次刷新轮换、
  重用检测全量作废；cookie 会话（门户）与 Bearer（管理后台）双轨并存，互不影响。
- `NODE_ENV=production` 下代码层拒绝开发默认 JWT 密钥、拒绝 `SEED_DEMO=true`，
  不要放松这些校验。
- 上传写本地 `uploads/`（单文件 10MB）；限流依赖真实客户端 IP，反代后需 `TRUST_PROXY`。
- 新接口路径自动带 `/api` 前缀；`scripts/*.mjs`、`*.py` 是维护脚本，不属于运行时代码。
