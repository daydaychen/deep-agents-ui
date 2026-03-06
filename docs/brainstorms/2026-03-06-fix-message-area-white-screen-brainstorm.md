---
date: 2026-03-06
topic: fix-message-area-white-screen
---

# 修复消息区域偶尔白屏的问题

## 现象
在消息流式输出过程中，对话区域有时会突然变白（空白），但输入框仍然存在。这通常发生在长对话、大量工具调用或包含复杂 Markdown/代码块的流式输出期间。

## 原因分析
1. **性能瓶颈**：流式更新频率过高（每 token 触发一次重绘），主线程阻塞导致渲染掉帧或挂起。
2. **算法复杂度**：`useProcessedMessages` 在每条消息更新时执行 $O(N \times M)$ 复杂度的查找。
3. **高开销组件**：`SyntaxHighlighter` 在流式过程中频繁销毁和重绘代码块，消耗大量 CPU。
4. **缺乏容错**：没有 `ErrorBoundary`，导致任何渲染层级的错误都会演变为全局白屏。

## 选定方案：方案 A + B (优化与加固)
通过“降低频率”、“优化算法”和“降级重度组件”来解决性能问题，同时增加“错误边界”作为最后的安全保障。

## 关键决策
- **[Decision 1] 渲染节流**：在 UI 层对 `messages` 的更新引入 100ms 的节流。
- **[Decision 2] 算法优化**：使用 `Map` 优化 `useProcessedMessages` 的工具调用匹配逻辑。
- **[Decision 3] Markdown 降级**：在流式输出期间，对代码块使用简单文本渲染，停止后再切换回 `SyntaxHighlighter`。
- **[Decision 4] 安全防护**：在 `ChatInterface` 消息列表外层添加 `ErrorBoundary`。

## 待解决问题
- [ ] 节流时间设定为 100ms 是否对用户体验有明显负面影响？（初步设定为 100ms，需验证）
- [ ] `MarkdownContent` 如何最优雅地感知“当前消息是否正在流式输出”？（可以通过 `stream.isLoading` 且消息 ID 匹配来判断）

## 下一步
→ 调用 `/workflows:plan` 开始具体实现。
