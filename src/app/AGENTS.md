# APP LAYER KNOWLEDGE BASE

**Generated:** 2026-03-09  
**Part of:** deep-agents-ui/AGENTS.md hierarchy
**Commit:** 137dc64

**Generated:** 2026-02-28 17:12:08  
**Part of:** deep-agents-ui/AGENTS.md hierarchy

## OVERVIEW

Next.js 16 App Router implementation - single-page chat application with AI agent orchestration.

## STRUCTURE

```
app/
├── components/            # Feature-specific UI components
│   ├── approval/         # Approval workflows & dialogs
│   ├── chat/            # Chat interface & messages
│   ├── memory/          # Memory sidebar & management
│   ├── message/         # Message rendering & styling
│   └── thread/          # Thread list & navigation
├── hooks/                # Feature-specific React hooks
│   ├── approval/        # Approval state logic
│   ├── chat/            # Chat state & AI integration
│   ├── memory/          # Memory persistence
│   └── thread/          # Thread management
├── types/               # TypeScript definitions
├── utils/               # App-specific utilities
├── layout.tsx           # Root layout (Server Component)
└── page.tsx            # Main chat page (Client Component)
```

## WHERE TO LOOK

| Task               | Location                | Notes                                   |
| ------------------ | ----------------------- | --------------------------------------- |
| Main layout        | `layout.tsx`            | Server Component only, uses NuqsAdapter |
| Chat UI            | `page.tsx`              | 369-line complex component              |
| Feature components | `components/{feature}/` | Organized by domain                     |
| Feature hooks      | `hooks/{feature}/`      | Mirror component structure              |
| Types              | `types/`                | Central type definitions                |
| Utilities          | `utils/`                | App-specific helpers                    |

## KEY COMPONENTS

| Component           | Location             | Purpose             |
| ------------------- | -------------------- | ------------------- |
| `ChatInterface`     | `components/chat/`   | Main chat wrapper   |
| `ConfigDialog`      | `components/chat/`   | Agent configuration |
| `Memory`            | `components/memory/` | Memory sidebar      |
| `FileViewDialog`    | `components/chat/`   | File viewing        |
| `TasksFilesSidebar` | `components/chat/`   | Tasks/files panel   |

## KEY HOOKS

| Hook                   | Location        | Purpose                           |
| ---------------------- | --------------- | --------------------------------- |
| `useChat`              | `hooks/chat/`   | Main chat logic (413 lines)       |
| `usePersistedMessages` | `hooks/`        | IndexedDB persistence (413 lines) |
| `useThreads`           | `hooks/thread/` | Thread management                 |
| `useMemory`            | `hooks/memory/` | Memory operations                 |

## CONVENTIONS (THIS LAYER ONLY)

- **Feature grouping**: Components and hooks organized in parallel directories
- **Absolute imports**: `@/*` only, no relative imports beyond depth 2
- **Client boundaries**: All components except layout are `"use client"`
- **State location**: Hooks manage state, components are presentational
- **Performance**: `React.memo()` on most components

## ANTI-PATTERNS (THIS LAYER ONLY)

- **Monolithic hooks**: `useChat.ts` (413 lines) mixes concerns
- **Large components**: `page.tsx` (369 lines) could be split
- **No error boundaries**: Missing React error boundaries
- **Console warnings**: Debug logging in production code

## ARCHITECTURE NOTES

- **Single-page app**: No routing beyond main page
- **Feature isolation**: Components/hooks grouped by domain
- **State separation**: URL state (nuqs), UI state (hooks), persistence (IndexedDB)
- **AI integration**: LangGraph SDK for agent orchestration
- **Memory model**: Thread persistence with IndexedDB

## REFACTORING CANDIDATES

1. Split `useChat.ts` into specialized hooks
2. Extract `usePersistedMessages.ts` IndexedDB operations
3. Break down `page.tsx` into smaller components
4. Add error boundaries for robustness
5. Implement proper loading/error states
6. Add i18n translations for all user-facing strings
7. Extract `usePersistedMessages.ts` IndexedDB operations
8. Break down `page.tsx` into smaller components
9. Add error boundaries for robustness
10. Implement proper loading/error states
