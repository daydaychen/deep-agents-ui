---
status: pending
priority: p2
issue_id: "007"
tags: [architecture, state-management, race-condition]
dependencies: []
---

# P2: OverrideConfig 状态同步逻辑存在竞态条件

## Problem Statement

当用户切换助手时，`useChat.ts` 中的 `useEffect` 同步逻辑会保留用户的运行时覆盖配置（如临时开启的 thinking 模式），导致新助手继承了旧助手的配置。这违反了计划文档的要求："切换助手时，底座工具栏的模型和模式状态重置为助手的默认值"。

## Findings

**来源:** architecture-strategist 审查报告

**文件位置:** `/Users/chentt/Github/deep-agents-ui/src/app/hooks/useChat.ts` 第 84-95 行

**问题代码:**
```typescript
useEffect(() => {
  if (activeAssistant) {
    const assistantConfig = activeAssistant.config?.configurable || {};
    const assistantMetadata = activeAssistant.metadata || {};

    setOverrideConfig((prev) => ({
      ...prev,  // ❌ 问题：保留所有之前的覆盖配置
      thinking: assistantConfig.thinking ?? assistantMetadata.thinking ?? false,
      authMode: assistantMetadata.authMode || "ask",
      // Keep existing model overrides if any
    }));
  }
}, [activeAssistant]);
```

**问题场景:**
1. 用户在助手 A 中开启了 `thinking: true`
2. 用户切换到助手 B（默认 `thinking: false`）
3. 由于 `...prev` 展开，助手 B 继承了 `thinking: true`

**违反的原则:**
- **状态一致性原则**: 切换助手时应完全重置为新助手的默认配置
- **计划文档规范**: 计划文件明确要求重置为默认值

## Proposed Solutions

### 方案 A: 显式重置所有字段（推荐）

**实现:**
```typescript
useEffect(() => {
  if (activeAssistant) {
    const assistantConfig = activeAssistant.config?.configurable || {};
    const assistantMetadata = activeAssistant.metadata || {};

    setOverrideConfig({
      // 仅保留 LLM 覆盖配置（模型相关）
      model: undefined,
      small_model: undefined,
      analyst: undefined,
      config_validator: undefined,
      databus_specialist: undefined,
      // 从助手默认值初始化
      thinking: assistantConfig.thinking ?? assistantMetadata.thinking ?? false,
      authMode: assistantMetadata.authMode || "ask",
      recursionLimit: undefined,
      interruptBefore: undefined,
      interruptAfter: undefined,
    });
  }
}, [activeAssistant]);
```

**Pros:**
- 明确重置所有字段
- 符合计划文档要求
- 避免状态污染

**Cons:**
- 需要手动列出所有字段
- 如果 OverrideConfig 增加新字段，需要更新此处

**Effort:** Small (30 分钟)

**Risk:** 低

---

### 方案 B: 使用助手默认值作为基础

**实现:**
```typescript
useEffect(() => {
  if (activeAssistant) {
    const assistantConfig = activeAssistant.config?.configurable || {};
    const assistantMetadata = activeAssistant.metadata || {};

    // 从助手默认值构建新的 overrideConfig
    const newOverrideConfig: OverrideConfig = {
      thinking: assistantConfig.thinking ?? assistantMetadata.thinking ?? false,
      authMode: assistantMetadata.authMode || "ask",
    };

    // 可选：保留用户的模型偏好（如果这是期望行为）
    // 或者完全重置：
    // const newOverrideConfig: OverrideConfig = { ... };

    setOverrideConfig(newOverrideConfig);
  }
}, [activeAssistant]);
```

**Pros:**
- 更简洁
- 只设置需要的字段

**Cons:**
- 未显式设置的字段会丢失
- TypeScript 可能报错缺少字段

**Effort:** Small (20 分钟)

**Risk:** 低

---

### 方案 C: 添加配置重置函数

**实现:**
```typescript
// 在 chat-context.ts 中
const resetOverrideConfig = useCallback((assistant: Assistant) => {
  const assistantConfig = assistant.config?.configurable || {};
  const assistantMetadata = assistant.metadata || {};

  return {
    model: undefined,
    small_model: undefined,
    analyst: undefined,
    config_validator: undefined,
    databus_specialist: undefined,
    thinking: assistantConfig.thinking ?? assistantMetadata.thinking ?? false,
    authMode: assistantMetadata.authMode || "ask",
    recursionLimit: undefined,
    interruptBefore: undefined,
    interruptAfter: undefined,
  };
}, []);

// 在 useChat.ts 中使用
useEffect(() => {
  if (activeAssistant) {
    setOverrideConfig(resetOverrideConfig(activeAssistant));
  }
}, [activeAssistant, resetOverrideConfig]);
```

**Pros:**
- 逻辑集中，易维护
- 可复用
- 易测试

**Cons:**
- 需要重构代码
- 增加新的 hook 函数

**Effort:** Medium (1 小时)

**Risk:** 低

---

## Recommended Action

**推荐方案 A** - 显式重置所有字段。这是最简单且直接的修复方式。

**实施步骤:**
1. 修改 `useChat.ts` 中的 `useEffect`
2. 显式设置所有 OverrideConfig 字段
3. 测试切换助手时配置正确重置
4. 添加注释说明行为

---

## Acceptance Criteria

- [ ] 修改状态同步逻辑，显式重置所有字段
- [ ] 测试场景 1：助手 A (thinking: true) → 助手 B (thinking: false)，验证助手 B 为 false
- [ ] 测试场景 2：助手 A (authMode: auto) → 助手 B (authMode: ask)，验证助手 B 为 ask
- [ ] 添加注释说明重置行为
- [ ] 更新计划文档的验收状态

---

## Technical Details

**Affected Files:**
- `/Users/chentt/Github/deep-agents-ui/src/app/hooks/useChat.ts`

**Related Components:**
- `chat-context.ts` - OverrideConfig 类型定义
- `DockToolbar.tsx` - 显示配置状态

---

## Work Log

### 2026-03-15 - 初始发现

**By:** architecture-strategist agent

**Actions:**
- 审查状态同步逻辑
- 发现竞态条件问题
- 生成架构审查报告

**Learnings:**
- 使用 `...prev` 展开可能导致状态污染
- 切换上下文时应显式重置所有字段

---

## Resources

- 架构审查报告：architecture-strategist 审查结果
- 计划文件：`docs/plans/2026-03-15-feat-assistant-config-and-chat-input-toolbar-optimization-plan-deepened.md`
