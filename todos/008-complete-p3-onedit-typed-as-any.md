---
status: complete
priority: p3
issue_id: "008"
tags: [code-review, type-safety, pre-existing]
dependencies: []
---

# `onEdit` Typed as `any` in ChatMessage.tsx (Pre-existing)

## Problem Statement

`ChatMessage.tsx` types `onEdit` as `(editedMessage: any, index: number) => void`. Should be `(editedMessage: Message, index: number) => void`.

## Findings

- **Source:** TypeScript Reviewer
- **Location:** `src/app/components/ChatMessage.tsx`
- **Note:** Pre-existing — not introduced by this PR

## Acceptance Criteria

- [ ] `onEdit` prop typed with `Message` instead of `any`

## Work Log

| Date       | Action                                       |
| ---------- | -------------------------------------------- |
| 2026-03-01 | Identified during code review (pre-existing) |
