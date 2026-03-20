---
status: complete
priority: p1
issue_id: "030"
tags: [code-review, performance, security, inspector]
dependencies: []
---

# Unbounded Inspector State Growth

## Problem Statement

The inspector reducer appends to arrays without any upper bound. In long-running sessions, `logEntries`, `screenshots`, `configHistory`, and `testResults` grow indefinitely. Screenshots with base64 data are particularly dangerous — each can be 500KB-2MB, and 100 screenshots would consume 500MB+ of JavaScript heap.

## Findings

### Performance Oracle + Security Sentinel + Architecture Strategist

**File:** `src/app/components/inspector/inspector-reducer.ts`

All PUSH_* actions use spread to append:
- `PUSH_LOG` (line 52): `[...state.logEntries, ...entries]` — O(n) per dispatch, O(n²) cumulative
- `PUSH_SCREENSHOT` (line 70): `[...state.screenshots, action.payload]` — megabytes per entry
- `PUSH_CONFIG` (line 41): `[...existing, snapshot]` — config snapshots accumulate
- `PUSH_TEST_RESULTS` (line 63): `[...state.testResults, ...action.payload]`

## Proposed Solutions

### Solution A: Rolling Window Caps (Recommended)

Add constants and slice in reducer:

```typescript
const MAX_LOG_ENTRIES = 500;
const MAX_SCREENSHOTS = 20;
const MAX_CONFIG_SNAPSHOTS = 30;
const MAX_TEST_RESULTS = 200;

case "PUSH_LOG": {
  const entries = Array.isArray(action.payload) ? action.payload : [action.payload];
  const combined = [...state.logEntries, ...entries];
  return {
    ...state,
    isOpen: true,
    activeTab: "log",
    logEntries: combined.length > MAX_LOG_ENTRIES ? combined.slice(-MAX_LOG_ENTRIES) : combined,
  };
}
```

- Pros: Simple, prevents OOM, preserves recent data
- Cons: Loses oldest entries silently
- Effort: Small (30 min)
- Risk: Low

## Acceptance Criteria

- [ ] All PUSH_* actions have maximum array size caps
- [ ] Screenshots capped at ~20 entries
- [ ] Log entries capped at ~500 entries
- [ ] Config snapshots capped at ~30 per task

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-20 | Created from code review | — |
