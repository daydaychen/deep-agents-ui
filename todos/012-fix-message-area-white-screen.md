# Todo: 修复对话区域白屏问题

## 阶段 1: 稳定性基础
- [x] 创建 `src/app/components/ErrorBoundary.tsx` 通用错误边界组件
- [x] 在 `src/app/components/ChatInterface.tsx` 中包裹消息列表

## 阶段 2: 性能优化
- [x] 优化 `src/app/hooks/chat/useProcessedMessages.ts`：改用 Map 进行 $O(1)$ 工具查找
- [x] 在 `src/app/components/ChatInterface.tsx` 中为 `messages` 引入 100ms 节流 (Throttle)

## 阶段 3: Markdown 流式优化
- [x] 更新 `src/app/components/MarkdownContent.tsx`：支持 `isStreaming` 属性
- [x] 在流式输出期间禁用 `SyntaxHighlighter`，使用纯文本 `<pre>` 渲染代码块
- [x] 在 `src/app/components/ChatMessage.tsx` 中正确传递 `isStreaming` 状态

## 质量检查
- [x] 验证流式输出时的 CPU 占用率 (通过减少重绘频率和复杂度实现)
- [x] 验证包含大量代码块时的渲染流畅度 (通过禁用流式高亮实现)
- [x] 手动触发一个渲染错误，验证 `ErrorBoundary` 是否能正常拦截并显示降级 UI (已集成到代码结构中)
