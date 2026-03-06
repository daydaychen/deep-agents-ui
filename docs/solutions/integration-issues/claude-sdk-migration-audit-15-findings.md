---
title: "SDK Migration Audit: 15 Critical, Important, and Cleanup Findings Across Auth, Streaming, Session Management, and Security"
date: 2026-03-06
category: integration-issues
severity: critical
component: "api-layer (auth, chat route, session-manager, sdk-message-processor, next.config)"
tags:
  - claude-agent-sdk
  - sdk-migration
  - security-hardening
  - sse-streaming
  - session-management
  - type-safety
symptoms:
  - "Subagent messages silently dropped: addSubagentMessage was a no-op stub"
  - "Tool call status permanently stuck on 'pending': synthetic tool_result messages discarded"
  - "Production deployable without API_SECRET_KEY: auth middleware silently bypassed"
  - "No security headers: responses lacked X-Frame-Options, HSTS, CORS"
  - "SSE connections dropped by reverse proxies: no heartbeat during long thinking periods"
root_cause: >
  The LangGraph-to-Claude-Agent-SDK migration introduced an incomplete message processor
  with a no-op addSubagentMessage stub and silently discarded synthetic tool_result messages.
  Auth middleware lacked a production guard and used plain string comparison for tokens.
  Security headers were never configured. Several LangGraph-era patterns (uuid dependency,
  useSWRInfinite, derived context types) were not updated. Session lifecycle had no reaper
  or failure cleanup, and the SSE stream had no heartbeat or threadId-first event.
resolution: >
  Implemented 15 fixes across 19 files (+378/-227 lines): connected subagent message storage,
  processed synthetic tool results, added production auth guard with timing-safe comparison,
  configured 7 security headers and CORS, added model allowlist and error sanitization,
  cached file reads, added SSE heartbeat, implemented session orphan reaper, wrapped SDK calls
  in try/catch, eliminated as any casts, emitted threadId as first SSE event, removed ~52 lines
  of dead code, standardized response patterns, and replaced derived types with explicit interfaces.
time_to_resolve: "4-6 hours"
related_docs:
  - docs/plans/2026-03-06-migration-deepagents-to-claude-agent-sdk.md
  - docs/plans/2026-03-06-frontend-ui-adaptation-langgraph-sdk-to-claude-agent-sdk-sse.md
  - docs/solutions/integration-issues/langgraph-sdk-retry-edit-message-operations.md
  - docs/solutions/performance-issues/optimizing-chat-streaming-performance-and-stability.md
commit: 8bac5131407561d0e8cb0a155d7c276e9bdb8dbb
branch: claude-sdk-migration
---

# SDK Migration Audit: 15 Findings Across Auth, Streaming, Session Management, and Security

## Context

