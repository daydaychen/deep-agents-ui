---
status: complete
priority: p2
issue_id: "034"
tags: [code-review, performance, inspector]
dependencies: []
---

# Inline Arrow Function Defeats React.memo on PipelineGraph

## Problem Statement

ConfigTab passes an inline arrow function to `PipelineGraph.onNodeClick`, creating a new reference every render and defeating `React.memo` on PipelineGraph. The pipeline graph re-renders and re-parses the config unnecessarily.

## Findings

### Performance Oracle

**File:** `src/app/components/inspector/tabs/ConfigTab.tsx:197-199`

```tsx
<PipelineGraph
  onNodeClick={(name) => {
    setSelectedNode((prev) => (prev === name ? null : name));
  }}
/>
```

## Proposed Solutions

### Solution A: useCallback (Recommended)

```tsx
const handleNodeClick = useCallback((name: string) => {
  setSelectedNode((prev) => (prev === name ? null : name));
}, []);
```

- Pros: 5-second fix, prevents unnecessary PipelineGraph re-renders
- Cons: None
- Effort: Trivial (5 min)
- Risk: None

## Acceptance Criteria

- [ ] `onNodeClick` wrapped in useCallback
- [ ] PipelineGraph only re-renders when config data changes

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-20 | Created from code review | — |
