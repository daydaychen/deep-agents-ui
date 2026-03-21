---
title: "feat: Message list virtualization"
type: feat
status: completed
date: 2026-03-21
origin: docs/brainstorms/2026-03-21-message-list-virtualization-requirements.md
---

# feat: Message list virtualization

## Overview

Replace the flat `processedMessages.map()` rendering in ChatInterface and SubAgentPanel with `@tanstack/react-virtual` to make render time O(viewport) instead of O(N). Replace `use-stick-to-bottom` with custom stick-to-bottom logic built on the virtualizer's scroll API, since the two libraries are architecturally incompatible. (see origin: `docs/brainstorms/2026-03-21-message-list-virtualization-requirements.md`)

## Problem Statement

During streaming, the chat interface reconciles the entire `processedMessages` array every 100ms (throttled). Each `ChatMessage` instantiates 6+ child component trees. At 100+ messages this causes O(N) React reconciliation per tick. Existing optimizations (throttling, `contentVisibility: 'auto'`, progressive markdown) reduce the constant factor but don't eliminate linear scaling. SubAgentPanel has the same flat `.map()` pattern.

## Proposed Solution

Use `@tanstack/react-virtual`'s `useVirtualizer` hook with dynamic height measurement (`measureElement`) to only mount messages in/near the viewport. Replace `use-stick-to-bottom` with a ref-based scroll detection + `virtualizer.scrollToIndex(count - 1)` for auto-scroll during streaming.

## Technical Considerations

### Library Incompatibility (Key Finding)

`use-stick-to-bottom` expects a natural content div (`contentRef`) that grows as children are added. `@tanstack/react-virtual` creates a fixed-height spacer div with absolutely positioned items. These two approaches are fundamentally incompatible for the same scroll container. The solution is to replace `use-stick-to-bottom` entirely with custom stick-to-bottom logic using the virtualizer's `scrollToIndex` API.

### Dynamic Height Measurement

Messages vary dramatically in height (short text vs. multi-tool-call messages with code blocks). The virtualizer must:
1. Use `estimateSize` for initial layout (e.g., 120px average)
2. Use `measureElement` ref callback to measure actual DOM heights
3. Re-measure when streaming completes (progressive markdown swaps `<pre>` for `SyntaxHighlighter`, changing height)

### Stick-to-Bottom Replacement

The custom logic needs (per learnings: use refs, not state, for scroll detection):
- `isAtBottomRef` updated via scroll event listener
- `scrollToBottom()` using `virtualizer.scrollToIndex(count - 1, { align: 'end' })`
- Auto-scroll when `isAtBottom && count/content changes` during streaming
- Disengage when user scrolls up, re-engage when they scroll back to bottom

### Existing Optimizations to Preserve

- `useThrottledValue(messages, isLoading ? 100 : 0)` — virtualizer consumes throttled messages (see origin: scope boundaries)
- Per-message `ErrorBoundary` wrapping (per learnings doc)
- `isLastMessage` special treatment for action requests, streaming indicators
- Message keying by `message.id` (required for retry/edit/branch operations)
- `useProcessedMessages` O(N) algorithm preserved as-is

## Implementation Units

### Unit 1: Install `@tanstack/react-virtual`

**Goal**: Add the virtualization dependency.

**Files**:
- `package.json` — modify

**Approach**:
1. Run `pnpm add @tanstack/react-virtual`
2. Verify the package installs and types are available

**Verification**: `pnpm install` succeeds, `import { useVirtualizer } from '@tanstack/react-virtual'` compiles.

### Unit 2: Virtualize ChatInterface main message list (R1, R3, R4, R5)

**Goal**: Replace the flat `processedMessages.map()` in ChatInterface with a virtualized list, including custom stick-to-bottom behavior.

**Files**:
- `src/app/components/ChatInterface.tsx` — modify

**Approach**:
1. Remove `import { useStickToBottom } from "use-stick-to-bottom"` and the `useStickToBottom()` call (line 71-74).
2. Add `import { useVirtualizer } from "@tanstack/react-virtual"`.
3. Create a `parentRef` for the scroll container (replaces `scrollRef`).
4. Set up `useVirtualizer`:
   ```typescript
   const virtualizer = useVirtualizer({
     count: processedMessages.length,
     getScrollElement: () => parentRef.current,
     estimateSize: () => 120,
     overscan: 5,
   });
   ```
5. Implement stick-to-bottom with refs:
   ```typescript
   const isAtBottomRef = useRef(true);
   const scrollElementRef = useRef<HTMLDivElement | null>(null);

   // Track scroll position
   useEffect(() => {
     const el = parentRef.current;
     if (!el) return;
     scrollElementRef.current = el;
     const handleScroll = () => {
       const threshold = 50;
       const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
       isAtBottomRef.current = atBottom;
     };
     el.addEventListener("scroll", handleScroll, { passive: true });
     return () => el.removeEventListener("scroll", handleScroll);
   }, []);

   // Auto-scroll to bottom when new messages arrive during streaming
   useEffect(() => {
     if (isAtBottomRef.current && processedMessages.length > 0) {
       virtualizer.scrollToIndex(processedMessages.length - 1, { align: "end" });
     }
   }, [processedMessages.length, virtualizer]);
   ```
