# vault-portal-admin — AI 门户独立管理后台

基于 vue-element-plus-admin 模板搭建，对接 `vault-portal-api`（NestJS，端口 3001）。
管理后台从前台 Next.js 站点中拆出，独立运行、独立部署。
仓库总览见[根 README](../README.md)，部署细节见 [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md)。

## 功能模块

| 菜单 | 路由 | 说明 |
| --- | --- | --- |
| 运营概览 | `/welcome` | 统计卡片、审核待办提醒、近 7 日新增内容/用户趋势 |
| 内容管理 → 工具/提示词/文章/资讯 | `/content/*` | 表格 CRUD、状态筛选、搜索、分页、发布/下架 |
| 采集审核 | `/review` | 7 类采集内容待审队列，单条 + 批量通过/拒绝（单次上限 500） |
| 数据源管理 | `/sources` | 采集源 CRUD、启停、手动/全量采集、最近日志 |
| 投稿审核 | `/submissions` | 用户投稿通过/拒绝（可填拒绝原因） |
| 举报管理 | `/reports` | 举报列表，标记已处理/重新打开 |
| 用户管理 | `/users` | 搜索/筛选/分页，封禁解封、角色变更（自身不可操作） |
| 分类管理 | `/categories` | 分类 CRUD，支持上级分类与排序 |
| 系统监控 → 登录日志 | `/monitor/login-logs` | 成功/失败登录全记录，搜索/筛选/删除/清空 |
| 系统监控 → 操作日志 | `/monitor/oper-logs` | 管理端变更类请求自动落库（含失败与请求体），详情弹窗查看 |
| 系统监控 → 在线用户 | `/monitor/online` | 最近 30 分钟活跃用户，支持强制下线（重登恢复） |
| 账户设置 | `/account-settings` | 修改密码、更新邮箱（右上角头像菜单进入） |

## 启动（开发）

```bash
pnpm install        # 本仓库需 pnpm 10.23.0（corepack pnpm@10.23.0 install）
pnpm dev            # http://localhost:5173
```

- 登录账号：使用后端用户表中的 `role=admin` 账号（非管理员登录会被直接拒绝）。
- 后端：需先启动 `vault-portal-api`（默认 :3001）。开发环境经 vite 代理转发
  `/api` 与 `/uploads`，无跨域问题。

## 常用命令

```bash
pnpm typecheck      # vue-tsc 类型检查（--noEmit --skipLibCheck）
pnpm lint           # eslint（--max-warnings 0）
pnpm build          # 清 dist 后生产构建（按 VITE_COMPRESSION 生成 .gz/.br 静态压缩产物）
pnpm preview        # 本地预览构建产物
```

## 认证机制（Bearer 双 token）

- `POST /api/auth/login` 响应体返回 `access_token`（7d）+ `refresh_token`（30d），
  同时保留 HttpOnly cookie（前台门户仍走 cookie 会话，互不影响）。
- 前端 axios 拦截器带 `Authorization: Bearer <accessToken>`；token 过期时自动调
  `POST /api/auth/refresh` 无感换发，失败则清登录态回登录页。
- refresh token 携带 `typ=refresh` 声明，后端守卫拒绝其冒充 access token。
- 每次鉴权/刷新都回查数据库：封禁、降权即时生效。
- 登录尝试（含失败）写入登录日志；管理端变更请求由拦截器写入操作日志；
  在线用户为内存活跃注册表（30 分钟窗口），强退 = 用户级撤销标记（重启失效）。

## 生产部署要点

- `VITE_GATEWAY`：API 网关前缀（默认 `/api`）。若管理后台与 API 不同域，
  将其设为完整地址（如 `https://api.example.com/api`），并在后端
  `CORS_ORIGINS` 中加入管理后台站点域名（开发走代理则不需要）。
- 路由为 history 模式，站点需配置 SPA 回退（所有路径回退到 index.html）。
- 登录页仅管理员可进入；所有业务接口后端均有 `@Roles('admin')` 守卫。
