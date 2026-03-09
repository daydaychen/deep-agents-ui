---
title: "useChat.ts Retry/Edit Message Checkpoint Forking Failures"
category: integration-issues
tags:
  - langgraph-sdk
  - react-hooks
  - useStream
  - checkpoint-forking
  - message-branching
  - stream-context
  - race-conditions
module: src/app/hooks/useChat.ts
symptom: >
  Retry and Edit message operations fail silently with "No parent checkpoint
  found for message" error. Forked branches behave incorrectly even when
  operations succeed. Rapid clicking causes duplicate fork operations.
root_cause: >
  Four bugs: (1) fetchStateHistory defaults to 10 entries, preventing
  parent_checkpoint resolution in longer conversations; (2) editMessage spreads
  all original properties instead of using minimal { type, content } pattern;
  (3) streamResumable: false cancels runs on disconnect; (4) no double-fire
  guard allows rapid clicks to duplicate fork operations.
date_solved: "2026-03-01"
severity: high
---

# LangGraph SDK: Retry/Edit Message Checkpoint Forking Failures

## Problem Statement

When a user clicks "Retry" on an AI message or "Edit" on a human message in the chat interface, the operation silently fails with:

```
No parent checkpoint found for message <id>
```

Even when it does not fail immediately, the forked branch may behave incorrectly due to message construction issues. The user experience is broken in three compounding ways: no feedback on silent failure, incorrect message data sent on edit, and server-side run cancellation on browser disconnect.

## Investigation Steps

