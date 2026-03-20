---
status: complete
priority: p2
issue_id: "032"
tags: [code-review, performance, inspector]
dependencies: []
---

# react-syntax-highlighter Full Bundle Import

## Problem Statement

ConfigTab imports the full `react-syntax-highlighter` package which includes all ~180 language parsers, adding 200-400KB gzipped to the client bundle. Only JSON highlighting is needed.

## Findings

### Performance Oracle

**File:** `src/app/components/inspector/tabs/ConfigTab.tsx:8-9`

```tsx
import SyntaxHighlighter from "react-syntax-highlighter";
import { atomOneDark, atomOneLight } from "react-syntax-highlighter/dist/esm/styles/hljs";
```

The default import pulls all languages. Since ConfigTab is only visible when the inspector's config tab is active, this is wasted on initial load.

## Proposed Solutions

### Solution A: Light Build with JSON Only (Recommended)

```tsx
import SyntaxHighlighter from "react-syntax-highlighter/dist/esm/light";
import json from "react-syntax-highlighter/dist/esm/languages/hljs/json";
import { atomOneDark, atomOneLight } from "react-syntax-highlighter/dist/esm/styles/hljs";

SyntaxHighlighter.registerLanguage("json", json);
```

- Pros: Reduces bundle by ~200-400KB, no visual change
- Cons: Must register each language explicitly
- Effort: Small (15 min)
- Risk: None

### Solution B: Dynamic Import via next/dynamic

Lazy-load the entire ConfigTab. Defers both syntax-highlighter and diff library until user opens Config tab.

- Pros: Zero cost until tab opened
- Cons: Brief loading state when first opening Config tab
- Effort: Small (20 min)
- Risk: Low

## Acceptance Criteria

- [ ] Only JSON language parser is bundled from react-syntax-highlighter
- [ ] Build bundle size for ConfigTab chunk is reduced

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-20 | Created from code review | — |
