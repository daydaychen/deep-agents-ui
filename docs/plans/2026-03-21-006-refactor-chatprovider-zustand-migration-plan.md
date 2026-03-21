---
title: "refactor: Migrate ChatProvider to Zustand store"
type: refactor
status: completed
date: 2026-03-21
origin: docs/brainstorms/2026-03-21-chatprovider-zustand-migration-requirements.md
---

# refactor: Migrate ChatProvider to Zustand store

## Overview

Replace the dual React Context pattern (ChatStateContext / ChatActionsContext) in ChatProvider with a Zustand store that exposes selector-based subscriptions. This eliminates unnecessary re-renders in components that only need a slice of chat state (e.g., ChatInput reads `threadId` but currently re-renders on every stream tick). (see origin: `docs/brainstorms/2026-03-21-chatprovider-zustand-migration-requirements.md`)

## Problem Statement

Both `useMemo` calls in ChatProvider depend on `[chat]` as a single dependency (lines 67, 87). Since `useChat` returns a new memoized object on every stream tick (because `stream` from `useStream()` changes), **all** `useChatState()` consumers re-render every 100ms during streaming — even components that only read `threadId`, `config`, or `overrideConfig`.

The dual-context split (state vs actions) was intended to prevent action-only consumers from re-rendering on state changes. But it's defeated by its own implementation: both contexts share `[chat]` as dependency, so the actions context also invalidates every tick despite all callbacks being stable references.

## Proposed Solution

Use Zustand's `createStore` factory + React context pattern (Zustand's official Next.js recommendation) to create a component-scoped store. The `ChatProvider` component becomes a thin sync bridge: it calls `useChat()` as before, then syncs the output into the Zustand store via `useEffect`. Consumers migrate from `useChatState().field` to `useChatStore(s => s.field)` with granular selectors.

## Technical Considerations

### Store Architecture (Key Decisions)

**Component-scoped store via `createStore()` + context**: A single lightweight context holds the store reference (replacing two contexts). This follows Zustand's official Next.js guide for SSR safety and allows future multi-chat layouts. (see origin: key decision "Zustand over useSyncExternalStore")

**Flat store shape**: All fields from both current contexts live in one flat Zustand store. Selectors naturally replace the state/actions split — selecting a function never triggers re-renders because function references are stable.

**stream object stays in the store**: The raw `stream` object is stored as a field. Only `ChatInterface` selects it (and accepts re-renders). Other consumers select specific scalar fields (`threadId`, `isLoading`, `overrideConfig`) and are unaffected by stream ticks. This is simpler than flattening all stream properties.

**setOverrideConfig preserves updater function pattern**: DockToolbar calls `setOverrideConfig(prev => ({...prev, authMode}))`. The Zustand action must support both direct values and updater functions, matching `React.Dispatch<React.SetStateAction<OverrideConfig>>`.

### Sync Mechanism

`useChat()` continues to own the data lifecycle. A `useEffect` in the ChatProvider syncs its output into the Zustand store. The 100ms throttle already in place means the one-frame lag from `useEffect` is negligible (consumers see data at most ~16ms later than the provider, within the same throttle window).

### Selector Equality

Values that produce new references on every tick despite identical content (e.g., `todos ?? []` creating new empty arrays) must use stable defaults. Define module-level constants (`EMPTY_TODOS`, `EMPTY_FILES`) in the store and only update when content actually changes. For `Map` values (`subagentMessagesMap`), consumers needing Maps should use `useShallow` from `zustand/react/shallow`.

### Preserving Existing Optimizations (per learnings doc)

- 100ms throttling via `useThrottledValue` — preserved, operates before store sync
- Per-message `ErrorBoundary` — preserved, unchanged
- Ref-based double-fire guards in `useChat` — preserved, `useChat` is not refactored
- Progressive markdown rendering — preserved, independent of state management
- O(N) `useProcessedMessages` algorithm — preserved, unchanged

## Implementation Units

### Unit 1: Install Zustand

**Goal**: Add the Zustand dependency.

**Files**:
- `package.json` — modify

**Approach**:
1. Run `pnpm add zustand`
2. Verify the package installs and types are available

**Verification**: `pnpm install` succeeds, `import { createStore } from 'zustand/vanilla'` compiles.

### Unit 2: Create the chat store definition

**Goal**: Define the Zustand store type and factory function.

