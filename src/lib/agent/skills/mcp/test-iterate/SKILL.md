---
name: test-iterate
description: Systematically test and refine Databus task configurations. Use when the agent needs to verify node behavior, debug extraction issues, or validate a complete pipeline before production deployment. Triggers on "test task", "debug extraction", "verify pipeline", "results look wrong".
---

# Test & Iterate

Verify and debug task configurations using a bottom-up testing strategy: validation → node tests → pipeline test.

## Quick Start

1. `task_validate(task_name="my_task")` — check structural completeness
2. `test_parser_node({task_name: "my_task", node_name: "stage_list", request_info: {meta_data: <from start node>}})` — verify extraction
3. Analyze SSE output → fix issues → re-test

## Tools Used

| Tool | Purpose | Safety |
|------|---------|--------|
| `task_validate` | Static structural checks | Read-only |
| `test_start_node` | Test seed generation | Read-only, no side effects |
| `test_parser_node` | Test data extraction | Read-only, makes HTTP request to target |
| `test_condition_node` | Test routing logic | Read-only |
| `test_pipeline` | End-to-end pipeline test | Read-only, makes HTTP requests |
| `test_template_code` | Test hook code in isolation | Read-only |
| `task_stages_get` | Read current config | Read-only. **Always call before config changes** |
| `task_stage_config` | Fix configuration issues | State-changing |
| `task_stage_parser_fields_setup` | Fix field extraction | State-changing |

## Resources

Use `read_resource(uri="...")` tool to read these resources when needed.

| URI | When to Read |
|-----|-------------|
| `context://schemas/crawl-field` | When fixing field extraction issues |
| `context://extractors` | When adjusting `extract.attr` values |
| `context://examples/xpath` | When debugging XPath selectors |
| `context://examples/jsonpath` | When debugging JSONPath selectors |
| `context://guide/pagination` | When fixing pagination issues |

## Testing Strategy

Test bottom-up in three levels:

```
Level 1: task_validate        → Catch structural errors (fast, no HTTP)
Level 2: test individual nodes → Verify each node works (makes HTTP requests)
Level 3: test_pipeline        → Verify end-to-end flow (full pipeline)
```

**Always start with Level 1.** Fix all validation errors before spending time on node tests.

## Level 1: Static Validation

```
task_validate(task_name="my_task")
```

Returns `{valid: bool, errors: [...], warnings: [...]}`.

**Common validation errors:**

| Error Message | Meaning | Fix |
|---------------|---------|-----|
| Missing start node | No node with `group="start"` | `task_stage_add` with `group="start"` |
| `CHANGE_ME 占位符` | Storage not configured | `task_stage_config` on storage node |
| `example.com 占位符` | Start URL is placeholder | `task_stage_config` on start node |
| Broken `next_stage` reference | Node links to non-existent name | Fix `prev_stage_name` or re-add missing node |
| No parser fields | Parser has no extraction rules | `task_stage_parser_fields_setup` |

## Level 2: Individual Node Testing

### Test Start Node

```
test_start_node({
    task_name: "my_task",
    options: {test_limit: 5}    # limit seeds for testing
})
```

**What to verify:**
- Seeds are generated (non-empty result)
- URLs are correct and accessible
- `meta_data` structure matches what the parser expects

### Test Parser Node

**Prerequisite:** Get `request_info` from the start node configuration.

```
# Step 1: Read start node config to get meta_data
task_stages_get(task_name="my_task", stage_name="start")

# Step 2: Use the meta_data as request_info
test_parser_node({
    task_name: "my_task",
    node_name: "stage_list",
    request_info: {
        meta_data: {
            "requests_data": {
                "url": "https://target-site.com/list",
                "method": "GET"
            }
        }
    }
})
```

**What to verify:**
- `items` array is non-empty
- Field values contain expected data (not empty strings)
- `links` array contains URLs if using list-detail pattern
- Item count matches expected number of elements on the page

### Test Condition Node

**Prerequisite:** Use output from `test_parser_node` as input.

```
test_condition_node({
    task_name: "my_task",
    node_name: "condition_filter",
    context: {
        request_info: { meta_data: {...} },
        response: { text: "...", status_code: 200 }
    },
    items: [...],    # items from parser test
    links: [...]     # links from parser test
})
```

