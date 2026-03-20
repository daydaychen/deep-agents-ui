---
status: complete
priority: p1
issue_id: "029"
tags: [code-review, architecture, inspector]
dependencies: []
---

# Add ErrorBoundary Around InspectorPanel

## Problem Statement

The InspectorPanel at `ChatInterface.tsx:238` has no ErrorBoundary. If any inspector tab throws (malformed JSON in ConfigTab's SyntaxHighlighter, corrupted base64 in ScreenshotTab, etc.), it crashes the entire ChatInterfaceInner component, including the chat view.

## Findings

### Architecture Strategist

Each `ChatMessage` is wrapped in `<ErrorBoundary>` (line 278), but `<InspectorPanel />` is not. The existing `ErrorBoundary` component at `src/app/components/ErrorBoundary.tsx` is already available.

## Proposed Solutions

### Solution A: Wrap InspectorPanel (Recommended)

```tsx
<ErrorBoundary>
  <InspectorPanel />
</ErrorBoundary>
```

- Pros: One-line fix, uses existing component
- Cons: None
- Effort: Trivial (5 min)
- Risk: None

## Acceptance Criteria

- [ ] InspectorPanel is wrapped in ErrorBoundary in ChatInterface.tsx
- [ ] Inspector tab crash does not affect chat view

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-20 | Created from code review | — |
