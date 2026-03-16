# APP COMPONENTS KNOWLEDGE BASE

**Generated:** 2026-03-09  
**Part of:** deep-agents-ui/src/app/AGENTS.md hierarchy
**Commit:** 137dc64

**Generated:** 2026-02-28 17:12:08  
**Part of:** deep-agents-ui/src/app/AGENTS.md hierarchy

## OVERVIEW

Feature-specific UI components organized by domain with parallel hooks structure.

## STRUCTURE

```
components/
├── approval/            # Approval workflows
│   ├── ApprovalList.tsx
│   └── ApprovalRow.tsx
├── chat/               # Chat interface
│   ├── ChatInterface.tsx
│   ├── ConfigDialog.tsx
│   ├── FileViewDialog.tsx
│   ├── TasksFilesSidebar.tsx
│   └── TooltipIconButton.tsx
├── memory/             # Memory management
│   ├── Memory.tsx
│   └── MemoryItem.tsx
├── message/            # Message rendering
│   ├── Message.tsx
│   └── MessageActions.tsx
└── thread/             # Thread navigation
    ├── ThreadList.tsx
    └── ThreadRow.tsx
```

## WHERE TO LOOK

| Task            | Location                     | Notes                  |
| --------------- | ---------------------------- | ---------------------- |
| Chat UI         | `chat/ChatInterface.tsx`     | Main wrapper component |
| Configuration   | `chat/ConfigDialog.tsx`      | Agent settings         |
| File viewing    | `chat/FileViewDialog.tsx`    | File preview           |
| Tasks/files     | `chat/TasksFilesSidebar.tsx` | Sidebar panel          |
| Memory UI       | `memory/Memory.tsx`          | Memory sidebar         |
| Message display | `message/Message.tsx`        | Message rendering      |
| Thread list     | `thread/ThreadList.tsx`      | Thread navigation      |

## COMPONENT PATTERNS

| Pattern               | Example                                   | Purpose                                |
| --------------------- | ----------------------------------------- | -------------------------------------- |
| **TooltipIconButton** | `chat/TooltipIconButton.tsx`              | Wrapper combining Tooltip + IconButton |
| **List/Item**         | `thread/ThreadList.tsx` + `ThreadRow.tsx` | List container + item component        |
| **Dialog**            | `chat/ConfigDialog.tsx`                   | Modal dialog with form                 |
| **Sidebar**           | `memory/Memory.tsx`                       | Collapsible sidebar panel              |
| **Wrapper**           | `chat/ChatInterface.tsx`                  | Main container component               |

## KEY COMPONENTS

| Component           | Type      | Lines | Memoized |
| ------------------- | --------- | ----- | -------- |
| `ChatInterface`     | Container | 300+  | Yes      |
| `ConfigDialog`      | Dialog    | 100+  | Yes      |
| `FileViewDialog`    | Dialog    | 200+  | Yes      |
| `TasksFilesSidebar` | Sidebar   | 200+  | Yes      |
| `Memory`            | Sidebar   | 100+  | Yes      |
| `Message`           | Display   | 150+  | Yes      |
| `ThreadList`        | List      | 100+  | Yes      |

## CONVENTIONS (THIS LAYER ONLY)

- **Feature grouping**: Each domain gets its own directory
- **Component naming**: PascalCase, descriptive of purpose
- **Memoization**: 29/ components use `React.memo()`
- **Client components**: All are `"use client"`
- **Props typing**: Strict TypeScript interfaces
- **Composition**: Prefer composition over inheritance

## STYLING PATTERNS

- **Tailwind classes**: Direct styling in components
- **shadcn/ui**: Base components extended
- **cn() utility**: Class merging from `@/lib/utils`
- **Variants**: Using `class-variance-authority` for component variants
- **Radix primitives**: Accessibility-first components

## PERFORMANCE NOTES

- **Memoization**: Heavy use of `React.memo()` for pure components
- **Callback hooks**: `useCallback` for event handlers
- **Memo hooks**: `useMemo` for expensive computations
- **Effect optimization**: Minimal `useEffect` usage

## ANTI-PATTERNS (THIS LAYER ONLY)

- **Large components**: Some >200 lines (refactor candidates)
- **Inline styles**: Mix of Tailwind and inline styles
- **Complex props**: Deep prop drilling in some cases
- **Missing error boundaries**: No component-level error handling

## REFACTORING CANDIDATES

1. Split `FileViewDialog.tsx` into view/logic components
2. Extract `TasksFilesSidebar.tsx` tasks/files panels
3. Create shared base components for dialogs
4. Implement proper loading skeletons
5. Add component-level error boundaries
6. Add i18n support for all hardcoded strings
7. Extract `TasksFilesSidebar.tsx` tasks/files panels
8. Create shared base components for dialogs
9. Implement proper loading skeletons
10. Add component-level error boundaries
