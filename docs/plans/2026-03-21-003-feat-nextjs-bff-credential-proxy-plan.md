---
title: "feat: Add Next.js BFF credential proxy for LangGraph API"
type: feat
status: completed
date: 2026-03-21
origin: docs/brainstorms/2026-03-21-nextjs-bff-credential-proxy-requirements.md
---

# feat: Add Next.js BFF credential proxy for LangGraph API

## Overview

Add a Next.js Route Handler (`/api/langgraph/[...path]`) that transparently proxies all LangGraph SDK requests, moving the deployment URL and API key server-side. The client never contacts the LangGraph deployment directly — all requests route through the same-origin proxy. This is the first use of Next.js server capabilities in the project.

## Problem Statement

The LangGraph deployment URL is stored in plain localStorage (`config.ts`) and passed directly to the client-side `Client` SDK (`ClientProvider.tsx`). Anyone with DevTools access can extract it; any XSS vulnerability exposes it completely. The app has zero API routes — Next.js server capabilities are entirely unused (see origin: `docs/brainstorms/2026-03-21-nextjs-bff-credential-proxy-requirements.md`).

## Proposed Solution

A transparent catch-all proxy that strips the `/api/langgraph` prefix and forwards requests to the upstream LangGraph deployment. SSE streaming responses are piped through without buffering. The `ClientProvider` points the SDK `Client` at the local proxy using an absolute URL (`window.location.origin + "/api/langgraph"`).

## Technical Considerations

- **LangGraph SDK requires absolute URLs**: `new URL(apiUrl + path)` in the SDK constructor throws on relative URLs. Must use `window.location.origin + "/api/langgraph"` (see origin: deferred question).
- **SSE reconnection headers**: The SDK reads `Location` and `Content-Location` response headers for automatic reconnection. The proxy must forward these headers and rewrite paths to include the `/api/langgraph` prefix so reconnection requests route through the proxy.
- **`duplex: 'half'`**: Required by Node.js fetch when forwarding `request.body` as a ReadableStream.
- **Next.js 16 `params` is a Promise**: Must `await params` in route handlers.
- **gzip buffering**: Next.js enables compression by default. SSE responses must set `Content-Type: text/event-stream` and `X-Accel-Buffering: no` to prevent buffering.
- **`streamResumable: true`**: Critical — if the client-to-proxy connection drops, the proxy-to-LangGraph connection closing should NOT cancel the server-side run (see learnings: `langgraph-sdk-retry-edit-message-operations.md`).
- **`ThreadState` O(n²) payload size**: At 100 messages with history limit 100, payloads reach ~7.6 MB. The proxy must stream these through without buffering into memory.
- **ConfigDialog refactor**: Currently creates temporary `Client` instances with the entered `deploymentUrl` to fetch assistants. After refactor, it should use `useClient()` from context since the proxy is always available.

## Implementation Units

### Unit 1: Create the proxy Route Handler

**Goal**: Transparent proxy at `/api/langgraph/[...path]` that forwards all HTTP methods and streams SSE responses.

**Files**:
- `src/app/api/langgraph/[...path]/route.ts` — new

**Approach**:
1. Read `LANGGRAPH_DEPLOYMENT_URL` from `process.env`. If not set, return 503 with `{ error: "LANGGRAPH_DEPLOYMENT_URL not configured" }`.
2. Export handlers for GET, POST, PUT, PATCH, DELETE. All delegate to a shared `proxyRequest()` function.
3. `proxyRequest()`:
   - Await `params` (Promise in Next.js 16) to get `path` segments
   - Join path segments: `path.join("/")`
   - Construct upstream URL: `new URL(pathname, LANGGRAPH_DEPLOYMENT_URL)`
   - Forward query parameters from `request.nextUrl.searchParams`
   - Selectively forward request headers: `content-type`, `accept`, `x-request-id`, `last-event-id` (for SSE reconnection)
   - Inject `x-api-key` from `LANGGRAPH_API_KEY` env var if present
   - For non-GET/HEAD requests, forward `request.body` with `duplex: 'half'`
   - Call `fetch()` to upstream
   - Forward response with selectively forwarded headers: `content-type`, `x-request-id`, `content-location`
   - For `Location` header: rewrite to include `/api/langgraph` prefix so reconnection routes through proxy
   - For SSE responses (`text/event-stream`): set `Cache-Control: no-cache, no-store`, `Connection: keep-alive`, `X-Accel-Buffering: no`
   - On fetch error, return 502 with error message
