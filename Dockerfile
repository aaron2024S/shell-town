FROM node:20-alpine AS builder

WORKDIR /app

# better-sqlite3 是 native 模块，需要编译工具
RUN apk add --no-cache python3 make g++

# 国内镜像加速（NAS 网络环境不佳时避免 Node headers 下载超时）
# 用环境变量而非 npm config：node-gyp 认 NODEJS_ORG_MIRROR / npm_config_disturl，
# 且环境变量不经过 npm 的配置项名校验（npm 10 会拒绝 disturl 等键名）
ENV NODEJS_ORG_MIRROR=https://registry.npmmirror.com/-/binary/node
ENV npm_config_registry=https://registry.npmmirror.com \
    npm_config_disturl=https://registry.npmmirror.com/-/binary/node

# 复制workspace根配置
COPY package.json package-lock.json* ./
COPY server/package.json ./server/
COPY web/package.json ./web/

# 安装依赖（包含devDependencies用于构建）
RUN npm ci --no-audit --no-fund

# 复制源码
COPY server/ ./server/
# 前端使用预构建的 dist，不在 Docker 内重新编译（避免环境差异导致 UI 不一致）
COPY web/dist/ ./web/dist/

# 只构建服务端
RUN npm run build --workspace server

# 清除 dev 依赖，只保留生产依赖（已编译的 native 模块会保留）
RUN npm prune --omit=dev

# 运行阶段
FROM node:20-alpine AS runtime

WORKDIR /app

# 直接复制 builder 阶段已编译好的生产依赖，不再重新 npm install
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/server/package.json ./server/package.json
COPY --from=builder /app/web/package.json ./web/package.json

# 复制构建产物
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/web/dist ./web/dist

# 运行时不再需要源码目录：构建脚本已把 schema.sql 拷进 server/dist/db/。
# 这行保留仅为兼容"用旧构建流程产出的 dist"的情况（db/index.ts 会按优先级依次尝试）。
COPY server/src/db/schema.sql ./server/src/db/schema.sql

# 出厂宠物素材快照 + 启动入口：首次挂载 ./pets 时自动播种缺失文件（不覆盖用户改动）
COPY --from=builder /app/web/dist/pets ./pets-default
COPY docker-entrypoint.sh ./docker-entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data

# 数据持久化目录
RUN mkdir -p /app/data
VOLUME /app/data

EXPOSE 3000

ENTRYPOINT ["sh", "docker-entrypoint.sh"]
CMD ["node", "server/dist/index.js"]
