---
status: complete
priority: p2
issue_id: "001"
tags: [code-review, pattern-consistency, races]
dependencies: []
---

# Inconsistent `isLoading` Guard Across Submit Callbacks

## Problem Statement

Only `retryFromMessage` and `editMessage` have `if (stream.isLoading) return` guards. The other 5 submit callbacks (`sendMessage`, `runSingleStep`, `continueStream`, `markCurrentThreadAsResolved`, `resumeInterrupt`) do not, allowing concurrent submits.

## Findings

- **Source:** Pattern Recognition Specialist, Frontend Races Reviewer
- **Location:** `src/app/hooks/useChat.ts` — all `stream.submit()` call sites
- **Evidence:** 7 callbacks call `stream.submit()`, only 2 have the guard

| Callback | Has Guard |
|----------|-----------|
| `sendMessage` (line 101) | No |
| `runSingleStep` (line 127) | No |
| `continueStream` (line 180) | No |
| `markCurrentThreadAsResolved` (line 202) | No |
| `resumeInterrupt` (line 212) | No |
| `retryFromMessage` (line 232) | Yes |
| `editMessage` (line 265) | Yes |

## Proposed Solutions

### Option A: Add `isLoading` guard to all submit callbacks
- **Pros:** Simple, consistent pattern
- **Cons:** Some callbacks (e.g., `sendMessage`) may intentionally allow queuing
- **Effort:** Small
- **Risk:** Low — may need to exclude `sendMessage` if queuing is desired

### Option B: Use `multitaskStrategy: "interrupt"` on `useStream`
- **Pros:** SDK handles concurrency automatically, no per-callback guards needed
- **Cons:** Interrupts in-progress runs rather than blocking new ones
- **Effort:** Small
- **Risk:** Medium — behavior change for all submit operations

## Acceptance Criteria

- [ ] All submit callbacks have consistent concurrency handling
- [ ] No double-submit possible from rapid user interaction
- [ ] Existing intentional concurrent usage (if any) still works

## Work Log

| Date | Action |
|------|--------|
| 2026-03-01 | Identified during code review |
