---
status: complete
priority: p2
issue_id: "002"
tags: [code-review, races, double-click]
dependencies: []
---

# `isLoading` Guard Has Render-Frame Gap

## Problem Statement

The `if (stream.isLoading) return` guard in `retryFromMessage` and `editMessage` reads state from the current render snapshot. Between a click and the next React render, `isLoading` may still be `false`, allowing a fast double-click to fire twice before React updates the state.

## Findings

- **Source:** Frontend Races Reviewer
- **Location:** `src/app/hooks/useChat.ts:234, 267`
- **Evidence:** `stream.isLoading` is React state — it only updates after a render cycle. Two synchronous click events in the same frame would both see `isLoading === false`.
- **Probability:** Low (requires double-click within same render frame), but possible

## Proposed Solutions

### Option A: Ref-based guard (Recommended)

```typescript
const isSubmittingRef = useRef(false);

const retryFromMessage = useCallback((message, index) => {
  if (isSubmittingRef.current || stream.isLoading) return;
  isSubmittingRef.current = true;
  // ... submit logic ...
  // Reset in onFinish/onError or after submit returns
}, [...]);
```

- **Pros:** Synchronous check, no render-frame gap
- **Cons:** Must manage ref lifecycle (reset on completion)
- **Effort:** Small
- **Risk:** Low

### Option B: Disable buttons at UI layer

- **Pros:** Prevents the event entirely
- **Cons:** `MessageToolbar` already hides buttons when `isLoading`, but there's a render gap there too
- **Effort:** Small
- **Risk:** Low

## Acceptance Criteria

- [ ] Rapid double-clicking retry/edit does not fire two submits
- [ ] Guard resets correctly after stream completes or errors

## Work Log

| Date       | Action                        |
| ---------- | ----------------------------- |
| 2026-03-01 | Identified during code review |
