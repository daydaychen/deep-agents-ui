---
status: complete
priority: p1
issue_id: "028"
tags: [code-review, typescript, inspector]
dependencies: []
---

# ParsedToolResult Type Safety & Memoization

## Problem Statement

`ParsedToolResult.data` is typed as `unknown`, forcing every consumer to use unsafe `as` casts. Additionally, `parseToolResult` is called 3 times per completed tool call in ToolCallBox — once in useEffect, once in `canInspect` useMemo, and once in `handleViewInInspector`.

## Findings

### 1. Blind Type Assertions (HIGH) — TypeScript Reviewer

**File:** `src/app/utils/tool-result-parser.ts:14` and `src/app/components/ToolCallBox.tsx:163-191`

The `data: unknown` field forces 4 unsafe casts:
- `parsed.data as Record<string, unknown>` (config)
- `parsed.data as ValidationResult` (validation)
- `parsed.data as LogEntry[]` (test_log)
- `parsed.data as Screenshot` (screenshot)

### 2. Triple Parsing (CRITICAL) — Performance Oracle

**File:** `src/app/components/ToolCallBox.tsx:158, 249, 256`

`parseToolResult` performs `JSON.parse`, regex matching, and for test tools `parseSSELog` which regex-tests every line. All 3 invocations fire for every completed tool call.

## Proposed Solutions

### Solution A: Discriminated Union + Memoize (Recommended)

**Type fix:** Make `ParsedToolResult` a discriminated union:
```typescript
export type ParsedToolResult =
  | { type: "config"; inspectorTab: "config"; summary: string; data: Record<string, unknown>; metadata?: ParsedMetadata }
  | { type: "test_log"; inspectorTab: "log"; summary: string; data: LogEntry[]; metadata?: ParsedMetadata }
  | { type: "validation"; inspectorTab: "log"; summary: string; data: ValidationResult; metadata?: ParsedMetadata }
  | { type: "screenshot"; inspectorTab: "screenshot"; summary: string; data: Screenshot; metadata?: ParsedMetadata };
```

**Memoization fix:** Parse once:
```typescript
const parsedResult = useMemo(() => {
  if (toolCall.status !== "completed" || !toolCall.result) return null;
  return parseToolResult(toolCall.name, toolCall.result, toolCall.id);
}, [toolCall.status, toolCall.result, toolCall.name, toolCall.id]);

const canInspect = !!inspector && !!parsedResult;
```

- Pros: Eliminates all unsafe casts, reduces parsing 3x→1x
- Cons: Requires updating switch statement in ToolCallBox
- Effort: Small (45 min)
- Risk: Low

## Acceptance Criteria

- [ ] `ParsedToolResult` is a discriminated union with typed `data` per variant
- [ ] No `as` casts on `parsed.data` in ToolCallBox
- [ ] `parseToolResult` called only once per completed tool call (via useMemo)
- [ ] Build passes with no type errors

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-20 | Created from code review | — |