During the migration from LangGraph SDK to Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`), a comprehensive code review audit identified 15 findings across security, performance, correctness, and code quality. This document captures all findings, their root causes, solutions, and prevention strategies.

**Commit:** `8bac513` | **Files changed:** 19 | **Lines:** +378/-227

---

## P1 -- Critical Findings (5)

### 1. Subagent Messages Silently Discarded

**File:** `src/lib/sdk-message-processor.ts`

**Symptom:** The subagent UI panel was completely blank. No subagent output was visible.

**Root cause:** `addSubagentMessage()` was a no-op stub -- it had comments about intent but never stored messages to any data structure.

**Before:**
```typescript
function addSubagentMessage(state: ProcessorState, parentToolUseId: string, message: UIMessage) {
  if (!message.parentToolUseId) return;
  // Not adding to main messages -- caller will use getSubagentMessagesMap()
}
```

**After:**
```typescript
function addSubagentMessage(state: ProcessorState, parentToolUseId: string, message: UIMessage) {
  const existing = state.subagentMessages.get(parentToolUseId);
  if (existing) {
    existing.push(message);
  } else {
    state.subagentMessages.set(parentToolUseId, [message]);
  }
}
```

`getSubagentMessagesMap()` was also fixed to merge finalized messages with in-flight streaming messages.

---

### 2. Tool Status Permanently Stuck "pending"

**File:** `src/lib/sdk-message-processor.ts`

**Symptom:** Every tool call spinner in the UI spun forever. No success/failure indication.

**Root cause:** The Claude Agent SDK sends synthetic user messages containing `tool_result` content blocks. The migration code had `if (msg.isSynthetic) return;` which silently discarded all tool results.

**Before:**
```typescript
function processUserMessage(state: ProcessorState, msg: Record<string, unknown>) {
  if (msg.isSynthetic) return;  // all tool results dropped
```

**After:**
```typescript
function processUserMessage(state: ProcessorState, msg: Record<string, unknown>) {
  if (msg.isSynthetic) {
    processSyntheticToolResult(state, msg);  // now processes tool results
    return;
  }
```

Added `processSyntheticToolResult()` (~30 lines) that extracts `tool_result` content blocks and calls `resolveToolCallById()` (~25 lines) to transition tool statuses to `"completed"` or `"error"`.

---

### 3. No Production Auth Guard; Timing-Attack Vulnerable Token Comparison

**File:** `src/lib/auth.ts`

**Symptom:** Production deploy without `API_SECRET_KEY` had zero authentication. Token comparison leaked secret length via timing side-channel.

**Root cause:** Auth logic used `if (secret) { ... }` which silently bypassed auth when the env var was unset, regardless of environment. Token comparison used `===`.

**After:**
```typescript
import crypto from "crypto";

function timingSafeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf-8");
  const bufB = Buffer.from(b, "utf-8");
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA);  // constant-time even on length mismatch
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

// Production guard:
if (!secret) {
  if (isProduction) {
    console.error("[AUTH] FATAL: API_SECRET_KEY is not set...");
    return NextResponse.json(
      { error: "Server misconfiguration: authentication is not configured" },
      { status: 500 }
    );
  }
  console.warn("[AUTH] WARNING: API_SECRET_KEY is not set...");
  return handler(req, ctx);
}
```

---

### 4. No Security Headers (CSP, HSTS, X-Frame-Options, CORS)

**File:** `next.config.ts`

**Symptom:** App vulnerable to clickjacking, MIME sniffing, downgrade attacks, and unrestricted cross-origin API access.

**Fix:** Added `headers()` to `next.config.ts`:
```typescript
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];
```

Plus per-route CORS on `/api/:path*` with `ALLOWED_ORIGINS` env var.

**Known gaps (deferred):** CSP (`Content-Security-Policy`) was not added due to complexity of tuning for the app's inline scripts/styles -- this should be addressed separately. The `ALLOWED_ORIGINS` env var defaults to an empty string when unset; a production guard analogous to P1-3's auth guard should be considered.

---

### 5. Model Name Not Validated; Zod Errors Leaked to Client

**Files:** `src/lib/validation.ts`, `src/app/api/chat/route.ts`

**Fix:** Added regex prefix allowlist for model names and replaced raw Zod error responses with generic messages:
```typescript
// validation.ts -- prefix check; consider tightening to /^claude-[a-z0-9._-]+$/ for defense-in-depth
model: z.string().regex(/^claude-/, "Model must be a Claude model").optional(),

