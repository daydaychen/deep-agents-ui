---
status: complete
priority: p2
issue_id: "003"
tags: [code-review, pattern-consistency, config]
dependencies: []
---

# Missing `recursion_limit` in Retry/Edit Config

## Problem Statement

`sendMessage` and `continueStream` pass `recursion_limit: recursionLimit` in their config, but `retryFromMessage` and `editMessage` only pass `config: activeAssistant?.config` without the recursion limit. This means retried/edited runs use the assistant's default limit instead of the component-level override.

## Findings

- **Source:** Pattern Recognition Specialist
- **Location:** `src/app/hooks/useChat.ts:250-260` (retry), `289-301` (edit)
- **Evidence:**

| Callback                      | Has `recursion_limit` |
| ----------------------------- | --------------------- |
| `sendMessage` (line 114)      | Yes                   |
| `continueStream` (line 189)   | Yes                   |
| `retryFromMessage` (line 252) | No                    |
| `editMessage` (line 293)      | No                    |
| `runSingleStep` (line 143)    | No                    |

## Proposed Solutions

### Option A: Add recursion_limit to retry/edit config (Recommended)

```typescript
config: {
  ...(activeAssistant?.config ?? {}),
  recursion_limit: recursionLimit,
},
```

- **Pros:** Consistent with `sendMessage` and `continueStream`
- **Cons:** None
- **Effort:** Small (2 lines changed)
- **Risk:** None

## Acceptance Criteria

- [ ] All submit callbacks that start agent execution pass `recursion_limit`
- [ ] `recursionLimit` added to useCallback dependency arrays where needed

## Work Log

| Date       | Action                        |
| ---------- | ----------------------------- |
| 2026-03-01 | Identified during code review |
