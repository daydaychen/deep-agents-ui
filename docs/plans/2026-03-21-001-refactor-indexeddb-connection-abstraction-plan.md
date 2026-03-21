---
title: "refactor: Extract IndexedDB singleton connection manager"
type: refactor
status: active
date: 2026-03-21
origin: docs/brainstorms/2026-03-21-indexeddb-connection-abstraction-requirements.md
---

# refactor: Extract IndexedDB singleton connection manager

## Overview

Replace the dual-connection IndexedDB pattern (ephemeral per-call in `db.ts`, long-lived ref in `usePersistedMessages.ts`) with a singleton connection manager. This fixes the P1 memory leak from unclosed connections, eliminates the race condition where rapid `threadId` changes close a connection a newer effect is using, and reduces `usePersistedMessages.ts` from 250 to ~150 lines by removing all raw IDB boilerplate.

## Problem Statement

Two independent connection patterns coexist:
1. `db.ts:deleteThreadData` opens and closes a fresh connection per call
2. `usePersistedMessages` opens a connection per `threadId` change via useEffect, storing it in a ref

The cleanup at lines 131-137 does `dbPromise.then(db => db?.close())` but sets `dbRef.current = null` synchronously. Rapid thread switching causes: (a) closing a connection the new effect is already using, (b) orphaned connections from unresolved promises. (See origin: `docs/brainstorms/2026-03-21-indexeddb-connection-abstraction-requirements.md`)

## Proposed Solution

A module-level singleton connection manager in `src/app/utils/db.ts`, following the existing `config.ts` pattern of module-level `let` variables + exported functions (no classes). The manager:

- Lazily opens one connection on first use, returns the cached promise on subsequent calls
- Handles `onversionchange` by closing and invalidating so the next call reopens
- Exposes three operations: `loadThreadMessages`, `saveThreadMessages`, `deleteThreadData`
- SSR-safe via `typeof window === "undefined"` guard

`usePersistedMessages` drops all raw IDB code (open, close, transaction creation) and calls the manager's exported functions instead.

## Deferred Questions — Resolved

These were deferred from brainstorming (see origin doc):

1. **Lazy vs eager open**: **Lazy**. The connection opens on first `getConnection()` call. This is SSR-safe (no `indexedDB` access on server), avoids blocking app startup, and matches the `config.ts` pattern where `getConfig()` reads on demand.

2. **`onversionchange` handling**: **Yes, handle it**. When another tab upgrades the DB, close the current connection and set the cached promise to `null`. The next `getConnection()` call reopens. Low cost, prevents the "blocked" deadlock scenario.

3. **Operations in manager vs hook**: **Move load/save/delete into the manager** as standalone exported async functions. Each function calls `getConnection()` internally. The hook consumes them as plain async imports — no connection refs, no transaction boilerplate. This gives the cleanest separation: manager owns IDB lifecycle + operations, hook owns React state + throttling.

## Technical Considerations

- **Connection lifecycle**: One connection per app session. Never closed on thread switch — only closed on `onversionchange` or page unload. This inherently eliminates the race condition.
- **Concurrent callers**: Multiple components calling `getConnection()` simultaneously all await the same promise. No duplicate opens.
- **Error isolation**: Following existing convention (`console.error` + graceful fallback), persistence failures never propagate to the UI layer (see learnings from `optimizing-chat-streaming-performance-and-stability.md`).
- **Write frequency**: During streaming, writes happen every ~1000ms (`BATCH_WRITE_INTERVAL`). The singleton keeps the connection open, so no open/close overhead per batch.
- **Biome compliance**: Double quotes, semicolons, 2-space indent, 100-char line width.

## Implementation Units

### Unit 1: Singleton connection manager in `db.ts`

**Goal**: Replace the existing `db.ts` (63 lines of `deleteThreadData` + constants) with a connection manager that exposes `getConnection()` and three data operations.

**Files**:
- `src/app/utils/db.ts` — rewrite

