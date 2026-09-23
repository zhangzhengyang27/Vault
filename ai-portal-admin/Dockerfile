# syntax=docker/dockerfile:1
# ---------- 构建阶段 ----------
FROM node:22-alpine AS build-stage

WORKDIR /app
RUN corepack enable
# 与 package.json engines / README 声明一致（锁文件为 pnpm 10.x 格式）
RUN corepack prepare pnpm@10.23.0 --activate

# 国内构建可取消下一行注释以使用镜像源（默认保持官方源，保证 CI 可重复）
# RUN npm config set registry https://registry.npmmirror.com

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# ---------- 运行阶段 ----------
# nginx 配置来自 docker/nginx.conf.template：
#   - /api、/uploads 反代到 API_UPSTREAM 指向的后端（运行时 envsubst 注入）
#   - history 路由 SPA 回退、gzip_static、*.map 拦截
FROM nginx:stable-alpine AS production-stage

COPY --from=build-stage /app/dist /usr/share/nginx/html
# nginx 官方镜像会自动对 /etc/nginx/templates/*.template 执行 envsubst 后放到 conf.d
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template

# API 反代目标。Docker Desktop（macOS/Windows）默认值可直连宿主机；
# Linux 需 --add-host=host.docker.internal:host-gateway，compose/k8s 中显式覆盖
ENV API_UPSTREAM=http://host.docker.internal:3001

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
