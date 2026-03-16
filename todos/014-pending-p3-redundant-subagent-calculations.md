---
status: complete
priority: p3
issue_id: 014
tags: [code-review, performance, optimization]
dependencies: []
---

...

## Work Log

- 2026-03-06: Consolidated subagent extraction logic into extractSubAgents utility and integrated it into useProcessedMessages. Removed redundant calculations in ChatInterface and ChatMessage.

# 014-pending-p3-redundant-subagent-calculations

## Problem Statement

`useSubAgents` is called multiple times for the same data across different components, leading to redundant calculations (though memoized within each component).

## Findings

1. `ChatInterface.tsx`: Calculates `allSubAgents` by flatMapping all tool calls from `processedMessages`.
2. `ChatMessage.tsx`: Calculates `subAgents` for its own tool calls.
3. `SubAgentSection.tsx` (implied): Likely uses the passed subagents.

While `useSubAgents` is memoized, the `processedMessages.flatMap` in `ChatInterface` runs on every update (throttled to 100ms), which involves iterating over all messages and their tool calls.

## Proposed Solutions

### Solution 1: Lift State / Centralize

Calculate subagents once in `useProcessedMessages` and include them in the `ProcessedMessage` object.

**Pros:**

- Single pass for all message-related processing.
- Guaranteed consistency.

**Cons:**

- Increases complexity of `useProcessedMessages`.

### Solution 2: Accept Current State

Keep it as is, as the performance impact is currently minimal.

## Recommended Action

Monitor performance. If the message list grows to >500 messages and stuttering occurs, implement Solution 1. For now, this is a low-priority optimization.

## Technical Details

- **Affected Files**:
  - `src/app/hooks/chat/useProcessedMessages.ts`
  - `src/app/components/ChatInterface.tsx`
  - `src/app/components/ChatMessage.tsx`
