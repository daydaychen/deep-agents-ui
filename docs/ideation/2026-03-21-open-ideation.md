---
date: 2026-03-21
topic: open-ideation
focus: open-ended
---

# Ideation: deep-agents-ui Open Improvement Ideas

## Codebase Context

**Project**: deep-agents-ui — TypeScript/Next.js 16 (App Router) + React 19 SPA for AI agent chat. Styled with Tailwind CSS + shadcn/ui (Radix primitives). LangGraph SDK for agent orchestration. pnpm 9, Biome linter, i18n via next-intl (en/zh).

**Architecture**: Feature-parallel structure — `components/{feature}/` mirrors `hooks/{feature}/`. ~29 React.memo'd components. URL state via nuqs, data fetching via SWR. Purely client-side SPA in a Next.js wrapper (zero API routes or server components).

**Known pain points**:
- Zero tests — no test framework configured
- Monolithic hooks: `useChat.ts` (798 lines), `usePersistedMessages.ts` (250 lines)
- Relaxed type safety — `any` allowed, 5 `as any` casts at the LangGraph SDK boundary
- ~18 pending todos: P1s include memory leak in IndexedDB, auth validation, JSON prototype pollution
- ~15 standalone components outside feature folders
- Next.js server capabilities completely unused

**Past learnings**:
- LangGraph SDK has non-obvious defaults (`fetchStateHistory` defaults to 10, `streamResumable:false` cancels runs)
- Streaming needs 100ms throttling, O(N) message processing, progressive rendering for code blocks
- Ref-based guards needed for race conditions, not just React state
- Each ChatMessage wrapped in ErrorBoundary to isolate failures

## Ranked Ideas

### 1. Extract Submit-Config Builder
**Description:** The 5-6 near-identical `stream.submit()` blocks in `useChat.ts` (sendMessage, runSingleStep, continueStream, retryFromMessage, editMessage) each repeat ~30 lines of ref-reading, config assembly, and options construction. Extract a single `buildSubmitOptions()` helper that returns the complete options object. Each action method shrinks to 3-5 lines, cutting useChat.ts by ~150 lines.
**Rationale:** Unanimous across all 6 ideation frames. Highest leverage-to-effort ratio in the codebase. Every future config change (new stream mode, new override key) currently requires 5-6 synchronized edits — a guaranteed source of divergence bugs. The pattern at lines 222-256, 280-344, 355-392, 458-508, 521-582 is identical: read overrideConfigRef/metadataRef/recursionLimitRef/recursionMultiplierRef/activeAssistantConfigRef, compute finalRecursionLimit, call getFinalConfigurable(), build assistantConfig, submit with identical streamMode/streamSubgraphs/streamResumable.
**Downsides:** Low risk. Requires careful extraction to preserve subtle differences between submit paths (checkpoint passing in retry/edit vs. fresh in send).
**Confidence:** 95%
**Complexity:** Low
**Status:** Explored

### 2. Fix IndexedDB with a Proper Connection Abstraction
**Description:** Replace the raw `indexedDB.open()` calls in `db.ts` and `usePersistedMessages.ts` with a connection-pooled wrapper (or adopt idb-keyval/Dexie ~20KB). Add automatic eviction for stale thread data (TTL-based cleanup). Fix the race condition where `db?.close()` in the useEffect cleanup fires against an unresolved promise when threadId changes rapidly.
**Rationale:** Directly addresses the P1 memory leak. The dual-connection pattern (long-lived ref in the hook, ephemeral per-call in db.ts) is the most error-prone code in the repo. `usePersistedMessages.ts` opens a new connection on every threadId change (line 94-138) but the cleanup races against the async openDB promise. A proper abstraction would cut the hook from 250 lines to ~60.
**Downsides:** Introducing a dependency like Dexie adds ~20KB. The TTL eviction policy needs careful tuning to avoid deleting data users expect to persist.
**Confidence:** 90%
**Complexity:** Medium
**Status:** Explored

### 3. Vitest + Critical-Path Test Suite
**Description:** Bootstrap Vitest with jsdom/happy-dom and write targeted tests for the three highest-risk pure-logic modules: (1) `safe-json-parse.ts` prototype pollution guard (currently bypassable — the depth check counts all `{` characters including those inside strings), (2) `tool-result-parser.ts` (18 code paths, feeds the Inspector), (3) `useProcessedMessages` (single-pass pipeline with mutable in-place mutations fragile under React strict mode).
**Rationale:** Zero tests is the single largest risk multiplier. These three modules cover ~40% of meaningful logic paths and contain actual latent bugs (regex-based depth check in safe-json-parse, mutable `tc.status` assignments in useProcessedMessages that could double-mutate under strict mode).
**Downsides:** Initial setup cost. Mocking LangGraph SDK types requires understanding actual message shapes.
**Confidence:** 90%
**Complexity:** Medium
**Status:** Explored

