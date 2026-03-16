---
date: 2026-03-01
topic: langgraph-sdk-enhancements
---

# LangGraph SDK Enhancements: Assistant Management, Runtime Overrides, and Store Explorer

## What We're Building

A comprehensive enhancement to the `deep-agents-ui` that integrates advanced `langchain-langgraph-sdk` features directly into the existing user interface. This upgrade will provide developers with more control over assistant configurations, runtime parameters, and persistent storage (Store/Memory) without leaving the chat environment.

## Why This Approach

We chose **Approach 1 (Integrated)** to maintain a seamless user experience while surfacing powerful developer tools. By embedding these features into existing components like the `ConfigDialog`, `ChatInput`, and `Sidebar`, we ensure that advanced functionality is available exactly when and where it's needed during iterative agent development.

## Key Decisions

- **Assistant Management**:
  - **CRUD Operations**: Support creating, updating, and deleting assistants via the `ConfigDialog`.
  - **Structured Configuration**: Use structured forms (where possible) for editing assistant `config` and `metadata`, falling back to a JSON editor when necessary.
- **Runtime Overrides**:
  - **Contextual Popover**: Add a settings popover to the `ChatInput` to allow overriding `model`, `recursion_limit`, and `interrupt` points for each individual run.
  - **Model Selection**: Provide a pre-defined list of common models (e.g., `gpt-4o`, `claude-3-5-sonnet`) for quick selection, with a manual input option.
- **Memory (Store) Explorer**:
  - **Sidebar Integration**: Add a dedicated "Memory" (Store) section to the `TasksFilesSidebar`.
  - **Simple Search**: Implement an efficient text search through store item keys and values to help developers inspect the agent's persistent state.

## Open Questions

- **Schema Discovery**: Can we reliably fetch the expected configuration schema for each assistant to provide better structured forms?
- **Model List Source**: Where should we source the pre-defined list of models to ensure it's up-to-date with available providers?

## Next Steps

→ `/workflows:plan` for implementation details.
