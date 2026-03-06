---
name: hook-dev
description: Write, test, and debug Hook code for Databus spider customization. Use when the agent needs custom logic for request modification, response processing, pagination, or data transformation. Triggers on "write hook", "custom request", "before_request", "after_parse", "pagination logic".
---

# Hook Development

Write, test, and deploy custom Hook code for spider behavior customization.

## Quick Start

1. Choose hook type from the reference table below
2. Write the hook function following the correct signature
3. `test_template_code({template_code: "def before_request(meta_data): ...", hook_type: "before_request", test_data: {...}})` — test in isolation
4. `hook_create(hook_type="before_request", hook_name="my_hook", code="...")` — create the hook template
5. `hook_release(hook_type="before_request", hook_name="my_hook")` — publish to Redis
6. `hook_attach(task_name="my_task", stage_name="stage_list", hook_type="before_request", hook_name="my_hook")` — bind to task stage

## Tools Used

| Tool | Purpose | Safety |
|------|---------|--------|
| `test_template_code` | Test hook code in isolation | Read-only |
| `hook_list` | List hook templates (by type or all) | Read-only |
| `hook_get` | Get hook code and metadata | Read-only |
| `hook_create` | Create new hook template with code validation | State-changing |
| `hook_update` | Update hook code or metadata (partial) | State-changing |
| `hook_delete` | Delete hook template (with reference safety) | Destructive |
| `hook_release` | Publish hook to Redis (make it live) | State-changing |
| `hook_revoke` | Unpublish hook from Redis | State-changing |
| `hook_attach` | Bind hook to a task's parse stage | State-changing |
| `hook_detach` | Unbind hook from a task's parse stage | State-changing |
| `task_stages_get` | Read current stage config | Read-only |
| VFS `/vfs/read` | Read existing hook code (alternative) | HTTP GET endpoint |
| VFS `/vfs/edit` | Edit existing hook code (alternative) | HTTP POST endpoint |

## Hook Types Reference

Each hook type has a specific function signature. **You must match the signature exactly.**

| Hook Type | Signature | Purpose |
|-----------|-----------|---------|
| `before_request` | `def before_request(meta_data):` | Modify request params, headers, auth, cookies before HTTP request |
| `after_request` | `def after_request(resp, meta_data):` | Process response, conditional retry, status check |
| `request_exception` | `def request_exception(error_info, meta_data):` | Handle request failures, fallback logic |
| `before_parse` | `def before_parse(resp_content, meta_data):` | Pre-process response text before parsing |
| `after_parse` | `def after_parse(item_list, link_list, resp, meta_data):` | Post-process extracted data, filter, enrich |
| `custom_next_url` | `def custom_next_url(meta_data, resp, other_info):` | Custom next-page URL logic (returns list of URLs) |
| `custom_page_url` | `def custom_page_url(content, meta_data):` | Custom page URL generation |

### Parameter Details

**`meta_data`** — Request context dict containing:
- `requests_data` — `{url, method, headers, params, data, cookies, ...}`
- Task context fields

**`resp`** — Response object with:
- `.text` — Response body as string
- `.status_code` — HTTP status code
- `.headers` — Response headers dict
- `.json()` — Parse response as JSON

**`item_list`** — Mutable list of extracted data items (only in `after_parse`)

**`link_list`** — Mutable list of extracted links (only in `after_parse`)

**`error_info`** — Exception info dict (only in `request_exception`)

### Return Values

| Hook Type | Must Return |
|-----------|------------|
| `before_request` | Modified `meta_data` dict |
| `after_request` | Modified `resp` (or raise exception) |
| `request_exception` | Modified `meta_data` for retry |
| `before_parse` | Modified `resp_content` string |
| `after_parse` | Tuple `(item_list, link_list)` |
| `custom_next_url` | List of URL strings |
| `custom_page_url` | URL string |

## Development Workflow

### Step 1: Check Existing Hooks First

Before writing new hook code, search for reusable templates:

```
hook_list(hook_type="before_request", name_filter="auth")
```

