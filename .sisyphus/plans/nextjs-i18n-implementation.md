# Next.js 国际化实施计划

## TL;DR

> **快速摘要**: 为 Next.js 16 + React 19 项目实施完整的中英双语国际化支持，使用 `next-intl` v4 库和 App Router 最佳实践。
>
> **交付成果**:
>
> - 支持 `/zh` (中文) 和 `/en` (英文) 路由前缀
> - 默认语言为中文 (`zh`)
> - 所有 UI 文本（约 200+ 处）翻译为中英双语
> - LanguageSwitcher 语言切换组件
> - TypeScript 类型安全的翻译系统
>
> **估计工作量**: Large (2-3 小时执行时间)
> **并行执行**: YES - 4 个阶段，最后阶段 4 个并行 QA 任务
> **关键路径**: 基础设施 → 布局迁移 → 组件更新 → 语言切换器 → QA 验证

---

## Context

### Original Request

为 deep-agents-ui 项目按照 Next.js 生态系统 i18n 最佳实践实施国际化，支持中英双语。

### Interview Summary

**Key Decisions**:

- **默认语言**: 中文 (`zh`) - 用户明确要求
- **备用语言**: 英文 (`en`)
- **路由策略**: 前缀路由 (`/zh/page`, `/en/page`)
- **库选择**: `next-intl` v4 - Next.js App Router 专用，TypeScript 优先
- **翻译策略**: 替换现有中文硬编码为结构化翻译系统
- **Provider 顺序**: `Theme → Tooltip → Nuqs → NextIntl → children`
- **键命名**: 按功能区域命名 (e.g., `chat.inputPlaceholder`)

**Research Findings**:

- next-intl v4 是 Next.js App Router 的推荐方案（5.6M 周下载量）
- 现有项目已有部分中文硬编码（MemoryItemDialog.tsx 等）
- 项目无现有测试基础设施
- 约 200+ 处硬编码文本需要翻译

### Metis Review Findings

**Identified Gaps** (addressed in this plan):

- ✅ Provider 嵌套顺序已明确
- ✅ 现有中文处理策略已确定（替换）
- ✅ 动态内容（toast 消息）插值处理方案
- ✅ Metadata 元数据本地化策略
- ✅ 20+ 组件需要更新，已分波次处理

---

## Work Objectives

### Core Objective

在 Next.js 16 + React 19 + App Router 项目中实施完整的国际化（i18n）支持，支持中英双语切换，默认中文，使用 next-intl v4 库。

### Concrete Deliverables

1. **基础设施文件**:

   - `src/i18n/routing.ts` - 路由配置
   - `src/i18n/request.ts` - 请求配置
   - `src/i18n/navigation.ts` - 导航辅助
   - `src/proxy.ts` - 本地化检测中间件
   - `next.config.ts` - Next.js 配置更新

2. **翻译文件**:

   - `messages/en.json` - 英文翻译（约 150+ 个键）
   - `messages/zh.json` - 中文翻译（约 150+ 个键）
   - `src/types/i18n.d.ts` - TypeScript 类型增强

3. **布局与路由**:

   - `src/app/[locale]/layout.tsx` - 本地化感知布局
   - `src/app/[locale]/page.tsx` - 本地化感知主页
   - `src/app/layout.tsx` - 根布局简化

4. **UI 组件**:

   - `src/components/LanguageSwitcher.tsx` - 语言切换器
   - 更新 15+ 现有组件以使用翻译

5. **文档**:
   - `docs/i18n.md` - 国际化使用文档

### Definition of Done

- [ ] 访问 `/zh` 显示中文界面
- [ ] 访问 `/en` 显示英文界面
- [ ] 访问 `/` 自动重定向到 `/zh`（默认中文）
- [ ] LanguageSwitcher 组件可以切换语言
- [ ] 所有 UI 文本都有对应的中英翻译
- [ ] TypeScript 类型检查通过
- [ ] 应用启动无 hydration 错误

### Must Have

- next-intl v4 完整集成
- 前缀路由支持 (`/zh`, `/en`)
- LanguageSwitcher 组件
- 所有现有硬编码文本翻译
- TypeScript 类型安全

### Must NOT Have (Guardrails)

- 不要更改现有业务逻辑
- 不要删除现有功能
- 不要添加不必要的依赖（只加 next-intl）
- 不要破坏 nuqs URL state 功能
- 不要在组件中使用硬编码文本（全部使用翻译键）

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — 所有验证由执行代理自动完成。

### Test Decision

- **基础设施存在**: NO（当前无测试）
- **自动化测试**: NO（项目阶段决定不添加测试）
- **Agent-Executed QA**: YES（每个任务都有具体的 QA 场景）

### QA Policy

每个任务 MUST 包含 agent-executed QA 场景：

- **前端/UI**: Playwright - 导航、交互、DOM 断言、截图
- **API/配置**: Bash (curl) - 请求发送、状态码断言
- **构建验证**: Bash - 类型检查、构建成功

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — 基础设施):
├── Task 1: Install next-intl & configure infrastructure [quick]
├── Task 2: Create routing.ts & request.ts config [quick]
├── Task 3: Create proxy.ts middleware [quick]
├── Task 4: Setup TypeScript types augmentation [quick]
└── Task 5: Update next.config.ts [quick]

