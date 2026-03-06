---
name: create-task
description: Create and configure web scraping tasks on the Databus platform from scratch. Use when the agent has analyzed a website and needs to set up a complete crawling pipeline with start node, parser, and storage. Triggers on "create task", "new crawler", "set up pipeline", "scrape website".
---

# Create Task

Build a complete crawling pipeline from scratch: start node → parser → storage.

## Quick Start

1. `task_create(task_name="my_task", official_website_url="https://example.com")`
2. `task_stage_add(task_name="my_task", stage_name="start", group="start", type="input")`
3. `task_stage_add(task_name="my_task", stage_name="stage_list", group="stage", type="html", prev_stage_name="start")`
4. `task_stage_add(task_name="my_task", stage_name="storage_file", group="storage", type="file", prev_stage_name="stage_list")`
5. Configure start URL, parser fields, and storage — then `task_validate`.

## Tools Used

| Tool | Purpose | Safety |
|------|---------|--------|
| `task_create` | Create task skeleton | Idempotent (returns existing if name matches) |
| `task_stage_add` | Add pipeline nodes | Upsert semantics, safe to retry |
| `task_stages_get` | Read current config | Read-only. **Always call before `task_stage_config`** |
| `task_stage_config` | Modify node config via JSON Patch | State-changing. Read config first |
| `task_stage_parser_fields_setup` | Set extraction fields | Idempotent per mode |
| `task_stage_relationship_update` | Re-link nodes | State-changing |
| `task_validate` | Check pipeline completeness | Read-only |
| `task_update` | Update task metadata (proxy, throttle, headers) | State-changing |
| `task_delete` | Delete entire task | **Destructive, irreversible** |
| `task_stage_delete` | Delete a single node | **Destructive, irreversible** |
| `task_start` | Start task execution | **Triggers real HTTP requests** |
| `task_stop` | Stop a running task | State-changing |

## Resources

Use `read_resource(uri="...")` tool to read these resources as needed for schemas and examples.
Use `list_resources` to discover all available resources.

| URI | When to Read |
|-----|-------------|
| `context://node-types` | Before `task_stage_add` — see available groups and types |
| `context://schemas/crawl-field` | Before `task_stage_parser_fields_setup` — field schema |
| `context://extractors` | Before field setup — valid `extract.attr` values |
| `context://examples/xpath` | When writing XPath `path` values (HTML parser) |
| `context://examples/jsonpath` | When writing JSONPath `path` values (JSON parser) |
| `context://formatters` | When adding field format processors |
| `context://guide/pagination` | When configuring multi-page scraping |
| `context://schemas/stage-conf` | Full schema for all node configurations |

## Workflow

### Step 1: Create Task

```
task_create(
    task_name="my_task",
    official_website_url="https://target-site.com",
    project="databus_ai",        # optional, default "databus_ai"
    description="Crawl product listings"  # optional
)
```

- Returns `{task_name, existed}`.
- If `existed: true`, the task already exists — inspect it with `task_stages_get` and decide whether to reuse or delete.
- **Warning:** `task_delete` is a hard delete with no undo.

### Step 2: Choose Pipeline Pattern

Use `read_resource(uri="context://node-types")` to see available node groups and types.

| Pattern | Structure | When to Use |
|---------|-----------|-------------|
| **simple_list** | start → parser → storage | Single-page list extraction |
| **list_detail** | start → list_parser → detail_parser → storage | List page links to detail pages |
| **multi_category** | start(code) → parser → storage | Multiple seed URLs from code |
| **with_condition** | start → parser → condition → storage_a / storage_b | Route data by rules |

### Step 3: Add and Configure Start Node

**Add the node:**
```
task_stage_add(
    task_name="my_task",
    stage_name="start",
    group="start",
    type="input"        # or "code" for multiple seed URLs
)
```

**Read current config (mandatory before any config change):**
```
task_stages_get(task_name="my_task", stage_name="start")
```

**Configure URL and User-Agent (input type):**

> **Required:** Always set a realistic User-Agent header. The default Python-requests UA triggers anti-crawler detection on most sites.

```
task_stage_config(
    task_name="my_task",
    stage_name="start",
    operations=[
        {"op": "replace", "path": "/meta_data/requests_data/url", "value": "https://target-site.com/list"},
        {"op": "replace", "path": "/meta_data/requests_data/headers/User-Agent",
         "value": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"}
    ]
)
```

**Configure code-type start node** (for multiple seed URLs):
Use `type="code"` and set the `gen_seed_list()` callback:
```
task_stage_config(
    task_name="my_task",
    stage_name="start",
    operations=[
        {"op": "replace", "path": "/meta_data/code_callback", "value": "def gen_seed_list():\n    urls = ['https://site.com/page/1', 'https://site.com/page/2']\n    return [{'url': u} for u in urls]"}
    ]
)
```