// route.ts - before: { error: parsed.error.issues }
return NextResponse.json({ error: "Invalid request parameters" }, { status: 400 });
```

---

## P2 -- Important Findings (6)

### 6. File Reads on Every Request

**Files:** `src/lib/agent/agents.ts`, `src/lib/agent/config.ts`

**Fix:** Cached `readFileSync` at module scope with startup-time Map/variable:
```typescript
const promptCache = new Map<string, string>();
for (const name of ["analyst", "databus_specialist", "config_validator"]) {
  try { promptCache.set(name, readFileSync(join(PROMPT_DIR, `${name}.md`), "utf-8")); }
  catch (err) { promptCache.set(name, ""); }
}
```

---

### 7. SSE Connections Die During Long Agent Thinking

**File:** `src/app/api/chat/route.ts`

**Fix:** Added 15-second SSE heartbeat comment:
```typescript
heartbeatTimer = setInterval(() => {
  try { controller.enqueue(encoder.encode(": heartbeat\n\n")); }
  catch { clearHeartbeat(); }
}, 15_000);
```

SSE comments (`:` prefix) are ignored by EventSource clients but keep TCP connections alive through proxies.

---

### 8. No Session Orphan Reaper

**File:** `src/lib/agent/session-manager.ts`

**Fix:** Background reaper every 60s with configurable TTL (default 10min):
```typescript
private reapOrphanedSessions(): void {
  const now = Date.now();
  for (const [threadId, session] of this.active) {
    if (now - session.startedAt.getTime() > this.maxLifetimeMs) {
      try { session.abortController.abort(); } catch {}
      this.active.delete(threadId);
    }
  }
}
```

Timer uses `.unref()` to avoid blocking process exit.

---

### 9. query() Failure Leaks Session Slot

**File:** `src/app/api/chat/route.ts`

**Fix:** Wrapped `query()` in try/catch with explicit session cleanup:
```typescript
sessionManager.register(effectiveThreadId, abortController);
let result;
try {
  result = query({ prompt: message, options });
} catch (error) {
  sessionManager.unregister(effectiveThreadId);
  return NextResponse.json({ error: "An internal error occurred" }, { status: 500 });
}
```

---

### 10. Type Safety -- `as any` Casts

**Files:** `src/lib/auth.ts`, `src/lib/sdk-message-processor.ts`

**Fix:** `ctx: any` became `ctx: Record<string, unknown>`. `(msg as any).isReplay` became proper type narrowing with `"isReplay" in msg && msg.isReplay`.

---

### 11. threadId Not Available Until First Message

**File:** `src/app/api/chat/route.ts`

**Fix:** Emit threadId as the very first SSE event:
```typescript
start(controller) {
  controller.enqueue(
    encoder.encode(`event: thread_id\ndata: ${JSON.stringify({ threadId: effectiveThreadId })}\n\n`)
  );
}
```

---

## P3 -- Cleanup (4)

### 12. Dead Code Removed (~52 lines)

Removed: `StreamState` interface, duplicate `ToolCall`/`SubAgent` types, unused `getActive()`/`getActiveCount()`/`has()` methods, `getMessagesMetadata` callback, `isStreaming` alias.

### 13. Standardized Patterns

All routes now use `NextResponse.json()`. UUID generation uses `crypto.randomUUID()`. Route configs (`dynamic`, `maxDuration`) applied consistently.

### 14. Removed `uuid` Package Dependency

Replaced `import { v4 as uuidv4 } from "uuid"` with native `crypto.randomUUID()`. Removed `uuid` and `@types/uuid` from `package.json`.

### 15. Replaced Fragile Derived Context Types

Replaced `Omit<ReturnType<typeof useChat>, ...>` with explicit `ChatStateContextType` and `ChatActionsContextType` interfaces. Also replaced `useSWRInfinite` with `useSWR` (no real server-side pagination existed).

---

## Prevention Strategies

### SDK Migration Checklist

1. **Map every SDK message type** to a handler. Verify every write function actually mutates state.
2. **Auth middleware must fail-closed** in production. Use `crypto.timingSafeEqual`, never `===`.
3. **Security headers** should be configured at project creation, not as an afterthought.
4. **Every SSE endpoint** needs a heartbeat mechanism (15s interval, SSE comment syntax).
5. **Session lifecycle** must handle all exit paths: success, error, cancel, timeout.
6. **Ban `as any`** via ESLint `@typescript-eslint/no-explicit-any: error`.
7. **Define context types explicitly** -- never derive from `ReturnType<typeof ...>` with `Omit`/`Pick`.

### Code Review Checklist for Migrations

- [ ] Does every `addX`/`storeX` function actually mutate state?
- [ ] For every `if (...) return;` early exit, verify no side effects are skipped
- [ ] Does auth enforce in production even with missing env vars?
- [ ] Is token comparison timing-safe?
- [ ] Does `next.config.ts` define security headers?
- [ ] Are CORS headers scoped to `/api/:path*` only?
- [ ] Do error responses contain only generic messages?
- [ ] Are all user-supplied strings validated with allowlists?
- [ ] Is every external SDK call wrapped in try/catch with cleanup?
- [ ] Are there zero `as any` casts in the diff?
- [ ] Are there duplicate type definitions across files?
- [ ] Run `tsc --noEmit` with strict settings

### Recommended CI Gates

Prioritize P1-matching gates first; others can be added incrementally.

| Gate | Tool | Catches |
|------|------|---------|
| No `as any` | `@typescript-eslint/no-explicit-any` | Type safety violations |
| Strict TypeScript | `tsc --noEmit --strict` | Dead code, type errors |
| Unused deps | `depcheck` | Unnecessary packages |
| Security headers | Integration test | Missing headers |
| Auth enforcement | Unit test matrix | Auth bypass |
| Response sanitization | Grep for `String(error)` | Error leakage |
| SSE heartbeat | Integration test | Proxy timeout |
| Session cleanup | Unit tests | Session orphans |

### Tests That Would Have Caught These Issues

**P1-1 (Message loss):** Call `addSubagentMessage`, then `getSubagentMessagesMap`, assert message exists.

**P1-2 (Stuck tools):** Process `[assistant_with_tool_call, synthetic_tool_result]`, assert tool status transitions to `"completed"`.

**P1-3 (Auth bypass):** Set `NODE_ENV=production`, unset `API_SECRET_KEY`, assert 500 response.

**P2-7 (SSE timeout):** Mock SDK to delay 30s, verify heartbeat comments received.

**P2-8 (Session leak):** Register session, simulate query failure, assert session unregistered.

---

## Key Takeaway

The 15 findings cluster into three systemic gaps:

1. **Incomplete state wiring** (P1-1, P1-2): Data flow paths were partially implemented during migration. Prevention: map every SDK message type to a handler, test round-trip data flow.

2. **Security-by-default gaps** (P1-3, P1-4, P1-5): Security was treated as additive rather than foundational. Prevention: enforce auth in production by default, add headers at project creation, sanitize all client-facing errors.

3. **Accumulated technical debt** (P2-6, P2-10, P3-12--15): Migration shortcuts (casts, duplicate types, inconsistent patterns) compound into maintenance burden. Prevention: enforce type strictness in CI, run dead code detection post-migration.

---

## Related Documentation

- [Migration Plan: deepagents to Claude Agent SDK](../plans/2026-03-06-migration-deepagents-to-claude-agent-sdk.md)
- [Frontend UI Adaptation Plan](../plans/2026-03-06-frontend-ui-adaptation-langgraph-sdk-to-claude-agent-sdk-sse.md)
- [LangGraph SDK Retry/Edit Operations](./langgraph-sdk-retry-edit-message-operations.md) (superseded)
- [Streaming Performance Optimization](../performance-issues/optimizing-chat-streaming-performance-and-stability.md)

## Commit Chain

| Commit | Description | Relationship |
|--------|-------------|-------------|
| `a6aeb12` | Phase 1A -- SDK install, auth, validation, route skeleton | Foundation hardened by this audit |
| `96479ca` | Phase 1B -- Subagent definitions, prompts | File caching fix |
| `9224c17` | Phase 1C -- SSE streaming, session management | Heartbeat and reaper additions |
| `0bf3dd9` | Phase 2 -- Frontend UI adaptation | Type safety and dead code fixes |
| `5c7cd5d` | Auth dev-mode bypass | Superseded by production guard |
| **`8bac513`** | **This fix -- 15 code review findings** | -- |
| `ac5ffea` | Make withAuth generic for route context types | Follow-up to auth changes |