Wave 2 (After Wave 1 — 布局迁移):
├── Task 6: Create messages/en.json & zh.json [quick]
├── Task 7: Move page.tsx to [locale]/page.tsx [quick]
├── Task 8: Create [locale]/layout.tsx with NextIntlClientProvider [visual-engineering]
├── Task 9: Update root layout.tsx [quick]
└── Task 10: Create LanguageSwitcher component [visual-engineering]

Wave 3 (After Wave 2 — 核心组件更新):
├── Task 11: Update page.tsx with translations [quick]
├── Task 12: Update ConfigDialog with translations [quick]
├── Task 13: Update ChatInput with translations [quick]
├── Task 14: Update Memory with translations [quick]
├── Task 15: Update ThreadList with translations [quick]
└── Task 16: Update ChatInterface with translations [quick]

Wave 4 (After Wave 3 — 剩余组件更新):
├── Task 17: Update EditMessage with translations [quick]
├── Task 18: Update RejectionMessageInput with translations [quick]
├── Task 19: Update ThreadStatusFilter with translations [quick]
├── Task 20: Update TasksSection with translations [quick]
├── Task 21: Update TasksFilesSidebar with translations [quick]
├── Task 22: Update FileViewDialog with translations [quick]
├── Task 23: Update ModeToggle with translations [quick]
├── Task 24: Update MemoryItemDialog with translations [quick]
├── Task 25: Update ApprovalActions with translations [quick]
└── Task 26: Update ToolApprovalInterrupt with translations [quick]

Wave 5 (After Wave 4 — 验证与文档):
├── Task 27: Create i18n documentation [writing]
├── Task 28: Final integration test [unspecified-high]
└── Task 29: Build verification [quick]

Wave FINAL (After ALL tasks — 4 个并行 QA):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Full QA test - both locales (unspecified-high)
└── Task F4: Scope fidelity check (deep)

