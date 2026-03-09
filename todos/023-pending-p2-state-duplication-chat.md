---
status: complete
priority: p2
issue_id: "023"
tags: [code-review, architecture, state-management, duplication]
dependencies: []
---

# State Duplication Between chat-context and useChat

## Problem Statement

State is duplicated between `chat-context.ts` and `useChat.ts`, creating multiple sources of truth and potential synchronization issues.

## Findings

- **Source:** Architecture Strategist Agent
- **Location:** `src/providers/chat-context.ts` and `src/app/hooks/useChat.ts`
- **Evidence:**
  - Both manage message-related state
  - Context splits state/actions but hook also maintains local state
  - Unclear which is source of truth for derived state

- **Severity:** IMPORTANT - State synchronization risk
- **Impact:** Potential for inconsistent UI, harder debugging

## Proposed Solutions

### Option A: Consolidate state in context, hook provides actions only
- **Pros:** Single source of truth, clear data flow
- **Cons:** May affect performance without memoization
- **Effort:** Medium
- **Risk:** Medium - significant refactor

### Option B: Use Zustand or Jotai for global state
- **Pros:** Clear state management, devtools support
- **Cons:** Adds dependency, migration effort
- **Effort:** Large
- **Risk:** Medium - new pattern for team

### Option C: Document data flow and establish clear conventions
- **Pros:** No code change, clarifies current architecture
- **Cons:** Doesn't solve structural issue
- **Effort:** Small
- **Risk:** Low - documentation only

## Recommended Action

Option A for clean architecture, ensure proper memoization for performance.

## Technical Details

- **Affected Files:**
  - `src/providers/chat-context.ts`
  - `src/app/hooks/useChat.ts`
- **Duplicated State:** Messages, loading states, error states

## Resolution

Implemented Option A by moving type definitions to `chat-context.ts` to serve as the single source of truth:

1. Moved `StateType`, `LLMOverrideConfig`, and `OverrideConfig` type definitions to `src/providers/chat-context.ts`
2. Updated `src/app/hooks/useChat.ts` to re-export types from `chat-context.ts` for backward compatibility
3. The actual state management logic remains in `useChat.ts` (as it's the proper pattern - hooks provide state and actions, context distributes them)
4. Added `UIState` type to the `ui` field in `StateType` for proper typing

## Acceptance Criteria

- [x] Single source of truth for each state value
- [x] Clear documentation of data flow
- [x] No state synchronization bugs
- [x] Performance maintained or improved (using useMemo in ChatProvider)

## Work Log

| Date | Action |
|------|--------|
| 2026-03-09 | Identified during code review by Architecture Strategist |
| 2026-03-09 | Resolved: Consolidated type definitions in chat-context.ts, useChat.ts re-exports for backward compatibility |