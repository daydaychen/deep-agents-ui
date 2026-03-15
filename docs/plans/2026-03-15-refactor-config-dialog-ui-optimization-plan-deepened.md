---
title: Optimize ConfigDialog UI from JSON to Form
type: refactor
status: completed
date: 2026-03-15
origin: docs/plans/2026-03-15-refactor-config-dialog-ui-optimization-plan.md
---

# Optimize ConfigDialog UI from JSON to Form

## Enhancement Summary

**Deepened on:** 2026-03-15
**Sections enhanced:** Overview, Proposed Solution, Technical Approach, MVP Implementation Plan, Acceptance Criteria
**Research agents used:** frontend-design, best-practices-researcher, kieran-typescript-reviewer, spec-flow-analyzer, architecture-strategist

### Key Improvements
1.  **"Control Deck" Aesthetic**: Shifting toward a high-precision, technical UI that feels professional and expert-oriented.
2.  **Mature Library Integration**: Recommending `shadcn-tag-input` and `React Hook Form` to avoid reinventing form management.
3.  **Type-Safe State Layer**: Implementing a robust mapping layer between the UI's array-based state and the SDK's object-based payloads.
4.  **Architectural Alignment**: Placing reusable components in `src/app/components/ui/` for cross-dialog consistency.

## Overview

[Original content preserved]
Currently, the `ConfigDialog` component in `src/app/components/ConfigDialog.tsx` uses JSON string input for `assistantConfig` and `assistantMetadata`. This approach is error-prone and provides a poor user experience. As the `client.assistants.update` API has a specific structure for `config` (`tags`, `recursion_limit`, `configurable`) and `metadata` is a key-value object, we can optimize the UI by replacing the JSON textareas with structured form inputs.

### Research Insights

**Best Practices:**
- **Schema-First Forms**: Use `react-hook-form` with `Zod` for validation and state management. This is the gold standard for complex Next.js forms in 2026.
- **Tag Management**: Use `shadcn-tag-input` (by vpgits) for a native shadcn/ui feel with Enter/Comma support and animations.
- **Atomic Composition**: Build the `KeyValueForm` using shadcn/ui `Input` and `Button` primitives combined with `useFieldArray`.

**Performance Considerations:**
- Use `useFieldArray` to ensure stable key-based rendering of form rows, preventing full list re-renders on every keystroke.
- Debounce validation if the schema is complex, though for this simple flat structure, real-time validation is fine.

## Proposed Solution

1.  **Tabbed Configuration**: Divide the dialog into "General", "Config", and "Metadata" tabs to manage the increased vertical space of the new forms.
2.  **Pill-Based Tag Input**: Replace the `tags` array with a modern tag input component.
3.  **Dynamic Key-Value Grid**: Use a two-column grid (Key | Value) with "Add" and "Remove" actions for `configurable` and `metadata`.
4.  **Interactive Validation**: Real-time feedback for duplicate keys, invalid recursion limits, and empty fields.

### Interaction Graph
`ConfigDialog` (Tabs) -> `GeneralSettings` | `AssistantConfigForm` | `MetadataForm` -> `KeyValueForm` -> `client.assistants.update`.

## Technical Approach

### Architecture

**1. Component Placement:**
- `src/app/components/ui/KeyValueForm.tsx`: A reusable, domain-agnostic key-value editor.
- `src/app/components/ui/TagInput.tsx`: Wrapper for `shadcn-tag-input`.

**2. State Mapping Layer:**
Implement a transformation layer to keep the UI state clean:
```typescript
interface KeyValueEntry {
  id: string; // for React keys
  key: string;
  value: any;
}

const toFormData = (obj: Record<string, any>) => 
  Object.entries(obj).map(([key, value]) => ({ id: crypto.randomUUID(), key, value }));

const fromFormData = (entries: KeyValueEntry[]) => 
  Object.fromEntries(entries.map(e => [e.key, e.value]));
```

### Implementation Phases

#### Phase 1: Foundation (Setup Libraries)
- Install `react-hook-form`, `zod`, and `@hookform/resolvers`.
- Install `shadcn-tag-input` or implement a simple shadcn-style wrapper.
- Create `KeyValueForm.tsx` using `useFieldArray`.

#### Phase 2: Refactor ConfigDialog
- Migrate existing `useState` calls to a single `useForm` hook.
- Implement the tabbed layout using shadcn/ui `Tabs`.
- Wire up the new form components.

#### Phase 3: Polish & Validation
- Add "Dirty State" warnings if user tries to close with unsaved changes.
- Ensure smooth transitions between select-from-list and enter-manually modes for Assistant ID.

## System-Wide Impact

### Error & Failure Propagation
- **Validation**: Duplicate keys in `configurable` or `metadata` should be flagged before submission to prevent silent data overwrite.
- **Async Handling**: Use `isSubmitting` state to disable inputs and show a loader on the "Save" button.

### State Lifecycle Risks
- Ensure that switching between assistants correctly resets the form state or loads the new assistant's data.

## Acceptance Criteria

- [ ] JSON textareas are replaced by structured forms.
- [ ] `configurable` and `metadata` use a dynamic key-value grid.
- [ ] `tags` use a modern pill-based input.
- [ ] Tabs are used to organize settings.
- [ ] No duplicate keys are allowed in the form.
- [ ] Async update state is clearly communicated (loading/success/error).

## Sources & References

### Origin
- **Brainstorm document:** [docs/brainstorms/2026-03-01-langgraph-sdk-enhancements-brainstorm.md](docs/brainstorms/2026-03-01-langgraph-sdk-enhancements-brainstorm.md). Key decisions: Move toward structured editing of assistant parameters.

### External References
- [Shadcn UI Tag Input](https://github.com/vpgits/shadcn-tag-input)
- [React Hook Form useFieldArray](https://react-hook-form.com/api/usefieldarray)
- [LangGraph SDK Assistants API](https://langchain-ai.github.io/langgraph/sdk-python/assistants/)

### Related Work
- `src/app/components/approval/ArgumentEditor.tsx`: Existing pattern for structured argument editing.