Critical Path: 1-5 → 6-10 → 11-16 → 17-26 → 27-29 → F1-F4
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 10 (Wave 4)
```

### Dependency Matrix

| Task  | Depends On | Blocks |
| ----- | ---------- | ------ |
| 1-5   | —          | 6-10   |
| 6     | 1-5        | 7-10   |
| 7-10  | 6          | 11-26  |
| 11-16 | 7-10       | 17-26  |
| 17-26 | 11-16      | 27-29  |
| 27-29 | 17-26      | F1-F4  |
| F1-F4 | 27-29      | —      |

### Agent Dispatch Summary

- **Wave 1**: 5 tasks → `quick` x5
- **Wave 2**: 5 tasks → `quick` x3, `visual-engineering` x2
- **Wave 3**: 6 tasks → `quick` x6
- **Wave 4**: 10 tasks → `quick` x10
- **Wave 5**: 3 tasks → `writing` x1, `unspecified-high` x1, `quick` x1
- **Wave FINAL**: 4 tasks → `oracle` x1, `unspecified-high` x2, `deep` x1

---

- [x] 1. Install next-intl & configure package.json

  **What to do**:
  - Install `next-intl` v4: `yarn add next-intl`
  - Verify package.json 更新成功

  **Must NOT do**:
  - 不要安装其他不必要的 i18n 库

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2-6)
  - **Blocks**: Tasks 7-26
  - **Blocked By**: None

  **References**:
  - `package.json` - 添加 next-intl 依赖
  - next-intl docs: https://next-intl.dev/docs/getting-started/app-router

  **Acceptance Criteria**:
  - [ ] `yarn add next-intl` 执行成功
  - [ ] package.json 包含 `"next-intl": "^4.x.x"`

  **QA Scenarios**:
  ```
  Scenario: Package installation verification
    Tool: Bash
    Preconditions: 在项目根目录
    Steps:
      1. cat package.json | grep next-intl
    Expected Result: 输出版本号，如 "next-intl": "^4.0.0"
    Evidence: .sisyphus/evidence/task-1-package-install.txt
  ```

  **Commit**: YES
  - Message: `feat(i18n): install next-intl dependency`
  - Files: `package.json`, `yarn.lock`

- [x] 2. Create i18n routing configuration

  **What to do**:
  - Create `src/i18n/routing.ts` with routing configuration
  - Define locales: `['zh', 'en']`
  - Define defaultLocale: `'zh'`
  - Define localePrefix: `'always'`

  **Must NOT do**:
  - 不要使用过时的 createSharedPathnamesNavigation

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`next-best-practices`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3-6)
  - **Blocks**: Tasks 7-26
  - **Blocked By**: None

  **References**:
  - next-intl v4 routing docs: https://next-intl.dev/docs/routing

  **Acceptance Criteria**:
  - [ ] File `src/i18n/routing.ts` 存在
  - [ ] 导出 `routing` 对象
  - [ ] 包含 zh 和 en 两个 locale
  - [ ] defaultLocale 为 'zh'

  **QA Scenarios**:
  ```
  Scenario: Routing config verification
    Tool: Bash
    Preconditions: src/i18n/routing.ts 已创建
    Steps:
      1. cat src/i18n/routing.ts | grep "defineRouting"
      2. cat src/i18n/routing.ts | grep "locales"
      3. cat src/i18n/routing.ts | grep "defaultLocale"
    Expected Result: 包含 defineRouting, locales 数组, defaultLocale: 'zh'
    Evidence: .sisyphus/evidence/task-2-routing-config.txt
  ```

  **Commit**: YES (与 Task 1 一起)

- [x] 3. Create i18n request configuration

  **What to do**:
  - Create `src/i18n/request.ts`
  - 实现 `getRequestConfig` 导出
  - 动态导入对应 locale 的 messages

  **Must NOT do**:
  - 不要同步导入所有 messages（影响性能）

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`next-best-practices`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-2, 4-6)
  - **Blocks**: Tasks 7-26
  - **Blocked By**: None

  **References**:
  - next-intl request config: https://next-intl.dev/docs/configuration

  **Acceptance Criteria**:
  - [ ] File `src/i18n/request.ts` 存在
  - [ ] 导出 `getRequestConfig`
  - [ ] 使用动态 import 加载 messages

  **QA Scenarios**:
  ```
  Scenario: Request config verification
    Tool: Bash
    Preconditions: src/i18n/request.ts 已创建
    Steps:
      1. cat src/i18n/request.ts | grep "getRequestConfig"
      2. cat src/i18n/request.ts | grep "import"
    Expected Result: 包含 getRequestConfig 导出和动态 import
    Evidence: .sisyphus/evidence/task-3-request-config.txt
  ```

  **Commit**: YES (与 Task 1 一起)

- [x] 4. Create i18n navigation helpers

  **What to do**:
  - Create `src/i18n/navigation.ts`
  - 导出 `Link`, `redirect`, `usePathname`, `useRouter` 的本地化版本

  **Must NOT do**:
  - 不要直接使用 next/navigation 的原始导出

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`next-best-practices`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-3, 5-6)
  - **Blocks**: Tasks 7-26
  - **Blocked By**: None

  **References**:
  - next-intl navigation: https://next-intl.dev/docs/routing/navigation

  **Acceptance Criteria**:
  - [ ] File `src/i18n/navigation.ts` 存在
  - [ ] 导出 Link, redirect, usePathname, useRouter

  **QA Scenarios**:
  ```
  Scenario: Navigation helpers verification
    Tool: Bash
    Preconditions: src/i18n/navigation.ts 已创建
    Steps:
      1. cat src/i18n/navigation.ts | grep "createNavigation"
      2. cat src/i18n/navigation.ts | grep "Link\|redirect\|usePathname\|useRouter"
    Expected Result: 包含 createNavigation 和所有必要导出
    Evidence: .sisyphus/evidence/task-4-navigation.txt
  ```

  **Commit**: YES (与 Task 1 一起)

- [x] 5. Create proxy middleware for locale detection

  **What to do**:
  - Create `src/proxy.ts` (middleware)
  - 使用 `createMiddleware` 处理 locale 前缀
  - 配置 matcher 排除静态资源、API 路由

  **Must NOT do**:
  - 不要影响 API 路由和静态文件

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`next-best-practices`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-4, 6)
  - **Blocks**: Tasks 7-26
  - **Blocked By**: None

  **References**:
  - next-intl middleware: https://next-intl.dev/docs/routing/middleware

  **Acceptance Criteria**:
  - [ ] File `src/proxy.ts` 存在
  - [ ] 使用 createMiddleware
  - [ ] 配置正确的 matcher

  **QA Scenarios**:
  ```
  Scenario: Middleware verification
    Tool: Bash
    Preconditions: src/proxy.ts 已创建
    Steps:
      1. cat src/proxy.ts | grep "createMiddleware"
      2. cat src/proxy.ts | grep "matcher"
    Expected Result: 包含 createMiddleware 和 matcher 配置
    Evidence: .sisyphus/evidence/task-5-middleware.txt
  ```

  **Commit**: YES (与 Task 1 一起)

- [x] 6. Create TypeScript types augmentation

  **What to do**:
  - Create `src/types/i18n.d.ts`
  - 声明 next-intl 模块类型
  - 定义 Messages 类型

  **Must NOT do**:
  - 不要破坏现有类型

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`next-best-practices`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-5)
  - **Blocks**: Tasks 11-26 (组件使用翻译)
  - **Blocked By**: None

  **References**:
  - next-intl TypeScript: https://next-intl.dev/docs/workflows/typescript

  **Acceptance Criteria**:
  - [ ] File `src/types/i18n.d.ts` 存在
  - [ ] 声明 next-intl 类型增强

  **QA Scenarios**:
  ```
  Scenario: TypeScript augmentation verification
    Tool: Bash
    Preconditions: src/types/i18n.d.ts 已创建
    Steps:
      1. cat src/types/i18n.d.ts
    Expected Result: 包含 declare module 'next-intl'
    Evidence: .sisyphus/evidence/task-6-types.txt
  ```

  **Commit**: YES (与 Task 1 一起)



## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — `oracle`
      Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
      Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
      Run `tsc --noEmit` + `next build`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names.
      Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Full QA Test - Both Locales** — `unspecified-high`
      Start from clean state. Test `/zh` loads Chinese UI, `/en` loads English UI, `/` redirects to `/zh`. Verify LanguageSwitcher works. Test key user flows in both languages. Save screenshots to `.sisyphus/evidence/final-qa/`.
      Output: `Routes [3/3] | Components [26/26] | Switching [PASS/FAIL] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
      For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance.
      Output: `Tasks [29/29 compliant] | Scope [CLEAN/CREEP] | VERDICT`

