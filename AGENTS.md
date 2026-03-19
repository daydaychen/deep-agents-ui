# Databus Pilot UI KNOWLEDGE BASE

**Generated:** 2026-03-09  
**Commit:** 137dc64  
**Branch:** feat

**Generated:** 2026-02-28 17:12:08  
**Commit:** a17df78  
**Branch:** feat

## OVERVIEW

LangGraph AI agent UI with chat, memory, thread management, and sub-agent orchestration. Next.js 16 + React 19 SPA wrapped in App Router.

## STRUCTURE

```
deep-agents-ui/
├── src/app/                    # App Router entry
│   ├── components/            # Feature components (approval/, chat/, etc.)
│   ├── hooks/                 # Feature hooks (parallel to components)
│   ├── types/                 # TypeScript definitions
│   └── utils/                 # App-specific utilities
├── src/components/ui/         # shadcn/ui component library
├── src/providers/             # React context providers
└── src/lib/                   # Shared utilities (cn() function)
```

## WHERE TO LOOK

| Task                | Location                        | Notes                                        |
| ------------------- | ------------------------------- | -------------------------------------------- |
| Chat interface      | `src/app/page.tsx`              | Main 369-line component                      |
| Feature components  | `src/app/components/{feature}/` | approval/, chat/, memory/, message/, thread/ |
| Corresponding hooks | `src/app/hooks/{feature}/`      | Mirror component structure                   |
| UI components       | `src/components/ui/`            | shadcn library                               |
| State management    | `src/providers/`                | Context providers                            |
| Shared utils        | `src/lib/`                      | Only cn() function                           |

## CODE MAP

| Symbol                 | Type      | Location                   | Role                              |
| ---------------------- | --------- | -------------------------- | --------------------------------- |
| `useChat`              | Hook      | `src/app/hooks/chat/`      | Main chat logic (413 lines)       |
| `usePersistedMessages` | Hook      | `src/app/hooks/`           | IndexedDB persistence (413 lines) |
| `ChatInterface`        | Component | `src/app/components/chat/` | Primary UI wrapper                |
| `LangGraphSDKProvider` | Provider  | `src/providers/`           | AI agent SDK context              |

## CONVENTIONS

- **Absolute imports only**: `@/*` → `./src/*` (no relative imports beyond depth 2)
- **Feature grouping**: Parallel `components/{feature}/` and `hooks/{feature}/` directories
- **Client components**: All components are `"use client"` except root layout
- **Performance**: `React.memo()` used on 29/ components
- **State**: URL state with `nuqs`, data fetching with `SWR`
- **Styling**: `shadcn/ui` + `Tailwind` with Radix UI colors

## ANTI-PATTERNS (THIS PROJECT)

- **ESLint allows `any`**: Type safety intentionally relaxed
- **No tests**: Zero test setup (development phase)
- **Monolithic hooks**: `useChat.ts` (413 lines) combines multiple concerns
- **Console warnings**: `console.warn/error` used for debugging
- **React hooks deps**: `react-hooks/exhaustive-deps` disabled in 2 places

## UNIQUE STYLES

- **Component composition**: `TooltipIconButton` pattern (Tooltip + IconButton wrapper)
- **Color system**: Radix UI colors and Tailwind default palette
- **Layout**: Resizable panels with `react-resizable-panels`
- **AI integration**: LangGraph SDK for agent orchestration
- **Memory management**: Sidebar with thread persistence

## COMMANDS

```bash
# Development
pnpm dev               # Port 3003 with Turbopack
pnpm build             # Standalone output mode
pnpm start             # Production server

# Code quality (Biome)
pnpm lint              # Biome lint check
pnpm lint:fix          # Auto-fix lint issues
pnpm format            # Biome format
pnpm check             # Full check (lint + format + imports)
pnpm check:fix         # Auto-fix all issues

# Docker
docker build -t deep-agents-ui .
docker run -p 3003:3003 deep-agents-ui
```

## NOTES

- **Docker**: Multi-stage build, Node 20 alpine, port 3003
- **CI**: GitHub Actions with lint/build/spell checks
- **Missing**: Test automation, deployment workflows, E2E tests
- **Refactoring candidates**: Split `useChat.ts`, `usePersistedMessages.ts`
- **Architecture**: React SPA in Next.js wrapper - no API routes/middleware
- **State complexity**: Chat + threads + memory + sub-agents + configuration
- **i18n**: next-intl with ./src/i18n/request.ts configuration
- **CI**: GitHub Actions with lint/build/spell checks
- **Missing**: Test automation, deployment workflows, E2E tests
- **Refactoring candidates**: Split `useChat.ts`, `usePersistedMessages.ts`
- **Architecture**: Essentially React SPA in Next.js wrapper - no API routes/middleware
- **State complexity**: Chat + threads + memory + sub-agents + configuration
