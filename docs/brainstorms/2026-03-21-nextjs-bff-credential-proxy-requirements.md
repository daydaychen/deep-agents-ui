---
date: 2026-03-21
topic: nextjs-bff-credential-proxy
---

# Next.js BFF Credential Proxy

## Problem Frame

The deployment URL for the LangGraph backend is stored in plain localStorage and passed directly to the client-side `Client` SDK. Anyone with DevTools access can extract it; any XSS vulnerability exposes it completely. The app has zero API routes — Next.js server capabilities are entirely unused. `audit-logger.ts` has a TODO for a backend service that cannot exist without server-side infrastructure.

## Requirements

- R1. All LangGraph API requests from the client must route through a Next.js Route Handler proxy (`/api/langgraph/[...path]`). The client must never directly contact the LangGraph deployment URL.
- R2. The LangGraph deployment URL must be stored as a server-side environment variable (`LANGGRAPH_DEPLOYMENT_URL`), not exposed to the client via `NEXT_PUBLIC_*` or localStorage.
- R3. The proxy must correctly forward SSE streaming responses (used by LangGraph `stream` calls) without buffering the entire response — the client must receive chunks progressively.
- R4. `ClientProvider` must create the LangGraph `Client` pointing at the local proxy (`/api/langgraph`) instead of the raw deployment URL.
- R5. The ConfigDialog must be simplified: remove the `deploymentUrl` field. Non-sensitive settings (`assistantId`, `recursionLimit`, `recursionMultiplier`, `userId`) remain in localStorage and ConfigDialog.
- R6. `config.ts` must be updated: `deploymentUrl` removed from `StandaloneConfig` interface and localStorage storage. The proxy reads the deployment URL from the environment, not from any client-provided value.
- R7. When `LANGGRAPH_DEPLOYMENT_URL` is not set, the proxy must return a clear error response (e.g., 503) and the client must show a meaningful message (e.g., "Backend not configured").
- R8. All existing LangGraph SDK functionality (threads, assistants, runs, streaming) must continue to work identically through the proxy.

## Success Criteria

- The deployment URL does not appear in any client-side code, network request URL, localStorage, or DevTools-visible state
- `pnpm dev` works with `LANGGRAPH_DEPLOYMENT_URL` set in `.env.local`
- Streaming chat responses work with identical latency characteristics (no full-response buffering)
- Existing features (thread list, config dialog, chat) work without regression

## Scope Boundaries

- **Not in scope**: Rate limiting, server-side audit logging, authentication/authorization — these are follow-up work that this proxy enables
- **Not in scope**: Migrating existing localStorage config data — fresh `.env.local` setup is acceptable
- **Not in scope**: API key or token-based auth for the proxy itself — the proxy is same-origin, protected by browser same-origin policy
- **Not in scope**: HTTPS/TLS configuration — handled by deployment infrastructure

## Key Decisions

- **Minimal credential proxy first**: No rate limiting or audit logging in this scope. The proxy is a transparent pass-through that hides the deployment URL. This creates the foundation for future server-side features.
- **Env var only**: Deployment URL configured via `LANGGRAPH_DEPLOYMENT_URL` environment variable. One deployment per instance. No runtime override UI.
- **Simplify ConfigDialog**: Remove `deploymentUrl` from the dialog. Keep non-sensitive settings (`assistantId`, `recursionLimit`, etc.) in localStorage.
- **Same-origin eliminates CORS**: With the proxy, all client requests go to the same origin. No CORS configuration needed on the LangGraph deployment for the UI.

## Dependencies / Assumptions

- Next.js 16 App Router Route Handlers support streaming responses (ReadableStream)
- The LangGraph SDK `Client` works correctly when pointed at a proxy URL that forwards to the real deployment
- The LangGraph deployment does not require client-specific auth headers (current behavior confirms this — only `Content-Type` is set)

## Outstanding Questions

### Deferred to Planning

- [Affects R3][Needs research] What is the correct way to proxy SSE streams in Next.js 16 Route Handlers? Need to verify `ReadableStream` piping works for `text/event-stream` content type without Next.js buffering.
- [Affects R4][Technical] Does the LangGraph SDK `Client` support relative URLs (e.g., `/api/langgraph`) or does it require an absolute URL?
- [Affects R1][Technical] Should the catch-all route strip the `/api/langgraph` prefix when forwarding, or does the LangGraph API expect specific path structure?
- [Affects R5][Technical] How much of ConfigDialog needs to change? Determine exact fields and validation schema updates during planning.

## Next Steps

→ `/ce:plan` for structured implementation planning