---

## Commit Strategy

**Wave 1**: `feat(i18n): setup next-intl infrastructure`

- Files: `src/i18n/*`, `src/proxy.ts`, `next.config.ts`, `package.json`
- Pre-commit: `yarn install && npx tsc --noEmit`

**Wave 2**: `feat(i18n): setup locale routing and layout`

- Files: `src/app/[locale]/*`, `src/components/LanguageSwitcher.tsx`, `messages/*`
- Pre-commit: `npx tsc --noEmit`

**Wave 3**: `feat(i18n): translate core components`

- Files: `src/app/page.tsx`, `src/app/components/ConfigDialog.tsx`, `src/app/components/chat/ChatInput.tsx`, `src/app/components/Memory.tsx`, `src/app/components/ThreadList.tsx`, `src/app/components/ChatInterface.tsx`
- Pre-commit: `npx tsc --noEmit`

**Wave 4**: `feat(i18n): translate remaining components`

- Files: `src/app/components/*`, `src/components/ui/*`
- Pre-commit: `npx tsc --noEmit`

**Wave 5**: `docs(i18n): add i18n documentation and final QA`

- Files: `docs/i18n.md`, `.sisyphus/evidence/*`
- Pre-commit: `yarn build`

---

## Success Criteria

### Verification Commands

```bash
# 路由验证
curl -s http://localhost:3000/zh | grep -i "databus"
# Expected: 返回中文标题

curl -s http://localhost:3000/en | grep -i "databus"
# Expected: 返回英文标题

# 重定向验证
curl -sI http://localhost:3000/ | grep -i location
# Expected: Location: /zh

# 类型检查
npx tsc --noEmit
# Expected: 无错误

# 构建验证
yarn build
# Expected: 构建成功

# 应用启动
yarn dev
# Expected: 启动在 3003 端口，无 hydration 错误
```

### Final Checklist

- [ ] `/zh` 路由显示中文界面
- [ ] `/en` 路由显示英文界面
- [ ] `/` 路由重定向到 `/zh`
- [ ] LanguageSwitcher 可以切换语言
- [ ] 所有 26 个组件都使用翻译键
- [ ] 零硬编码 UI 文本
- [ ] TypeScript 检查通过
- [ ] 构建成功
- [ ] 无 hydration 错误
- [ ] next-intl 类型增强正常工作

---

## Notes

### 翻译键命名约定

- **页面级**: `page.title`, `page.description`
- **组件级**: `componentName.elementName`
  - 例如: `configDialog.deploymentUrl`, `chatInput.placeholder`
- **通用**: `common.button.save`, `common.button.cancel`
- **错误**: `errors.saveFailed`, `errors.requiredField`
- **状态**: `status.idle`, `status.busy`, `status.completed`

### Provider 嵌套顺序

```tsx
<ThemeProvider>
  <TooltipProvider>
    <NuqsAdapter>
      <NextIntlClientProvider>{children}</NextIntlClientProvider>
    </NuqsAdapter>
  </TooltipProvider>
</ThemeProvider>
```

### 重要文件清单

| 文件                                  | 说明                                    |
| ------------------------------------- | --------------------------------------- |
| `src/i18n/routing.ts`                 | 路由配置，定义 locales 和 defaultLocale |
| `src/i18n/request.ts`                 | 请求配置，加载对应语言 messages         |
| `src/proxy.ts`                        | 中间件，处理 locale 检测和重定向        |
| `messages/zh.json`                    | 中文翻译                                |
| `messages/en.json`                    | 英文翻译                                |
| `src/app/[locale]/layout.tsx`         | 本地化感知布局                          |
| `src/components/LanguageSwitcher.tsx` | 语言切换器                              |

- [x] 7. Update next.config.ts for i18n plugin

  **What to do**:
  - 修改 `next.config.ts`
  - 使用 `createNextIntlPlugin` 包装配置
  - 确保 Turbopack 配置不受影响

  **Must NOT do**:
  - 不要破坏现有的 turbopack 配置

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`next-best-practices`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 8-11)
  - **Blocks**: Tasks 12-26
  - **Blocked By**: Tasks 1-6

  **References**:
  - `next.config.ts` - 现有配置
  - next-intl config: https://next-intl.dev/docs/getting-started/app-router

  **Acceptance Criteria**:
  - [ ] next.config.ts 使用 createNextIntlPlugin
  - [ ] Turbopack 配置保留

  **QA Scenarios**:
  ```
  Scenario: Next.js config verification
    Tool: Bash
    Preconditions: next.config.ts 已更新
    Steps:
      1. cat next.config.ts | grep "createNextIntlPlugin"
      2. yarn build 2>&1 | head -20
    Expected Result: 包含 createNextIntlPlugin，构建不报错
    Evidence: .sisyphus/evidence/task-7-config.txt
  ```

  **Commit**: YES (与 Wave 1 一起)

