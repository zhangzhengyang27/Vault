# 发布部署清单（Release Runbook）

发布前逐项过一遍本清单。生产域名已确定为
**`https://vault.zhangzhengyang.com`（门户）** 与
**`https://vault-admin.zhangzhengyang.com`（管理后台）**，
相关配置文件中的占位符已替换为真实值（见下表）；带 ⚠️ 的是**部署机器上仍需人工确认**的项。

## 0. 域名与环境变量（已按生产域名填好）

| 位置 | 变量 | 当前值 |
|---|---|---|
| `vault-portal/.env.production`（构建环境） | `NEXT_PUBLIC_SITE_URL` | `https://vault.zhangzhengyang.com` |
| `vault-portal/.env.production`（构建环境） | `BACKEND_URL` | `http://127.0.0.1:3001`（单机部署：后端与门户同机） |
| `vault-portal-admin/.env.production` | `VITE_PORTAL_URL` | `https://vault.zhangzhengyang.com` |

注意：门户两项在 **build 时**内联进产物，构建机不是部署机时，构建环境必须带同样
的值（详见第 2 节）。

## 1. 后端 vault-portal-api

### 环境变量（生产必填）

```bash
NODE_ENV=production
PORT=3001
DATABASE_URL=postgres://user:pass@host:5432/ai_portal   # 不配直接启动失败
JWT_SECRET=<openssl rand -hex 32 生成，禁止使用 .env.example 示例值>
CORS_ORIGINS=https://vault.zhangzhengyang.com,https://vault-admin.zhangzhengyang.com
# 可选：
COOKIE_SECURE=true        # HTTPS 部署时建议显式开启
TRUST_PROXY=1             # 位于 nginx 等反代之后时设置跳数，限流/日志才能拿到真实 IP
FIRECRAWL_API_KEY=...     # 托管抓取时
SEED_DEMO=                # 生产绝对不要设 true（代码层已在 NODE_ENV=production 拒绝）
MCP_STDIO_PROBE_ENABLED=  # 保持为空：stdio 探测会在服务器执行 npx/uvx/docker（任意代码执行面）
CRAWLER_AUTO_PUBLISH=     # 采集内容免审直发开关：留空/true=抓到即发布（默认）；false=先进审核队列
```

### 数据库初始化（从零建库）

1. 创建数据库后导入**全量** dump：`psql -d ai_portal -f ai_portal_dump.sql`
   （结构 + 种子数据 + `migrations` 记录一体；owner 落到导入用户，pg_dump 带
   `--no-owner --no-privileges`）。⚠️ 此 dump 必须与实体同步维护——实体加列后
   若只靠增量迁移补，历史 dump 会缺列（2026-09 曾因此 `news.category` 缺列启动崩溃，
   修复方式即重导全量 dump）；
2. 执行 `pnpm migration:run`（dump 已含 `migrations` 记录时为幂等 no-op，仅补充
   dump 生成之后新增的迁移）；
3. 不要用 `TYPEORM_SYNCHRONIZE=true` 做首次部署——它不建 `pg_trgm` 运算符类索引，
   且任何生产库都应以迁移为准；
4. `pg_trgm` 模糊搜索索引由应用每次启动时自动确保（`ensureGinTrgmIndexes`），
   托管 PG 需允许 `CREATE EXTENSION`（非超级用户可能失败，仅 warn 不阻断）。

### 安全机制速览

- refresh token 入库（SHA-256 哈希）：可撤销、每次刷新轮换、重用检测（旧 token 复现 → 全部作废）；
  改密码/管理员强退会撤销该用户全部 refresh token。
- 登录防爆破双层：IP 限流（全局 100/min，登录 10/min）+ 账号维度（15 分钟内失败 10 次锁定 15 分钟）。
- MCP 工具探测：生产默认禁用 stdio 分支（npx/uvx/docker 不再在服务器上执行第三方代码），
  仅保留远程 HTTP 探测。
- 注册/新密码最小长度 8 位。

### 构建与启动

```bash
pnpm install --frozen-lockfile
pnpm build
node --enable-source-maps dist/src/main.js   # 用进程管理器（pmi/systemd）托管
```

## 2. 门户 vault-portal（Next.js）

### ⚠️ 构建期内联的环境变量

`NEXT_PUBLIC_SITE_URL`（源码引用）与 `next.config.ts` 的 `BACKEND_URL`（rewrites）
都在 **build 时**烘焙进产物——运行时改环境变量无效，改配置必须重新 build。
两项已写入 `vault-portal/.env.production`（单机部署：门户与后端同机，`BACKEND_URL` 指向
本机 3001）。直接在部署机上构建即可：

```bash
pnpm build    # 自动读取 .env.production；如需覆盖可在命令行显式传环境变量
```

漏配 `NEXT_PUBLIC_SITE_URL` 的后果：sitemap/robots/RSS/canonical/OG 全部输出 localhost。

### 部署

- `pnpm build && pnpm start`（监听 0.0.0.0:3000），或 standalone/容器化；
- 生产已注入基础安全响应头（X-Frame-Options/nosniff/Referrer-Policy/Permissions-Policy），
  HSTS 建议在边缘/负载均衡层开启；
- `/login`、`/register` 已 noindex；社区帖子详情页 metadata 由 layout 服务端生成。

## 3. 管理后台 vault-portal-admin

### 构建

`.env.production` 已含全部所需变量（`VITE_PUBLIC_PATH`、`VITE_CDN=false`、
`VITE_COMPRESSION=both`、`VITE_PORTAL_URL`）。`VITE_GATEWAY` 缺省为同域 `/api`。

### 部署（Docker，推荐）

```bash
docker build -t vault-portal-admin .
# Linux 宿主机：
docker run -p 8080:80 \
  --add-host=host.docker.internal:host-gateway \
  -e API_UPSTREAM=http://host.docker.internal:3001 \
  vault-portal-admin
```

镜像内 nginx 已包含（`docker/nginx.conf.template`）：
- `/api`、`/uploads` 反代到 `API_UPSTREAM`（**必须配置**，否则接口全 404）；
- history 路由 SPA 回退（刷新/直达不 404）；
- `gzip_static`（构建产物带 .gz）+ 动态 gzip 兜底；
- `*.map` 与隐藏文件拦截（构建已关闭 sourcemap，双保险）。

非 Docker 部署（裸 nginx）：按 `docker/nginx.conf.template` 配置同样的
反代 + try_files 回退即可。若 API 在独立域名，设置 `VITE_GATEWAY` 并在后端
`CORS_ORIGINS` 加入管理后台地址。

## 4. 发布后待办（不阻塞上线）

- 上传文件目前只有 10MB/文件限制、无用户级配额：观察磁盘占用，必要时加每日配额与清理任务；
- 在线用户/限流/账号锁定均为单实例内存态：**当前按单实例部署，无需处理**；
  若未来扩展为多实例，需先迁移到 Redis；
- `synchronize` 保持关闭，一切 schema 变更走 TS migration；
- 建议跟进：社区帖子服务端渲染（当前客户端渲染，SEO 弱）、CSP 头、`public/demos/`
  演示页是否需要公开托管。
