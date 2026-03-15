---
status: pending
priority: p2
issue_id: "006"
tags: [agent-native, tools, parity]
dependencies: []
---

# P2: 新增 UI 控制功能缺乏 Agent-Native Parity

## Problem Statement

新增的 DockToolbar UI 控制功能（Auth Mode、Thinking Toggle、Model Switcher）主要面向手动 UI 交互，**缺乏对应的 agent 工具或系统提示支持**。这违反了 agent-native 架构的核心原则："用户通过 UI 可执行的操作，agent 也应能通过工具/系统提示执行"。

## Findings

**来源:** agent-native-reviewer 审查报告

### High Severity 问题

#### 1. Auth Mode 缺乏 Agent 控制能力
**文件位置:** `DockToolbar.tsx` 第 29-36 行，`useChat.ts` 第 118-124 行

**UI 功能:**
```typescript
// 用户可通过 UI 切换 Auth Mode
const handleAuthModeChange = (mode: OverrideConfig["authMode"]) => {
  setOverrideConfig((prev) => ({ ...prev, authMode: mode }));
};
```

**Agent Parity 缺口:**
- ❌ Agent 无法通过工具或系统提示设置 Auth Mode
- ❌ Agent 无法动态调整 `interruptBefore` 行为
- ❌ 系统提示中未包含 Auth Mode 的语义说明

#### 2. Thinking Toggle 缺乏 Agent 控制
**文件位置:** `DockToolbar.tsx` 第 33、38-40 行

**UI 功能:**
```typescript
const toggleThinking = () => {
  setOverrideConfig((prev) => ({ ...prev, thinking: !prev.thinking }));
};
```

**Agent Parity 缺口:**
- ❌ Agent 无法自主启用/禁用思考模式
- ❌ `thinking` 参数仅通过 UI 状态传递，未暴露为 agent 工具
- ❌ 系统提示未说明 thinking 参数的作用

#### 3. Model Switcher 缺乏 Agent 程序化选择能力
**文件位置:** `DockToolbar.tsx` 第 48-56 行

**UI 功能:**
```typescript
// Model Switcher (当前为占位符)
<Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
  <Sparkles className="h-4 w-4" />
  <span className="sr-only">{t("model")}</span>
</Button>
```

**Agent Parity 缺口:**
- ❌ Model Switcher 当前为占位符，功能未实现
- ❌ 即使 UI 实现，agent 也无法通过工具选择模型
- ❌ 不同子 agent 的模型配置无法由 agent 自主调整

#### 4. interruptBefore/interruptAfter 配置缺乏 Agent 访问
**文件位置:** `useChat.ts` 第 241-268 行

**Agent Parity 缺口:**
- ❌ Agent 无法动态添加/移除中断点
- ❌ Agent 无法在运行时调整审批流程
- ❌ `READ_MODE_NODES` 列表硬编码在 hook 中，agent 无法访问或修改

## Proposed Solutions

### 方案 A: 创建 Agent 工具集（推荐）

**实现:**

```typescript
// /Users/chentt/Github/deep-agents-ui/src/tools/runtime_config.ts (新建文件)

import { useClient } from "@/providers/client-context";
import { OverrideConfig } from "@/providers/chat-context";

/**
 * Agent 工具：设置认证模式
 */
export async function setAuthMode(mode: "ask" | "read" | "auto") {
  const client = useClient();
  const threadId = getCurrentThreadId();
  
  await client.threads.updateState(threadId, {
    values: { 
      configurable: { authMode: mode },
      interruptBefore: getInterruptBeforeForMode(mode)
    }
  });
  
  return { 
    success: true, 
    mode,
    description: getModeDescription(mode)
  };
}

/**
 * Agent 工具：切换思考模式
 */
export async function setThinkingMode(enabled: boolean) {
  const client = useClient();
  const threadId = getCurrentThreadId();
  
  await client.threads.updateState(threadId, {
    values: { 
      configurable: { thinking: enabled }
    }
  });
  
  return { 
    success: true, 
    thinking: enabled,
    description: enabled 
      ? "思考模式已启用 - 深度推理，消耗更多 token" 
      : "思考模式已关闭 - 快速响应，节省资源"
  };
}

/**
 * Agent 工具：配置中断点
 */
export async function configureInterrupts(config: {
  interruptBefore?: string[];
  interruptAfter?: string[];
}) {
  const VALID_NODES = [
    "task", "shell", "write_file", "edit_file", "delete_file",
    "click", "navigate", "fill", "upsert_task", "run_shell_command",
    "*"
  ];
  
  const invalidNodes = [
    ...(config.interruptBefore || []),
    ...(config.interruptAfter || [])
  ].filter(node => !VALID_NODES.includes(node));
  
  if (invalidNodes.length > 0) {
    throw new Error(`Invalid node names: ${invalidNodes.join(", ")}`);
  }
  
  return { 
    success: true, 
    ...config,
    description: `中断点已配置：${config.interruptBefore?.length || 0} 个 before, ${config.interruptAfter?.length || 0} 个 after`
  };
}

/**
 * Agent 工具：设置模型配置
 */
export async function setModelConfig(
  agentType: "model" | "small_model" | "analyst" | "config_validator" | "databus_specialist",
  config: { model?: string; temperature?: number; max_tokens?: number }
) {
  return { 
    success: true, 
    agentType, 
    config,
    description: `${agentType} 模型配置已更新`
  };
}

// 辅助函数
function getInterruptBeforeForMode(mode: "ask" | "read" | "auto"): string[] | undefined {
  const READ_MODE_NODES = [
    "task", "shell", "write_file", "edit_file", "delete_file",
    "click", "navigate", "fill", "upsert_task", "run_shell_command"
  ];
  
  if (mode === "ask") return ["*"];
  if (mode === "read") return READ_MODE_NODES;
  return undefined;
}

function getModeDescription(mode: "ask" | "read" | "auto"): string {
  const descriptions = {
    ask: "Ask Mode - 所有操作需审批（最安全）",
    read: "Read Mode - 仅高危操作需审批（平衡）",
    auto: "Auto Mode - 自动执行所有操作（最快，谨慎使用）"
  };
  return descriptions[mode];
}
```

