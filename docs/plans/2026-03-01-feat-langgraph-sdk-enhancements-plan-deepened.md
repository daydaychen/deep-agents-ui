---
title: "Deepened Plan: LangGraph SDK Enhancements (Assistant CRUD, Runtime Overrides, Memory Explorer)"
type: feat
status: active
date: 2026-03-01
origin: docs/plans/2026-03-01-feat-langgraph-sdk-enhancements-plan.md
---

# Deepened Plan: LangGraph SDK Enhancements

## Overview
This enhanced plan leverages the latest **LangGraph SDK (2024-2026)** capabilities to provide production-grade developer tools within `deep-agents-ui`. We are moving beyond basic chat to full **Assistant Lifecycle Management**, **Precision Runtime Control**, and **Hybrid Memory Exploration**.

## Research Insights & Best Practices

### Assistant Management (CRUD)
- **Concept**: Assistants are concrete instances of Graphs. Updating an assistant creates a new version while preserving historical configuration.
- **SDK Pattern**: Use `client.assistants.search` with metadata filters for multi-tenant or multi-user isolation.
- **Validation**: Complex `config` and `metadata` must be validated as valid JSON before submission to avoid 400 Bad Request errors from the SDK.

### Runtime Overrides (RunConfig)
- **Priority**: Overrides passed in `client.runs.stream(..., config=...)` take absolute precedence over the Assistant's default config.
- **Safety**: Use `streamResumable: true` to prevent the server from cancelling the run upon browser disconnect.
- **HITL**: `interrupt_before` and `interrupt_after` are critical for human-in-the-loop debugging; the UI should allow setting these per-run.

### Memory Store Explorer
- **Hybrid Storage**: LangGraph distinguishes between **Short-term Memory** (Thread Checkpoints) and **Long-term Memory** (Namespace-scoped Store).
- **Navigation**: UI should use a **Namespace Tree** (e.g., `["user_123", "memories"]`) to filter items.
- **Search**: Support **Semantic Search** with vector similarity scores, not just keyword matching.

---

## Enhanced Implementation Phases

### Phase 1: Advanced Assistant Management
**File**: `src/app/components/ConfigDialog.tsx`

- **Implementation**:
    - [ ] **JSON Validation**: Integrate a minimal JSON editor (or `textarea` with live `JSON.parse` validation) for `config` and `metadata` fields.
    - [ ] **Versioning Support**: Display the `created_at` and `updated_at` timestamps for assistants.
    - [ ] **Safe Deletion**: Add a confirmation dialog that warns about active threads associated with the assistant being deleted.
- **Code Pattern**:
    ```typescript
    // SDK call for creating a specialized assistant
    const assistant = await client.assistants.create({
      graph_id: "agent",
      config: validatedConfig,
      metadata: { created_by: userId, type: "specialized-expert" }
    });
    ```

### Phase 2: Precision Runtime Overrides
**Files**: `src/app/components/chat/ChatInput.tsx`, `src/app/hooks/useChat.ts`

- **Implementation**:
    - [ ] **Dynamic Overrides State**: Add `overrideConfig` state to `ChatProvider`.
    - [ ] **Settings Popover**: Create a `Popover` in `ChatInput` containing:
        - `model`: Selection dropdown (Claude 3.5, GPT-4o, Gemini 2.0).
        - `recursion_limit`: Slider (10 - 200).
        - `interrupt_before/after`: Checkboxes for node-level interruptions.
    - [ ] **Integration-Fix (Bug Prevention)**: 
        - Explicitly set `fetchStateHistory: { limit: 100 }` in `useStream`.
        - Ensure `streamResumable: true` in all `stream.submit` calls.
        - Apply `isSubmittingRef` guard to prevent race conditions during forked runs.
- **Edge Case**: Handle the scenario where an override makes the `recursion_limit` lower than the current message count.

### Phase 3: Semantic Memory Explorer
**Files**: `src/app/components/TasksFilesSidebar.tsx`, `src/app/hooks/useMemory.ts`

- **Implementation**:
    - [ ] **Hierarchical Navigation**: Left-hand tree view for `client.store.listNamespaces`.
    - [ ] **Semantic Search Bar**: Input that triggers `client.store.search` with optional `query` (vector search).
    - [ ] **Item CRUD**: Allow manual editing of memory items (correction of "hallucinated" memories).
    - [ ] **Performance**: Use `TanStack Query` for caching store lists to reduce redundant SDK calls.
- **UI Aesthetic**: Use a "Bento Grid" or collapsible "Accordion" style in the sidebar to keep the interface clean.

---

## Technical Integrity & Safety

- **Security**: Never expose the full `client` object to the client-side without proper auth headers (already handled by `ClientProvider`).
- **Performance**: Quadratic payload growth in `ThreadState` history (50 msgs ≈ 5.6 MB). Cap UI history rendering to prevent browser lag.
- **Parity**: Ensure every action available in the UI (e.g., updating a memory item) is also available as an Agent Tool (`upsert_memory`).

---

## Acceptance Criteria (Enhanced)
- [x] Assistant CRUD supports complex JSON validation.
- [x] Runtime settings allow overriding model and recursion limit per-message.
- [x] Memory Explorer supports hierarchical namespaces and semantic search.
- [x] All "Fork" and "Override" operations are protected against double-click race conditions.
- [x] Long conversations (>10 exchanges) support correct checkpoint forking.

## References
- Internal Learning: `docs/solutions/integration-issues/langgraph-sdk-retry-edit-message-operations.md`
- LangGraph SDK Docs: [Runtime Overrides](https://langchain-ai.github.io/langgraphjs/how-tos/configuration/)
- Agent-Native Architecture: [Parity Principle](https://github.com/langchain-ai/deep-agents-ui/AGENTS.md)
