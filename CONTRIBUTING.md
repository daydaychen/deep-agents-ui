# Contributing Guide

感谢你对 Deep Agents UI 项目的关注！本指南将帮助你快速搭建开发环境并了解我们的工作流程。

## 📋 目录

- [环境要求](#-环境要求)
- [快速开始](#-快速开始)
- [开发工作流](#-开发工作流)
- [代码规范](#-代码规范)
- [提交规范](#-提交规范)
- [VS Code 配置](#-vs-code-配置)
- [故障排除](#-故障排除)

## 🎯 环境要求

- **Node.js**: v20+ (使用 `.nvmrc` 中指定的版本)
- **包管理器**: pnpm v9.15.0+
- **Git**: v2.50+

> **注意**: 我们使用 pnpm 作为包管理器。如果你还没有安装，可以通过 `npm install -g pnpm` 或 `corepack enable` 安装。

## 🚀 快速开始

### 1. 克隆仓库

```bash
git clone git@github.com:daydaychen/deep-agents-ui.git
cd deep-agents-ui
```

### 2. 运行设置脚本

```bash
./scripts/setup-dev.sh
```

这个脚本会自动：
- 检查 Node.js 版本
- 安装依赖
- 配置 Git hooks
- 创建 `.env.local` 文件

### 3. 启动开发服务器

```bash
pnpm dev
```

应用将在 http://localhost:3003 运行。

## 💻 开发工作流

### 可用脚本

| 命令 | 描述 |
|------|------|
| `pnpm dev` | 启动开发服务器 (Turbopack) |
| `pnpm dev:debug` | 启动带调试器的开发服务器 |
| `pnpm build` | 构建生产版本 |
| `pnpm build:analyze` | 构建并分析包大小 |
| `pnpm lint` | 运行 Biome Lint |
| `pnpm lint:fix` | 自动修复 Lint 问题 |
| `pnpm lint:fix:unsafe` | 自动修复（包含不安全修复）|
| `pnpm format` | 格式化代码 |
| `pnpm format:check` | 检查代码格式 |
| `pnpm check` | 运行完整检查 (Lint + Format + Import) |
| `pnpm check:fix` | 自动修复所有问题 |
| `pnpm organize-imports` | 自动组织导入 |
| `pnpm type-check` | 运行 TypeScript 类型检查 |
| `pnpm type-check:strict` | 运行严格模式类型检查 |
| `pnpm clean` | 清理构建缓存 |
| `pnpm clean:all` | 完全清理（包括 node_modules） |

### 分支策略

- `main`: 主分支，保持稳定
- `feat/*`: 功能分支
- `fix/*`: 修复分支
- `refactor/*`: 重构分支

### 开发流程

1. **创建分支**
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **开发并提交**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

3. **推送到远程**
   ```bash
   git push origin feat/your-feature-name
   ```

4. **创建 Pull Request**

## 📝 代码规范

### TypeScript

- 优先使用显式类型，避免 `any`
- 使用路径别名 `@/*` 导入模块
- 遵循严格的 null 检查

### React

- 使用函数组件和 Hooks
- 组件使用 `"use client"` 指令（如需要）
- 使用 `React.memo()` 优化性能（已用于 29+ 组件）

### 样式

- 使用 Tailwind CSS
- 遵循设计系统中的颜色变量
- 使用 `cn()` 工具函数合并类名

### 文件组织

```
src/
├── app/                    # App Router
│   ├── components/        # 功能组件
│   ├── hooks/            # 功能 Hooks
│   ├── types/            # TypeScript 类型
│   └── utils/            # 应用工具函数
├── components/ui/         # shadcn/ui 组件
├── providers/            # React Context Providers
└── lib/                  # 共享工具函数
```

## 🏷️ 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范。

### 格式

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### 类型

| 类型 | 描述 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档更新 |
| `style` | 代码风格调整（不影响功能） |
| `refactor` | 代码重构 |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `build` | 构建系统 |
| `ci` | CI/CD 配置 |
| `chore` | 其他改动 |
| `revert` | 回滚提交 |

### 示例

```bash
feat: add user authentication
fix(auth): resolve login redirect issue
docs: update README with setup instructions
refactor(chat): simplify message handling logic
```

## 🔧 VS Code 配置

### 推荐扩展

项目已配置 `.vscode/extensions.json`，打开项目时 VS Code 会推荐安装：

- **Biome** - 代码检查和格式化（替代 ESLint + Prettier）
- **Tailwind CSS IntelliSense** - Tailwind 智能提示
- **GitLens** - Git 增强
- **Code Spell Checker** - 拼写检查

### 编辑器设置

项目包含 `.vscode/settings.json`，已配置：

- 保存时自动格式化
- 保存时自动修复 Biome 问题
- 自动组织导入
- 100 字符标尺
- Tailwind CSS 支持

## 🐛 故障排除

### Node.js 版本问题

```bash
# 检查当前版本
node --version

# 使用 nvm 切换到正确版本
nvm use

# 或安装指定版本
nvm install 20
nvm use 20
```

### 依赖问题

```bash
# 清理并重新安装
pnpm clean:all
pnpm install
```

### 类型检查失败

```bash
# 运行严格类型检查查看详细错误
pnpm type-check:strict
```

### Git Hooks 未生效

```bash
# 手动初始化 husky
pnpm exec husky install
```

### 端口被占用

```bash
# 使用不同端口启动
pnpm dev --port 3004
```

## 📞 获取帮助

- 查看 [GitHub Issues](https://github.com/daydaychen/deep-agents-ui/issues)
- 阅读项目 [AGENTS.md](./AGENTS.md) 了解架构

---

**感谢你的贡献！** 🎉