4. Return `new Response(backendResponse.body, { status, headers })` — pipe the ReadableStream directly without buffering.

**Patterns to follow**: Next.js official BFF proxy pattern (documented in v16.2.1). Use `NextRequest` for typed access to `nextUrl.searchParams`.

**Verification**: `curl http://localhost:3003/api/langgraph/assistants/search -X POST -H "Content-Type: application/json" -d '{}'` returns assistants from the upstream LangGraph deployment.

### Unit 2: Update next.config.ts

**Goal**: Add `X-Accel-Buffering: no` header for API routes to prevent nginx buffering in production.

**Files**:
- `next.config.ts` — modify

**Approach**:
1. Add `headers()` async function to nextConfig:
   - Source: `/api/:path*`
   - Header: `X-Accel-Buffering: no`

**Verification**: Response headers on `/api/langgraph/*` include `X-Accel-Buffering: no`.

### Unit 3: Update ClientProvider

**Goal**: Point the LangGraph `Client` at the local proxy instead of the raw deployment URL.

**Files**:
- `src/providers/ClientProvider.tsx` — modify

**Approach**:
1. Remove the `deploymentUrl` prop from `ClientProviderProps`.
2. Compute the proxy URL: `typeof window !== "undefined" ? window.location.origin + "/api/langgraph" : ""`.
3. Create the `Client` with `apiUrl: proxyUrl`.
4. Pass `apiKey: null` to the Client constructor to prevent it from trying to read `LANGGRAPH_API_KEY` from the browser environment (the proxy injects it server-side).
5. The `useMemo` dependency changes from `[deploymentUrl]` to `[proxyUrl]` (which is stable after mount).

**Patterns to follow**: Existing `ClientProvider.tsx` structure.

**Verification**: `useClient()` returns a Client pointing at `/api/langgraph`. Network tab shows requests going to same-origin `/api/langgraph/*`.

### Unit 4: Update config.ts and StandaloneConfig

**Goal**: Remove `deploymentUrl` from the config interface and localStorage storage.

**Files**:
- `src/lib/config.ts` — modify

**Approach**:
1. Remove `deploymentUrl` from the `StandaloneConfig` interface.
2. Increment `STORAGE_VERSION` to 2 so old localStorage entries with `deploymentUrl` are ignored (existing migration logic returns null for version mismatch).
3. Remove any references to `deploymentUrl` in `getConfig`/`saveConfig`.

**Verification**: `getConfig()` returns config without `deploymentUrl`. Old localStorage entries are safely ignored.

### Unit 5: Update ConfigDialog

**Goal**: Remove `deploymentUrl` field and use `useClient()` instead of creating temporary Client instances.

**Files**:
- `src/app/components/ConfigDialog.tsx` — modify

**Approach**:
1. Remove `deploymentUrl` state variable and its `<Input>` field.
2. Remove `currentDeploymentUrl` prop.
3. Replace all `new Client({ apiUrl: urlToUse })` calls with `useClient()` from context — the proxy is always available, no need for temporary clients.
4. Update `handleSave` to not require `deploymentUrl` (remove the validation check).
5. Update the `onSave` call to exclude `deploymentUrl` from the saved config.
6. Update the `ConfigDialogProps` interface accordingly.

**Execution note**: Read the full ConfigDialog first to understand all `deploymentUrl` / `currentDeploymentUrl` / `new Client(...)` usage before editing.

**Verification**: ConfigDialog opens, lists assistants via the proxy, saves config without `deploymentUrl`.

### Unit 6: Update ChatPage.tsx

**Goal**: Remove `deploymentUrl` from the config flow, update `ClientProvider` usage.

