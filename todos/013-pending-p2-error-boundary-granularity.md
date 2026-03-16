---
status: complete
priority: p2
issue_id: 013
tags: [code-review, stability, react]
dependencies: []
---

...

## Work Log

- 2026-03-06: Moved ErrorBoundary inside the message loop in ChatInterface.tsx to wrap each individual message. Verified that single-message isolation is achieved.

# 013-pending-p2-error-boundary-granularity

## Problem Statement

The current `ErrorBoundary` in `ChatInterface.tsx` wraps the entire message list. If a single `ChatMessage` or `MarkdownContent` component crashes (e.g., due to malformed Markdown or a rendering edge case), the entire chat history is replaced by a single error alert.

## Findings

In `src/app/components/ChatInterface.tsx`:

```tsx
<ErrorBoundary className="mb-4">
  {processedMessages.map((data, index) => {
    // ...
    return (
      <div key={data.message.id} className="flex flex-col">
        <ChatMessage ... />
      </div>
    );
  })}
</ErrorBoundary>
```

The plan stated: "A crash in a single message does not affect the rest of the chat history". The current implementation fails this specific goal.

## Proposed Solutions

### Solution 1: Individual Message Wrapping (Recommended)

Move the `ErrorBoundary` inside the `map` function to wrap each `ChatMessage` individually.

**Pros:**

- Complete isolation: one message crashing doesn't affect others.
- Better UX: user can still see the rest of the conversation and the input box.

**Cons:**

- Small memory overhead for multiple ErrorBoundary instances (negligible).

### Solution 2: Grouped Wrapping

Wrap messages in blocks (e.g., every 10 messages).

**Pros:**

- Fewer ErrorBoundary instances.

**Cons:**

- Still affects multiple messages on a single crash.

## Recommended Action

Implement Solution 1. Update `ChatInterface.tsx` to move the `ErrorBoundary` inside the `processedMessages.map` callback.

## Technical Details

- **Affected Files**: `src/app/components/ChatInterface.tsx`
- **Component**: `ChatInterface`

## Acceptance Criteria

- [ ] Intentional crash in one `ChatMessage` only displays an error for that specific message.
- [ ] Other messages remain visible and interactive.
- [ ] The chat input remains functional.
