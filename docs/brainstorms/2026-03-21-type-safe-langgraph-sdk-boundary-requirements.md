---
date: 2026-03-21
topic: type-safe-langgraph-sdk-boundary
---

# Type-Safe LangGraph SDK Boundary

## Problem Frame

The LangGraph SDK boundary — where SDK data enters the UI — has 5 `as any` casts, 2 untyped `interrupt: any` declarations, and 3 independent content-extraction implementations. A backend schema change would silently break the UI at runtime. The original P1 prototype pollution concern in `tryParseJSON` has already been fixed (`safe-json-parse.ts` has proper regex + post-parse depth checks with 20+ tests).

## Requirements

- R1. Replace all `as any` casts at the LangGraph SDK boundary with discriminated union types or proper type narrowing
  - `useThreads.ts:105,115` — message content array element access
  - `useSubAgents.ts:38` — message metadata access for `lc_agent_name`
  - `ToolCallBox.tsx:437` — UI component cast
  - `utils.ts:51` — message metadata access
- R2. Consolidate duplicate content-extraction patterns into a single reusable utility
  - `extractStringFromMessageContent` in `utils.ts` (canonical implementation)
  - Inline `typeof content === "string" ? content : (content[0] as any)?.text` in `useThreads.ts:101-105` and `useThreads.ts:111-115`
- R3. Type the `interrupt` data — replace `interrupt?: any` with proper typed definitions
  - `useProcessedMessages.ts:27` — `interrupt?: any` parameter
  - `TasksSection.tsx:16` — `interrupt: any` prop
  - Both should use the existing `InterruptData` type from `types.ts`
- R4. All existing tests continue to pass. No behavioral changes — this is a pure type-safety refactor.

## Success Criteria

- Zero `as any` casts at the SDK boundary (the 5 listed above)
- Zero `interrupt: any` declarations
- `useThreads.ts` uses the shared content-extraction utility instead of inline casts
- `pnpm check` (Biome) passes
- TypeScript compilation succeeds with no new errors
- All existing tests pass

## Scope Boundaries

- NOT adding new runtime validation or parsing logic (safe-json-parse is already fixed)
- NOT adding `declare module` augmentations to the SDK — work with existing SDK types
- NOT refactoring content-extraction beyond consolidation (no new extraction logic)
- NOT changing any runtime behavior — purely compile-time type improvements

## Key Decisions

- **Reuse existing `InterruptData` / `ToolApprovalInterruptData` types**: Already defined in `types.ts`, just not used everywhere
- **Reuse existing `extractStringFromMessageContent`**: Already handles string | array content correctly in `utils.ts`, just not used in `useThreads.ts`
- **Prototype pollution is out of scope**: Already addressed by `safe-json-parse.ts` with proper implementation and tests

## Dependencies / Assumptions

- LangGraph SDK `@langchain/langgraph-sdk` message types expose `.content` as `string | MessageContentComplex[]` — need to verify exact SDK type declarations during planning

## Outstanding Questions

### Deferred to Planning

- [Affects R1][Needs research] What are the exact TypeScript types exported by `@langchain/langgraph-sdk` for message content blocks? Need to check if `TextBlock`, `ToolUseBlock` etc. are exported or need local definitions.
- [Affects R1][Technical] For `ToolCallBox.tsx:437` (`uiComponent as any`), what is the correct type for the `message` prop? Need to trace the component's expected interface.
- [Affects R1][Technical] For `utils.ts:51` and `useSubAgents.ts:38`, is `metadata` typed on the SDK `Message` type or does it need a type assertion with a narrower custom type?

## Next Steps

→ `/ce:plan` for structured implementation planning
