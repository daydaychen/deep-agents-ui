---
title: "Phase 2: Frontend UI Adaptation — LangGraph SDK → Claude Agent SDK SSE"
type: feat
status: completed
date: 2026-03-06
---

## Context

Phase 1 (A/B/C) established the Claude Agent SDK backend: API routes (`/api/chat`, `/api/chat/[threadId]/stop`), session management, subagent definitions, prompts, and skills. The backend streams `SDKMessage` events over SSE.

Phase 2 replaces the frontend's LangGraph SDK dependency with direct SSE fetch to these API routes, rewriting hooks, providers, and adapting components to the new message format.

## Scope

**In scope (P0/P1):**
- Remove `@langchain/langgraph-sdk` dependency
- SSE parser utility + SDK message processor
- Rewrite `useChat` hook (fetch SSE → UIMessage state)
- New `UIMessage` type system replacing LangGraph `Message`
- Rewrite providers (remove ClientProvider, simplify ChatProvider)
- Threads API route + rewrite `useThreads`
- Adapt all chat components to new types
- SubAgent display via `parent_tool_use_id` + task messages
- Tool call display from `SDKAssistantMessage.message.content`
- Todo extraction from TodoWrite tool_use blocks

**Deferred (P2/P3 — not in this phase):**
- Message editing (`forkSession`)
- Message retry (`resumeSessionAt`)
- Branching (`forkSession`)
- Memory store
- Tool approval UI (canUseTool is auto-deny)
- Single-step execution
- LLM override config per-node (SDK handles model selection)

---

## Implementation Steps

### Step 1: Define new types (`src/app/types/`)

- [ ] Create `src/app/types/messages.ts` with:
  - `UIMessage` — unified message type for UI rendering
  - `UIToolCall` — tool call with status/result
  - `UISubAgent` — subagent lifecycle tracking
  - `StreamState` — streaming state management
- [ ] Update `src/app/types/types.ts` — deprecate LangGraph-specific interfaces

**UIMessage design:**
```typescript
interface UIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: UIToolCall[];
  isStreaming?: boolean;
  parentToolUseId?: string | null;  // null = main agent, string = subagent
  metadata?: {
    model?: string;
    usage?: { input_tokens: number; output_tokens: number };
    cost_usd?: number;
    session_id?: string;
    error?: string;
  };
}
```

**Key files:** `src/app/types/messages.ts` (NEW), `src/app/types/types.ts`

### Step 2: SSE parser utility (`src/lib/sse-parser.ts`)

- [ ] Create buffer-based SSE parser handling TCP chunk boundaries
- [ ] Return typed events: `{ event?: string; id?: string; data: string }`
- [ ] Handle multi-line data fields, empty lines, comments

**Key file:** `src/lib/sse-parser.ts` (NEW)

### Step 3: SDK message processor (`src/lib/sdk-message-processor.ts`)

- [ ] Process `SDKMessage` JSON into `UIMessage[]` updates
- [ ] Handle streaming: accumulate `SDKPartialAssistantMessage` (type: `stream_event`) delta events into pending text
- [ ] Handle complete: `SDKAssistantMessage` (type: `assistant`) → finalize message with `BetaMessage.content` blocks
- [ ] Handle user: `SDKUserMessage` (type: `user`) → extract text from `MessageParam.content`
- [ ] Handle result: `SDKResultMessage` (type: `result`) → extract metadata (cost, usage, duration)
- [ ] Handle subagent lifecycle: `task_started`/`task_progress`/`task_notification` → track UISubAgent
- [ ] Handle status: `SDKStatusMessage` → status display
- [ ] Extract tool calls from `BetaMessage.content` blocks of type `tool_use`
- [ ] Extract todos from `TodoWrite` tool_use blocks
- [ ] Separate main agent messages (`parent_tool_use_id === null`) from subagent messages

**Key file:** `src/lib/sdk-message-processor.ts` (NEW)

### Step 4: Rewrite `useChat` hook