## SSE Output Parsing

All test tools return SSE (Server-Sent Events) text concatenated into a string. Parse the output as follows:

**Success indicators:**
- Look for `"type": "success"` in the output
- The `extra` field contains detailed results (items, links, seeds)

**Failure indicators:**
- `"type": "error"` — test failed, read `message` for details
- Exception tracebacks indicate code errors in hooks or gen_seed_list

**Output is truncated at 1MB.** For large result sets, focus on the first few items to verify correctness.

**Example successful parser output structure:**
```
event: test_result
data: {"type": "success", "message": "Parsed 25 items", "extra": {"items": [...], "links": [...]}}
```

**Example error output:**
```
event: test_result
data: {"type": "error", "message": "XPath evaluation failed: Invalid expression"}
```

## Level 3: Pipeline Test

After individual nodes pass, test the full pipeline:

```
test_pipeline({
    task_name: "my_task",
    options: {
        test_limit: 3    # limit seeds processed
    }
})
```

**Partial pipeline test** (test up to a specific node):
```
test_pipeline({
    task_name: "my_task",
    options: {
        test_type: "hereto",
        end_node: "stage_list"    # stop after this node
    }
})
```

## Error Pattern Recognition

### Start Node Issues

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| No seeds generated | URL invalid or unreachable | Verify URL, check proxy settings |
| No seeds (code type) | `gen_seed_list()` syntax error | Use `test_template_code` to debug the code |
| Seeds with wrong URLs | URL construction error | Check URL pattern in start config |
| Connection timeout | Site blocks requests | Try `requests_type: "new_render"` for JS pages, or configure proxy via `task_update(use_proxy=true)` |

### Parser Issues

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Empty items array | `list_path` disabled | `task_stage_config`: set `/list_path/status` to `true` |
| Empty items array | Wrong XPath/JSONPath | Inspect page source, adjust `/list_path/path` |
| Items with empty field values | Wrong `extract.attr` | Use `read_resource(uri="context://extractors")`, check field config |
| Wrong number of items | `list_path` too broad/narrow | Adjust XPath scope (more specific or more general) |
| All fields return same value | `path` is absolute, not relative to list item | Use relative paths (start with `.//` for XPath) |
| `text()` in path error | `text()` in field `path` | Move `text()` logic to `extract.attr: "#text"` |
| Encoding issues | Response charset detection | Consider `before_parse` hook for encoding fix |

### Pipeline Issues

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Fails at storage node | CHANGE_ME placeholders | `task_stages_get` + `task_stage_config` on storage |
| Fails at detail parser | List parser links not formatted | Add `urljoin` format to link field |
| Condition routes all to one branch | Condition logic wrong | `test_condition_node` with sample data |
| Timeout during pipeline test | Target site slow or blocking | Increase timeout, configure proxy |

## Iteration Workflow

Follow this loop until the task is production-ready:

```
1. Identify the failing node (start → parser → storage, in order)
2. task_stages_get — read current config
3. Fix the issue:
   - Config problem → task_stage_config
   - Field problem → task_stage_parser_fields_setup
   - Code problem → edit code, test_template_code, re-apply
4. Re-test the fixed node
5. If fixed, move to next node or run pipeline test
6. Repeat until task_validate returns valid AND test_pipeline succeeds
```

**Tips:**
- Fix **one issue at a time**, re-test after each fix
- Use `validate_only=true` in `task_stage_config` to preview changes before applying
- If stuck on XPath, use `read_resource(uri="context://examples/xpath")` for common patterns
- If parser returns HTML instead of text, check `extract.attr` — use `#text` not `#html`

## Known Limitations

- Cannot view execution logs after `task_start` — check web UI
- Cannot inspect collected data post-run — check web UI or target storage directly
- Cannot clear deduplication filters via MCP — manual via web UI
- Test tools make real HTTP requests to target sites — respect rate limits
- SSE output truncated at 1MB — large datasets may be incomplete

## Out of Scope

- **Creating tasks** → See `create-task` or `use-template` skill
- **Writing Hook code** → See `hook-dev` skill
- **Production monitoring** → Not available via MCP; check web UI
