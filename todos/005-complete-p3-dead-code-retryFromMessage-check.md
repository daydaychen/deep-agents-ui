---
status: complete
priority: p3
issue_id: "005"
tags: [code-review, simplicity, dead-code]
dependencies: []
---

# `!!retryFromMessage` Is Always True (Dead Code)

## Problem Statement

In `getMessageBranchInfo` (line 333), `!!retryFromMessage` is always `true` because `retryFromMessage` is defined by `useCallback` and is never `undefined`. This makes the check dead code.

## Findings

- **Source:** Code Simplicity Reviewer
- **Location:** `src/app/hooks/useChat.ts:333`
- **Code:** `const canRetry = hasParentCheckpoint && !!retryFromMessage && !isUserMessage;`
- **Fix:** `const canRetry = hasParentCheckpoint && !isUserMessage;`
- Also remove `retryFromMessage` from the `useCallback` dependency array (line 341)

## Acceptance Criteria

- [ ] Dead `!!retryFromMessage` check removed
- [ ] `retryFromMessage` removed from `getMessageBranchInfo` deps

## Work Log

| Date | Action |
|------|--------|
| 2026-03-01 | Identified during code review |
