---
status: wontfix
priority: p3
issue_id: "035"
tags: [code-review, simplicity, inspector]
dependencies: []
---

# DataTab Has No Data Source (YAGNI)

## Problem Statement

The `PUSH_TEST_RESULTS` action is defined in the reducer and DataTab renders `state.testResults`, but nothing ever dispatches `PUSH_TEST_RESULTS`. The `parseToolResult` function has no code path that returns `type: "data"`. The DataTab (197 lines with CSV/JSON export) will always show the "no data" empty state.

## Findings

### Code Simplicity Reviewer

**Files:**
- `inspector-context.ts:70` — `PUSH_TEST_RESULTS` action defined
- `inspector-reducer.ts:56-62` — Reducer case exists
- `tabs/DataTab.tsx` — 197 lines, never populated
- `ToolCallBox.tsx:163-191` — No case for `"data"` type in the switch

The DataTab was built as part of a deliberate design plan for future test pipeline structured data. However, the data flow to populate it does not yet exist.

## Proposed Solutions

### Solution A: Wire Up Data Source (Recommended if data extraction is coming soon)

Add a `"data"` case to the ToolCallBox switch and parseToolResult to extract structured rows from test_pipeline results.

- Pros: Activates existing code
- Effort: Medium

### Solution B: Remove Until Needed

Delete DataTab, remove "data" from InspectorTab union, remove from InspectorHeader tabs, remove testResults from state. Add back when data source exists.

- Pros: Removes 200+ lines of dead code
- Effort: Small

### Solution C: Keep As-Is (Acceptable)

Document that DataTab is a planned feature awaiting data flow wiring. No code change.

- Pros: No churn
- Cons: Dead code remains

## Acceptance Criteria

- [ ] Either wire up PUSH_TEST_RESULTS dispatch, or remove DataTab, or document as planned

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-20 | Created from code review | Part of deliberate Phase 4 plan |
