# AI 门户前台（Next.js 16）：在 NAS(amd64) 上构建
# 构建期烘焙：NEXT_PUBLIC_SITE_URL（sitemap/RSS/OG）与 BACKEND_URL（rewrites 代理目标，
# 指向同 compose 网络的 api 服务名）。两者改了都必须重新 build，运行期 env 无效。
FROM node:22-slim AS build
RUN corepack enable
WORKDIR /app
ENV CI=true NEXT_TELEMETRY_DISABLED=1
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ENV NEXT_PUBLIC_SITE_URL=https://vault.zhangzhengyang.com
ENV BACKEND_URL=http://api:3001
ENV NODE_OPTIONS=--max-old-space-size=2048
RUN pnpm build

FROM node:22-slim AS run
ENV NODE_ENV=production
ENV PORT=3000
ENV BACKEND_URL=http://api:3001
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.ts ./next.config.ts
EXPOSE 3000
CMD ["pnpm", "start"]
