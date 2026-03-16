---
status: complete
priority: p3
issue_id: "024"
tags: [code-review, patterns, magic-numbers, maintainability]
dependencies: []
---

# Magic Numbers Throughout Codebase

## Problem Statement

Hardcoded numeric values appear throughout the codebase without explanation, making code harder to understand and modify.

## Findings

- **Source:** Pattern Recognition Specialist
- **Location:** Multiple files
- **Evidence:**

  - Retry delays, timeouts, and limits without named constants
  - Animation durations embedded in components
  - Array slice indices without explanation

- **Severity:** NICE-TO-HAVE - Code clarity issue
- **Impact:** Harder maintenance, potential for errors when changing values

## Proposed Solutions

### Option A: Create constants file with named exports

- **Pros:** Centralized configuration, easy to modify
- **Cons:** May over-organize for simple values
- **Effort:** Small
- **Risk:** Low - simple improvement

### Option B: Add inline comments explaining magic numbers

- **Pros:** Quick, context with usage
- **Cons:** Doesn't help with reuse
- **Effort:** Small
- **Risk:** Low - minimal change

### Option C: Extract to configuration with environment variable support

- **Pros:** Configurable per environment
- **Cons:** Over-engineering for constants
- **Effort:** Medium
- **Risk:** Low - but unnecessary complexity

## Recommended Action

Option A for values used in multiple places, Option B for one-off values.

## Technical Details

- **Common Magic Numbers:**
  - Retry delays (1000, 2000, etc.)
  - Message limits (50, 100)
  - Animation durations
  - Throttle/debounce values

## Acceptance Criteria

- [x] All numeric constants have named exports or inline comments
- [x] Values used in multiple places are centralized
- [x] Code intent is clear without external documentation

## Work Log

| Date       | Action                                                                                                      |
| ---------- | ----------------------------------------------------------------------------------------------------------- |
| 2026-03-09 | Identified during code review by Pattern Recognition Specialist                                             |
| 2026-03-09 | Created `src/lib/constants.ts` with named exports for timeout/delay, limit, and animation constants         |
| 2026-03-09 | Updated useChat.ts to use constants for recursionLimit, message limit, toast duration, and error truncation |
| 2026-03-09 | Updated MarkdownContent.tsx and MessageToolbar.tsx to use COPY_SUCCESS_DURATION_MS                          |
| 2026-03-09 | Updated ChatPage.tsx to use DEFAULT_MESSAGE_LIMIT for assistant search                                      |
| 2026-03-09 | Updated ConfigDialog.tsx to use DEFAULT_MESSAGE_LIMIT                                                       |
| 2026-03-09 | Updated useThreads.ts to use THREAD_TITLE_MAX_LENGTH and DEFAULT_THREAD_LIMIT                               |
| 2026-03-09 | Updated useMemory.ts and useMemoryNamespace.ts to use DEFAULT_MEMORY_LIMIT                                  |
| 2026-03-09 | Verified build passes with no new errors                                                                    |
