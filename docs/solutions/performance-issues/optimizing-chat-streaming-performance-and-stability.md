---
title: "Optimizing Chat Streaming Performance and Stability"
category: performance-issues
status: completed
date: 2026-03-06
tags: [performance, react, streaming, throttling, stability]
related_issues: ["docs/plans/2026-03-06-fix-message-area-white-screen-plan.md"]
---

# Optimizing Chat Streaming Performance and Stability

## Problem Symptom
During token streaming from the LangGraph SDK, the chat interface intermittently experiences a "white screen" (complete UI crash) or significant UI freezing/stuttering. This is particularly noticeable with long messages or high-frequency token updates.

## Investigation Steps
1. **Profiling Render Frequency**: Observed that the `messages` state in `ChatProvider` triggers a full re-render of `ChatInterface` multiple times per second during streaming.
2. **Algorithm Analysis**: Identified that `useProcessedMessages` was using a nested loop to match tool calls with their results, resulting in $O(N \times M)$ complexity where $N$ is the number of messages and $M$ is the number of tool results.
3. **Component Bottlenecks**: `MarkdownContent` was re-rendering `SyntaxHighlighter` on every token update for code blocks, which is a CPU-intensive operation.
4. **Stability Check**: Lack of localized error boundaries meant that any single message rendering failure crashed the entire component tree.

## Root Cause Analysis
The combination of high-frequency React re-renders, expensive $O(N \times M)$ processing in the UI thread, and resource-heavy components being triggered repeatedly caused the main thread to choke. This pressure eventually led to React crashing or the UI becoming unresponsive, resulting in the "white screen" effect.

## Working Solution

### 1. Render Throttling
Implemented a `useThrottledValue` hook to limit UI updates of the `messages` array to once every 100ms during active loading.

```tsx
// src/app/components/ChatInterface.tsx
const throttledMessages = useThrottledValue(messages, isLoading ? 100 : 0);
const processedMessages = useProcessedMessages(throttledMessages, subagentMessagesMap, interrupt);
```

### 2. Algorithm Optimization
Refactored `useProcessedMessages` to use a `Map` for tool call lookups, reducing the matching logic to $O(N)$.

```typescript
// src/app/hooks/chat/useProcessedMessages.ts
const toolCallLookup = new Map<string, ToolCall>();
// ... iterate through messages once, using the map for tool/result matching
```

### 3. Stabilizing UI with Granular Error Boundaries
Wrapped individual `ChatMessage` components in a custom `ErrorBoundary` to isolate potential crashes.

```tsx
// src/app/components/ChatInterface.tsx
{processedMessages.map((data, index) => (
  <div key={data.message.id}>
    <ErrorBoundary className="mb-4">
      <ChatMessage ... />
    </ErrorBoundary>
  </div>
))}
```

### 4. Progressive Markdown Rendering
Modified `MarkdownContent` to bypass `SyntaxHighlighter` while a message is streaming, using a simple `<pre><code>` block instead.

```tsx
// src/app/components/MarkdownContent.tsx
{mounted && !isStreaming ? (
  <SyntaxHighlighter ...>{codeString}</SyntaxHighlighter>
) : (
  <pre className="p-4 text-xs overflow-auto font-mono whitespace-pre-wrap break-all">
    <code>{codeString}</code>
  </pre>
)}
```

## Prevention Strategies
1. **Always Throttle Streaming UI**: Never update the main chat list at the same frequency as the raw SDK stream. A 50-100ms throttle is usually imperceptible to users but massive for performance.
2. **Complexity Awareness**: Keep processing in `useMemo` hooks and ensure algorithms remain $O(N)$ when dealing with message arrays that grow over time.
3. **Lazy/Progressive Heavy Components**: Defer heavy rendering (like syntax highlighting or complex Mermaid diagrams) until the streaming state is complete.
4. **Isolate Failures**: Use localized ErrorBoundaries for any component rendering dynamic or external content.

## Cross-References
- [docs/plans/2026-03-06-fix-message-area-white-screen-plan.md](../../plans/2026-03-06-fix-message-area-white-screen-plan.md)
- `src/app/hooks/useThrottledValue.ts`
- `src/app/components/ErrorBoundary.tsx`
