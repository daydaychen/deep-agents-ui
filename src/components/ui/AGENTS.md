# UI COMPONENTS KNOWLEDGE BASE

**Generated:** 2026-03-09  
**Part of:** deep-agents-ui/AGENTS.md hierarchy  
**Commit:** 137dc64

## OVERVIEW

shadcn/ui component library with Radix UI primitives and custom extensions.

## STRUCTURE

```
ui/
├── alert.tsx              # Alert/notification component
├── button.tsx             # Button with variants
├── dialog.tsx             # Modal dialogs
├── dropdown-menu.tsx      # Dropdown menus
├── input.tsx              # Text input
├── label.tsx              # Form labels
├── mode-toggle.tsx        # Dark/light mode toggle
├── popover.tsx            # Popover/tooltip container
├── resizable.tsx          # Resizable panels
├── scroll-area.tsx        # Custom scrollable area
├── select.tsx             # Select dropdown
├── skeleton.tsx           # Loading skeletons
├── switch.tsx             # Toggle switch
├── tabs.tsx               # Tab navigation
├── textarea.tsx           # Multi-line text input
├── tooltip.tsx            # Tooltip primitive
└── tooltip-icon-button.tsx # Custom: Tooltip + IconButton
```

## WHERE TO LOOK

| Task             | Location                  | Notes                    |
| ---------------- | ------------------------- | ------------------------ |
| Button variants  | `button.tsx`              | Primary, secondary, etc. |
| Dialog/modal     | `dialog.tsx`              | AlertDialog base         |
| Form inputs      | `input.tsx`, `textarea`   | Controlled inputs        |
| Toggle theme     | `mode-toggle.tsx`         | Theme switching          |
| Custom component | `tooltip-icon-button.tsx` | App-specific pattern     |
| Layout panels    | `resizable.tsx`           | Draggable panels         |

## COMPONENT PATTERNS

| Pattern            | Example                   | Implementation                     |
| ------------------ | ------------------------- | ---------------------------------- |
| **Variants**       | `button.tsx`              | `class-variance-authority` (cva)   |
| **Composition**    | `dialog.tsx`              | Radix primitives + Tailwind        |
| **Forward ref**    | All components            | `React.forwardRef` for ref passing |
| **Custom utility** | `tooltip-icon-button.tsx` | Composite: Tooltip + IconButton    |

## CONVENTIONS (THIS LAYER ONLY)

- **Base**: All built on Radix UI primitives for accessibility
- **Styling**: Tailwind CSS with `cn()` utility for class merging
- **Variants**: `cva` (class-variance-authority) for type-safe variants
- **Naming**: PascalCase matching shadcn/ui conventions
- **Exports**: Named exports, no default exports

## CUSTOM EXTENSIONS

| Component                 | Purpose                                 |
| ------------------------- | --------------------------------------- |
| `tooltip-icon-button.tsx` | Composite: Tooltip wrapper + IconButton |
| `mode-toggle.tsx`         | Theme switching with next-themes        |

## ANTI-PATTERNS (THIS LAYER ONLY)

- **No stories**: No Storybook or component documentation
- **No tests**: UI components untested
- **Inconsistent sizing**: Some components use different spacing scales

## DEPENDENCIES

- **@radix-ui/\*** — Accessible primitives
- **class-variance-authority** — Type-safe variants
- **tailwind-merge** + **clsx** — Class merging
- **lucide-react** — Icons

## NOTES

- Components are unstyled primitives — styling comes from Tailwind classes
- All support `className` prop for customization
- Theme-aware via CSS variables (next-themes)