**Files**:
- `src/app/components/chat/ChatPage.tsx` — modify

**Approach**:
1. Remove `deploymentUrl` from `ClientProvider` — it no longer takes props (or just takes `children`).
2. Remove `currentDeploymentUrl` from `ConfigDialog` props.
3. Update initial config check: instead of requiring `deploymentUrl` to proceed, check if the proxy is available (optional — can just let the first API call fail).
4. The ConfigDialog should open when there is no `assistantId` configured, not when there is no `deploymentUrl`.
5. Update `handleSaveConfig` to not expect `deploymentUrl`.

**Patterns to follow**: Existing `ChatPage.tsx` structure.

**Verification**: App loads, connects via proxy, chat works end-to-end.

### Unit 7: Update .env.example and add .env.local entry

**Goal**: Document the new environment variables.

**Files**:
- `.env.example` — modify

**Approach**:
1. Add `LANGGRAPH_DEPLOYMENT_URL=` with comment explaining it's the upstream LangGraph server URL (required).
2. Add `LANGGRAPH_API_KEY=` with comment explaining it's optional, injected as `x-api-key` header.
3. Remove any `NEXT_PUBLIC_` deployment URL references if present.
4. Ensure `.env.local` has the actual values for development (do not commit this file).

**Verification**: `.env.example` documents all required env vars. `pnpm dev` works with values in `.env.local`.

### Unit 8: Update i18n messages

**Goal**: Remove `deploymentUrl`-related translation strings, add backend-not-configured error message.

**Files**:
- `messages/en.json` — modify
- `messages/zh.json` — modify

**Approach**:
1. Remove `config.deploymentUrl`, `config.deploymentUrlPlaceholder`, `config.deploymentUrlRequired` keys.
2. Add an error message for when the proxy returns 503 (backend not configured).

**Verification**: No missing translation warnings. Error message displays correctly when `LANGGRAPH_DEPLOYMENT_URL` is unset.

## Acceptance Criteria

- [ ] All LangGraph API requests route through `/api/langgraph/[...path]` (R1)
- [ ] `LANGGRAPH_DEPLOYMENT_URL` is a server-side env var, not exposed to client (R2)
- [ ] SSE streaming works without buffering — chat responses stream progressively (R3)
- [ ] `ClientProvider` points at the local proxy (R4)
- [ ] ConfigDialog does not show `deploymentUrl` field (R5)
- [ ] `deploymentUrl` removed from `StandaloneConfig` interface and localStorage (R6)
- [ ] Proxy returns 503 with clear error when env var is not set (R7)
- [ ] All existing features work: threads, assistants, chat, streaming (R8)
- [ ] `pnpm dev` works with `LANGGRAPH_DEPLOYMENT_URL` in `.env.local`
- [ ] Deployment URL does not appear in DevTools network tab, localStorage, or client-side code
- [ ] Biome lint + format pass on all changed files

## Sources & References

- **Origin document:** [docs/brainstorms/2026-03-21-nextjs-bff-credential-proxy-requirements.md](docs/brainstorms/2026-03-21-nextjs-bff-credential-proxy-requirements.md) — Key decisions: minimal credential proxy, env var only, simplify ConfigDialog
- **Target files:** `src/providers/ClientProvider.tsx`, `src/lib/config.ts`, `src/app/components/ConfigDialog.tsx`, `src/app/components/chat/ChatPage.tsx`
- **Next.js BFF docs:** Next.js v16.2.1 Backend for Frontend guide — official catch-all proxy pattern
- **LangGraph SDK source:** `@langchain/langgraph-sdk@1.7.4` `client.js` — `new URL(apiUrl + path)` requires absolute URL, `x-api-key` header for auth, `Location` header for SSE reconnection
- **Learnings:** `docs/solutions/integration-issues/langgraph-sdk-retry-edit-message-operations.md` — `streamResumable: true` critical, `ThreadState` O(n²) payload growth
- **Learnings:** `docs/solutions/performance-issues/optimizing-chat-streaming-performance-and-stability.md` — 100ms throttle still needed client-side
