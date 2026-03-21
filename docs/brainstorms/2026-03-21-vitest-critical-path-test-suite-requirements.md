---
date: 2026-03-21
topic: vitest-critical-path-test-suite
---

# Vitest + Critical-Path Test Suite

## Problem Frame

The project has zero tests — no test framework configured, no test files, no test dependencies. This is the single largest risk multiplier in the codebase. Three pure-logic modules contain actual latent bugs and cover ~40% of meaningful logic paths. Bootstrapping Vitest and testing these modules gives the highest safety return for the effort.

## Requirements

- R1. Bootstrap Vitest with a DOM environment (jsdom or happy-dom) so pure-logic and hook tests can run
- R2. Add a `test` script to package.json so tests are runnable via `pnpm test`
- R3. Write tests for `safe-json-parse.ts` covering: valid JSON, prototype pollution rejection, depth limiting, and the known bug where the depth check counts `{` inside strings
- R4. Fix the depth check bug in `safe-json-parse.ts` — replace the regex-based `{` counter with a proper depth measurement
- R5. Write tests for `tool-result-parser.ts` covering: `getToolCategory` (6 branches), `getToolSummary` (dispatch through 18-entry map), `parseToolResult` (5 major branches), `parseSSELog` (level detection), `detectAntiCrawl` (3 detection patterns + null)
- R6. Fix `tool-result-parser.ts` `tryParseJSON` to use `safe-json-parse.ts` instead of raw `JSON.parse` — agent tool results can contain arbitrary web-scraped content
- R7. Write tests for `useProcessedMessages` hook covering: tool message skipping, tool call status mutation, avatar grouping, tool call extraction from 3 message shapes (additional_kwargs.tool_calls, tool_calls, content[].tool_use), subagent extraction
- R8. Verify `useProcessedMessages` mutable `tc.status` / `sa.status` assignments are safe under React strict mode (double-invocation of useMemo) — fix if not

## Success Criteria

- `pnpm test` runs and passes
- All three target modules have test coverage for their main code paths
- The `safe-json-parse.ts` depth check correctly handles `{` inside string values
- `tool-result-parser.ts` uses the safe parser for all JSON parsing
- No `as any` introduced in tests (use proper SDK type fixtures)

## Scope Boundaries

- Do NOT test React components (ChatMessage, Inspector, etc.) — only pure-logic modules and hooks
- Do NOT add coverage thresholds or CI integration — that's follow-up work
- Do NOT test `usePersistedMessages` or other hooks — only `useProcessedMessages`
- Do NOT change the behavior of any module except the two explicit bug fixes (R4, R6)
- Do NOT add snapshot tests — prefer explicit assertions

## Key Decisions

- **Fix bugs in same PR**: When tests reveal bugs (depth check, tryParseJSON), fix them alongside the tests rather than characterizing current broken behavior. Delivers more value from the testing effort.
- **Vitest over Jest**: Vitest is the standard for Vite/modern ESM projects, has first-class TypeScript support, and is already used by deps in node_modules (Vercel packages).
- **Zero dependency on running app**: All tests should work with direct imports and mocked SDK types — no need for a running dev server.

## Outstanding Questions

### Deferred to Planning

- [Affects R1][Technical] jsdom vs happy-dom — which DOM environment is the better fit for this project's needs?
- [Affects R7][Technical] How to best mock LangGraph SDK `Message` types for useProcessedMessages tests — fixture objects vs factory function?
- [Affects R4][Technical] Best approach for proper JSON depth measurement — JSON.parse reviver, iterative parser, or structural analysis?

## Next Steps

→ `/ce:plan` for structured implementation planning