- [ ] Replace `useStream()` from LangGraph SDK with custom SSE fetch
- [ ] Use `fetch('/api/chat', { signal })` with `ReadableStream` reader
- [ ] Use SSE parser (Step 2) + message processor (Step 3)
- [ ] Maintain state: `messages: UIMessage[]`, `isStreaming`, `error`, `threadId`
- [ ] Extract `todos`, `subagents`, `subagentMessages` from processed messages
- [ ] Implement `sendMessage(content: string)` — POST to `/api/chat`, read SSE stream
- [ ] Implement `stopStream()` — abort fetch + POST to `/api/chat/[threadId]/stop`
- [ ] Implement `resumeThread(threadId: string)` — POST with `threadId` to resume
- [ ] Track `activeSubAgentId` auto-activation (from `task_started` events)
- [ ] Handle thread ID from `X-Thread-Id` response header on first request
- [ ] Handle reconnection on thread change (via `threadId` query param)
- [ ] Error handling: SSE error events, HTTP errors, abort signals
- [ ] Remove: `useStream`, LangGraph SDK Client, checkpoint/branch features

**Public API (preserved):**
```typescript
{
  messages, isLoading, isStreaming, error, threadId,
  todos, subagents, subagentMessagesMap, activeSubAgentId, setActiveSubAgentId,
  sendMessage, stopStream,
}
```

**Simplified (stubs for P2):**
```typescript
{
  continueStream: () => void,  // noop stub
  editMessage: () => void,     // noop stub
  retryFromMessage: () => void, // noop stub
}
```

**Key file:** `src/app/hooks/useChat.ts` (REWRITE)

### Step 5: Update config + providers

- [ ] Simplify `src/lib/config.ts`:
  - `StandaloneConfig` → `{ apiKey: string; model?: string; maxTurns?: number; userId?: string }`
  - Keep `getConfig()`/`saveConfig()` with same localStorage key
  - Migration: map old config fields to new
- [ ] Delete `src/providers/ClientProvider.tsx` — no longer needed
- [ ] Delete `src/providers/client-context.ts` — no longer needed
- [ ] Update `src/providers/chat-context.ts` — update type derivation for new `useChat` return type
- [ ] Update `src/providers/ChatProvider.tsx`:
  - Remove `Assistant`, `UseStreamThread` imports
  - Simplify props (no activeAssistant, thread, recursion params)
  - Wire new `useChat` hook

**Key files:** `src/lib/config.ts`, `src/providers/` (4 files)

### Step 6: Threads API route + rewrite `useThreads`

- [ ] Create `src/app/api/threads/route.ts`:
  - GET handler calling `listSessions({ dir: cwd })` from SDK
  - Return `SDKSessionInfo[]` mapped to thread-like response
  - Auth with `withAuth`
- [ ] Rewrite `src/app/hooks/useThreads.ts`:
  - Replace `client.threads.search()` with `fetch('/api/threads')`
  - Map `SDKSessionInfo` → `ThreadItem` (summary→title, firstPrompt→description)
  - Keep SWR infinite pagination
  - Simplify `useDeleteThread` (stub or remove — SDK sessions are file-based)
  - Simplify `useMarkThreadAsResolved` (stub — no LangGraph goto command)

**Key files:** `src/app/api/threads/route.ts` (NEW), `src/app/hooks/useThreads.ts`

### Step 7: Adapt hooks

- [ ] Rewrite `src/app/hooks/usePersistedMessages.ts`:
  - Remove `SubagentStreamInterface` import
  - Accept `Map<string, UIMessage[]>` instead of LangGraph subagent map
  - Keep IndexedDB caching logic, update `Message` → `UIMessage`
- [ ] Rewrite `src/app/hooks/chat/useProcessedMessages.ts`:
  - Process `UIMessage[]` instead of LangGraph `Message[]`
  - Tool call extraction already done in message processor; simplify to avatar/grouping logic
- [ ] Rewrite `src/app/hooks/message/useSubAgents.ts`:
  - Filter for "Agent" tool calls (was "task") with `subagent_type` arg
  - Or remove and inline into message processor
- [ ] Update `src/app/utils/utils.ts`:
  - Remove `import { Message } from "@langchain/langgraph-sdk"`
  - Update `extractSubAgents` for new `UIToolCall` type, filter "Agent" tool name
  - Update `extractStringFromMessageContent` for `UIMessage`
  - Update `isPreparingToCallTaskTool` → `isPreparingToCallAgentTool`
  - Remove/simplify `formatMessageForLLM`, `formatConversationForLLM`

**Key files:** `src/app/hooks/` (4 files), `src/app/utils/utils.ts`

### Step 8: Adapt components

