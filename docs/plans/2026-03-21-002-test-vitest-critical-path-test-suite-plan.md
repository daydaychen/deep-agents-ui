---
title: "test: Bootstrap Vitest and test critical-path modules"
type: test
status: completed
date: 2026-03-21
origin: docs/brainstorms/2026-03-21-vitest-critical-path-test-suite-requirements.md
---

# test: Bootstrap Vitest and test critical-path modules

## Overview

Bootstrap Vitest with happy-dom and write targeted tests for the three highest-risk pure-logic modules, fixing known bugs along the way. This addresses the "zero tests" anti-pattern documented in AGENTS.md and covers ~40% of meaningful logic paths.

## Problem Statement

The project has zero tests — no framework, no files, no dependencies (see origin: `docs/brainstorms/2026-03-21-vitest-critical-path-test-suite-requirements.md`). Three modules contain actual latent bugs:
1. `safe-json-parse.ts` — depth check counts `{` in strings, bypassable
2. `tool-result-parser.ts` — `tryParseJSON` uses raw `JSON.parse`, bypassing prototype pollution protection
3. `useProcessedMessages` — mutable in-place mutations on objects within `useMemo`

## Proposed Solution

Add Vitest + happy-dom + `@testing-library/react`, write tests for all three modules, fix the two known bugs (R4, R6 from origin).

## Technical Considerations

- **happy-dom over jsdom**: Faster execution, lighter memory footprint, sufficient for hook testing via `renderHook`. No full browser rendering needed.
- **Path aliases**: Vitest needs `resolve.alias` in config to match tsconfig's `@/*` → `./src/*` mapping.
- **LangGraph SDK mocking**: `useProcessedMessages` consumes `Message` from `@langchain/langgraph-sdk`. Tests will use plain fixture objects conforming to the `Message` type — no SDK mock needed since the hook only reads properties.
- **React strict mode**: `useMemo` in `useProcessedMessages` mutates `tc.status` and `sa.status` on objects created in the same reduce pass. Under strict mode, React may double-invoke the memo function — but since each invocation creates fresh objects via `reduce`, this is actually safe. Tests should verify this explicitly.
- **Biome compliance**: Test files must follow project conventions — double quotes, semicolons, 2-space indent.

## Implementation Units

### Unit 1: Bootstrap Vitest

**Goal**: Get `pnpm test` working with an empty test suite.

**Files**:
- `vitest.config.ts` — new
- `package.json` — add `test` script and dev dependencies
- `tsconfig.json` — no changes needed (Vitest uses its own TS handling)

**Approach**:
1. Install: `vitest`, `happy-dom`, `@testing-library/react`, `@testing-library/react-hooks` (if needed for React 19 — check if `@testing-library/react` v16+ includes `renderHook`)
2. Create `vitest.config.ts` at project root:
   - `test.environment: "happy-dom"`
   - `test.include: ["src/**/*.test.ts", "src/**/*.test.tsx"]`
   - `resolve.alias: { "@": path.resolve(__dirname, "src") }`
3. Add `"test": "vitest run"` and `"test:watch": "vitest"` to package.json scripts
4. Verify `pnpm test` runs with zero tests (exit 0)

**Patterns to follow**: `biome.json` for formatting rules, `tsconfig.json` for path alias pattern

**Verification**: `pnpm test` exits successfully. `pnpm test:watch` starts in watch mode.

### Unit 2: Test and fix `safe-json-parse.ts`

**Goal**: Full test coverage for all code paths, fix the depth check bug (R3, R4).

**Files**:
- `src/lib/safe-json-parse.test.ts` — new
- `src/lib/safe-json-parse.ts` — fix depth check

**Approach**:
1. Write tests first (test-first for the bug fix):
   - Valid JSON parsing (object, array, string, number, null)
   - Prototype pollution detection: `__proto__`, `constructor`, `prototype` keys
   - Prototype pollution with `disallowPrototypes: false` (should pass)
   - **Depth check bug**: `'{"key": "value with { braces }"}'` — should NOT exceed depth 1, but current code counts all `{`
   - Depth check with actually nested objects at various depths
   - `maxDepth` option override
   - Invalid JSON throws
2. Fix the depth check: Replace `(str.match(/{/g) || []).length` with a `JSON.parse` reviver that tracks nesting depth, or a simple iterative scanner that respects string boundaries.
   - Recommended: Parse with `JSON.parse` using a reviver that counts max nesting depth. This is the simplest correct approach — let the JSON parser handle string escaping.

**Execution note**: Test-first. Write failing test for the depth bug, then fix.

**Verification**: All tests pass. The depth check correctly ignores `{` inside string values.

### Unit 3: Test and fix `tool-result-parser.ts`

**Goal**: Test all exported functions and fix `tryParseJSON` to use safe parser (R5, R6).

**Files**:
- `src/app/utils/tool-result-parser.test.ts` — new
- `src/app/utils/tool-result-parser.ts` — replace `tryParseJSON` with `parseJSON` import