6. Replace the rendering section (lines 301-362):
   - Outer scroll container div uses `ref={parentRef}` (replaces `scrollRef`)
   - Inner div uses `style={{ height: virtualizer.getTotalSize(), position: 'relative' }}`  (replaces `contentRef` with `contentVisibility: 'auto'`)
   - Map over `virtualizer.getVirtualItems()` instead of `processedMessages`
   - Each virtual item uses absolute positioning with `translateY(virtualItem.start)`
   - Use `ref={virtualizer.measureElement}` and `data-index={virtualItem.index}` on each row
   - Access actual data via `processedMessages[virtualItem.index]`
   - Preserve `isLastMessage` check using `virtualItem.index === processedMessages.length - 1`
   - Preserve `ErrorBoundary` wrapping per message
   - Preserve all `ChatMessage` props

**Patterns to follow**: `@tanstack/react-virtual` dynamic sizing pattern from research — `estimateSize` + `measureElement` + absolute positioning with `translateY`.

**Execution note**: The streaming last message continuously grows in height. The `measureElement` callback will re-measure on each render, and the auto-scroll effect will keep it in view. Test this carefully with long streaming responses.

**Verification**: TypeScript compiles. Messages render correctly. Scrolling is smooth. Auto-scroll works during streaming. Scrolling up disengages auto-scroll. Error boundaries still isolate failures.

### Unit 3: Virtualize SubAgentPanel message list (R2)

**Goal**: Apply the same virtualization pattern to SubAgentPanel's message list.

**Files**:
- `src/app/components/message/SubAgentPanel.tsx` — modify

**Approach**:
1. Replace `ScrollArea` with a plain overflow container (Radix ScrollArea conflicts with virtualizer scroll management).
2. Replace `bottomRef.current?.scrollIntoView()` with virtualizer scroll.
3. Set up `useVirtualizer` with the same dynamic sizing pattern.
4. Implement simple auto-scroll (SubAgentPanel always auto-scrolls to bottom on new messages — simpler than ChatInterface since there's no user scroll-up behavior needed for now).
5. Replace flat `processedMessages.map()` (lines 123-174) with virtualized rendering.
6. Preserve message keying by `data.message.id || proc-msg-${idx}`.

**Patterns to follow**: Unit 2's virtualizer setup, adapted for the simpler SubAgentPanel rendering.

**Verification**: TypeScript compiles. SubAgent messages render correctly in the side panel. Auto-scroll works as new messages arrive.

### Unit 4: Remove `use-stick-to-bottom` dependency

**Goal**: Clean up the now-unused dependency.

**Files**:
- `package.json` — modify

**Approach**:
1. Run `pnpm remove use-stick-to-bottom`
2. Verify no remaining imports of `use-stick-to-bottom` in the codebase

**Verification**: `pnpm install` succeeds. `grep -r "use-stick-to-bottom" src/` returns no results.

### Unit 5: Streaming height re-measurement (R4)

**Goal**: Ensure message heights are re-measured when streaming completes and content changes (e.g., progressive markdown rendering swaps `<pre>` for `SyntaxHighlighter`).

**Files**:
- `src/app/components/ChatInterface.tsx` — modify (if needed)

**Approach**:
1. The `measureElement` callback should naturally re-measure on re-renders. However, if height changes from progressive markdown rendering cause layout jumps, add `virtualizer.measure()` call when `isLoading` transitions from `true` to `false`.
2. Test with long code-block messages to verify no layout jumps when streaming completes.

**Execution note**: This may be a no-op if `measureElement` handles re-measurement automatically. Verify empirically before adding code.

**Verification**: No visible layout jumps when streaming completes. Code blocks render correctly with syntax highlighting after streaming.

## Acceptance Criteria

- [ ] Main message list uses virtualization — only viewport + overscan messages are mounted (R1)
- [ ] SubAgentPanel message list uses virtualization (R2)
- [ ] Auto-scroll to bottom works during streaming, disengages on scroll-up, re-engages at bottom (R3)
- [ ] Variable-height messages measured dynamically — no fixed row height assumption (R4)
- [ ] ErrorBoundary per message preserved (R5)
- [ ] `isLastMessage` special treatment preserved (action requests, streaming indicators) (R5)
- [ ] Retry, edit, branch switching all work correctly (R5)
- [ ] `use-stick-to-bottom` dependency removed
- [ ] TypeScript compiles with no new errors
- [ ] `pnpm check` (Biome) passes
- [ ] All existing tests pass

## Scope Boundaries

- NOT building custom in-app search to replace Ctrl+F (see origin: key decisions)
- NOT changing ChatMessage component internals
- NOT virtualizing other small lists (todos, files, sidebar threads)
- NOT changing the 100ms throttling strategy (see origin: scope boundaries)

## Sources & References

- **Origin document:** [docs/brainstorms/2026-03-21-message-list-virtualization-requirements.md](docs/brainstorms/2026-03-21-message-list-virtualization-requirements.md) — Key decisions: accept Ctrl+F tradeoff, virtualize both main list and SubAgentPanel
- **Learnings:** [docs/solutions/performance-issues/optimizing-chat-streaming-performance-and-stability.md](docs/solutions/performance-issues/optimizing-chat-streaming-performance-and-stability.md) — Preserve throttling, per-message ErrorBoundary, ref-based guards, message ID stability
- **Target files:** `src/app/components/ChatInterface.tsx`, `src/app/components/message/SubAgentPanel.tsx`
- **Library docs:** `@tanstack/react-virtual` — `useVirtualizer`, `measureElement`, `estimateSize`, `scrollToIndex`, `getVirtualItems`, `getTotalSize`
