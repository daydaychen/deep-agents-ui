---
status: complete
priority: p2
issue_id: "019"
tags: [code-review, performance, algorithm, complexity]
dependencies: []
---

# O(n) Operations in Message Resolution

## Problem Statement

Multiple locations use `findIndex` and array traversal for message lookup, resulting in O(n) complexity for operations that could be O(1) with proper data structure indexing.

## Findings

- **Source:** Performance Oracle Agent
- **Location:** `src/app/hooks/useChat.ts` and related files
- **Evidence:**

  - Line 131: `findIndex` called on messages array for resolution
  - Multiple `filter` operations for thread filtering
  - No message ID index or Map structure

- **Severity:** IMPORTANT - Degrades with message count
- **Impact:** Performance degradation visible with 100+ messages in thread

## Proposed Solutions

### Option A: Add Map-based index for message lookup by ID

- **Pros:** O(1) lookup, maintains current array for order
- **Cons:** Requires index maintenance on add/remove
- **Effort:** Medium
- **Risk:** Low - standard optimization pattern

### Option B: Use SWR/React Query built-in caching with proper keys

- **Pros:** Leverages existing tools, automatic cache management
- **Cons:** May not help with local message operations
- **Effort:** Medium
- **Risk:** Low - well-supported approach

### Option C: Pre-compute indices in useMemo

- **Pros:** Simple, React idiomatic
- **Cons:** Still recomputes on every message change
- **Effort:** Small
- **Risk:** Low - easy to implement

## Recommended Action

Option A for best performance, Option C for quick improvement.

## Technical Details

- **Affected Files:** `src/app/hooks/useChat.ts`
- **Operations:** Message resolution, thread filtering, edit message location
- **Current Complexity:** O(n) per operation

## Acceptance Criteria

- [ ] Message lookup by ID is O(1) or O(log n)
- [ ] Thread filtering performance acceptable with 500+ messages
- [ ] No noticeable delay in message operations
- [ ] Memory usage doesn't grow significantly

## Work Log

| Date       | Action                                                                                               |
| ---------- | ---------------------------------------------------------------------------------------------------- |
| 2026-03-09 | Identified during code review by Performance Oracle                                                  |
| 2026-03-09 | Implemented Map-based index for O(1) message lookup in resolveMessageIndex function (commit 3e74297) |
