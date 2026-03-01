---
status: complete
priority: p3
issue_id: "006"
tags: [code-review, dry, refactor]
dependencies: []
---

# Duplicated Index-Resolution Pattern (3 Occurrences)

## Problem Statement

The `findIndex` + fallback-to-index pattern appears 3 times in `useChat.ts`. Could be extracted to a shared helper.

## Findings

- **Source:** TypeScript Reviewer, Architecture Strategist
- **Locations:**
  - `retryFromMessage` (lines 236-239)
  - `editMessage` (lines 269-272)
  - `getMessageBranchInfo` (lines 311-314)
- **Pattern:**
```typescript
const actualIndex = stream.messages.findIndex((msg) => msg.id === message.id);
const indexToUse = actualIndex !== -1 ? actualIndex : index;
```

## Proposed Solutions

### Option A: Extract helper function
```typescript
const resolveMessageIndex = useCallback(
  (message: Message, fallbackIndex: number) => {
    const actual = stream.messages.findIndex((msg) => msg.id === message.id);
    return actual !== -1 ? actual : fallbackIndex;
  },
  [stream.messages]
);
```
- **Effort:** Small
- **Risk:** None

### Option B: Leave as-is
- 3 occurrences is borderline for extraction. Each is 2 lines and self-explanatory.

## Acceptance Criteria

- [ ] If extracted, all 3 call sites use the shared helper
- [ ] No behavior change

## Work Log

| Date | Action |
|------|--------|
| 2026-03-01 | Identified during code review |
