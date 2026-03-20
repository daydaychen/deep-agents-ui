---
status: complete
priority: p2
issue_id: "033"
tags: [code-review, quality, inspector]
dependencies: []
---

# Inspector Code Duplication

## Problem Statement

Several patterns are duplicated across inspector components: file download (5x), empty state layout (4x), clipboard copy (2x), and imgSrc computation (2x in ScreenshotTab).

## Findings

### Pattern Recognition Specialist

**File download (5 occurrences):**
- `DataTab.tsx:28-35` (JSON), `DataTab.tsx:56-62` (CSV)
- `ConfigTab.tsx:129-136`, `QuickActions.tsx:19-26`
- `ScreenshotTab.tsx:30-37`

All follow: `Blob → createObjectURL → createElement("a") → click → revokeObjectURL`

**Empty state (4 occurrences):**
- `DataTab.tsx:67-76`, `ConfigTab.tsx:112-121`
- `LogTab.tsx:55-64`, `ScreenshotTab.tsx:41-51`

All render: `<div centered> <Icon size={32} /> <p uppercase tracking-widest> {message} </p> </div>`

**imgSrc duplication (2x):**
- `ScreenshotTab.tsx:30-33` and `ScreenshotTab.tsx:55-58` — identical logic

## Proposed Solutions

### Solution A: Extract Utilities (Recommended)

1. `src/app/utils/download.ts` — `downloadFile(content, filename, mimeType?)`
2. `src/app/components/inspector/widgets/EmptyState.tsx` — `<EmptyState icon={Icon} message={msg} />`
3. Local `getImageSrc` function or useMemo in ScreenshotTab

- Pros: DRY, reusable across codebase (SubAgentPanel has same empty pattern)
- Cons: New files
- Effort: Small (30 min)
- Risk: None

## Acceptance Criteria

- [ ] File download logic extracted to shared utility
- [ ] Empty state layout extracted to shared component
- [ ] ScreenshotTab imgSrc computed once

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-20 | Created from code review | — |
