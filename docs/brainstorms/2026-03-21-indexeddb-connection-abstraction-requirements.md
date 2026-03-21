---
date: 2026-03-21
topic: indexeddb-connection-abstraction
---

# Fix IndexedDB Connection Abstraction

## Problem Frame

`usePersistedMessages.ts` (250 lines) and `db.ts` (63 lines) both open independent IndexedDB connections to the same database. The hook opens a new connection on every `threadId` change and its cleanup races against the async open promise — rapid thread switching can close a connection that a newer effect is already using, or leave connections unclosed. `db.ts:deleteThreadData` opens a separate ephemeral connection per call with no reuse. Together, these cause P1 memory leaks in long sessions (accumulating unclosed connections).

## Requirements

- R1. Replace all raw `indexedDB.open()` calls with a single shared connection manager that reuses one connection to the database
- R2. Fix the race condition: rapid `threadId` changes must not close a connection that a newer effect is already using, and must not leave orphaned connections
- R3. All existing IndexedDB operations (load, batch save, delete by thread) continue to work identically
- R4. `usePersistedMessages` complexity should be meaningfully reduced — the IndexedDB connection lifecycle management is extracted out of the hook
- R5. Error paths must not leak connections — all operations guarantee cleanup on failure

## Success Criteria

- Connection count in DevTools stays at 0 or 1 regardless of how rapidly threads are switched
- No behavioral change to subagent message persistence (load, save, delete all work as before)
- `usePersistedMessages.ts` is significantly shorter (target: remove ~100+ lines of raw IDB boilerplate)

## Scope Boundaries

- Do NOT add TTL-based eviction or automatic cleanup of old thread data — that's a separate concern
- Do NOT change the data schema (keyPath, indexes, store name)
- Do NOT change the merge/throttle logic in `usePersistedMessages` (the subagent message merging, `UI_UPDATE_THROTTLE`, `BATCH_WRITE_INTERVAL` — these stay as-is)
- Do NOT adopt a third-party library (Dexie, idb-keyval) — hand-rolled singleton keeps the dependency footprint zero

## Key Decisions

- **Singleton connection, not library**: A hand-rolled singleton avoids adding ~20KB dependency for what amounts to 3 operations (load, save, delete). The raw IndexedDB API complexity is in connection lifecycle, not in the operations themselves.
- **Connection fix only, no eviction**: Eviction is orthogonal and easy to add later once the abstraction exists.

## Outstanding Questions

### Deferred to Planning
- [Affects R1][Technical] Should the singleton lazily open on first use, or eagerly on module load? Lazy is safer for SSR/test environments but adds a promise to every call path.
- [Affects R2][Technical] Should the connection manager handle `onversionchange` events (fired when another tab upgrades the DB)?
- [Affects R4][Technical] Should `batchSaveToIndexedDB` and `loadSubagentMessages` move into the connection manager as methods, or stay in the hook and receive the connection as a parameter?

## Next Steps

→ `/ce:plan` for structured implementation planning