- [ ] `src/app/page.tsx`:
  - Remove `ClientProvider` wrapper
  - Remove `useClient`, `Assistant` imports
  - Remove assistant SWR fetch
  - Simplify `ChatProvider` props
  - Update `ConfigDialog` usage
- [ ] `src/app/components/ChatInterface.tsx`:
  - Update message type references
  - Keep throttling and scroll logic
- [ ] `src/app/components/ChatMessage.tsx`:
  - Adapt to `UIMessage` type
  - Update tool call/subagent rendering
- [ ] `src/app/components/chat/ChatInput.tsx`:
  - Remove LLM override dropdown (model selection is server-side)
  - Keep textarea + send/stop buttons
- [ ] `src/app/components/ToolCallBox.tsx`:
  - Adapt to `UIToolCall` type
  - Remove `LoadExternalComponent` (LangGraph UI components)
- [ ] `src/app/components/message/SubAgentSection.tsx` + `SubAgentPanel.tsx` + `SubAgentDetails.tsx`:
  - Adapt to `UISubAgent` / `UIMessage` types
- [ ] `src/app/components/ThreadList.tsx`:
  - Adapt to new `useThreads` API
- [ ] `src/app/components/ConfigDialog.tsx`:
  - Remove deployment URL, assistant ID fields
  - Simplify to: API key, optional model, optional max turns
  - Remove LangGraph Client usage
- [ ] `src/app/components/chat/TasksSection.tsx`:
  - Keep mostly as-is (TodoItem interface unchanged)
- [ ] `src/app/components/ToolApprovalInterrupt.tsx`:
  - Keep as stub (tool approval deferred to P2)

**Key files:** 10+ component files

### Step 9: Remove LangGraph dependencies

- [ ] `yarn remove @langchain/langgraph-sdk`
- [ ] Verify no remaining imports from `@langchain/*`
- [ ] Remove `@langchain/core` if present (check package.json)

### Step 10: Build verification + cleanup

- [ ] `tsc --noEmit` — zero type errors
- [ ] `yarn build` — successful build
- [ ] Manual smoke test: send message, see streaming response
- [ ] Verify: thread list loads, new thread creates, stop works

---

## SDKMessage → UIMessage Mapping Reference

| SDKMessage type | UI behavior |
|----------------|-------------|
| `assistant` (SDKAssistantMessage) | Finalize assistant message with BetaMessage.content blocks |
| `stream_event` (SDKPartialAssistantMessage) | Accumulate streaming text/tool deltas |
| `user` (SDKUserMessage) | Render user message (skip isSynthetic tool results) |
| `result` (SDKResultMessage) | Extract session metadata, mark stream complete |
| `system` + `init` | Ignore (SDK initialization) |
| `system` + `status` | Update status display |
| `system` + `task_started` | Track subagent start |
| `system` + `task_progress` | Update subagent progress |
| `system` + `task_notification` | Mark subagent completed/failed |
| `system` + `compact_boundary` | Ignore |
| `tool_progress` | Optional: show tool execution progress |
| `tool_use_summary` | Optional: tool summary display |
| `rate_limit_event` | Optional: rate limit warning |
| Others | Ignore |

## Key Design Decisions

1. **`parent_tool_use_id` for subagent filtering**: SDK messages with `parent_tool_use_id !== null` are subagent messages. This replaces LangGraph's separate `stream.subagents` Map.

2. **Streaming via BetaRawMessageStreamEvent**: The `SDKPartialAssistantMessage.event` contains Anthropic streaming events (`content_block_delta`, etc.). We accumulate these into a pending message and replace with the final `SDKAssistantMessage`.

3. **Tool name change**: SubAgents use the "Agent" tool (not "task" from LangGraph). Update extraction filters accordingly.

4. **Config simplification**: Remove deployment URL and assistant ID. The API is same-origin. Only API key is needed.

5. **Stub deferred features**: `editMessage`, `retryFromMessage`, `setBranch` etc. are preserved as no-op stubs to avoid breaking component interfaces. Actual implementation deferred to Phase 3.

## Verification

1. `tsc --noEmit` passes
2. `yarn build` succeeds
3. Browser test: open app → configure API key → send message → see streaming response
4. Thread list shows session history
5. Tool calls display in ToolCallBox
6. SubAgent lifecycle shows in SubAgentSection
7. Stop button aborts the stream
8. New thread button works
