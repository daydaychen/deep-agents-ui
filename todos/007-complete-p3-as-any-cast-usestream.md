---
status: complete
priority: p3
issue_id: "007"
tags: [code-review, type-safety, pre-existing]
dependencies: []
---

# `as any` Cast on `useStream` Options (Pre-existing)

## Problem Statement

`useStream<StateType>({...} as any)` on line 92 hides type mismatches. DeepAgent-specific options like `filterSubagentMessages` and `streamSubgraphs` are not in the public SDK types.

## Findings

- **Source:** TypeScript Reviewer, Architecture Strategist
- **Location:** `src/app/hooks/useChat.ts:92`
- **Note:** Pre-existing — not introduced by this PR. Likely needed because the SDK types don't include DeepAgent-specific options.

## Proposed Solutions

### Option A: Create typed wrapper/extension interface

```typescript
interface DeepAgentStreamOptions extends UseStreamOptions<StateType> {
  filterSubagentMessages?: boolean;
  streamSubgraphs?: boolean;
}
```

- **Effort:** Small
- **Risk:** Low — but may need updating when SDK types change

### Option B: Leave as-is until SDK exports proper types

- **Effort:** None
- **Risk:** None

## Work Log

| Date       | Action                                       |
| ---------- | -------------------------------------------- |
| 2026-03-01 | Identified during code review (pre-existing) |
