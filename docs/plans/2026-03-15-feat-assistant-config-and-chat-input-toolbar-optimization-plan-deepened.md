---
title: "feat: Refactor Assistant Config UI and add Chat Input Dock Toolbar"
type: feat
status: completed
date: 2026-03-15
origin: docs/brainstorms/2026-03-15-assistant-config-and-chat-input-toolbar-optimization-brainstorm.md
---

# feat: Refactor Assistant Config UI and add Chat Input Dock Toolbar (Deepened)

## Enhancement Summary
**Deepened on:** 2026-03-15
**Sections enhanced:** 4 (UI/UX, Security, Technical Approach, Performance)
**Research agents used:** UI-UX Pro, Security Sentinel, Repo Analyst, Framework Researcher

### Key Improvements
1.  **Semantic Auth Modes**: Mapped 🛡️ (Ask), 👁️ (Read), and ⚡ (Auto) to concrete `interruptBefore` node lists for LangGraph SDK.
2.  **Thinking Indicator Strategy**: Defined the specific Emerald 400 (#34d399) color and pulse animation logic, linked to the `thinking` configurable flag.
3.  **State Synchronization**: Established a clear hierarchy for `overrideConfig` initialization when switching assistants.
4.  **Performance Safeguards**: Incorporated 100ms render throttling to prevent UI stuttering during high-frequency "Thinking" updates.

---

## Overview
本项目旨在优化助手的配置体验，将高频的运行时配置（模型、安全模式、思考模式）从深层的 JSON/表单中提取到聊天输入框下方的“底座工具栏（Dock Toolbar）”，同时简化助手设置中的复杂参数录入。

## Problem Statement / Motivation
1.  **高频操作不便**：用户想要临时切换模型或开启“思考模式”时，需要打开弹窗并寻找对应的 JSON Key。
2.  **安全感缺失**：LangGraph 的中断机制（HITL）对用户是黑盒，缺乏直观的操作模式（Ask/Read/Auto）。
3.  **配置门槛高**：`configurable` 的键值对表单没有任何引导，用户不知道有哪些 Key 可选。

## Proposed Solution

### 1. 聊天输入框“底座工具栏” (Dock Toolbar)
在 `ChatInput.tsx` 的输入框容器内部（Textarea 下方）增加一个紧凑的工具栏，包含：
- **模型切换 (Model Switcher)**: 临时覆盖当前会话的模型（不修改助手原对象）。
- **安全模式 (Auth Mode)**: 🛡️ (Ask), 👁️ (Read), ⚡ (Auto) 三档。
    - **Ask**: 拦截所有步骤 (`*`)。
    - **Read**: 自动注入高危节点拦截列表（详见技术考虑）。
    - **Auto**: `auto-approve` 模式，无拦截。
- **思考开关 (Thinking Toggle)**: 控制请求 `configurable` 中是否注入 `{"thinking": true}`。

### Research Insights (UI/UX)
**Best Practices:**
- **Compact Layout**: 使用水平 Flex 容器，图标间距 `gap-2`，确保在移动端不拥挤。
- **Accessibility**: 每个图标按钮必须包含 `Tooltip` 和 `aria-label`。使用 `Lucide-React` 的 `Shield`, `Brain`, `Sparkles` 图标。
- **Thinking Feedback**: 使用 `#34d399` (Emerald 400) 色的微型脉冲动画，仅在 `isLoading` 且开启 `thinking` 覆盖时显示。

### 2. 助手配置“实验室”优化
- **出厂预设**: 在 `ConfigDialog` 增加专门的“安全”和“模型”默认值设置。
- **参数引导 (Key Suggestions)**: 在录入 `configurable` 键值对时，提供下拉推荐（如 `workspace_path`, `recursion_limit`）。

---

## Technical Considerations

### State Management & Synchronization
- **Override Store**: 在 `chat-context.ts` 中扩展 `OverrideConfig` 类型以包含 `thinking` 和 `authMode`。
- **Reset Logic**: 切换 `activeAssistant` 时，必须调用重置函数，将 `overrideConfig` 同步为新助手的默认 `metadata` 或 `configurable` 设置。

### Node ID Mapping & SDK Integration
- **Read Mode Nodes**: 拦截列表应包含：`task`, `shell`, `write_file`, `edit_file`, `delete_file`, `click`, `navigate`, `fill`, `upsert_task`, `run_shell_command`。
- **SDK Options**: 调用 `submit()` 或 `stream()` 时，需设置 `streamSubgraphs: true` 以确保拦截逻辑在子图中生效。

### Research Insights (Performance)
- **Render Throttling**: 延续 `ChatInterface.tsx` 中的 100ms 渲染节流，防止“思考中”状态的高频更新导致 UI 卡顿。
- **Resumability**: 默认开启 `streamResumable: true`，防止在网络波动时后端任务被意外取消。

---

## Acceptance Criteria
- [ ] `ChatInput` 下方出现 Dock Toolbar，布局紧凑且符合 a11y 标准。
- [ ] 切换安全模式时，发送消息的 `interruptBefore` 参数根据模式（Ask/Read/Auto）正确注入。
- [ ] 开启思考模式时，请求的 `configurable` 负载包含 `thinking: true`。
- [ ] 切换助手时，底座工具栏的模型和模式状态重置为助手的默认值。
- [ ] 思考指示器颜色为 `#34d399`，且带有平滑的脉冲动画。

## MVP Implementation Details

### `src/providers/chat-context.ts` (Type Extension)
```typescript
export type OverrideConfig = {
  model?: string;
  thinking?: boolean;
  authMode?: "ask" | "read" | "auto";
  // ... existing fields
};
```

### `src/app/hooks/useChat.ts` (Auth Logic)
```typescript
const READ_MODE_NODES = ["task", "shell", "write_file", "edit_file", "click", "navigate", "fill", "upsert_task"];

const finalInterruptBefore = overrideConfig.interruptBefore || (
  overrideConfig.authMode === "ask" ? ["*"] :
  overrideConfig.authMode === "read" ? READ_MODE_NODES : 
  undefined
);
```

## Sources & References
- **Origin Brainstorm**: [docs/brainstorms/2026-03-15-assistant-config-and-chat-input-toolbar-optimization-brainstorm.md](docs/brainstorms/2026-03-15-assistant-config-and-chat-input-toolbar-optimization-brainstorm.md)
- **Local Learning**: [docs/solutions/performance-issues/optimizing-chat-streaming-performance-and-stability.md](docs/solutions/performance-issues/optimizing-chat-streaming-performance-and-stability.md)
- **Reference**: `deepagents-cli` 中的 `auto-approve` (`Ctrl+T`) 交互模式。
