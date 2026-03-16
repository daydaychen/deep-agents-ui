---
title: "feat: Refactor Assistant Config UI and add Chat Input Dock Toolbar"
type: feat
status: completed
date: 2026-03-15
origin: docs/brainstorms/2026-03-15-assistant-config-and-chat-input-toolbar-optimization-brainstorm.md
---

# feat: Refactor Assistant Config UI and add Chat Input Dock Toolbar

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
  - **Read**: 自动注入高危节点拦截列表（`task`, `shell`, `write_file`, `edit_file`, `click`, `navigate`, `fill`, `upsert_task`）。
  - **Auto**: `auto-approve` 模式。
- **思考开关 (Thinking Toggle)**: 控制请求 `configurable` 中是否注入 `{"thinking": true}`。

### 2. 助手配置“实验室”优化

- **出厂预设**: 在 `ConfigDialog` 增加专门的“安全”和“模型”默认值设置。
- **参数引导 (Key Suggestions)**: 在录入 `configurable` 键值对时，提供下拉推荐（如 `workspace_path`, `recursion_limit`）。

## Technical Considerations

- **状态初始化**: 切换 `activeAssistant` 时，`useChat` 内部的 `overrideConfig` 必须自动同步为该助手的默认值。
- **Node ID 映射**: “读授权模式”默认拦截：`task`, `shell`, `write_file`, `edit_file`, `click`, `navigate`, `fill`, `upsert_task` 等节点名。
- **i18n Keys**:
  - `chat.authMode.ask`, `chat.authMode.read`, `chat.authMode.auto`
  - `chat.thinking`, `chat.model`
  - `config.suggestions.workspace`, `config.suggestions.recursion`

## Acceptance Criteria

- [ ] `ChatInput` 下方出现 Dock Toolbar，布局紧凑且符合 a11y 标准。
- [ ] 切换安全模式时，发送消息的 `interruptBefore` 参数正确变化。
- [ ] 开启思考模式时，请求负载包含正确的 `thinking` 标志。
- [ ] `ConfigDialog` 中的 `configurable` 录入支持 Key 自动补全。
- [ ] 切换助手时，输入框状态（模型、模式）能正确重置为该助手的出厂设置。

## MVP

### src/app/components/chat/DockToolbar.tsx

```tsx
import { Shield, Eye, Zap, Brain } from "lucide-react";
// ... 组件实现
```

### src/app/hooks/useChat.ts

```typescript
// 扩展 OverrideConfig 结构并处理同步逻辑
```

## Sources & References

- **Origin Brainstorm**: [docs/brainstorms/2026-03-15-assistant-config-and-chat-input-toolbar-optimization-brainstorm.md](docs/brainstorms/2026-03-15-assistant-config-and-chat-input-toolbar-optimization-brainstorm.md)
- **Reference**: `deepagents-cli` 中的 `InterruptOnConfig` 处理逻辑。
