# 使用 Node 20 Alpine 作为基础镜像
FROM node:20-alpine AS base

# 安装必要的系统依赖
RUN apk add --no-cache libc6-compat
WORKDIR /app

# 设置生产环境变量
ENV NODE_ENV=production

# 安装 pnpm
RUN npm install -g pnpm

# 为开发阶段设置环境变量
ENV NEXT_TELEMETRY_DISABLED=1

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 第一阶段：依赖安装
FROM base AS deps
WORKDIR /app

# 复制包管理文件
COPY package.json pnpm-lock.yaml* ./
# 使用 pnpm 安装依赖
RUN pnpm install --frozen-lockfile

# 第二阶段：构建
FROM base AS builder
WORKDIR /app

# 从 deps 阶段复制 node_modules
COPY --from=deps /app/node_modules ./node_modules
# 复制源代码
COPY . .

# 设置构建环境变量
ENV NEXT_TELEMETRY_DISABLED=1

# 构建应用
RUN pnpm build

# 第三阶段：运行
FROM base AS runner
WORKDIR /app

# 设置生产环境变量
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 从 builder 阶段复制必要文件
COPY --from=builder /app/public ./public

# 设置 standalone 输出目录（Next.js 优化）
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# 更改文件所有权
RUN chown -R nextjs:nodejs /app

# 切换到非 root 用户
USER nextjs

# 暴露端口
EXPOSE 3003

# 设置环境变量
ENV PORT=3003
ENV HOSTNAME="0.0.0.0"

# 启动应用
CMD ["node", "server.js"]