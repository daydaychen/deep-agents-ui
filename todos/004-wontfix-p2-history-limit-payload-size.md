---
status: wont_fix
priority: p2
issue_id: "004"
tags: [code-review, performance, payload]
dependencies: []
---

# `fetchStateHistory: { limit: 100 }` Causes O(n^2) Payload Growth

## Problem Statement

Each `ThreadState` in the history contains ALL messages accumulated up to that point. With `limit: 100`, the total payload grows quadratically. For a 50-message conversation, this is ~7.6 MB fetched after every stream completion. The deepened plan recommended 50 as a balance.

## Findings

- **Source:** Performance Oracle
- **Location:** `src/app/hooks/useChat.ts:88`
- **Evidence:**

| History Limit | 50-msg Payload | 100-msg Payload |
|---|---|---|
| 10 (SDK default) | ~0.7 MB | ~1.4 MB |
| 50 (plan recommendation) | ~1.9 MB | ~5.6 MB |
| 100 (current) | ~1.9 MB | ~7.6 MB |

- User explicitly chose 100 over the plan's 50 because retry was failing with lower limits
- `getMessagesMetadata` computation is `O(M x H x avg)` per render

## Proposed Solutions

### Option A: Keep 100, monitor performance
- **Pros:** Maximum coverage for retry/edit on old messages
- **Cons:** Higher payload and CPU cost
- **Effort:** None
- **Risk:** Performance degradation on long conversations

### Option B: Reduce to 50, add lazy-load for older messages
- **Pros:** Better baseline performance
- **Cons:** Requires additional code for lazy-loading extended history on demand
- **Effort:** Medium
- **Risk:** Low

### Option C: Reduce to 50, show "message too old to retry" toast
- **Pros:** Simple, good performance
- **Cons:** Some older messages won't be retryable
- **Effort:** Small (already implemented — toast fires for missing checkpoint)
- **Risk:** Low

## Acceptance Criteria

- [ ] History limit chosen based on real-world performance measurement
- [ ] No noticeable UI lag on conversations with 20+ exchanges

## Work Log

| Date | Action |
|------|--------|
| 2026-03-01 | Identified during code review. User chose 100 over recommended 50. |
