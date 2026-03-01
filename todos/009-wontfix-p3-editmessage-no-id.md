---
status: wont_fix
priority: p3
issue_id: "009"
tags: [code-review, consistency]
dependencies: []
---

# `editMessage` Creates Message Without `id` (Intentional)

## Problem Statement

`sendMessage` creates `{ id: uuidv4(), type, content }`, but `editMessage` creates `{ type, content }` without an `id`. Both work — the server assigns an ID on fork operations.

## Findings

- **Source:** TypeScript Reviewer
- **Location:** `src/app/hooks/useChat.ts:284-287`
- **Note:** This is intentional per the plan and matches the official `agent-chat-ui` reference. The server assigns the ID during checkpoint forking. Adding a client-side ID would be harmless but unnecessary.

## Decision

No action needed — this is by design. Documented for awareness.

## Work Log

| Date | Action |
|------|--------|
| 2026-03-01 | Identified during code review — confirmed intentional |
