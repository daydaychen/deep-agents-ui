---
title: LangGraph SDK Enhancements: Assistant Management, Runtime Overrides, and Store Explorer
type: feat
status: active
date: 2026-03-01
origin: docs/brainstorms/2026-03-01-langgraph-sdk-enhancements-brainstorm.md
---

# LangGraph SDK Enhancements: Assistant Management, Runtime Overrides, and Store Explorer

## Overview

This plan implements a set of advanced developer tools within the `deep-agents-ui`, leveraging the full capabilities of the `langchain-langgraph-sdk`. The focus is on providing direct control over assistants, runtime behavior, and persistent storage.

## Problem Statement / Motivation

Currently, users must manually configure Assistant IDs and have limited control over runtime parameters like recursion limits or model overrides during a conversation. Additionally, inspecting the Store (Memory) requires a separate dedicated view, which breaks the flow of development and testing.

## Proposed Solution

1. **Assistant CRUD**: Add management capabilities to `ConfigDialog`.
2. **Runtime Overrides**: Add a settings popover to `ChatInput` to override run parameters.
3. **Memory Explorer**: Integrate a searchable Memory view into the `TasksFilesSidebar`.

## Technical Considerations

- **SDK Interaction**: Use `client.assistants.*` for CRUD and pass overrides to `stream.submit`.
- **UI Consistency**: Maintain the current aesthetic using Shadcn UI components.
- **State Management**: Lift runtime override state to `ChatProvider` or handle it locally in `ChatInterface`.

## System-Wide Impact

- **Interaction graph**: `ConfigDialog` -> `Client` (Assistant CRUD). `ChatInput` -> `useChat` -> `useStream` (Runtime parameters). `TasksFilesSidebar` -> `useMemory` (Store access).
- **API surface parity**: Extends the UI to cover more of the LangGraph SDK's REST API.
- **Integration test scenarios**: Test assistant creation, followed by a run with model override, followed by verifying store updates in the sidebar.

## Acceptance Criteria

- [ ] **Assistant CRUD**:
  - [ ] Create new assistant with custom `name`, `graph_id`, and `config`.
  - [ ] Update existing assistant `name`, `config`, and `metadata`.
  - [ ] Delete assistants from the selection list.
- [ ] **Runtime Overrides**:
  - [ ] Override `model` for the next message/run.
  - [ ] Temporarily adjust `recursion_limit`.
  - [ ] Set `interrupt_before` / `interrupt_after` points.
- [ ] **Memory Explorer**:
  - [ ] New "Memory" section in `TasksFilesSidebar`.
  - [ ] Search input that filters by key or value content.
  - [ ] Collapsible like other sidebar sections.

## Implementation Phases

### Phase 1: Assistant Management (ConfigDialog)

- **File**: `src/app/components/ConfigDialog.tsx`
- **Actions**:
  - Add state for assistant management (name, config json, metadata json).
  - Implement `handleCreateAssistant`, `handleUpdateAssistant`, `handleDeleteAssistant`.
  - Add a "Manage" mode or inline action buttons in the assistant list.

### Phase 2: Runtime Overrides (ChatInput)

- **Files**: `src/app/components/chat/ChatInput.tsx`, `src/app/hooks/useChat.ts`
- **Actions**:
  - Add a settings popover to `ChatInput`.
  - Update `useChat.ts` to support passing `RunConfig` overrides to `sendMessage` and `continueStream`.

### Phase 3: Memory Explorer (TasksFilesSidebar)

- **Files**: `src/app/components/TasksFilesSidebar.tsx`, `src/app/hooks/useMemory.ts`
- **Actions**:
  - Create a `MemoryExplorer` sub-component.
  - Add search logic to filter namespaces and items.
  - Integrate into `TasksFilesSidebar.tsx`.

## Sources & References

- **Origin brainstorm**: [docs/brainstorms/2026-03-01-langgraph-sdk-enhancements-brainstorm.md](docs/brainstorms/2026-03-01-langgraph-sdk-enhancements-brainstorm.md)
- LangGraph SDK: `src/providers/ClientProvider.tsx`, `src/app/hooks/useChat.ts`
- Existing UI patterns: `src/app/components/ConfigDialog.tsx`, `src/app/components/TasksFilesSidebar.tsx`
