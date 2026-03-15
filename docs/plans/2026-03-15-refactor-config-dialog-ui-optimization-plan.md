---
title: Optimize ConfigDialog UI from JSON to Form
type: refactor
status: active
date: 2026-03-15
---

# Optimize ConfigDialog UI from JSON to Form

## Overview

Currently, the `ConfigDialog` component in `src/app/components/ConfigDialog.tsx` uses JSON string input for `assistantConfig` and `assistantMetadata`. This approach is error-prone and provides a poor user experience. As the `client.assistants.update` API has a specific structure for `config` (`tags`, `recursion_limit`, `configurable`) and `metadata` is a key-value object, we can optimize the UI by replacing the JSON textareas with structured form inputs.

## Problem Statement / Motivation

- **Error-prone**: Users have to manually type JSON, which leads to syntax errors.
- **Poor UX**: Editing complex objects in a small textarea is difficult.
- **Redundant validation**: The UI has to manually validate JSON before saving.
- **API Mismatch**: The current UI treats the entire `config` as a generic JSON object, while the API expects specific fields.

## Proposed Solution

1.  **Refactor `ConfigDialog` state**: Replace `assistantConfig` (string) and `assistantMetadata` (string) with structured states.
2.  **Create a `KeyValueForm` component**: A reusable component to handle dynamic key-value pairs for `configurable` and `metadata`.
3.  **Implement `TagsInput`**: A field for `tags` (string array).
4.  **Update `ConfigDialog` layout**:
    - `recursion_limit`: Numeric input (already exists, but should be part of the config section if updating assistant).
    - `tags`: Form input.
    - `configurable`: `KeyValueForm`.
    - `metadata`: `KeyValueForm`.
5.  **Update translations**: Adjust labels in `en.json` and `zh.json`.

## Technical Considerations

- **State Management**: Use objects/arrays for the form state and only serialize/deserialize when interacting with the SDK.
- **Dynamic Rows**: The `KeyValueForm` should allow adding and removing rows for keys and values.
- **Type Safety**: Ensure types from `@langchain/langgraph-sdk` are correctly used.

## System-Wide Impact

- **Interaction graph**: `ConfigDialog` -> `client.assistants.update` -> Server.
- **Error propagation**: Form validation errors (e.g., duplicate keys in `KeyValueForm`) should be handled before submission.
- **State lifecycle risks**: Partial updates if some fields are invalid (though form inputs should minimize this).
- **Integration test scenarios**: Verify that saving the form correctly calls `client.assistants.update` with the expected payload structure.

## Acceptance Criteria

- [ ] `assistantConfig` JSON textarea is replaced by structured inputs (`tags`, `recursion_limit`, `configurable`).
- [ ] `assistantMetadata` JSON textarea is replaced by a `KeyValueForm`.
- [ ] `KeyValueForm` allows adding/removing entries and supports basic validation (no empty keys).
- [ ] `tags` can be edited as a list or comma-separated string.
- [ ] Settings are correctly saved to the server via `client.assistants.update`.
- [ ] Translations are updated to reflect the new UI.

## MVP Implementation Plan

### `src/app/components/ui/key-value-form.tsx` (New)
A simple helper to manage dynamic key-value pairs.

### `src/app/components/ConfigDialog.tsx` (Update)
- Replace `assistantConfig` and `assistantMetadata` state.
- Use `KeyValueForm` for `configurable` and `metadata`.
- Add `tags` input.

## Sources & References

- **SDK Types**: `Assistant` from `@langchain/langgraph-sdk`.
- **Existing Patterns**: `ArgumentEditor.tsx` for form-based editing.
- **Translation files**: `messages/en.json`, `messages/zh.json`.
