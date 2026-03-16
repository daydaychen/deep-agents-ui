---
status: complete
priority: p1
issue_id: "016"
tags: [code-review, performance, memory-leak, indexeddb]
dependencies: []
---

# Memory Leak in IndexedDB Connection Management

## Problem Statement

The `usePersistedMessages` hook opens IndexedDB connections but does not guarantee proper cleanup in all scenarios, leading to potential memory leaks and resource exhaustion over time.

## Findings

- **Source:** Performance Oracle Agent
- **Location:** `src/app/hooks/usePersistedMessages.ts` lines 82-117
- **Evidence:**

  - Multiple code paths open connections without guaranteed closure
  - Error scenarios may leave connections open
  - No connection pooling or reuse strategy

- **Severity:** CRITICAL - Can cause browser slowdown and crashes in long sessions
- **Impact:** Accumulating open connections consume memory and can lock database

## Proposed Solutions

### Option A: Wrap all IDB operations in try-finally with explicit close

- **Pros:** Guarantees cleanup, minimal architecture change
- **Cons:** Verbose, easy to miss new operations
- **Effort:** Small
- **Risk:** Low - standard resource management pattern

### Option B: Create a singleton IDB connection manager

- **Pros:** Single connection reused, centralized management
- **Cons:** More complex, singleton pattern has trade-offs
- **Effort:** Medium
- **Risk:** Medium - requires careful lifecycle management

### Option C: Use idb library with proper transaction handling

- **Pros:** Library handles connection lifecycle, promise-based API
- **Cons:** Adds dependency, migration effort
- **Effort:** Medium
- **Risk:** Low - established library pattern

## Recommended Action

Option A for immediate fix, consider Option C for long-term maintainability.

## Technical Details

- **Affected Files:** `src/app/hooks/usePersistedMessages.ts`
- **Database:** subagent-messages
- **Stores:** messages

## Acceptance Criteria

- [ ] All IDB operations wrapped in try-finally
- [ ] Connections closed even in error scenarios
- [ ] No connection accumulation in DevTools
- [ ] Long-running session test passes (no memory growth)

## Work Log

| Date       | Action                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------ |
| 2026-03-09 | Identified during code review by Performance Oracle                                        |
| 2026-03-09 | Implemented Option A: wrapped all IDB operations in try-finally blocks with explicit close |
