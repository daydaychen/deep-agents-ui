---
date: 2026-03-15
topic: assistant-config-and-chat-input-toolbar-optimization
---

# 助手配置与聊天输入框工具栏优化方案

## 1. 核心目标 (What We're Building)
通过将“高频临时配置”移至聊天输入框工具栏（底座模式），并将“低频持久配置”移至助手配置表单，实现配置灵活性与用户体验的平衡。借鉴 Coding Agents (Claude Code/Gemini CLI) 的设计，引入语义化的安全授权模式。

## 2. 设计架构 (Architecture)

### 2.1 聊天输入框：驾驶舱 (The Cockpit)
借鉴 `deepagents-cli` 的设计，在 `ChatInput.tsx` 的底部增加一个紧凑的“底座工具栏 (Dock Toolbar)”：

*   **状态初始化与重置**: 切换助手时，底座工具栏会自动同步助手的“出厂预设”；在当前 Thread 内的切换仅为“临时覆盖”，不影响助手对象的持久配置。
*   **授权模式快速切换 (对应 CLI 的 Ctrl+T)**:
    *   **🛡️ 严格 (Ask)**: 拦截所有步骤。
    *   **👁️ 生产 (Read-authorized)**: 拦截写文件、执行 Shell、调用子任务等高危节点。
    *   **⚡ 快速 (Auto)**: `auto-approve` 模式，不拦截。
*   **思考指示器 (Thinking Indicator)**: 当 `stream_mode` 进入逻辑处理阶段时，在输入框上方显示 `#34d399` 色的微型呼吸灯动画。

### 2.2 助手配置：实验室 (The Lab)
*   **出厂安全预设**: 允许为该助手预设默认的 `interrupt_on` 级别。
*   **常用参数补全 (Key Suggestions)**: 在录入 `configurable` 时提供常用 Key（如 `workspace_path`）的下拉补全，替代手敲。

## 3. 关键决策 (Key Decisions)

*   **[决策 1]：双流处理策略**: 前端应同时处理 `messages` 和 `updates` 流。`updates` 用于精准捕获中断状态并触发 UI 的“确认/拒绝”弹窗。
*   **[决策 2]：工具安全等级**: 默认将 `shell`, `write_file`, `edit_file`, `task` 标记为高危节点。
*   **[决策 3]：视觉一致性**: 延续 `deepagents-cli` 的色彩语言（如思考状态的绿色）。

## 4. 待解决问题 (Open Questions)

*   **节点名称映射**: `interruptBefore` 需要的是 Graph 内部的节点 ID。我们需要确保前端能通过 SDK 获取到这些节点名，或者建立一套从工具名到节点名的可靠映射。
*   **多工具联动**: 如果一个节点同时调用了读和写工具，如何处理？(建议默认从严处理，即视为写节点)。

## 5. 后续步骤 (Next Steps)
→ `/ce:plan` 开始实施 `ChatInput` 工具栏组件和 `ConfigDialog` 的预定义引导功能。