**Pros:**
- 实现 agent-native parity
- 提供完整的运行时配置能力
- 符合项目架构原则

**Cons:**
- 需要创建新工具文件
- 需要更新系统提示

**Effort:** Medium (3-4 小时)

**Risk:** 低

---

### 方案 B: 增强系统提示（配合方案 A）

**实现:**

```markdown
<!-- /Users/chentt/Github/deep-agents-ui/src/lib/system-prompt.md (新建) -->

# Agent Configuration Capabilities

你可以建议用户通过以下方式调整运行时配置：

## 1. 认证模式 (Auth Mode)
- **Ask**: 所有操作需审批（最安全）
- **Read**: 仅高危操作需审批（平衡）
- **Auto**: 自动执行（最快，谨慎使用）

使用工具：`set_auth_mode(mode: "ask" | "read" | "auto")`

## 2. 思考模式 (Thinking)
- **开启**: 深度推理，消耗更多 token
- **关闭**: 快速响应，节省资源

使用工具：`set_thinking_mode(enabled: boolean)`

## 3. 模型选择
- **主模型**: 通用任务
- **小模型**: 简单查询
- **分析师模型**: 复杂分析
- **验证器模型**: 代码审查

使用工具：`set_model_config(agentType, config)`

## 4. 递归限制
- 默认：{{recursionLimit}} × {{recursionMultiplier}}
- 可根据任务复杂度建议调整

使用工具：`adjust_recursion_limit(limit, multiplier)`
```

**Pros:**
- Agent 知道可用的配置选项
- 可以主动建议使用

**Cons:**
- 需要维护系统提示文档

**Effort:** Small (1 小时)

**Risk:** 低

---

## Recommended Action

**推荐方案 A + B 组合** - 创建完整的 Agent 工具集并更新系统提示。

**实施步骤:**
1. 创建 `src/tools/runtime_config.ts`
2. 注册工具到 agent 系统
3. 创建系统提示文档
4. 测试工具调用
5. 更新国际化文本

---

## Acceptance Criteria

- [ ] 创建 `set_auth_mode` 工具
- [ ] 创建 `set_thinking_mode` 工具
- [ ] 创建 `configure_interrupts` 工具
- [ ] 创建 `set_model_config` 工具
- [ ] 导出 `READ_MODE_NODES` 常量供 agent 使用
- [ ] 创建系统提示文档
- [ ] 测试所有工具调用
- [ ] 更新 i18n 文本添加 agent 说明

---

## Technical Details

**Affected Files:**
- `/Users/chentt/Github/deep-agents-ui/src/tools/runtime_config.ts` (新建)
- `/Users/chentt/Github/deep-agents-ui/src/lib/system-prompt.md` (新建)
- `/Users/chentt/Github/deep-agents-ui/src/lib/constants.ts` (扩展现有)

**Related Components:**
- `DockToolbar.tsx` - UI 控制
- `useChat.ts` - 配置逻辑

---

## Work Log

### 2026-03-15 - 初始发现

**By:** agent-native-reviewer agent

**Actions:**
- 审查新增 UI 功能的 agent 可访问性
- 发现 4 个 High Severity agent parity 缺口
- 生成详细的 agent-native 审查报告

**Learnings:**
- UI 功能设计时未考虑 agent 访问
- 需要创建对应工具实现 parity

---

## Resources

- Agent-Native 审查报告：agent-native-reviewer 审查结果
- Agent-Native 架构原则：compound-engineering 文档
- LangGraph SDK 文档：https://langchain-ai.github.io/langgraphjs/
