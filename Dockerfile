# 使用 Node 24 Alpine 作为基础镜像
FROM node:24-alpine AS base

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

FROM base AS builder

WORKDIR /app

# 为开发阶段设置环境变量
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# 复制源代码
COPY . .

# 使用 pnpm 安装依赖（跳过 prepare 脚本避免 husky 错误）
RUN npx pnpm install --frozen-lockfile --ignore-scripts

# 构建应用
RUN npx pnpm build

# 第二阶段：运行
FROM base AS runner

WORKDIR /app

# 设置生产环境变量
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 从 builder 阶段复制必要文件（复制时直接设置所有者，避免额外层）
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 切换到非 root 用户
USER nextjs

# 暴露端口
EXPOSE 3003

# 设置环境变量
ENV PORT=3003
ENV HOSTNAME="0.0.0.0"

# 启动应用
CMD ["node", "server.js"]
