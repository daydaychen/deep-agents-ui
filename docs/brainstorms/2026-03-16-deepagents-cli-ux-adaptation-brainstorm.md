---
date: 2026-03-16
topic: deepagents-cli-ux-adaptation
---

# DeepAgents CLI UX Adaptation Brainstorm

## Context

This brainstorm compares the UI/UX design of **deepagents_cli** (CLI-based portal for coding agents) with our current **deep-agents-ui** web portal (for automation crawler scenarios). The goal is to identify valuable patterns from the CLI that can improve our web interface, while accounting for our different focus: automation web crawling via databus_backend and Playwright MCP, rather than general file editing.

---

## What We're Building

**Improvement recommendations** for the deep-agents-ui web portal based on proven CLI UX patterns. These are design enhancements that will make the web interface more powerful, efficient, and user-friendly for automation scenarios.

---

## Analysis Summary

### DeepAgents CLI Strengths

The CLI demonstrates exceptional UX through:

1. **Semantic Color Coding** - Consistent color mapping (green=agent, amber=tools, gray=system)
2. **Progressive Disclosure** - Simple summaries that expand to full details
3. **Multi-Modal Input** - Text + /commands + !bash + @files in unified interface
4. **Real-Time State Feedback** - Persistent toolbar showing auto-approve, token usage
5. **Human-in-the-Loop with Preview** - Approval with before/after diff preview
6. **Smart Truncation** - Intelligent summarization with expansion option
7. **Rich Terminal Components** - Panels, syntax highlighting, structured layouts

### Current Web Portal Strengths

Our web interface already has:

1. Clean, developer-focused aesthetic (shadcn/ui + Tailwind)
2. Good accessibility foundations (Radix UI primitives)
3. URL-based state management
4. Streaming message support
5. Thread and memory management
6. Sub-agent orchestration visualization

### Key Differences to Consider

| Aspect              | CLI (Coding Agents)          | Web Portal (Automation Crawlers)         |
| ------------------- | ---------------------------- | ---------------------------------------- |
| **Primary Output**  | File edits, code changes     | Web page analysis, data extraction       |
| **Key Artifacts**   | Diffs, file operations       | Screenshots, DOM snapshots, data schemas |
| **User Focus**      | Code review, file management | Site analysis, configuration generation  |
| **Approval Points** | File writes, shell commands  | MCP tool calls, data extraction rules    |
| **Context**         | Local filesystem             | Remote websites via Playwright           |

---

## Key Improvement Recommendations

### 1. Implement Semantic Color System

**Current State**: Status colors exist but aren't consistently applied across the UI.

**Recommendation**: Adopt CLI's color philosophy:

- **Emerald (#10b981)**: Agent messages, successful operations
- **Amber (#fbbf24)**: Tool operations, MCP calls, warnings
- **Blue**: Active/pending states, links
- **Gray**: System messages, secondary info
- **Red**: Errors, rejections

**Application**: Apply consistently to message bubbles, tool call borders, status indicators, and the sub-agent panel.

---

### 2. Progressive Disclosure for Tool Results

**Current State**: ToolCallBox shows full JSON by default, which can be overwhelming.

**Recommendation**: Implement CLI-style progressive disclosure:

```
Collapsed: ⏺ web_search("how to center div") [▼]
Expanded:  ⏺ web_search("how to center div") [▲]
           ── Input ────────────────────────
           query: "how to center div"
           max_results: 5
           ── Result ───────────────────────
           [Formatted results with syntax highlighting]
```

**Benefits**: Reduces cognitive load, keeps chat clean, allows drill-down when needed.

---

### 3. Multi-Modal Input Interface

**Current State**: Text-only input with basic file attachment.

**Recommendation**: Add CLI-inspired input modes:

- **`/commands`**: Slash commands for quick actions (/clear, /tokens, /help)
- **`@mentions`**: Reference files, threads, or memory items with autocomplete
- **`!actions`**: Quick shortcuts for common operations (!screenshot, !analyze)
- **Drag & Drop**: Direct file/URL dropping into input

**Implementation**: Use prompt_toolkit-style autocomplete in the textarea with visual indicators for different input types.

---

### 4. Persistent Status Bar

**Current State**: No persistent status indicator. Token usage and settings are buried in dialogs.

**Recommendation**: Add a bottom toolbar (like CLI's status bar) showing:

```
[Auto-approve: ON]  [Tokens: 16,840/128k]  [Model: claude-3.5-sonnet]  [⚙ Settings]
```

**Benefits**: Always-visible context, quick settings access, resource awareness.

---

### 5. Enhanced Approval Workflow with Preview

**Current State**: ToolApprovalInterrupt shows basic info but lacks rich preview.

**Recommendation**: Implement CLI-style approval with:

- **Before/After Preview**: For MCP operations affecting state
- **Diff View**: For configuration changes
- **Screenshot Preview**: For Playwright actions (our unique need)
- **Keyboard Shortcuts**: `Y` to approve, `N` to reject, `E` to edit
- **Batch Approval**: Approve multiple pending actions at once

**Automation-Specific Enhancement**: Show the target webpage screenshot when approving Playwright actions.

---

### 6. Smart Content Summarization

**Current State**: Large outputs (JSON, HTML) are displayed in full.

**Recommendation**: Implement intelligent truncation:

- **Auto-summarize**: Show first 500 chars + "... (2,340 more)"
- **Syntax Collapse**: Collapse nested JSON/objects by default
- **Line Limits**: Truncate code blocks at 50 lines with expansion
- **Path Abbreviation**: Show basename for long file paths

**Automation Context**: Particularly valuable for large DOM snapshots and extracted data.

---

### 7. Rich Panel Components

**Current State**: Basic card-based layout.

**Recommendation**: Adopt CLI's panel-based information architecture:

- **Bordered Panels**: Clear visual separation with subtle borders
- **Syntax Highlighting**: Monokai-style theme for code blocks
- **Status Icons**: Consistent iconography (⏺, ⎿, ☑, ⏳)
- **Nested Indentation**: Visual hierarchy for sub-tasks

**Implementation**: Create a `RichPanel` component with variants for different content types.

---

### 8. Session State Visualization

**Current State**: Thread list shows basic info; no session overview.

**Recommendation**: Add CLI-inspired session management:

- **Session Overview Dashboard**: Visual summary of current session
- **Token Usage Graph**: Real-time context window visualization
- **Activity Timeline**: Chronological view of actions taken
- **Checkpoint/Fork**: Save session state, create branches

---

### 9. Keyboard-First Navigation

**Current State**: Limited keyboard shortcuts (only Enter to send).

**Recommendation**: Implement power-user shortcuts:

- **`Ctrl+K`**: Global command palette
- **`Ctrl+Enter`**: Send message (already exists)
- **`Ctrl+E`**: Open in external editor
- **`Ctrl+T`**: Toggle auto-approve
- **`Esc`**: Close panels, cancel operations
- **`↑/↓`**: Navigate message history

---

### 10. Automation-Specific Enhancements (Based on MCP Tools)

Based on analysis of **databus_backend** (30 tools) and **Playwright** (37 tools) MCP tools, here are domain-specific UI components:

#### A. Screenshot Viewer (`browser_take_screenshot`)

**Tool Output**: PNG/JPEG base64 images (max 1.15MP, 1568px linear)

**UI Component**:

```
┌─ Screenshot: example.com ───────────┐
│ [📷 Viewport] [📄 Full Page] [🎯 Element] │
│                                     │
│  ┌─────────────────────────────┐   │
│  │                             │   │
│  │    [Base64 Image Render]    │   │
│  │                             │   │
│  └─────────────────────────────┘   │
│                                     │
│  Size: 1568×900 • 847KB            │
│  [🔍 Zoom] [💾 Download] [📋 Copy]  │
└─────────────────────────────────────┘
```

**Features**:

- Lightbox modal for full-size viewing
- Zoom/pan controls
- Download original file
- Compare mode (before/after action)

---

#### B. DOM Snapshot Viewer (`browser_snapshot`)

**Tool Output**: YAML ARIA snapshot with semantic roles and refs

**UI Component**:

```
┌─ DOM Snapshot ──────────────────────┐
│ 🔍 [Search elements...] [📋 Copy]   │
├─────────────────────────────────────┤
│ ▼ [document]                        │
│   ▶ [region='main']                 │
│   ▼ [heading='Product List']        │
│     ▶ [button='Add to Cart'] [ref=s1e3]│
│     ▶ [link='Details'] [ref=s1e4]   │
│   ▶ [list='Products']               │
│                                     │
│ Selected: [ref=s1e3]                │
│ Tag: button | Role: button          │
│ Text: "Add to Cart"                 │
│ [👆 Click] [📍 Scroll to] [📝 Copy locator]│
└─────────────────────────────────────┘
```

**Features**:

- Collapsible tree view
- Search/filter by role/text
- Click element to see details
- Generate locator from selection
- Highlight element on screenshot (if available)

---

#### C. HTML Content Viewer (`browser_get_html`)

**Tool Output**: Cleaned HTML string (optionally truncated)

**UI Component**:

```
┌─ HTML Content ──────────────────────┐
│ [👁 Preview] [📄 Source] [🌐 Open]   │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ <div class="product">           │ │
│ │   <h2>Product Name</h2>         │ │
│ │   <span class="price">$29.99</span>│ │
│ │   ... (2,340 more chars)        │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Show full content] [Copy HTML]     │
└─────────────────────────────────────┘
```

**Features**:

- Syntax-highlighted code view
- Rendered preview tab
- Truncation indicator with expand
- Copy to clipboard

---

#### D. Network Request Panel (`browser_network_requests`)

**Tool Output**: JSONL log of all HTTP requests

**UI Component**:

```
┌─ Network Activity ──────────────────┐
│ 🔍 Filter: [All ▼] [Status ▼]      │
├─────────────────────────────────────┤
│ Method │ Status │ URL              │
│────────┼────────┼──────────────────│
│ GET    │ 200    │ /api/products    │
│ POST   │ 201    │ /api/cart        │
│ GET    │ 404    │ /missing.css     │
│────────┼────────┼──────────────────│
│ [📊 47 requests] [⬇ 2.3MB] [⬆ 45KB]│
└─────────────────────────────────────┘
```

**Features**:

- Filter by method, status, domain
- Request/response detail view
- Timing waterfall (if available)
- Export as HAR

---

#### E. Task Pipeline Visualizer (databus_backend)

**Tool Output**: `task_stages_get` returns stage configurations

**UI Component**:

```
┌─ Task Pipeline: product_crawler ────┐
│                                     │
│  ┌─────────┐    ┌─────────┐        │
│  │  START  │───▶│  CRAWL  │        │
│  └─────────┘    └────┬────┘        │
│                      │              │
│              ┌───────┴───────┐      │
│              ▼               ▼      │
│        ┌─────────┐     ┌─────────┐  │
│        │  PARSE  │     │ STORAGE │  │
│        └─────────┘     └─────────┘  │
│                                     │
│  [▶ Start] [⏹ Stop] [🔄 Validate]   │
└─────────────────────────────────────┘
```

**Features**:

- Visual DAG representation
- Stage status indicators (pending/running/completed/error)
- Click stage to view config
- Real-time execution progress

---

#### F. Test Results Stream (databus_backend)

**Tool Output**: SSE (Server-Sent Events) formatted text

**UI Component**:

```
┌─ Test: product_crawler ─────────────┐
│ [⏹ Stop] [💾 Save Log]              │
├─────────────────────────────────────┤
│ ▶ Starting test...                  │
│ ✓ Connected to task                 │
│ ▶ Executing stage: crawl            │
│   ✓ Fetched https://example.com     │
│   ✓ Found 24 products               │
│ ▶ Executing stage: parse            │
│   ✓ Parsed 24 items                 │
│   ⚠ Warning: 2 items missing price  │
│ ✓ Test completed                    │
│                                     │
│ [📊 View Results] [🔍 Debug]        │
└─────────────────────────────────────┘
```

**Features**:

- Real-time streaming display
- Color-coded log levels
- Collapsible sections
- Export full log

---

#### G. Hook Code Editor (databus_backend)

**Tool Output**: Python code with syntax highlighting

**UI Component**:

```
┌─ Hook: custom_parser ───────────────┐
│ Type: after_parse │ Status: ✅ Released │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ 1  def after_parse(item):       │ │
│ │ 2      # Custom parsing logic   │ │
│ │ 3      if 'price' in item:      │ │
│ │ 4          item['price'] = ...  │ │
│ │ 5      return item              │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [✏ Edit] [🧪 Test] [🚀 Release]     │
└─────────────────────────────────────┘
```

**Features**:

- Monaco/CodeMirror editor
- Syntax highlighting
- Test with sample data
- Version history

---

## Implementation Priority

### Phase 1: Foundation (Quick Wins)

1. Semantic color system consistency
2. Progressive disclosure for ToolCallBox
3. Persistent status bar
4. Keyboard shortcuts (Ctrl+K, Esc)

### Phase 2: Enhanced Interactions

5. Multi-modal input with autocomplete
6. Smart content summarization
7. Rich panel components

### Phase 3: Advanced Features

8. Enhanced approval workflow with preview
9. Session state visualization
10. Automation-specific enhancements (screenshots, data preview)

---

## Why This Approach

The CLI's UX patterns are battle-tested for agent interactions. By adapting them to our web context:

1. **Familiarity**: Users of the CLI will feel at home
2. **Efficiency**: Progressive disclosure and keyboard shortcuts speed up workflows
3. **Clarity**: Semantic colors and structured panels reduce cognitive load
4. **Power**: Multi-modal input and persistent status give users control
5. **Domain Fit**: Automation-specific enhancements address our unique needs

---

## MCP Tool Categories Summary

Based on the tool analysis:

### databus_backend Tools (30 total)

- **Task Management** (13): CRUD operations, pipeline config, validation
- **Template Management** (3): Template listing, application, patching
- **Hook Management** (9): Hook lifecycle, attachment, release
- **Testing** (5): SSE streaming tests for nodes and pipelines

### Playwright Tools (37 total)

- **Visual Output** (4): Screenshots, video, PDF
- **DOM Inspection** (3): ARIA snapshots, HTML extraction
- **Navigation** (4): URL navigation, back/forward/reload
- **Interaction** (15): Mouse, keyboard, form, wait
- **Network** (4): Request monitoring, response handling
- **Storage** (6): Cookie management
- **Other** (5): Console, tabs, evaluation

## Open Questions

1. **Color Accessibility**: Should we maintain the exact CLI colors or adjust for WCAG compliance?
2. **Mobile Experience**: How do keyboard shortcuts and persistent status bar work on mobile?
3. **Screenshot Storage**: Where and how long should automation screenshots be stored?
4. **Performance**: Will progressive disclosure and rich panels impact rendering performance?
5. **User Preference**: Should these be opt-in features or default behavior?
6. **Tool Output Caching**: Should we cache MCP tool outputs (screenshots, HTML) for replay?
7. **DOM-Screenshot Sync**: How to synchronize DOM snapshot refs with screenshot coordinates?
8. **SSE Display**: What's the best UI pattern for streaming test results (auto-scroll vs manual)?

---

## Next Steps

→ `/ce:plan` for implementation details

**Recommended starting point**: Phase 1 items (colors, progressive disclosure, status bar) as they provide immediate value with minimal risk.

**Automation-specific priority**: Screenshot viewer and DOM snapshot viewer are highest value for web automation workflows.