If a suitable hook exists, use `hook_get` to read its code. You can:
- Reuse it directly via `hook_attach`
- Copy and modify via `hook_create` with adapted code
- Update it via `hook_update` (if you own it)

**Only create new hooks when no existing template fits.**

### Step 2: Identify Hook Type

Match your need to a hook type:

| Need | Hook Type |
|------|-----------|
| Add auth headers / modify URL | `before_request` |
| Handle API pagination tokens | `after_request` or `custom_next_url` |
| Retry on specific errors | `after_request` (raise `NeedRetryException`) |
| Clean HTML before parsing | `before_parse` |
| Filter or enrich parsed data | `after_parse` |
| Skip certain pages | `after_request` (raise `SkipException`) |
| Custom page numbering | `custom_page_url` |

### Step 3: Write Hook Code

Write the function following the sandbox constraints. See `sandbox-reference.md` for the full list of available objects and restrictions.

**Example — Add authorization header:**
```python
def before_request(meta_data):
    meta_data["requests_data"]["headers"]["Authorization"] = "Bearer YOUR_TOKEN"
    return meta_data
```

**Example — Extract next page URL from JSON API:**
```python
def custom_next_url(meta_data, resp, other_info):
    data = resp.json()
    next_cursor = data.get("next_cursor")
    if not next_cursor:
        return []
    base_url = meta_data["requests_data"]["url"].split("?")[0]
    return [f"{base_url}?cursor={next_cursor}"]
```

**Example — Filter items in after_parse:**
```python
def after_parse(item_list, link_list, resp, meta_data):
    filtered = [item for item in item_list if item.get("price") and item["price"] != "0"]
    return filtered, link_list
```

**Example — Handle errors with retry:**
```python
def after_request(resp, meta_data):
    if resp.status_code == 429:
        time.sleep(2)
        raise NeedRetryException("Rate limited, retrying")
    if resp.status_code == 403:
        raise SkipException("Forbidden, skipping")
    return resp
```

### Step 4: Test in Isolation

```
test_template_code({
    template_code: "def before_request(meta_data):\n    meta_data['requests_data']['headers']['X-Auth'] = 'token123'\n    return meta_data",
    hook_type: "before_request",
    test_data: {
        "meta_data": {
            "requests_data": {
                "url": "https://api.example.com/data",
                "method": "GET",
                "headers": {}
            }
        }
    }
})
```

**Required `test_data` keys per hook type:**

| hook_type | Required test_data |
|-----------|-------------------|
| `before_request` | `{"meta_data": {"requests_data": {"url": "...", "method": "GET", "headers": {}}}}` |
| `after_request` | `{"resp": {"text": "...", "status_code": 200}, "meta_data": {...}}` |
| `request_exception` | `{"error_info": {"error": "ConnectionError"}, "meta_data": {...}}` |
| `before_parse` | `{"resp_content": "<html>...</html>", "meta_data": {...}}` |
| `after_parse` | `{"item_list": [...], "link_list": [...], "resp": {...}, "meta_data": {...}}` |
| `custom_next_url` | `{"meta_data": {...}, "resp": {"text": "..."}, "other_info": {}}` |
| `custom_page_url` | `{"content": "...", "meta_data": {...}}` |

### Step 5: Analyze Test Output

Test results are SSE text. Look for:
- `"type": "success"` → hook executed without errors
- `"type": "error"` → hook failed, read `message` for the traceback
- Check that the return value matches expectations

### Step 6: Iterate

Fix code errors based on the test output, then re-test. Common issues:
- `NameError` — variable not available in sandbox (see `sandbox-reference.md`)
- `KeyError` — wrong key in meta_data or resp
- `TypeError` — wrong return type (e.g., returning None instead of meta_data)

### Step 7: Deploy Hook to Task

Hooks are stored as named templates in the database and attached to task stages by name.

**Option A: Full MCP workflow (recommended)**

