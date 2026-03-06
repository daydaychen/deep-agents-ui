---
name: use-template
description: Create scraping tasks from existing templates with variable substitution and patch application. Use when a similar crawling pattern already exists as a template, or for quick task setup. Triggers on "use template", "quick setup", "apply template", "reusable pattern".
---

# Use Template

Create tasks quickly from existing templates, then customize as needed.

## Quick Start

1. `template_list(type="task")` — find a matching template
2. `template_apply(template_name="...", task_name="my_task", url="https://target.com", variables={...})`
3. `task_stages_get(task_name="my_task")` — review what was created
4. `task_validate(task_name="my_task")` — verify completeness

## Tools Used

| Tool | Purpose | Safety |
|------|---------|--------|
| `template_list` | Browse available templates | Read-only, max 100 results |
| `template_apply` | Create task from template | Idempotent (returns existing task if name matches) |
| `template_patch_apply` | Apply config patches to task | State-changing. Use `preview=true` first |
| `task_stages_get` | Review created configuration | Read-only |
| `task_stage_config` | Customize after template apply | State-changing. Read config first |
| `task_stage_parser_fields_setup` | Adjust extraction fields | State-changing |
| `task_validate` | Verify completeness | Read-only |

## Resources

Use `read_resource(uri="...")` tool to read these resources when needed.

| URI | When to Read |
|-----|-------------|
| `context://schemas/stage-conf` | Understanding what templates render into |
| `context://schemas/crawl-field` | When adjusting parser fields after template apply |
| `context://node-types` | When templates don't match and you need to fall back to manual creation |

## Workflow

### Step 1: Discover Templates

```
template_list(type="task")
```

Returns a list of templates, each with:
- `name` — Template identifier
- `description` — What the template creates
- `variables` — Required variables with `name`, `description`, `type`, `example`
- `flow` — Pipeline structure overview

Use `name_filter` to narrow results:
```
template_list(type="task", name_filter="ecommerce")
```

**Max 100 results returned.** Use `name_filter` if you can't find what you need.

### Step 2: Analyze Template Requirements

Before applying, check the template's `variables` list:
- Each variable has `name`, `description`, `type`, and `example`
- **All variables are required** — missing any triggers `InvalidInputError`
- Match variable types: string values for URLs, XPaths, etc.

### Step 3: Apply Template

```
template_apply(
    template_name="ecommerce_list",
    task_name="my_task",
    url="https://shop.example.com/products",
    variables={
        "list_xpath": "//div[@class='product']",
        "title_xpath": ".//h3",
        "price_xpath": ".//span[@class='price']"
    },
    project="databus_ai"    # optional, default "databus_ai"
)
```

**Important behaviors:**
- If a task with `task_name` already exists: returns the **existing task unchanged** (stages are NOT re-applied)
- To re-apply a template: `task_delete` first (irreversible!), then re-apply
- Returns `{task_name, existed}` — check `existed` flag

### Step 4: Review and Customize

```
task_stages_get(task_name="my_task")
```

Inspect the created pipeline. If adjustments are needed:

```
# Always read before modifying
task_stages_get(task_name="my_task", stage_name="stage_list")

# Patch specific values
task_stage_config(
    task_name="my_task",
    stage_name="stage_list",
    operations=[
        {"op": "replace", "path": "/list_path/path", "value": "//div[@class='product-item']"}
    ]
)
```

### Step 5: Apply Patches (Optional)

Patch templates apply configuration modifications to an existing task.

```
# List available patch templates
template_list(type="patch")

# Preview patch before applying
template_patch_apply(
    task_name="my_task",
    patches=["add_proxy", "increase_throttle"],
    preview=true
)

# Apply if preview looks good
template_patch_apply(
    task_name="my_task",
    patches=["add_proxy", "increase_throttle"]
)
```

**After any patch apply, run `task_validate` immediately.** Patches bypass normal side-effect processing (`_commit_stage_changes()`), so validation catches any inconsistencies.

### Step 6: Validate and Test

```
task_validate(task_name="my_task")
```

Fix any errors, then proceed to the `test-iterate` skill to verify with real data.

## Decision Tree

```
Is there a matching template?
├── YES, fits exactly
│   → template_apply → task_validate → test-iterate skill
├── YES, needs minor tweaks
│   → template_apply → task_stage_config adjustments → task_validate → test-iterate skill
├── YES, but needs different fields
│   → template_apply → task_stage_parser_fields_setup → task_validate → test-iterate skill
└── NO matching template
    → Fall back to create-task skill
```

## Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| `InvalidInputError("缺失模板变量: ...")` | Missing required variable | Provide all variables listed in template |
| `NotFoundError` | Template name doesn't exist | Check `template_list` for correct name |
| `existed: true` but wrong config | Task existed before template apply | `task_delete` + re-apply (irreversible!) |
| Validation warnings after patch | Patch bypassed side effects | `task_stage_config` no-op on affected node to trigger regeneration |
| `JsonPatchConflict` | Template created unexpected structure | `task_stages_get` to see actual structure, then patch accordingly |

## Known Limitations

- Cannot create new templates via MCP — templates are created via web UI
- `template_apply` does not overwrite existing tasks — must delete first
- Patch templates bypass `_commit_stage_changes()` — always validate after
- Max 100 templates returned per `template_list` call

## Out of Scope

- **Creating tasks from scratch** → See `create-task` skill
- **Writing Hook code** → See `hook-dev` skill
- **Testing the task** → See `test-iterate` skill
- **Creating new templates** → Use web UI
