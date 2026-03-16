---
title: "fix: message area white screen during streaming"
type: fix
status: completed
date: 2026-03-06
origin: docs/brainstorms/2026-03-06-fix-message-area-white-screen-brainstorm.md
---

# fix: message area white screen during streaming

## Overview

This plan addresses the intermittent "white screen" issue occurring during message streaming in the chat interface. The problem is rooted in high-frequency React re-renders, expensive $O(N \times M)$ algorithms, and resource-heavy components like `SyntaxHighlighter` being triggered on every token update.

## Problem Statement / Motivation

When the LangGraph SDK streams tokens, the `messages` array updates rapidly. Without throttling, this causes the entire message list to re-render several times per second. This pressure, combined with expensive processing in `useProcessedMessages` and complex Markdown rendering, can freeze the UI thread or cause React to crash. Since there is no `ErrorBoundary`, any crash leads to a complete white screen.

## Proposed Solution

A multi-layered approach combining stability (ErrorBoundary), performance (Throttling & Algorithm optimization), and progressive enhancement (Markdown degradation during streaming).

## Technical Considerations

- **React Stability**: `ErrorBoundary` will catch crashes in individual message components, preventing a total UI failure.
- **Processing Efficiency**: `useProcessedMessages` will be optimized to $O(N)$ using a pre-computed `Map`.
- **Render Pressure**: `messages` updates will be throttled to 100ms in the UI layer.
- **Markdown Overhead**: `MarkdownContent` will bypass `SyntaxHighlighter` while a message is still "active" (streaming).

## System-Wide Impact

- **Interaction graph**: `ChatInterface` -> `useProcessedMessages` -> `ChatMessage` -> `MarkdownContent`. Throttling at the top level ripples down to all children.
- **Error propagation**: Errors in `ChatMessage` or `MarkdownContent` will be caught by the new `ErrorBoundary`, displaying a localized error message instead of blanking the screen.
- **State lifecycle risks**: Throttling might introduce a 100ms lag in seeing the very latest token, which is acceptable for performance gains.

## Acceptance Criteria

- [x] UI remains responsive during long, complex message streaming (e.g., streaming 500+ lines of code).
- [x] No "white screen" observed during streaming sessions.
- [x] A crash in a single message does not affect the rest of the chat history or the input box.
- [x] Tool call matching in `useProcessedMessages` performs efficiently even with 100+ messages.

## Implementation Phases

### Phase 1: Stability Foundation

- **Tasks**:
  - [x] Create `src/components/ui/error-boundary.tsx` using a standard class component pattern.
  - [x] Wrap the message list in `ChatInterface.tsx` with the new `ErrorBoundary`.
- **Success Criteria**: Intentionally throwing an error in a `ChatMessage` displays a fallback UI instead of a white screen.

### Phase 2: Performance Optimization

- **Tasks**:
  - [x] Refactor `src/app/hooks/chat/useProcessedMessages.ts` to replace the nested loop with a `Map`-based lookup for tool results.
  - [x] Implement a `useThrottledValue` hook or use a simple throttle in `ChatInterface.tsx` for the `messages` array.
- **Success Criteria**: Reduced CPU usage during streaming; `useProcessedMessages` execution time remains low regardless of message count.

### Phase 3: Markdown progressive enhancement

- **Tasks**:
  - [x] Update `MarkdownContent.tsx` to accept an `isStreaming` prop.
  - [x] If `isStreaming` is true, render code blocks as simple `<pre><code>` elements.
  - [x] Switch to `SyntaxHighlighter` only when `isStreaming` becomes false.
- **Success Criteria**: Code blocks stream in instantly without the lag associated with syntax highlighting.

## Sources & References

- **Origin brainstorm:** [docs/brainstorms/2026-03-06-fix-message-area-white-screen-brainstorm.md](docs/brainstorms/2026-03-06-fix-message-area-white-screen-brainstorm.md)
- **Similar patterns:** `src/app/hooks/usePersistedMessages.ts` (uses `UI_UPDATE_THROTTLE`)
- **Key Files**:
  - `src/app/components/ChatInterface.tsx`
  - `src/app/hooks/chat/useProcessedMessages.ts`
  - `src/app/components/MarkdownContent.tsx`
