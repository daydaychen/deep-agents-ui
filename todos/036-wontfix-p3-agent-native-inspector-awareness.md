---
status: wontfix
priority: p3
issue_id: "036"
tags: [code-review, agent-native, inspector]
dependencies: []
---

# Agent Has No Awareness of Inspector Panel

## Problem Statement

The agent does not know its tool results are being visualized in the Inspector panel. It cannot reference the Inspector in conversation, suggest the user check specific tabs, or control Inspector state programmatically.

## Findings

### Agent-Native Reviewer

- 2/21 capabilities are fully agent-accessible (data push via tool results)
- 15/21 are UI-only with no agent equivalent
- Agent cannot tell users "check the Config tab for the diff" because it doesn't know the Inspector exists
- Anti-crawl detection results are display-only — agent cannot react to them

Key gaps:
1. No system prompt documentation of Inspector capabilities
2. QuickActions (validate/test/start) require human clicks
3. Export, diff, timeline navigation are purely client-side

## Proposed Solutions

### Solution A: System Prompt Injection (Recommended — low cost, high value)

Add Inspector awareness to the agent's system prompt:
```
Your tool results are automatically visualized in the Inspector panel:
- task_stages_get / task_stage_config → Config tab (with diff and pipeline graph)
- test_pipeline / test_* → Log tab (with structured log viewer)
- task_validate → Log tab (with validation results)
- browser_screenshot → Screenshot tab
You can suggest the user check specific tabs after key operations.
```

- Pros: Zero code change, immediate agent awareness
- Effort: Trivial
- Risk: None

### Solution B: Structured Output Convention (Future)

Allow tool results to include `__inspector` metadata for the frontend to interpret as dispatch commands.

- Effort: Medium
- Risk: Low

## Acceptance Criteria

- [ ] Agent system prompt documents Inspector capabilities
- [ ] Agent can reference Inspector tabs in conversation

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-20 | Created from code review | — |
