# APP HOOKS KNOWLEDGE BASE

**Generated:** 2026-03-09  
**Part of:** deep-agents-ui/src/app/AGENTS.md hierarchy  
**Commit:** 137dc64

## OVERVIEW

Feature-specific React hooks organized by domain with parallel structure to components.

## STRUCTURE

```
hooks/
├── chat/                        # Chat state & AI integration
│   ├── useChat.ts              # Main chat logic (631 lines)
│   └── useProcessedMessages.ts # Message processing
├── memory/                      # Memory persistence
│   └── useMemoryNamespace.ts   # Memory namespace operations
├── message/                     # Message handling
│   ├── useOrphanedActionRequests.ts
│   ├── useSubAgentExpansion.ts
│   └── useSubAgents.ts         # Sub-agent orchestration
├── thread/                      # Thread management
│   └── useThreadGrouping.ts    # Thread grouping logic
├── approval/                    # Approval workflows
│   └── useApprovalState.ts     # Approval state management
├── usePersistedMessages.ts      # IndexedDB persistence (207 lines)
├── useThreads.ts               # Thread CRUD operations
├── useMemory.ts                # Memory operations
└── useThrottledValue.ts        # Utility hook
```

## WHERE TO LOOK

| Task                | Location                       | Notes                                |
| ------------------- | ------------------------------ | ------------------------------------ |
| Main chat logic     | `chat/useChat.ts`              | 631 lines, LangGraph SDK integration |
| Message persistence | `usePersistedMessages.ts`      | IndexedDB, batch writes              |
| Thread management   | `useThreads.ts`                | Thread CRUD with SWR                 |
| Sub-agent handling  | `message/useSubAgents.ts`      | Sub-agent stream management          |
| Memory operations   | `useMemory.ts`                 | Memory CRUD operations               |
| Approval state      | `approval/useApprovalState.ts` | Approval workflow logic              |

## KEY HOOKS

| Hook                   | Lines | Purpose                     | Complexity |
| ---------------------- | ----- | --------------------------- | ---------- |
| `useChat`              | 631   | Main chat logic, streaming  | High       |
| `usePersistedMessages` | 207   | IndexedDB persistence       | High       |
| `useThreads`           | ~150  | Thread CRUD with caching    | Medium     |
| `useSubAgents`         | ~200  | Sub-agent orchestration     | Medium     |
| `useMemory`            | ~100  | Memory namespace operations | Low        |

## HOOK PATTERNS

| Pattern              | Example                        | Purpose                                  |
| -------------------- | ------------------------------ | ---------------------------------------- |
| **SDK Integration**  | `useChat.ts`                   | LangGraph SDK streaming with `useStream` |
| **Persistence**      | `usePersistedMessages.ts`      | IndexedDB with batching & throttling     |
| **SWR Fetching**     | `useThreads.ts`                | Data fetching with caching               |
| **Sub-agent Stream** | `message/useSubAgents.ts`      | Multiple concurrent stream management    |
| **State + Actions**  | `approval/useApprovalState.ts` | Encapsulate component state logic        |

## CONVENTIONS (THIS LAYER ONLY)

- **Naming**: `use{Feature}{Action}` for feature hooks, `use{Action}` for shared
- **File location**: Feature hooks in `hooks/{feature}/`, shared at `hooks/` root
- **Return pattern**: `[state, actions]` or `{ state, ...actions }` objects
- **Client directive**: All hooks are `"use client"` due to React hooks usage
- **Cleanup**: Always cleanup effects, close DB connections, abort streams

## ANTI-PATTERNS (THIS LAYER ONLY)

- **Monolithic hooks**: `useChat.ts` (631 lines) mixes streaming, state, config
- **Deep nesting**: Some hooks have 3+ levels of nested callbacks
- **Mixed concerns**: `usePersistedMessages` handles both DB and UI state
- **Console logging**: Debug logs in production code
- **Missing cleanup**: Some streams may not cleanup on unmount

## ARCHITECTURE NOTES

- **Streaming**: `useStream` from LangGraph SDK for real-time AI responses
- **Persistence**: IndexedDB with batched writes, throttled UI updates
- **Sub-agents**: Map-based tracking of multiple concurrent agent streams
- **Caching**: SWR for server state, refs for local streaming state
- **State refs**: Heavy use of `useRef` to avoid re-renders during streaming

## REFACTORING CANDIDATES

1. Split `useChat.ts` into: `useChatStream`, `useChatConfig`, `useChatState`
2. Extract `usePersistedMessages` DB layer into separate module
3. Create shared hook utilities for common patterns
4. Add proper error boundaries and retry logic
5. Implement hook testing with MSW for SDK mocking