1. Analyzed the LangGraph SDK source at `node_modules/@langchain/langgraph-sdk/dist/react/stream.lgp.js` to understand `fetchStateHistory` defaults, `streamResumable` behavior, and `getMessagesMetadata` internals.
2. Compared the codebase against the official `agent-chat-ui` reference implementation (`src/components/thread/messages/human.tsx` for edit, `src/components/thread/index.tsx` for regenerate).
3. Reviewed SDK type definitions (`SubmitOptions`, `MessageMetadata`, `ThreadState`).
4. Ran a performance analysis on the O(n²) payload growth introduced by increasing the history limit.
5. A race condition review identified the double-fire gap between a click event and React re-rendering the button out of the DOM.
6. Confirmed that `optimisticValues` in fork operations creates flash-of-wrong-content on error — dropped from solution.
7. Consulted LangGraph issues [#4987](https://github.com/langchain-ai/langgraph/issues/4987) (checkpoint ID reuse) and [#4825](https://github.com/langchain-ai/langgraph/issues/4825) (stale history during `joinStream`).

## Root Cause Analysis

### Bug 1: `fetchStateHistory` Default Limit Too Low (Critical)

SDK source (`stream.lgp.js:26`):

```javascript
const limit = typeof options?.limit === "number" ? options.limit : 10;
return client.threads.getHistory(threadId, { limit });
```

Passing `fetchStateHistory: true` fetches only **10 state history entries**. Each message exchange creates 2+ checkpoint states. With tool calls and subgraphs, a single exchange can generate 5-10+ states. Conversations with more than ~5 exchanges will have earlier messages **without** `firstSeenState`, making `parent_checkpoint` unavailable.

### Bug 2: Message Construction Spreading All Properties (High)

```typescript
// WRONG — copies additional_kwargs, response_metadata, name, etc.
const newMessage = { ...message, id: uuidv4() };

// CORRECT — minimal message, server assigns ID
const newMessage: Message = { type: "human", content: message.content };
```

The LangGraph server's message reducer does not handle extra fields correctly when processing a fork. The official `agent-chat-ui` reference constructs minimal messages.

### Bug 3: `streamResumable: false` Cancels Runs on Disconnect (Medium)

```javascript
// SDK internals
onDisconnect: submitOptions?.onDisconnect ?? (streamResumable ? "continue" : "cancel")
```

With `streamResumable: false`, if the browser disconnects during a fork operation, **the run is cancelled on the server**. This is semantically different from "non-resumable" — it actively destroys the run.

### Bug 4: No Double-Fire Guard (Medium)

The `MessageToolbar` hides buttons when `isLoading` is true, but there's a render-frame gap where the button remains in the DOM after the first click. A fast double-click fires the operation twice, producing two concurrent fork operations that race against each other.

## Working Solution

### Fix 1: Explicit History Limit

```typescript
// Before
fetchStateHistory: true,  // defaults to limit: 10

// After
fetchStateHistory: { limit: 100 },
```

**Performance note:** Each `ThreadState` contains ALL messages up to that point, so payload grows quadratically:

| History Limit | 50-msg Payload | 100-msg Payload |
|---|---|---|
| 10 (original) | ~0.7 MB | ~1.4 MB |
| 50 (recommended) | ~1.9 MB | ~5.6 MB |
| 100 (implemented) | ~1.9 MB | ~7.6 MB |

### Fix 2: Minimal Message Construction

```typescript
// Before
const newMessage = { ...message, id: uuidv4() };

// After — only type and content, no id
const newMessage: Message = {
  type: "human",
  content: message.content,
};
```

### Fix 3: `streamResumable: true`

Applied uniformly to both `retryFromMessage` and `editMessage`:

```typescript
stream.submit(undefined, {
  checkpoint: parentCheckpoint,
  config: {
    ...(activeAssistant?.config ?? {}),
    recursion_limit: recursionLimit,
  },
  streamMode: ["messages", "updates"],
  streamSubgraphs: true,
  streamResumable: true,  // NOT false
});
```

### Fix 4: Ref-Based Double-Fire Guard

```typescript
const isSubmittingRef = useRef(false);

// Reset when stream finishes
useEffect(() => {
  if (!stream.isLoading) {
    isSubmittingRef.current = false;
  }
}, [stream.isLoading]);

// In retryFromMessage / editMessage:
if (stream.isLoading || isSubmittingRef.current) return;
isSubmittingRef.current = true;
```

### Additional: `resolveMessageIndex` Helper

Extracted duplicated `findIndex + fallback` pattern:

```typescript
const resolveMessageIndex = useCallback(
  (message: Message, fallbackIndex: number) => {
    const actual = stream.messages.findIndex((msg) => msg.id === message.id);
    return actual !== -1 ? actual : fallbackIndex;
  },
  [stream.messages]
);
```

## Key SDK Internals Discovered

| Finding | Detail |
|---------|--------|
| `fetchStateHistory` default | `limit: 10` when `true` is passed |
| `ThreadState` payload | Contains ALL messages up to that point — O(n²) growth |
| `streamResumable` mapping | `true` → `onDisconnect: "continue"`, `false` → `"cancel"` |
| `getMessagesMetadata` | Uses `findLast` from newest→oldest to find earliest state containing a message |
| `LoadExternalComponent` Proxy | Forwards ALL property accesses to stream object; accessing `toolProgress` permanently tracks `"tools"` mode in `stream_mode` |

## Prevention Strategies

### SDK Configuration
- **Always verify SDK defaults** — don't assume `true` means "everything works"
- Set explicit `fetchStateHistory` limit based on expected conversation length
- Always set `streamResumable: true` unless intentionally wanting run cancellation
- Include `recursion_limit` in ALL submit configs consistently

### Message Construction
- Use **minimal message objects** for fork operations: only `type` and `content`
- Never spread original message properties into fork messages
- Let the server assign IDs for forked messages

### Concurrency
- Add ref-based guards on checkpoint-forking operations (not just React state guards)
- React state guards (`isLoading`) have a render-frame gap
- Reset guards in both success and error paths

### Code Review Checklist
- [ ] All `submit()` callbacks have consistent `recursion_limit`
- [ ] All fork operations specify `streamResumable: true`
- [ ] `fetchStateHistory` is explicitly set (not relying on defaults)
- [ ] Message construction follows the minimal pattern (type + content only)
- [ ] State-changing operations have ref-based double-fire protection
- [ ] Guard is cleared in both success and error paths

## Testing Checklist

- [ ] Retry works on messages beyond the 10 most recent states
- [ ] Edit forks correctly from the edited message's checkpoint
- [ ] Branch switcher shows correct options after fork
- [ ] Rapid double-clicking doesn't create duplicate forks
- [ ] Disconnect during fork doesn't cancel the server-side run
- [ ] Long conversations (20+ exchanges) support retry/edit on all messages
- [ ] Toast error appears when checkpoint is unavailable

## Related References

### Internal
- **Plan document:** `docs/plans/2026-03-01-fix-retry-edit-message-checkpoint-forking-plan.md`
- **Implementation:** `src/app/hooks/useChat.ts`

### External
- [LangChain Branching Docs](https://docs.langchain.com/oss/javascript/langchain/streaming/frontend) — canonical `useStream` branching example
- [LangChain Time Travel Docs](https://docs.langchain.com/oss/javascript/langgraph/use-time-travel) — checkpoint forking concepts
- [agent-chat-ui](https://github.com/langchain-ai/agent-chat-ui) — official reference implementation

### Known SDK Issues
- [#4987](https://github.com/langchain-ai/langgraph/issues/4987) — Forked checkpoints may reuse IDs, breaking history traversal
- [#4825](https://github.com/langchain-ai/langgraph/issues/4825) — Stale history during `joinStream` execution
