---
date: 2026-03-21
topic: message-list-virtualization
---

# Message List Virtualization

## Problem Frame

During streaming, the chat interface reconciles the entire `processedMessages` array every 100ms (throttled). Each `ChatMessage` instantiates 6+ child component trees (avatar, content, tool calls, subagent section, orphaned approvals, toolbar). At 100+ messages this causes O(N) React reconciliation per tick, degrading responsiveness. The existing optimizations (throttling, `contentVisibility: 'auto'`, progressive markdown rendering) reduce the constant factor but don't eliminate the linear scaling.

SubAgentPanel has the same pattern — a flat `processedMessages.map()` with auto-scroll, growing unbounded during long agent executions.

## Requirements

- R1. **Main message list virtualization**: Replace the flat `processedMessages.map()` in `ChatInterface` with a virtualizer that only mounts messages in/near the viewport. Render time must be O(viewport) regardless of total message count.
- R2. **SubAgentPanel virtualization**: Apply the same virtualization to `SubAgentPanel`'s message list rendering.
- R3. **Stick-to-bottom preservation**: Auto-scroll to the latest message during streaming must continue to work. When the user scrolls up, auto-scroll must disengage. When they scroll back to the bottom, it must re-engage. This matches existing `use-stick-to-bottom` behavior.
- R4. **Variable-height messages**: Messages vary dramatically in height (short text vs. multi-tool-call messages with code blocks). The virtualizer must measure actual DOM heights dynamically, not assume fixed row heights.
- R5. **No behavioral regression**: ErrorBoundary wrapping per message, `isLastMessage` special treatment (action requests, streaming indicators), branch info, and all existing message interactions must be preserved.

## Success Criteria

- Scrolling through a 200+ message thread feels smooth (no jank during scroll or streaming)
- React DevTools Profiler shows constant render time regardless of message count
- All existing chat interactions work: retry, edit, branch switching, subagent expansion, tool approval, inspector integration

## Scope Boundaries

- NOT building a custom in-app search to replace Ctrl+F (accepted tradeoff)
- NOT changing ChatMessage component internals
- NOT virtualizing other small lists (todos, files, sidebar threads)
- NOT changing the 100ms throttling strategy

## Key Decisions

- **Accept Ctrl+F tradeoff**: Unmounted messages won't appear in browser find. This matches behavior of major chat apps (Slack, Discord). The performance gain outweighs the search loss for this use case.
- **Both lists**: Virtualize both the main ChatInterface message list and SubAgentPanel's message list for consistency.

## Dependencies / Assumptions

- `@tanstack/react-virtual` is the intended virtualization library (lightweight, well-maintained, framework-agnostic)
- The `use-stick-to-bottom` library's `scrollRef`/`contentRef` pattern may need coordination or replacement with virtualizer-managed scrolling

## Outstanding Questions

### Deferred to Planning

- [Affects R3][Needs research] Can `use-stick-to-bottom` coexist with `@tanstack/react-virtual`'s scroll management, or does stick-to-bottom need to be reimplemented using the virtualizer's scroll API?
- [Affects R2][Technical] SubAgentPanel uses Radix `ScrollArea` — should it switch to a plain overflow container for virtualizer compatibility?
- [Affects R4][Technical] What overscan count balances smooth scrolling with minimal unnecessary mounts? (likely 3-5 messages)
- [Affects R1][Technical] The `isLastMessage` check uses array index — how to map virtualizer indices back to the full array for special-casing the last message?

## Next Steps

`/ce:plan` for structured implementation planning