- [x] 8. Create Chinese translations file (zh.json)

  **What to do**:
  - Create `messages/zh.json`
  - 包含所有中文翻译内容
  - 按 namespace 组织: common, page, chat, config, memory, thread, error, toast

  **Must NOT do**:
  - 不要遗漏草稿中列出的任何硬编码文本

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 7, 9-11)
  - **Blocks**: Tasks 12-26
  - **Blocked By**: Tasks 1-6

  **References**:
  - `.sisyphus/drafts/i18n-implementation.md` - 硬编码文本清单

  **Acceptance Criteria**:
  - [ ] messages/zh.json 存在
  - [ ] 包含所有 namespaces
  - [ ] JSON 格式有效

  **QA Scenarios**:
  ```
  Scenario: Chinese translations verification
    Tool: Bash
    Preconditions: messages/zh.json 已创建
    Steps:
      1. cat messages/zh.json | jq 'keys'
      2. cat messages/zh.json | jq '.common | keys'
      3. cat messages/zh.json | jq '.chat | keys'
    Expected Result: 包含 common, page, chat, config, memory, thread, error, toast namespaces
    Evidence: .sisyphus/evidence/task-8-zh-translations.txt
  ```

  **Commit**: YES
  - Message: `feat(i18n): add Chinese translations`

- [x] 9. Create English translations file (en.json)

  **What to do**:
  - Create `messages/en.json`
  - 与 zh.json 结构一致
  - 包含所有英文翻译

  **Must NOT do**:
  - 不要改变 zh.json 的结构

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 7-8, 10-11)
  - **Blocks**: Tasks 12-26
  - **Blocked By**: Tasks 1-6

  **References**:
  - `messages/zh.json` - 参考结构

  **Acceptance Criteria**:
  - [ ] messages/en.json 存在
  - [ ] 结构与 zh.json 一致
  - [ ] JSON 格式有效

  **QA Scenarios**:
  ```
  Scenario: English translations verification
    Tool: Bash
    Preconditions: messages/en.json 已创建
    Steps:
      1. diff <(cat messages/zh.json | jq 'keys') <(cat messages/en.json | jq 'keys')
    Expected Result: 两个文件的 keys 一致
    Evidence: .sisyphus/evidence/task-9-en-translations.txt
  ```

  **Commit**: YES (与 Task 8 一起)

- [x] 10. Move layout.tsx to [locale] dynamic segment

  **What to do**:
  - 创建 `src/app/[locale]/layout.tsx`
  - 从原 `src/app/layout.tsx` 迁移内容
  - 添加 `generateStaticParams` 导出

  **Must NOT do**:
  - 不要删除原 layout.tsx 直到新布局验证通过

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`next-best-practices`, `vercel-react-best-practices`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 7-9, 11)
  - **Blocks**: Tasks 12-26
  - **Blocked By**: Tasks 1-6

  **References**:
  - `src/app/layout.tsx` - 现有布局

  **Acceptance Criteria**:
  - [ ] src/app/[locale]/layout.tsx 存在
  - [ ] 包含 generateStaticParams
  - [ ] 原 layout.tsx 保留（暂不删除）

  **QA Scenarios**:
  ```
  Scenario: Locale layout verification
    Tool: Bash
    Preconditions: src/app/[locale]/layout.tsx 已创建
    Steps:
      1. cat src/app/[locale]/layout.tsx | grep "generateStaticParams"
      2. cat src/app/[locale]/layout.tsx | grep "locales"
    Expected Result: 包含 generateStaticParams 和 locales 导出
    Evidence: .sisyphus/evidence/task-10-layout.txt
  ```

  **Commit**: YES
  - Message: `feat(i18n): add locale-aware layout`

