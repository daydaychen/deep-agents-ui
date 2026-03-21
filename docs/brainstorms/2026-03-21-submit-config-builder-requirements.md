---
date: 2026-03-21
topic: submit-config-builder
---

# Extract Submit-Config Builder from useChat.ts

## Problem Frame

`useChat.ts` (798 lines) contains 5 methods (`sendMessage`, `runSingleStep`, `continueStream`, `retryFromMessage`, `editMessage`) that each repeat ~25 lines of identical config assembly: reading 5 refs, computing `finalRecursionLimit`, calling `getFinalConfigurable()`, building `assistantConfig` with `auth_mode`, and passing the same `streamMode`/`streamSubgraphs`/`streamResumable` options.

This duplication has already caused at least one divergence bug: `sendMessage` passes `user_id` inside `configurable` but the other 4 methods do not.

## Requirements

- R1. Extract a `buildSubmitConfig()` function inside `useChat` that returns the complete submit options object: `{ metadata, config, streamMode, streamSubgraphs, streamResumable }`
- R2. Each of the 5 methods calls `buildSubmitConfig()` and spreads/merges its output with any method-specific overrides (optimisticValues, checkpoint, command)
- R3. Fix the `user_id` divergence: ensure `configurable.user_id` is consistently included (or excluded) across all 5 methods via the builder
- R4. The 2 simpler methods (`markCurrentThreadAsResolved`, `resumeInterrupt`) remain unchanged — they don't use config assembly
- R5. No behavioral changes to any submit path. Each method retains its own guard logic (`isLoading`/`isSubmittingRef`), `setActiveSubAgentId` reset, and unique pre-work (checkpoint resolution, message construction, optimistic values)

## Success Criteria

- `useChat.ts` is reduced by ~100-150 lines
- Config assembly logic exists in exactly one place
- All 5 methods produce identical submit options (modulo their specific overrides)
- Existing behavior is preserved — no change to what reaches `stream.submit()`

## Scope Boundaries

- Do NOT extract guard logic (`isLoading` check, `isSubmittingRef`, `setActiveSubAgentId`) — each method handles this differently
- Do NOT refactor `markCurrentThreadAsResolved` or `resumeInterrupt` — they use a simpler pattern
- Do NOT change `getFinalConfigurable()` internals
- Do NOT move the builder to a separate file — it reads refs and callbacks defined inside `useChat`

## Key Decisions

- **Config builder only, not a guard wrapper**: The guard pattern has enough variation (e.g., `continueStream` doesn't reset `setActiveSubAgentId`) that wrapping it would add indirection without clarity
- **Fix `user_id` via the builder**: The builder should include `user_id` in `configurable` consistently, resolving the existing divergence

## Outstanding Questions

### Deferred to Planning
- [Affects R1][Technical] Should `buildSubmitConfig` be a plain function or wrapped in `useCallback`? It reads from refs so identity stability may not matter, but should be verified
- [Affects R2][Technical] `retryFromMessage` passes `metadata` from `stream.getMessagesMetadata()` instead of `metadataRef.current` — verify whether this override should be preserved as a method-specific merge or if it's another divergence

## Next Steps

→ `/ce:plan` for structured implementation planning