### Step 4: Add and Configure Parser Node

**Add the node (always specify `prev_stage_name`):**
```
task_stage_add(
    task_name="my_task",
    stage_name="stage_list",
    group="stage",
    type="html",              # or "json", "csv", "attachment"
    prev_stage_name="start"   # REQUIRED — creates the pipeline link
)
```

**Read config, then enable list parsing:**
```
task_stages_get(task_name="my_task", stage_name="stage_list")

task_stage_config(
    task_name="my_task",
    stage_name="stage_list",
    operations=[
        {"op": "replace", "path": "/list_path/status", "value": true},
        {"op": "replace", "path": "/list_path/path", "value": "//div[@class='item']"}
    ]
)
```

For **JSON parser**, use JSONPath for `list_path`:
```json
{"op": "replace", "path": "/list_path/path", "value": "$.data.items[*]"}
```

### Step 5: Configure Extraction Fields

Use `read_resource` to read `context://schemas/crawl-field` and `context://extractors` first.

```
task_stage_parser_fields_setup(
    task_name="my_task",
    stage_name="stage_list",
    mode="replace",     # "replace" for initial setup, "merge" for updates
    fields=[
        {
            "name": "title",
            "path": ".//h2[@class='title']",
            "extract": {"attr": "#text", "default": ""},
            "comment": "Product title"
        },
        {
            "name": "price",
            "path": ".//span[@class='price']",
            "extract": {"attr": "#text", "default": "0"},
            "format": [{"name": "strip"}],
            "comment": "Product price"
        },
        {
            "name": "link",
            "path": ".//a",
            "extract": {"attr": "@href", "default": ""},
            "format": [{"name": "urljoin"}],
            "comment": "Detail page URL"
        }
    ]
)
```

**Critical rules for fields:**
- `path` is the element locator — XPath for HTML, JSONPath for JSON
- `path` must **NOT** contain `text()` or `string()` — use `extract.attr` instead
- `extract.attr` specifies what to extract: `#text`, `#string`, `@href`, `@src`, etc.
- `format` is an optional list of post-processing steps (use `read_resource(uri="context://formatters")`)
- **List-detail pattern**: intermediate parser nodes (e.g., `stage_list`) **MUST** include a URL field with `extract.attr: "@href"` and `format: [{"name": "urljoin"}]`. Without this, downstream nodes cannot receive entry URLs and parsing fails.

**Analyst report extract_type → field configuration:**

When configuring fields from an analyst report, map `extract_type` values as follows:

| Analyst `extract_type` | `extract.attr` | `format` | Notes |
|------------------------|----------------|----------|-------|
| `text` | `#text` | `[{"name": "strip"}]` | Plain text content |
| `url` / `link` | `@href` | `[{"name": "urljoin"}]` | Relative URLs need urljoin |
| `image` / `src` | `@src` | `[{"name": "urljoin"}]` | Image source URLs |
| `html` | `#innerHTML` | _(none)_ | Raw HTML content |
| `attribute` | `@{attr_name}` | _(varies)_ | Specific HTML attribute |

**Tool selection for configuration:**

| Priority | Tool | Use For |
|----------|------|---------|
| P1 | `task_stage_parser_fields_setup` | **Fields array only** — atomic field operations, mode=merge for updates |
| P2 | `task_stage_config` | **JSON Patch** — list_path, page_path, meta_data, and all other config |
| P3 | `edit_file` (VFS) | **Hook code and gen_seed_list only** — never for fields or node config |

### Step 6: Configure Pagination (Optional)

Use `read_resource(uri="context://guide/pagination")` for full details.

**Click-mode pagination** (follow "next" links):
```
task_stage_config(
    task_name="my_task",
    stage_name="stage_list",
    operations=[
        {"op": "replace", "path": "/page_path/status", "value": true},
        {"op": "replace", "path": "/page_path/path", "value": "//a[@class='next']"},
        {"op": "replace", "path": "/page_path/extract/attr", "value": "@href"},
        {"op": "replace", "path": "/page_path/format", "value": [{"name": "urljoin"}]}
    ]
)
```

**Config-mode pagination** (numeric pages):
```
task_stage_config(
    task_name="my_task",
    stage_name="stage_list",
    operations=[
        {"op": "replace", "path": "/page_conf/status", "value": true},
        {"op": "replace", "path": "/page_conf/total", "value": 10},
        {"op": "replace", "path": "/page_conf/step", "value": 1},
        {"op": "replace", "path": "/page_conf/current", "value": 1}
    ]
)
```

### Step 7: Add Condition Node (Optional)

