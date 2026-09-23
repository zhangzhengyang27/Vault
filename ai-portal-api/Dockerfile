# AI 门户后端 API（NestJS 11）：在 NAS(amd64) 上构建，勿在 Mac(arm64) 构建后搬运
FROM node:22-slim AS build
RUN corepack enable
WORKDIR /app
ENV CI=true
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22-slim AS run
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
EXPOSE 3001
CMD ["node", "--enable-source-maps", "dist/src/main.js"]
