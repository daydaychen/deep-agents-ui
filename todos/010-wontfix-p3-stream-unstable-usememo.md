---
status: wont_fix
priority: p3
issue_id: "010"
tags: [code-review, performance, pre-existing]
dependencies: []
---

# `stream` Object in useMemo Deps Is Unstable (Pre-existing)

## Problem Statement

`useStream` returns a new object reference each render, making `stream` in the `useMemo` dependency array trigger re-computation every render. The outer `useMemo` (line 422) is effectively a no-op.

## Findings

- **Source:** Performance Oracle
- **Location:** `src/app/hooks/useChat.ts:422-469`
- **Note:** Pre-existing — not introduced by this PR. The `useMemo` still serves as documentation of intent and would work correctly if the SDK stabilized the return object.

## Proposed Solutions

### Option A: Destructure stable properties from `stream`
```typescript
const { messages, isLoading, values, ... } = stream;
// Use individual properties in useMemo deps
```
- **Effort:** Medium — many properties to destructure
- **Risk:** Low

### Option B: Leave as-is
- The SDK may stabilize the reference in a future version
- Performance impact is minimal (useMemo body is cheap)

## Work Log

| Date | Action |
|------|--------|
| 2026-03-01 | Identified during code review (pre-existing) |