For routing data based on rules:
```
task_stage_add(
    task_name="my_task",
    stage_name="condition_filter",
    group="condition",
    type="if",
    prev_stage_name="stage_list"
)
```

Use `read_resource(uri="context://schemas/condition-stage")` for condition operators: `equals`, `not_equals`, `contains`, `regex_match`, `is_empty`, etc.

### Step 8: Add and Configure Storage Node

```
task_stage_add(
    task_name="my_task",
    stage_name="storage_file",
    group="storage",
    type="file",                  # or "s3", "mongo", "kafka", "hdfs"
    prev_stage_name="stage_list"  # or "condition_filter" if using conditions
)
```

**For s3/hdfs/mongo/kafka storage:** The node is created with `CHANGE_ME` placeholders. You **must** configure them:
```
task_stages_get(task_name="my_task", stage_name="storage_s3")

# Replace CHANGE_ME values — check task_stages_get output for exact paths
task_stage_config(
    task_name="my_task",
    stage_name="storage_s3",
    operations=[
        {"op": "replace", "path": "/bucket", "value": "my-bucket"},
        {"op": "replace", "path": "/prefix", "value": "crawl-data/"}
    ]
)
```

### Step 9: Validate Pipeline

```
task_validate(task_name="my_task")
```

Returns `{valid, errors, warnings}`.
- Fix all `errors` before proceeding.
- `warnings` are informational but review them.
- **Next step:** Use the `test-iterate` skill to verify the task works with real data.

### Step 10: Start Task (Production)

After validation and testing are complete:

```
task_start(task_name="my_task")
```

- **This triggers real HTTP requests to the target site.** Always validate and test first.
- Use `task_stop(task_name="my_task")` to stop a running task.
- Cannot view execution logs or collected data via MCP after starting — check web UI.

## List-Detail Pattern

For pages where a list links to detail pages, add a second parser:

```
# 1. Add detail parser after list parser
task_stage_add(task_name="my_task", stage_name="stage_detail", group="stage", type="html", prev_stage_name="stage_list")

# 2. Configure the list parser to extract detail links
#    (the "link" field with urljoin format becomes the seed for stage_detail)

# 3. Configure detail parser fields for the detail page
task_stage_parser_fields_setup(task_name="my_task", stage_name="stage_detail", mode="replace", fields=[...])

# 4. Point storage at the detail parser
task_stage_add(task_name="my_task", stage_name="storage_file", group="storage", type="file", prev_stage_name="stage_detail")
```

## Naming Conventions

| Node Type | Name Pattern | Examples |
|-----------|-------------|----------|
| Start node | `start` | Always `start` |
| Parser nodes | `stage_{purpose}` | `stage_list`, `stage_detail`, `stage_api` |
| Storage nodes | `storage_{type}` | `storage_file`, `storage_s3`, `storage_mongo` |
| Condition nodes | `condition_{purpose}` | `condition_filter`, `condition_route` |

## Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| `JsonPatchConflict` | Path doesn't exist in current config | Call `task_stages_get` first; use `"op": "add"` for new paths |
| `TASK_NOT_FOUND` | Invalid task name | Check `task_list()` for correct name |
| `上游节点不存在` | Invalid `prev_stage_name` | Create nodes in order: start → parser → storage |
| Validation: `CHANGE_ME 占位符` | Storage not fully configured | `task_stage_config` to replace all placeholders |
| Validation: `example.com 占位符` | Start URL not set | Configure start node URL |
| Cannot set null | `exclude_none=True` in JSON Patch | Use empty string `""`, empty dict `{}`, or `false` instead |
| `InvalidInputError` | Invalid group/type combination | Use `read_resource(uri="context://node-types")` for valid combinations |

### JSON Patch Tips

- **`replace`** — Change existing value. Path must exist.
- **`add`** — Add new key or append to array (`/array/-` appends).
- **`remove`** — Delete a key. Path must exist.
- Always `task_stages_get` before patching to see the current structure.
- Use `validate_only=true` in `task_stage_config` to preview without applying.

## Known Limitations

- Cannot view execution logs or collected data via MCP — check web UI after `task_start`
- Cannot view task run records or status via MCP — check web UI
- Cannot clear deduplication filters via MCP — manual via web UI
- Cannot configure periodic schedules — manual via web UI
- Cannot copy/duplicate existing tasks — read config and recreate manually
- Cannot inspect or delete collected data via MCP — check target storage directly
- `task_start` triggers real HTTP requests — always `task_validate` first

## Out of Scope

- **Testing the task** → See `test-iterate` skill
- **Writing Hook code** → See `hook-dev` skill
- **Using templates** → See `use-template` skill for faster setup from existing patterns