### 4. Next.js BFF Proxy Layer
**Description:** Add a Next.js Route Handler (`/api/langgraph/[...path]`) that proxies requests to the LangGraph deployment URL, moving credentials server-side. The client-side `ClientProvider` would point at `/api/langgraph` instead of the raw deployment URL. Store sensitive config in environment variables or HTTP-only cookies instead of localStorage. This enables server-side rate limiting, audit logging (`audit-logger.ts` TODO finally gets a backend), and CORS lockdown.
**Rationale:** First real use of Next.js server capabilities (currently 100% wasted). Eliminates client-side credential exposure — `config.ts` stores `deploymentUrl` in plain localStorage, visible in DevTools and extractable via any XSS. The `audit-logger.ts` line 38 TODO "Send to backend audit service when available" gets its backend.
**Downsides:** Highest complexity. Adds a network hop. Requires config migration from localStorage. The SSE streaming proxy needs careful buffering implementation.
**Confidence:** 85%
**Complexity:** High
**Status:** Explored

### 5. Type-Safe LangGraph SDK Boundary
**Description:** Define discriminated union types for message content (string | TextBlock[] | ToolUseBlock[]), interrupt payloads (ToolApprovalInterruptData | HumanInputInterruptData), and stream event metadata. Replace all 5 `as any` casts and 4 independent content-extraction implementations with exhaustive pattern matches. Include a sandboxed JSON parser (reviver rejecting `__proto__`/`constructor` keys) for all agent-generated content — addressing the P1 prototype pollution vector in `tryParseJSON`.
**Rationale:** The `as any` casts cluster at the most critical boundary: where LangGraph SDK data enters the UI. A backend schema change would silently break the UI at runtime. The prototype pollution through `tryParseJSON` (tool-result-parser.ts line 68-73) is a P1 security issue since tool results can contain arbitrary web-scraped content. Typing this boundary propagates safety to ~60% of the codebase.
**Downsides:** Requires understanding actual SDK message shapes vs. declared types. May need `declare module` augmentation.
**Confidence:** 85%
**Complexity:** Medium
**Status:** Unexplored

### 6. Message List Virtualization
**Description:** Replace the flat `processedMessages.map()` in ChatInterface (lines 305-349) with `@tanstack/react-virtual`. Only render messages in the viewport plus overscan. Integrate with existing `useStickToBottom` for auto-scroll during streaming.
**Rationale:** O(N) reconciliation cost on every 100ms throttled stream update. At 100+ messages (within DEFAULT_MESSAGE_LIMIT), each ChatMessage instantiates 6+ child components. `contentVisibility: 'auto'` only helps paint, not React reconciliation. Virtualization makes render time O(viewport) regardless of thread length.
**Downsides:** Variable-height messages make virtualization harder (need dynamic measurement). Branch switching may need special handling. Stick-to-bottom integration is a known friction point.
**Confidence:** 80%
**Complexity:** Medium
**Status:** Unexplored

### 7. ChatProvider Selector-Based Subscriptions
**Description:** Replace the dual-context split (ChatStateContext / ChatActionsContext) with a Zustand store or `useSyncExternalStore`-based selector pattern. Currently both contexts depend on `[chat]` as a single useMemo dependency (ChatProvider.tsx lines 44 and 72), so every stream tick re-renders all consumers. Selectors would let ChatInput subscribe only to `isLoading` and the message list subscribe only to `messages`.
**Rationale:** The dual-context "optimization" is defeated by its own implementation: both useMemo calls share the `[chat]` dependency. During streaming, this triggers re-renders in every component calling `useChatState()` including components that only read `threadId` or `isLoading`. This compounds with every other rendering cost.
**Downsides:** Zustand adds a dependency and paradigm shift. Custom `useSyncExternalStore` selectors are dependency-free but more complex to implement.
**Confidence:** 75%
**Complexity:** Medium
**Status:** Unexplored

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | Internationalize hardcoded strings | Real UX bug but low leverage; better as a follow-on task |
| 2 | Optimistic thread deletion with undo | Nice UX polish but narrow scope — only affects delete action |
| 3 | Progressive Markdown rendering | Subsumed by virtualization (off-screen code blocks never mount) |
| 4 | Declarative tool-result-parser registry | Good extensibility but current 18-tool list is stable; premature |
| 5 | Offline-first thread cache | Too ambitious; depends on BFF proxy and IndexedDB fix landing first |
| 6 | Connection-aware offline queue | High complexity, niche benefit; better after BFF proxy |
| 7 | Derive connection status from stream state | Too narrow alone; subsumed by broader connection improvements |
| 8 | Typed ToolCallBox-Inspector protocol | Subsumed by broader type-safety initiative (#5) |
| 9 | ErrorBoundary reporting to LangGraph backend | Requires BFF proxy (#4) first |
| 10 | Replace flatMap with stable Map for subagents | Too granular; subsumed by ChatProvider selector improvements |
| 11 | Streaming cost/token estimator | Novel but requires per-model pricing data that doesn't exist |
| 12 | Integration test with mocked Client | Variant of test framework (#3); subsumed |
| 13 | Replace IndexedDB entirely with server-side BFF | Too aggressive; proxy + improved IDB is more pragmatic |
| 14 | Connection resilience with exponential backoff | Full resilience layer is premature at this stage |

## Session Log
- 2026-03-21: Initial ideation — 48 raw ideas from 6 frames, ~20 unique after dedupe + 3 cross-cutting syntheses, 7 survivors
- 2026-03-21: Brainstorming idea #1 (Extract Submit-Config Builder)
- 2026-03-21: Brainstorming idea #2 (Fix IndexedDB Connection Abstraction)
- 2026-03-21: Brainstorming idea #3 (Vitest + Critical-Path Test Suite)
- 2026-03-21: Brainstorming idea #4 (Next.js BFF Credential Proxy)
