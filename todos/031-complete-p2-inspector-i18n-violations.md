---
status: complete
priority: p2
issue_id: "031"
tags: [code-review, i18n, inspector]
dependencies: []
---

# Inspector i18n Violations

## Problem Statement

Several inspector components bypass the i18n system with hardcoded Chinese strings or fragile string manipulation of translation output.

## Findings

### 1. String Replacement Hack (HIGH) — Pattern Recognition

**File:** `src/app/components/inspector/tabs/LogTab.tsx:122`

```tsx
{t("log.noLogs").replace("暂无日志", "日志")}
```

Manipulates Chinese translation at runtime. Produces incorrect output in English locale (replace finds nothing, leaving "No logs yet" as a section heading).

### 2. Hardcoded Chinese in QuickActions (MEDIUM) — Pattern Recognition + Agent-Native

**File:** `src/app/components/inspector/widgets/QuickActions.tsx:33, 38, 44`

```typescript
onSendMessage("请验证当前任务配置");
onSendMessage("请测试当前任务");
onSendMessage("请启动当前任务");
```

These appear in the chat history in Chinese regardless of user locale.

### 3. Hardcoded Chinese in tool-result-parser (MEDIUM) — Pattern Recognition

**File:** `src/app/utils/tool-result-parser.ts:48-126`

~20 hardcoded Chinese summary strings like `"任务创建成功"`, `"验证通过"`, etc. Since this is a utility file without React hook access, fixing requires passing a translation function or using a non-hook i18n API.

## Proposed Solutions

### Solution A: Add Translation Keys (Recommended)

1. Add `"log.title": "Logs"` / `"日志"` key, replace the `.replace()` hack
2. Add QuickActions command keys: `"actions.validateCommand"`, etc.
3. For tool-result-parser: accept an optional `t` function parameter, or return i18n keys instead of strings

- Pros: Proper i18n support
- Cons: tool-result-parser requires structural change for full fix
- Effort: Medium (1-2 hours)
- Risk: Low

## Acceptance Criteria

- [ ] No `.replace()` on translation output anywhere
- [ ] QuickActions messages use translation keys
- [ ] Add `log.title` translation key to en.json and zh.json

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-20 | Created from code review | — |