**Files**:
- `src/stores/chat-store.ts` — create

**Approach**:
1. Define `ChatStoreState` interface with all current `ChatStateContextType` fields plus all `ChatActionsContextType` fields, flattened into one interface.
2. Define stable default values for fields that produce new references (`EMPTY_TODOS: TodoItem[] = []`, `EMPTY_FILES: Record<string, string> = {}`, etc.).
3. Create `createChatStore()` factory using `createStore<ChatStoreState>()` from `zustand/vanilla`.
4. Initial state has sensible defaults (empty messages, not loading, no error, etc.).
5. The store exposes a `_sync` action that bulk-updates all fields from a `useChat` return value. This is the only mutation path — all business logic stays in `useChat`.
6. `setOverrideConfig` action supports both direct value and updater function: `(valOrUpdater) => set(s => ({ overrideConfig: typeof valOrUpdater === 'function' ? valOrUpdater(s.overrideConfig) : valOrUpdater }))`.
7. `setActiveSubAgentId` and `setFiles` are simple setters.

**Patterns to follow**: Zustand `createStore` factory pattern from official Next.js guide. Type the store using the curried `createStore<Type>()(...)` form for TypeScript inference.

**Verification**: TypeScript compiles. Store can be instantiated and state read/written in isolation.

### Unit 3: Create ChatStoreProvider and useChatStore hook

**Goal**: Create the React context + provider that scopes the Zustand store instance, and the typed selector hook.

**Files**:
- `src/providers/chat-store-provider.tsx` — create

**Approach**:
1. Create a React context holding `ReturnType<typeof createChatStore> | undefined`.
2. `ChatStoreProvider` component: instantiates the store via `useState(() => createChatStore())`, wraps children in the context provider.
3. `useChatStore<T>(selector: (state: ChatStoreState) => T): T` hook: reads the store from context, calls `useStore(store, selector)`. Throws if used outside provider.
4. Export `useChatStoreShallow` convenience that wraps `useStore` with `useShallow` for multi-field selections.

**Patterns to follow**: Zustand's official Next.js provider pattern (`createStore` + `useStore` + context).

**Verification**: TypeScript compiles. Provider can wrap a test component that reads state via selector.

### Unit 4: Convert ChatProvider to sync bridge

**Goal**: Replace the dual-context providers in ChatProvider with a sync effect that writes into the Zustand store. Wrap with ChatStoreProvider.

**Files**:
- `src/providers/ChatProvider.tsx` — modify
- `src/app/components/chat/ChatPage.tsx` — modify (wrap with ChatStoreProvider)

**Approach**:
1. In `ChatProvider`, remove the two `useMemo` calls and the `<ChatActionsContext.Provider>` / `<ChatStateContext.Provider>` wrapping.
2. Add a `useEffect` that calls `store.getState()._sync(chat)` whenever `chat` changes. Get the store via `useChatStore` context or pass it as a ref.
3. Render `{children}` directly — no more context providers.
4. In `ChatPage.tsx`, wrap `<ChatProvider>` with `<ChatStoreProvider>`:
   ```tsx
   <ChatStoreProvider>
     <ChatProvider ...props>
       <ChatInterface ... />
     </ChatProvider>
   </ChatStoreProvider>
   ```
5. Alternatively, merge `ChatStoreProvider` into `ChatProvider` — create the store inside `ChatProvider` and provide it via context. This avoids an extra nesting level.

**Execution note**: Keep the old context exports temporarily (Unit 5 migrates consumers). During this unit, the old hooks (`useChatState`, `useChatActions`) should still work via backward-compatible wrappers that internally delegate to the Zustand store.

**Verification**: TypeScript compiles. App renders. Old `useChatState()` and `useChatActions()` still work via compat wrappers. No behavioral regression.

### Unit 5: Migrate all consumers to Zustand selectors

**Goal**: Replace all `useChatState()` and `useChatActions()` calls with `useChatStore(selector)`.

**Files**:
- `src/app/components/ChatInterface.tsx` — modify
- `src/app/components/ChatMessage.tsx` — modify
- `src/app/components/chat/ChatInput.tsx` — modify
- `src/app/components/chat/DockToolbar.tsx` — modify
- `src/app/components/TasksFilesSidebar.tsx` — modify

**Approach**:

For each consumer, replace the destructured context call with granular selectors:

1. **ChatInterface (inner)** — reads ~14 state fields and ~8 actions. Use `useChatStoreShallow` for the state bundle since this component genuinely needs most fields:
   ```typescript
   const { stream, messages, todos, ... } = useChatStoreShallow(s => ({
     stream: s.stream,
     messages: s.messages,
     // ... all needed fields
   }));
   ```
   For actions, select individually or use `useChatStoreShallow`.

2. **ChatInterface (outer)** — reads only `sendMessage` and `setActiveSubAgentId`. Two individual selectors.

3. **ChatMessage** — reads only `config`. Single scalar selector: `useChatStore(s => s.config)`.

4. **ChatInput** — reads only `threadId`. Single scalar selector: `useChatStore(s => s.threadId)`.

5. **DockToolbar** — reads `overrideConfig` (state) and `setOverrideConfig` (action). Two selectors.

6. **TasksFilesSidebar** — reads `isLoading` and `interrupt`. Two scalar selectors or one shallow selector.

**Verification**: TypeScript compiles. All consumers render correctly. ChatInput, DockToolbar, ChatMessage do NOT re-render during streaming (verify with React DevTools Profiler or console.log in dev).

### Unit 6: Remove old context and clean up

**Goal**: Remove the dual-context pattern, backward-compat wrappers, and the `use-stick-to-bottom`-style dead code.

**Files**:
- `src/providers/chat-context.ts` — modify (remove contexts, keep type exports)
- `src/providers/ChatProvider.tsx` — modify (remove compat wrappers if any remain)

**Approach**:
1. Remove `ChatStateContext`, `ChatActionsContext`, `useChatState`, `useChatActions` from `chat-context.ts`.
2. Keep the type definitions (`ChatStateContextType`, `ChatActionsContextType`, `OverrideConfig`, etc.) — they're used by `useChat` and other modules. Optionally rename them if they no longer need "Context" in the name.
3. Verify no remaining imports of the removed exports: `grep -r "useChatState\|useChatActions\|ChatStateContext\|ChatActionsContext" src/`.
4. Run `pnpm check:fix` for Biome lint.

**Verification**: No remaining references to old contexts. TypeScript compiles. `pnpm check` passes. All features work.

## Acceptance Criteria

- [ ] ChatStateContext and ChatActionsContext replaced with a single Zustand store (R1)
- [ ] Each consumer uses granular selectors — ChatInput only subscribes to `threadId`, etc. (R2)
- [ ] Action callbacks are stable references that never trigger consumer re-renders (R3)
- [ ] No behavioral regression — streaming, interrupts, branching, subagents, retry/edit all work (R4)
- [ ] Dual-context pattern removed, ChatProvider simplified to sync bridge (R5)
- [ ] `setOverrideConfig` updater function pattern preserved for DockToolbar
- [ ] TypeScript compiles with no new errors
- [ ] `pnpm check` (Biome) passes
- [ ] All existing tests pass (84 tests in test suite)

## Scope Boundaries

- NOT refactoring `useChat` hook internals or `useStream` from the SDK (see origin: scope boundaries)
- NOT splitting the `stream` object into finer-grained pieces (see origin: scope boundaries)
- NOT migrating InspectorProvider or ClientProvider to Zustand (separate effort)
- NOT adding Zustand DevTools middleware (can be added later)
- NOT adding new tests for re-render verification (manual verification via React DevTools)

## Sources & References

- **Origin document:** [docs/brainstorms/2026-03-21-chatprovider-zustand-migration-requirements.md](docs/brainstorms/2026-03-21-chatprovider-zustand-migration-requirements.md) — Key decisions: Zustand over useSyncExternalStore, full migration over incremental
- **Learnings:** [docs/solutions/performance-issues/optimizing-chat-streaming-performance-and-stability.md](docs/solutions/performance-issues/optimizing-chat-streaming-performance-and-stability.md) — Preserve throttling, ref-based guards, per-message ErrorBoundary, O(N) algorithm
- **Learnings:** [docs/solutions/integration-issues/langgraph-sdk-retry-edit-message-operations.md](docs/solutions/integration-issues/langgraph-sdk-retry-edit-message-operations.md) — Ref-based guards required (not state), streamResumable must stay true
- **Target files:** `src/providers/ChatProvider.tsx`, `src/providers/chat-context.ts`, consumer components
- **Library docs:** Zustand v5 — `createStore`, `useStore`, `useShallow`, Next.js provider pattern