```
# 1. Create the hook template (validates code automatically)
hook_create(
    hook_type="before_request",
    hook_name="my_auth_hook",
    code="def before_request_(meta_data):\n    meta_data['requests_data']['headers']['Authorization'] = 'Bearer TOKEN'\n    return meta_data",
    description="Add auth header to requests"
)

# 2. Publish to Redis (makes it available to running tasks)
hook_release(hook_type="before_request", hook_name="my_auth_hook")

# 3. Attach to task stage
hook_attach(
    task_name="my_task",
    stage_name="stage_list",
    hook_type="before_request",
    hook_name="my_auth_hook"
)
```

**Option B: Update existing hook code via MCP**

```
# Update code (supports partial updates)
hook_update(
    hook_type="before_request",
    hook_name="my_auth_hook",
    code="def before_request_(meta_data):\n    # updated code\n    return meta_data"
)

# Re-publish to Redis (required after update)
hook_release(hook_type="before_request", hook_name="my_auth_hook")
```

**Option C: Edit existing hook code via VFS**

```
# Read existing hook code
GET /vfs/read?path=/hooks/before_request/my_hook/code.py

# Edit the code
POST /vfs/edit
{
    "path": "/hooks/before_request/my_hook/code.py",
    "old_string": "old code here",
    "new_string": "new code here"
}
```

The hook field value is the **template name** (not the code itself). The stage config stores a list of hook template names per hook type.

## Exception Control Flow

Use these exceptions inside hook code to control task behavior:

```python
raise NeedRetryException("reason")   # 1001 — Auto-retry this seed
raise SkipException("reason")        # 1002 — Skip this seed, continue others
raise AbortException("reason")       # 1003 — Abort the entire task chain
```

**When to use each:**
- `NeedRetryException` — Transient errors (rate limit, timeout, temporary block)
- `SkipException` — Permanent issues for this URL (404, deleted page, irrelevant content)
- `AbortException` — Critical failures (auth expired, site structure changed completely)

## Pagination Hook Constraints

When writing `custom_page_url` or `custom_next_url` hooks, you **must** implement termination conditions to prevent infinite crawling loops.

**Required:** At least 1 termination condition. **Recommended:** 2-3 for robustness.

| Condition | Implementation | Example |
|-----------|---------------|---------|
| No next token | Check response for cursor/token absence | `if not data.get("next_cursor"): return []` |
| Page limit | Track page count, cap at reasonable max | `if page >= MAX_PAGES: return []` |
| Empty data | Stop when no items returned | `if not data.get("items"): return []` |
| Error status | Stop on non-200 responses | `if resp.status_code != 200: return []` |

## Performance Constraints

Hook code executes in the request pipeline. Slow hooks block the entire crawl.

- **No blocking HTTP calls** in the main hook body — use `SharedVar` to cache tokens, sessions, or other state across requests (pre-initialize via web UI)
- **No O(n²) algorithms** — keep processing linear
- **Import inside function** — use lazy imports for non-standard modules
- **Always wrap in try/except** — unhandled exceptions break the pipeline; return the original data on error

## Error Handling (MCP Tools)

| Error | Cause | Fix |
|-------|-------|-----|
| `InvalidInputError` | Invalid `hook_type` value | Use exact names from Hook Types Reference table |
| SSE timeout | Hook code too slow or target site slow | Simplify test_data, check for infinite loops |
| `SyntaxError` in test output | Python syntax error in hook code | Fix the syntax, re-test |
| `NameError: 'xxx' is not defined` | Object not available in sandbox | Check `sandbox-reference.md` for available objects |
| VFS write fails | Path doesn't match expected pattern | Use `/hooks/{hook_type}/{hook_name}/code.py` format |

## Known Limitations

- Cannot manage `Variable_` or `SharedVar` via MCP — pre-initialize via web UI if hooks need state
- Cannot view hook execution logs via MCP
- Hook throttle settings are per-template, set via `hook_create`/`hook_update` `throttle` parameter
- Running tasks don't auto-reload hooks after `hook_release` — restart the task for changes to take effect
- No hook template copy/duplicate, version history browsing, or rename via MCP

## Out of Scope

- **Creating tasks** → See `create-task` skill
- **Testing task pipeline** → See `test-iterate` skill
- **Using templates** → See `use-template` skill
- **Sandbox environment details** → See `sandbox-reference.md` companion file
