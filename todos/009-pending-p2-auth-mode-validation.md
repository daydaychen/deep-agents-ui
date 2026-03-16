---
status: pending
priority: p2
issue_id: "009"
tags: [architecture, auth-mode, validation]
dependencies: []
---

# P2: authMode 到 interruptBefore 的映射缺少验证层

## Problem Statement

`useChat.ts` 中 `getInterruptBefore` 函数没有处理 `mode` 为 `undefined` 或非法值的情况，违反防御性编程原则。如果 `overrideConfig.authMode` 为 `undefined`，函数返回 `undefined`，但调用处期望明确的行为。

## Findings

**来源:** architecture-strategist 审查报告

**文件位置:** `/Users/chentt/Github/deep-agents-ui/src/app/hooks/useChat.ts` 第 97-103 行

**问题代码:**

```typescript
const getInterruptBefore = useCallback(
  (mode: OverrideConfig["authMode"]) => {
    if (mode === "ask") return ["*"];
    if (mode === "read") return READ_MODE_NODES;
    return undefined; // ❌ 未处理 undefined 或非法值
  },
  [READ_MODE_NODES]
);
```

**问题分析:**

1. **未处理 undefined**: 如果 `mode` 为 `undefined`，返回 `undefined`，行为不明确
2. **未处理非法值**: TypeScript 类型系统允许 `undefined` 传入，但逻辑假设总是有值
3. **缺少默认行为**: 未知模式应降级为最安全的 Ask 模式

## Proposed Solutions

### 方案 A: 添加防御性验证（推荐）

**实现:**

```typescript
const getInterruptBefore = useCallback(
  (mode: OverrideConfig["authMode"] = "ask"): string[] | undefined => {
    switch (mode) {
      case "ask":
        return ["*"];
      case "read":
        return READ_MODE_NODES;
      case "auto":
        return undefined;
      default:
        // 防御性：未知模式降级为最安全的 Ask 模式
        console.warn(`Unknown auth mode: ${mode}, defaulting to "ask"`);
        return ["*"];
    }
  },
  [READ_MODE_NODES]
);
```

**Pros:**

- 处理所有可能情况
- 未知模式降级为安全默认值
- 使用 `switch` 更清晰
- 添加警告日志便于调试

**Cons:**

- 需要修改函数签名
- 添加默认参数可能掩盖上游问题

**Effort:** Small (30 分钟)

**Risk:** 低

---

### 方案 B: 提取为独立工具函数

**实现:**

```typescript
// src/lib/auth-mode.ts (新建)
import { READ_MODE_NODES } from "./constants";

export type AuthMode = "ask" | "read" | "auto";

export function getInterruptBefore(
  mode: AuthMode = "ask"
): string[] | undefined {
  switch (mode) {
    case "ask":
      return ["*"];
    case "read":
      return READ_MODE_NODES;
    case "auto":
      return undefined;
    default:
      console.warn(`Unknown auth mode: ${mode}, defaulting to "ask"`);
      return ["*"];
  }
}

export function isValidAuthMode(mode: unknown): mode is AuthMode {
  return mode === "ask" || mode === "read" || mode === "auto";
}

// useChat.ts 中使用
import { getInterruptBefore, isValidAuthMode } from "@/lib/auth-mode";

const finalInterruptBefore =
  overrideConfig.interruptBefore || getInterruptBefore(overrideConfig.authMode);
```

**Pros:**

- 逻辑集中，易维护
- 可复用
- 可独立测试
- 导出类型供其他地方使用

**Cons:**

- 需要创建新文件
- 增加导入

**Effort:** Medium (1 小时)

**Risk:** 低

---

### 方案 C: 添加运行时类型守卫

**实现:**

```typescript
const getInterruptBefore = useCallback(
  (mode: OverrideConfig["authMode"]) => {
    // 运行时类型守卫
    if (!mode || !["ask", "read", "auto"].includes(mode)) {
      console.warn(`Invalid auth mode: ${mode}, defaulting to "ask"`);
      return ["*"];
    }

    if (mode === "ask") return ["*"];
    if (mode === "read") return READ_MODE_NODES;
    return undefined;
  },
  [READ_MODE_NODES]
);
```

**Pros:**

- 运行时验证
- 捕获类型系统无法捕获的错误

**Cons:**

- 增加运行时开销
- 代码稍显冗长

**Effort:** Small (20 分钟)

**Risk:** 低

---

## Recommended Action

**推荐方案 B** - 提取为独立工具函数。这是最符合架构最佳实践的修复方式。

**实施步骤:**

1. 创建 `src/lib/auth-mode.ts`
2. 导出 `AuthMode` 类型、`getInterruptBefore` 函数
3. 在 `useChat.ts` 中使用新函数
4. 添加测试用例

---

## Acceptance Criteria

- [ ] 创建 `src/lib/auth-mode.ts`
- [ ] 导出 `AuthMode` 类型
- [ ] 导出 `getInterruptBefore` 函数，处理所有情况
- [ ] 导出 `isValidAuthMode` 类型守卫
- [ ] 在 `useChat.ts` 中使用新函数
- [ ] 添加测试用例验证所有模式
- [ ] 测试非法值降级为 "ask"

---

## Technical Details

**Affected Files:**

- `/Users/chentt/Github/deep-agents-ui/src/app/hooks/useChat.ts`
- `/Users/chentt/Github/deep-agents-ui/src/lib/auth-mode.ts` (新建)

**Related Components:**

- `DockToolbar.tsx` - authMode UI 控制

---

## Work Log

### 2026-03-15 - 初始发现

**By:** architecture-strategist agent

**Actions:**

- 审查 authMode 到 interruptBefore 的映射逻辑
- 发现缺少验证层
- 生成架构审查报告

**Learnings:**

- 外部输入应始终验证
- 未知值应降级为安全默认值

---

## Resources

- 架构审查报告：architecture-strategist 审查结果
- TypeScript 类型守卫文档：https://www.typescriptlang.org/docs/handbook/2/narrowing.html