**Approach**:
1. Write tests for `getToolCategory`:
   - Each prefix: `task_`, `test_`, `hook_`, `template_`, `browser_`, `agent_browser`
   - Unknown tool name returns `"unknown"`

2. Write tests for `getToolSummary`:
   - Each entry in `SUMMARY_MAP` (18 tools) with representative JSON results
   - Unknown tool returns `null`
   - Undefined result returns `null`
   - Malformed JSON result (should not crash)

3. Write tests for `parseToolResult`:
   - `task_stages_get` → type `"config"`
   - `task_stage_config`, `task_stage_add`, `task_stage_parser_fields_setup` → type `"config"`
   - `task_validate` with valid/invalid results → type `"validation"`
   - `test_*` tools → type `"test_log"` with parsed SSE log entries
   - `browser_screenshot` → type `"screenshot"`
   - Unknown tool → `null`
   - Undefined result → `null`

4. Write tests for `parseSSELog`:
   - Lines with error/warn/success keywords get correct levels
   - `data:` prefix stripped
   - Empty lines filtered

5. Write tests for `detectAntiCrawl`:
   - 403/forbidden → `"bot_protection"`
   - 429/rate limit → `"rate_limit"`
   - captcha/验证码 → `"captcha"`
   - Normal content → `null`

6. Fix `tryParseJSON`: Replace `JSON.parse(str)` with `parseJSON(str, { maxDepth: 50 })` imported from `@/lib/safe-json-parse`. Use a high maxDepth since tool results can be deeply nested. Wrap in try/catch returning null (preserving current error behavior).

**Execution note**: Write tests for existing behavior first, then fix `tryParseJSON` and verify tests still pass (except the new security test that should now pass).

**Verification**: All 5 exported functions have test coverage. `tryParseJSON` now rejects prototype pollution attempts.

### Unit 4: Test `useProcessedMessages` hook

**Goal**: Test all processing branches including tool call extraction from 3 message shapes (R7, R8).

**Files**:
- `src/app/hooks/chat/useProcessedMessages.test.tsx` — new

**Approach**:
1. Create message fixtures conforming to `Message` type:
   - Human message (type: `"human"`, string content)
   - AI message with no tool calls
   - AI message with `additional_kwargs.tool_calls` (OpenAI format)
   - AI message with `tool_calls` array (LangGraph format)
   - AI message with `content[]` containing `tool_use` blocks (Anthropic format)
   - Tool message (type: `"tool"`, with `tool_call_id`)
   - AI message with `reasoning_content` in additional_kwargs

2. Test cases using `renderHook` from `@testing-library/react`:
   - Empty messages → empty array
   - Human messages pass through with `showAvatar: true`
   - Tool messages skipped from output
   - Tool message updates matching tool call's `status` to `"completed"` and sets `result`
   - Avatar grouping: consecutive same-type messages → `showAvatar: false` after first
   - Avatar shown when type changes (human → ai)
   - Avatar shown when `sender_id` changes
   - Tool calls extracted from all 3 message shapes
   - SubAgent extraction integrates with `subagentMessagesMap`
   - Interrupt parameter sets tool call status to `"interrupted"`
   - **Strict mode safety**: Render hook with `React.StrictMode` wrapper, verify no double-mutation artifacts

3. Mock `extractSubAgents` and `extractStringFromMessageContent` from `@/app/utils/utils` via `vi.mock` to isolate the hook logic.

**Patterns to follow**: Fixture objects matching `Message` interface from `@langchain/langgraph-sdk`

**Verification**: All test cases pass. Hook works correctly under strict mode wrapper.

## Acceptance Criteria

- [ ] `pnpm test` runs and passes (R1, R2)
- [ ] `safe-json-parse.ts` depth check correctly handles `{` inside string values (R3, R4)
- [ ] `tool-result-parser.ts` `tryParseJSON` uses safe parser (R5, R6)
- [ ] `useProcessedMessages` tested for all 3 tool call extraction shapes (R7)
- [ ] `useProcessedMessages` verified safe under React strict mode (R8)
- [ ] No `as any` introduced in tests
- [ ] Biome lint + format pass on all new files
- [ ] No snapshot tests — explicit assertions only (see origin: scope boundaries)

## Sources & References

- **Origin document:** [docs/brainstorms/2026-03-21-vitest-critical-path-test-suite-requirements.md](docs/brainstorms/2026-03-21-vitest-critical-path-test-suite-requirements.md) — Key decisions: fix bugs in same PR, Vitest over Jest, zero app dependency
- **Target files:** `src/lib/safe-json-parse.ts`, `src/app/utils/tool-result-parser.ts`, `src/app/hooks/chat/useProcessedMessages.ts`
- **Type definitions:** `src/app/types/types.ts` (ToolCall, SubAgent), `src/app/components/inspector/inspector-context.ts` (LogEntry, Screenshot, ValidationResult)
- **AGENTS.md anti-pattern:** Root AGENTS.md line 62 and hooks AGENTS.md line 95 both document "No tests" / "Missing: Test automation"
- **Performance learnings:** `docs/solutions/performance-issues/optimizing-chat-streaming-performance-and-stability.md` — error isolation context
