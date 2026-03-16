# Todo: LangGraph SDK Enhancements

## Phase 1: Advanced Assistant Management

- [x] **JSON Validation**: Integrate a minimal JSON editor (or `textarea` with live `JSON.parse` validation) for `config` and `metadata` fields in `ConfigDialog.tsx`.
- [x] **Versioning Support**: Display the `created_at` and `updated_at` timestamps for assistants in `ConfigDialog.tsx`.
- [x] **Safe Deletion**: Add a confirmation dialog that warns about active threads associated with the assistant being deleted.

## Phase 2: Precision Runtime Overrides

- [x] **Dynamic Overrides State**: Add `overrideConfig` state to `ChatProvider`.
- [x] **Settings Popover**: Create a `Popover` in `ChatInput` containing:
  - `model`: Selection dropdown (Claude 3.5, GPT-4o, Gemini 2.0).
  - `recursion_limit`: Slider (10 - 200).
  - `interrupt_before/after`: Checkboxes for node-level interruptions.
- [x] **Integration-Fix (Bug Prevention)**:
  - Explicitly set `fetchStateHistory: { limit: 100 }` in `useStream`.
  - Ensure `streamResumable: true` in all `stream.submit` calls.
  - Apply `isSubmittingRef` guard to prevent race conditions during forked runs.

## Phase 3: Semantic Memory Explorer

- [x] **Hierarchical Navigation**: Left-hand tree view for `client.store.listNamespaces` in `TasksFilesSidebar.tsx`.
- [x] **Semantic Search Bar**: Input that triggers `client.store.search` with optional `query` (vector search).
- [x] **Item CRUD**: Allow manual editing of memory items (correction of "hallucinated" memories).
- [x] **Performance**: Use `TanStack Query` (using SWR as an equivalent already established in the project).

## Quality & Shipping

- [x] Run full test suite.
- [x] Run linting.
- [ ] Capture and upload screenshots for UI changes.
- [ ] Create PR with full description.
