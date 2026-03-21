---
date: 2026-03-21
topic: chatprovider-zustand-migration
---

# ChatProvider Zustand Migration

## Problem Frame

During streaming, the `ChatProvider` dual-context split (ChatStateContext / ChatActionsContext) defeats its own optimization: both `useMemo` calls depend on `[chat]` as a single dependency (ChatProvider.tsx lines 67, 87). Since `useChat` returns a new object on every stream tick (because `stream` from `useStream()` changes), **all** `useChatState()` consumers re-render every 100ms during streaming — even components that only read `threadId`, `config`, or `overrideConfig`.

With virtualization now handling the main message list (O(viewport) instead of O(N)), the remaining unnecessary re-renders are in lightweight components (ChatInput, DockToolbar, TasksFilesSidebar, ChatMessage). The wins are incremental but real, and more importantly, the Zustand pattern prevents future consumers from being dragged into the streaming render loop.

## Requirements

- R1. Replace ChatStateContext and ChatActionsContext with a single Zustand store exposing selector-based subscriptions
- R2. Each consumer subscribes only to the specific slices it needs — components that read `threadId` do not re-render when `messages` changes
- R3. Action callbacks (sendMessage, stopStream, etc.) remain stable references that never trigger consumer re-renders
- R4. No behavioral regression — all existing chat features (streaming, interrupts, branching, subagents, retry/edit) work identically
- R5. Remove the dual-context pattern and `ChatProvider` wrapper (or simplify it to just initialize the store)

## Success Criteria

- Components that only read `threadId` or `config` do not re-render during streaming
- Action consumers never re-render due to state changes
- TypeScript compiles with no new errors
- All existing tests pass
- `pnpm check` (Biome) passes

## Scope Boundaries

- NOT refactoring `useChat` hook internals or `useStream` from the SDK
- NOT changing the data flow from LangGraph SDK → useChat → store
- NOT splitting the `stream` object into finer-grained pieces
- NOT adding new state management for features beyond current chat state

## Key Decisions

- **Zustand over useSyncExternalStore**: Built-in selector API, ~2KB, well-established React pattern. Less boilerplate than custom store.
- **Full migration over incremental**: Clean break avoids dual patterns coexisting. Consumer count is small (~5 files) so migration is bounded.

## Dependencies / Assumptions

- `useChat` hook continues to be the data source — the Zustand store wraps its output, not replaces the hook
- The `stream` object from `useStream()` contains methods (submit, stop) — these need to be accessible through the store without triggering state updates

## Outstanding Questions

### Deferred to Planning

- [Affects R1][Technical] Exact Zustand store shape — whether to flatten all fields or keep a state/actions split inside the store
- [Affects R1][Needs research] How to handle the `stream` object which contains both data (messages, isLoading) and methods (submit, stop) — Zustand selectors work best with plain data
- [Affects R5][Technical] Whether ChatProvider becomes a thin wrapper that syncs useChat → Zustand, or whether the store initialization moves elsewhere

## Next Steps

→ `/ce:plan` for structured implementation planning