- [x] 11. Create LanguageSwitcher component

  **What to do**:
  - Create `src/components/LanguageSwitcher.tsx`
  - 使用 i18n/navigation 的 Link 组件
  - 设计：按钮/下拉菜单形式，显示当前语言
  - 图标使用 lucide-react (Globe)

  **Must NOT do**:
  - 不要丢失 URL state（threadId, sidebar）

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`, `ui-ux-pro-max`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 7-10)
  - **Blocks**: Tasks 12-26
  - **Blocked By**: Tasks 1-6

  **References**:
  - `src/i18n/navigation.ts` - 使用本地化的 Link
  - shadcn/ui Select 组件用于语言选择

  **Acceptance Criteria**:
  - [ ] LanguageSwitcher 组件存在
  - [ ] 使用本地化的 navigation
  - [ ] 视觉风格与现有 UI 一致

  **QA Scenarios**:
  ```
  Scenario: LanguageSwitcher component
    Tool: Playwright
    Preconditions: App 运行中 (yarn dev)
    Steps:
      1. 导航到 http://localhost:3000/zh
      2. 截图记录中文界面
      3. 点击 LanguageSwitcher
      4. 选择 English
      5. 验证 URL 变为 /en
    Expected Result: 语言切换成功，UI 更新为英文
    Evidence: .sisyphus/evidence/task-11-switcher.png
  ```

  **Commit**: YES
  - Message: `feat(i18n): add LanguageSwitcher component`



### Wave 3: 页面迁移与核心组件 (After Wave 2)

- [x] 12. Move page.tsx to [locale] dynamic segment

  **What to do**:
  - 移动 `src/app/page.tsx` → `src/app/[locale]/page.tsx`
  - 更新导入路径（确保 @/* 别名仍然有效）
  - 添加 `setRequestLocale` 调用

  **Must NOT do**:
  - 不要改变组件逻辑，只迁移位置

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`next-best-practices`]

  **Parallelization**:
  - **Can Run In Parallel**: NO (依赖 Task 10)
  - **Parallel Group**: Wave 3 (顺序执行)
  - **Blocks**: Tasks 13-26
  - **Blocked By**: Task 10

  **References**:
  - `src/app/page.tsx` - 原页面文件

  **Acceptance Criteria**:
  - [ ] 文件移动到 src/app/[locale]/page.tsx
  - [ ] 原文件删除或重命名
  - [ ] setRequestLocale 调用添加

  **QA Scenarios**:
  ```
  Scenario: Page migration verification
    Tool: Bash
    Preconditions: 文件已移动
    Steps:
      1. ls -la src/app/[locale]/page.tsx
      2. cat src/app/[locale]/page.tsx | grep "setRequestLocale"
    Expected Result: 文件存在，包含 setRequestLocale
    Evidence: .sisyphus/evidence/task-12-page-move.txt
  ```

  **Commit**: YES
  - Message: `feat(i18n): move page to locale route`

- [x] 13. Add LanguageSwitcher to header

  **What to do**:
  - 修改 `src/app/[locale]/page.tsx`
  - 在 header 区域添加 LanguageSwitcher 组件
  - 与 Settings 按钮并列

  **Must NOT do**:
  - 不要影响现有按钮布局

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: NO (依赖 Task 11, 12)
  - **Parallel Group**: Wave 3
  - **Blocks**: Tasks 14-26
  - **Blocked By**: Tasks 11, 12

  **References**:
  - `src/components/LanguageSwitcher.tsx` - 语言切换器
  - Header 布局参考 page.tsx:147-169

  **Acceptance Criteria**:
  - [ ] LanguageSwitcher 在 header 中可见
  - [ ] 布局美观，不拥挤

  **QA Scenarios**:
  ```
  Scenario: LanguageSwitcher in header
    Tool: Playwright
    Preconditions: App 运行中
    Steps:
      1. 导航到 http://localhost:3000/zh
      2. 截图 header 区域
      3. 验证 LanguageSwitcher 可见
    Expected Result: LanguageSwitcher 在 Settings 按钮附近
    Evidence: .sisyphus/evidence/task-13-header.png
  ```

  **Commit**: YES
  - Message: `feat(i18n): integrate LanguageSwitcher in header`



### Wave 4: 组件国际化 (After Wave 3)

- [ ] 14. i18n: ConfigDialog.tsx translations

  **What to do**:
  - 更新 `src/app/components/ConfigDialog.tsx` 使用翻译
  - 替换所有硬编码文本：标签、placeholder、toast 消息、按钮

  **Must NOT do**:
  - 不要改变组件逻辑

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with 15-26)
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: Task 12

  **Acceptance Criteria**:
  - [ ] 所有硬编码文本使用 t() 函数
  - [ ] TypeScript 无错误

  **QA Scenarios**:
  ```
  Scenario: ConfigDialog translations
    Tool: Bash
    Steps:
      1. grep -c "t('" src/app/components/ConfigDialog.tsx
      2. grep -c "toast.success\|toast.error" src/app/components/ConfigDialog.tsx
    Expected Result: 翻译调用数 > 15
  ```

  **Commit**: YES (Wave 4 批量提交)

- [ ] 15. i18n: ChatInput.tsx translations

  **What to do**:
  - 更新 `src/app/components/chat/ChatInput.tsx`
  - 翻译：placeholder、labels、按钮、tabs、dropdown

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**: Wave 4

  **Acceptance Criteria**:
  - [ ] 所有 UI 文本使用翻译
  - [ ] 模型名称保持原样（技术标识符）

  **Commit**: YES (Wave 4 批量提交)

- [ ] 16. i18n: Memory.tsx translations

  **What to do**:
  - 更新 `src/app/components/Memory.tsx`
  - 翻译：placeholder、toast 消息、按钮

  **Recommended Agent Profile**: `quick`
  **Parallelization**: Wave 4
  **Commit**: YES (Wave 4 批量提交)

- [ ] 17. i18n: MemoryItemDialog.tsx translations

  **What to do**:
  - 更新 `src/app/components/MemoryItemDialog.tsx`
  - 翻译：toast 消息、placeholder、按钮
  - 将现有中文提取到翻译文件

  **Recommended Agent Profile**: `quick`
  **Parallelization**: Wave 4
  **Commit**: YES (Wave 4 批量提交)

- [ ] 18. i18n: EditMessage.tsx translations

  **What to do**:
  - 更新 `src/app/components/EditMessage.tsx`
  - 翻译：placeholder、按钮 title

  **Recommended Agent Profile**: `quick`
  **Parallelization**: Wave 4
  **Commit**: YES (Wave 4 批量提交)

- [ ] 19. i18n: RejectionMessageInput.tsx translations

  **What to do**:
  - 更新 `src/app/components/approval/RejectionMessageInput.tsx`
  - 翻译：placeholder、label

  **Recommended Agent Profile**: `quick`
  **Parallelization**: Wave 4
  **Commit**: YES (Wave 4 批量提交)

- [ ] 20. i18n: ThreadStatusFilter.tsx translations

  **What to do**:
  - 更新 `src/app/components/thread/ThreadStatusFilter.tsx`
  - 翻译：Idle、Busy、Interrupted、Error 状态标签

  **Recommended Agent Profile**: `quick`
  **Parallelization**: Wave 4
  **Commit**: YES (Wave 4 批量提交)

- [ ] 21. i18n: TasksSection.tsx translations

  **What to do**:
  - 更新 `src/app/components/chat/TasksSection.tsx`
  - 翻译：状态标签 (Pending、In Progress、Completed)

  **Recommended Agent Profile**: `quick`
  **Parallelization**: Wave 4
  **Commit**: YES (Wave 4 批量提交)

- [ ] 22. i18n: TasksFilesSidebar.tsx translations

  **What to do**:
  - 更新 `src/app/components/TasksFilesSidebar.tsx`
  - 翻译：状态标签、按钮

  **Recommended Agent Profile**: `quick`
  **Parallelization**: Wave 4
  **Commit**: YES (Wave 4 批量提交)

- [ ] 23. i18n: FileViewDialog.tsx translations

  **What to do**:
  - 更新 `src/app/components/FileViewDialog.tsx`
  - 翻译：placeholder、toast 消息、标题

  **Recommended Agent Profile**: `quick`
  **Parallelization**: Wave 4
  **Commit**: YES (Wave 4 批量提交)

- [ ] 24. i18n: ModeToggle.tsx translations

  **What to do**:
  - 更新 `src/components/ui/mode-toggle.tsx`
  - 翻译：tooltip 文本 (Switch to dark mode, etc.)

  **Recommended Agent Profile**: `quick`
  **Parallelization**: Wave 4
  **Commit**: YES (Wave 4 批量提交)

- [ ] 25. i18n: ThreadList.tsx translations

  **What to do**:
  - 更新 `src/app/components/ThreadList.tsx`
  - 翻译：按钮 aria-label、toast 消息

  **Recommended Agent Profile**: `quick`
  **Parallelization**: Wave 4
  **Commit**: YES (Wave 4 批量提交)

- [ ] 26. i18n: Approval components translations

  **What to do**:
  - 更新 approval 目录下的组件
  - ApprovalActions.tsx、ToolInfoCard.tsx、ArgumentEditor.tsx
  - 翻译：按钮、标签、提示

  **Recommended Agent Profile**: `quick`
  **Parallelization**: Wave 4
  **Commit**: YES (Wave 4 批量提交)



### Wave 5: Polish & QA (After Wave 4)

- [ ] 27. Update metadata for localization

  **What to do**:
  - 更新 `src/app/[locale]/layout.tsx`
  - 使 metadata (title, description) 支持本地化
  - 使用 `getTranslations` 获取翻译

  **Must NOT do**:
  - 不要破坏现有的 SEO 设置

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`next-best-practices`]

  **Parallelization**:
  - **Can Run In Parallel**: NO (依赖 Task 10)
  - **Parallel Group**: Wave 5
  - **Blocks**: Task F3
  - **Blocked By**: Task 10

  **Acceptance Criteria**:
  - [ ] metadata 使用翻译
  - [ ] 中英文页面有不同的 title

  **QA Scenarios**:
  ```
  Scenario: Localized metadata
    Tool: Bash
    Steps:
      1. curl -s http://localhost:3000/zh | grep "<title>"
      2. curl -s http://localhost:3000/en | grep "<title>"
    Expected Result: 中英文有不同的 title
  ```

  **Commit**: YES
  - Message: `feat(i18n): localize metadata`

- [ ] 28. Clean up original app/layout.tsx and app/page.tsx

  **What to do**:
  - 删除 `src/app/layout.tsx`（已迁移到 [locale]/layout.tsx）
  - 删除 `src/app/page.tsx`（已迁移到 [locale]/page.tsx）
  - 确保没有重复文件

  **Must NOT do**:
  - 不要误删 [locale] 目录下的文件

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 5
  - **Blocks**: Task 29
  - **Blocked By**: Task 12

  **Acceptance Criteria**:
  - [ ] src/app/layout.tsx 已删除
  - [ ] src/app/page.tsx 已删除
  - [ ] src/app/[locale]/* 文件完好

  **QA Scenarios**:
  ```
  Scenario: File cleanup verification
    Tool: Bash
    Steps:
      1. ls -la src/app/layout.tsx 2>&1 | grep "No such file"
      2. ls -la src/app/page.tsx 2>&1 | grep "No such file"
      3. ls -la src/app/[locale]/layout.tsx
      4. ls -la src/app/[locale]/page.tsx
    Expected Result: 原文件不存在，[locale] 文件存在
  ```

  **Commit**: YES
  - Message: `chore(i18n): clean up original layout and page files`

- [ ] 29. Create i18n usage documentation

  **What to do**:
  - 创建 `docs/i18n.md` 或更新 README
  - 说明：如何添加新翻译、命名约定、最佳实践

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5
  - **Blocks**: None
  - **Blocked By**: Tasks 7-9

  **Acceptance Criteria**:
  - [ ] 文档包含翻译文件结构
  - [ ] 包含添加新翻译的步骤
  - [ ] 包含命名约定

  **QA Scenarios**:
  ```
  Scenario: Documentation verification
    Tool: Bash
    Steps:
      1. cat docs/i18n.md | head -20
    Expected Result: 文档存在且内容完整
  ```

  **Commit**: YES
  - Message: `docs(i18n): add i18n usage documentation`

---

## Final Verification Wave

> **4 review agents run in PARALLEL after ALL implementation tasks complete**
> **ALL must APPROVE. Rejection → fix → re-run.**

- [ ] F1. **Plan Compliance Audit** — `oracle`
  
  **What to verify**:
  - All "Must Have" items are implemented
  - All "Must NOT Have" items are absent
  - All TODOs have corresponding evidence files
  
  **QA Scenarios**:
  ```
  Scenario: Compliance check
    Tool: Bash
    Steps:
      1. ls -la messages/zh.json messages/en.json
      2. ls -la src/i18n/
      3. ls -la src/app/[locale]/
      4. grep -r "useTranslations" src/app/components/ | wc -l
    Expected Result: All critical files exist, >20 components use translations
    Output: Must Have [8/8] | Must NOT Have [5/5] | Tasks [29/29] | VERDICT
  ```
  **Evidence**: `.sisyphus/evidence/f1-compliance.txt`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  
  **What to verify**:
  - TypeScript compiles without errors
  - Next.js builds successfully
  - No console.log in production code (except allowed ones)
  
  **QA Scenarios**:
  ```
  Scenario: Build verification
    Tool: Bash
    Steps:
      1. npx tsc --noEmit
      2. yarn build 2>&1 | tail -20
    Expected Result: tsc 无错误，build 成功
    Output: Build [PASS] | TypeCheck [PASS] | Files [Clean] | VERDICT
  ```
  **Evidence**: `.sisyphus/evidence/f2-quality.txt`

- [ ] F3. **Full QA Test - Both Locales** — `unspecified-high` (with `playwright` skill)
  
  **What to verify**:
  - `/zh` loads Chinese UI
  - `/en` loads English UI
  - `/` redirects to `/zh` (default locale)
  - LanguageSwitcher works
  - Key user flows work in both languages
  
  **QA Scenarios**:
  ```
  Scenario: Locale routing E2E
    Tool: Playwright
    Steps:
      1. Navigate to http://localhost:3000/zh
      2. Screenshot and OCR verify Chinese text
      3. Click LanguageSwitcher, select English
      4. Verify URL is /en
      5. Screenshot and OCR verify English text
      6. Navigate to http://localhost:3000/
      7. Verify redirect to /zh
    Expected Result: All routes work, switching works
    Output: Routes [3/3] | Components [26/26] | Switching [PASS] | VERDICT
  ```
  **Evidence**: `.sisyphus/evidence/f3-locale-test.png`

- [ ] F4. **Scope Fidelity Check** — `deep`
  
  **What to verify**:
  - Each task in plan has corresponding implementation
  - No scope creep (extra features not in plan)
  - No missing features from plan
  
  **QA Scenarios**:
  ```
  Scenario: Fidelity check
    Tool: git diff --stat
    Steps:
      1. git diff --stat HEAD~10
      2. Compare with planned file changes
    Expected Result: All planned files changed, no unexpected files
    Output: Tasks [29/29 compliant] | Scope [CLEAN] | VERDICT
  ```
  **Evidence**: `.sisyphus/evidence/f4-fidelity.txt`

---

## Commit Strategy

**Wave 1**: `feat(i18n): setup next-intl infrastructure`
- Files: `src/i18n/*`, `src/proxy.ts`, `next.config.ts`, `package.json`, `yarn.lock`, `src/types/i18n.d.ts`
- Pre-commit: `yarn install && npx tsc --noEmit`

**Wave 2**: `feat(i18n): add translations and LanguageSwitcher`
- Files: `messages/zh.json`, `messages/en.json`, `src/components/LanguageSwitcher.tsx`, `src/app/[locale]/layout.tsx`

**Wave 3**: `feat(i18n): migrate page to locale route`
- Files: `src/app/[locale]/page.tsx`, `src/app/[locale]/layout.tsx` (updated)

**Wave 4**: `feat(i18n): localize all components`
- Files: `src/app/components/*.tsx`, `src/components/ui/*.tsx` (批量)

**Wave 5**: `feat(i18n): polish and documentation`
- Files: `docs/i18n.md`, cleanup files

---

## Success Criteria

### Verification Commands
```bash
# 1. 路由验证
curl -s http://localhost:3000/zh | grep -c "Databus Pilot" || echo "Chinese content found"
curl -s http://localhost:3000/en | grep -c "Databus Pilot"

# 2. 构建验证
yarn build

# 3. TypeScript 验证
npx tsc --noEmit

# 4. 翻译文件验证
ls -la messages/zh.json messages/en.json
jq 'keys' messages/zh.json
jq 'keys' messages/en.json

# 5. i18n 基础设施验证
ls -la src/i18n/
ls -la src/app/[locale]/
```

### Final Checklist
- [ ] `/zh` 路由显示中文界面
- [ ] `/en` 路由显示英文界面
- [ ] `/` 重定向到 `/zh`
- [ ] LanguageSwitcher 工作正常
- [ ] 所有组件使用翻译而非硬编码
- [ ] TypeScript 无错误
- [ ] Next.js 构建成功
- [ ] 文档已创建

---

## Next Steps

1. **Review this plan**: 确认所有任务和决策符合预期
2. **Run `/start-work`**: 开始执行计划
3. **Monitor progress**: 使用 Sisyphus 跟踪任务状态

**Plan saved to**: `.sisyphus/plans/nextjs-i18n-implementation.md`