**Approach**:
1. Keep existing constants (`DB_NAME`, `DB_VERSION`, `STORE_NAME`)
2. Add module-level `let connectionPromise: Promise<IDBDatabase> | null = null`
3. Add `getConnection()`: if `connectionPromise` is null, create one via `indexedDB.open()`, wire `onupgradeneeded` for schema creation (moved from `usePersistedMessages`), wire `onversionchange` to close + invalidate. Return the cached promise.
4. Add SSR guard: `typeof window === "undefined"` returns rejected promise
5. Rewrite `deleteThreadData` to use `getConnection()` instead of ephemeral open
6. Add `loadThreadMessages(threadId)`: returns `Map<string, Message[]>` — move logic from `usePersistedMessages.loadSubagentMessages`
7. Add `saveThreadMessages(threadId, messagesMap)`: void — move logic from `usePersistedMessages.batchSaveToIndexedDB`

**Patterns to follow**: `src/lib/config.ts` (module-level cache variable, exported functions, SSR guard)

**Verification**: `deleteThreadData` still works from `useThreads.ts`. New functions type-check. Only one `indexedDB.open()` call exists in the entire codebase.

### Unit 2: Simplify `usePersistedMessages` to consume the manager

**Goal**: Remove all raw IDB code from the hook. The hook keeps only: merge logic, throttled UI updates, and calling the manager's async functions.

**Files**:
- `src/app/hooks/usePersistedMessages.ts` — simplify

**Approach**:
1. Remove: `dbRef`, `dbReadyPromiseRef`, the `useEffect` that opens/closes the connection (lines 94-138), `batchSaveToIndexedDB` useCallback (lines 140-177), `loadSubagentMessages` useCallback (lines 179-211)
2. Replace `batchSaveToIndexedDB` calls with `saveThreadMessages(threadId, messagesCacheRef.current)` imported from `@/app/utils/db`
3. Replace `loadSubagentMessages` call with `loadThreadMessages(threadId)` imported from `@/app/utils/db`
4. Keep: merge effect (lines 50-84), loading-finish effect (lines 87-91), load-on-threadId-change effect (lines 213-223), batch write timer effect (lines 225-242), the `PersistedSubagentMessage` interface (needed by manager), return value

**Patterns to follow**: Existing import style `import { ... } from "@/app/utils/db"`

**Verification**: Hook reduces by ~100 lines. No `IDBDatabase`, `IDBTransaction`, or `indexedDB` references remain in the hook. Subagent messages still load on thread switch and save during/after streaming.

### Unit 3: Move `PersistedSubagentMessage` type to `db.ts`

**Goal**: The interface is needed by both the manager (for store operations) and potentially the hook. Move it to the module that owns the schema.

**Files**:
- `src/app/utils/db.ts` — add export
- `src/app/hooks/usePersistedMessages.ts` — remove interface, import from db

**Approach**: Move the `PersistedSubagentMessage` interface to `db.ts` and export it. Import in the hook if still needed.

**Verification**: No duplicate type definitions. Both files compile.

## Acceptance Criteria

- [ ] Only one `indexedDB.open()` call exists in the entire codebase (in `getConnection()`)
- [ ] Connection count in DevTools stays at 0 or 1 regardless of rapid thread switching
- [ ] `usePersistedMessages.ts` contains zero raw IDB references (`IDBDatabase`, `IDBTransaction`, `indexedDB`)
- [ ] `usePersistedMessages.ts` reduced by ~100+ lines
- [ ] `deleteThreadData` (called from `useThreads.ts`) still works
- [ ] Subagent messages load correctly on thread switch
- [ ] Subagent messages persist during and after streaming
- [ ] Error paths log to console and return gracefully (no UI crashes)
- [ ] No `as any` casts introduced
- [ ] Biome lint + format pass

## Sources & References

- **Origin document:** [docs/brainstorms/2026-03-21-indexeddb-connection-abstraction-requirements.md](docs/brainstorms/2026-03-21-indexeddb-connection-abstraction-requirements.md) — Key decisions: singleton over library, connection fix only (no eviction), hand-rolled (zero dependencies)
- **Singleton pattern reference:** `src/lib/config.ts` — module-level cache variable pattern
- **AGENTS.md directive:** Root and hooks AGENTS.md both list "Extract `usePersistedMessages` DB layer into separate module" as a refactoring candidate
- **P1 todo:** `todos/016-pending-p1-memory-leak-indexeddb.md`
- **Race condition learnings:** `docs/solutions/integration-issues/langgraph-sdk-retry-edit-message-operations.md` — ref-based guards, cleanup in all code paths
- **Performance learnings:** `docs/solutions/performance-issues/optimizing-chat-streaming-performance-and-stability.md` — error isolation, 100ms throttle context
