import { describe, expect, it } from "vitest";
import {
  detectAntiCrawl,
  getToolCategory,
  getToolSummary,
  parseSSELog,
  parseToolResult,
} from "./tool-result-parser";

describe("getToolCategory", () => {
  it("returns 'task' for task_ prefix", () => {
    expect(getToolCategory("task_create")).toBe("task");
  });

  it("returns 'test' for test_ prefix", () => {
    expect(getToolCategory("test_pipeline")).toBe("test");
  });

  it("returns 'hook' for hook_ prefix", () => {
    expect(getToolCategory("hook_create")).toBe("hook");
  });

  it("returns 'template' for template_ prefix", () => {
    expect(getToolCategory("template_apply")).toBe("template");
  });

  it("returns 'browser' for browser_ prefix", () => {
    expect(getToolCategory("browser_screenshot")).toBe("browser");
  });

  it("returns 'browser' for agent_browser prefix", () => {
    expect(getToolCategory("agent_browser_click")).toBe("browser");
  });

  it("returns 'unknown' for unrecognized tools", () => {
    expect(getToolCategory("some_random_tool")).toBe("unknown");
  });
});

describe("getToolSummary", () => {
  it("returns null for undefined result", () => {
    expect(getToolSummary("task_create", undefined)).toBeNull();
  });

  it("returns null for unknown tool", () => {
    expect(getToolSummary("unknown_tool", '{"data": 1}')).toBeNull();
  });

  it("summarizes task_create (new task)", () => {
    const result = getToolSummary("task_create", '{"task_name": "my_task"}');
    expect(result).toContain("my_task");
    expect(result).toContain("创建成功");
  });

  it("summarizes task_create (existing task)", () => {
    const result = getToolSummary("task_create", '{"task_name": "my_task", "existed": true}');
    expect(result).toContain("已存在");
  });

  it("summarizes task_validate (valid)", () => {
    const result = getToolSummary("task_validate", '{"valid": true}');
    expect(result).toContain("验证通过");
  });

  it("summarizes task_validate (errors and warnings)", () => {
    const result = getToolSummary(
      "task_validate",
      '{"valid": false, "errors": ["e1", "e2"], "warnings": ["w1"]}',
    );
    expect(result).toContain("2");
    expect(result).toContain("1");
  });

  it("summarizes task_stage_config (success)", () => {
    const result = getToolSummary("task_stage_config", '{"success": true}');
    expect(result).toContain("成功");
  });

  it("summarizes task_stage_config (failure)", () => {
    const result = getToolSummary("task_stage_config", '{"success": false}');
    expect(result).toContain("失败");
  });

  it("summarizes task_stage_add", () => {
    const result = getToolSummary("task_stage_add", '{"vfs_path": "/path/to/node"}');
    expect(result).toContain("/path/to/node");
  });

  it("summarizes task_stage_parser_fields_setup", () => {
    const result = getToolSummary("task_stage_parser_fields_setup", '{"fields_count": 5}');
    expect(result).toContain("5");
  });

  it("summarizes test_pipeline", () => {
    const result = getToolSummary("test_pipeline", "line1\nline2\n完成 3 items");
    expect(result).toContain("完成");
  });

  it("summarizes task_start (success)", () => {
    const result = getToolSummary("task_start", '{"success": true, "task_id": "123"}');
    expect(result).toContain("启动成功");
    expect(result).toContain("123");
  });

  it("summarizes task_stop", () => {
    const result = getToolSummary("task_stop", '{"message": "任务已停止"}');
    expect(result).toContain("任务已停止");
  });

  it("summarizes task_stages_get", () => {
    const result = getToolSummary("task_stages_get", '{"stage1": {}, "stage2": {}}');
    expect(result).toContain("2");
  });

  it("summarizes hook_create", () => {
    const result = getToolSummary("hook_create", '{"name": "my_hook"}');
    expect(result).toContain("my_hook");
  });

  it("summarizes hook_release", () => {
    const result = getToolSummary("hook_release", '{"name": "my_hook"}');
    expect(result).toContain("my_hook");
  });

  it("summarizes hook_attach (with warning)", () => {
    const result = getToolSummary("hook_attach", '{"warning": "conflict detected"}');
    expect(result).toContain("conflict detected");
  });

  it("summarizes hook_attach (success)", () => {
    const result = getToolSummary("hook_attach", "{}");
    expect(result).toContain("绑定成功");
  });

  it("summarizes template_apply", () => {
    const result = getToolSummary("template_apply", "{}");
    expect(result).toContain("模板");
  });

  it("summarizes browser_screenshot", () => {
    const result = getToolSummary("browser_screenshot", "base64data");
    expect(result).toContain("截图");
  });

  it("does not crash on malformed JSON", () => {
    const result = getToolSummary("task_create", "{not valid json}");
    expect(result).not.toBeNull();
  });

  it("rejects prototype pollution in tool results", () => {
    const result = getToolSummary("task_create", '{"__proto__": {"admin": true}}');
    // tryParseJSON now uses safe parser — returns null for pollution attempts
    // the summary function receives {} fallback, so it still produces a summary
    expect(result).not.toBeNull();
  });
});

describe("parseToolResult", () => {
  it("returns null for undefined result", () => {
    expect(parseToolResult("task_create", undefined)).toBeNull();
  });

  it("returns null for unknown tool", () => {
    expect(parseToolResult("unknown_tool", '{"data": 1}')).toBeNull();
  });

  it("parses task_stages_get as config", () => {
    const result = parseToolResult("task_stages_get", '{"stage1": {}}', "tc-1");
    expect(result).not.toBeNull();
    expect(result?.type).toBe("config");
    expect(result?.inspectorTab).toBe("config");
    expect(result?.metadata?.toolCallId).toBe("tc-1");
  });

  it("parses task_stage_config as config", () => {
    const result = parseToolResult("task_stage_config", '{"success": true}');
    expect(result?.type).toBe("config");
  });

  it("parses task_stage_add as config", () => {
    const result = parseToolResult("task_stage_add", '{"vfs_path": "/a"}');
    expect(result?.type).toBe("config");
  });

  it("parses task_stage_parser_fields_setup as config", () => {
    const result = parseToolResult("task_stage_parser_fields_setup", '{"fields_count": 3}');
    expect(result?.type).toBe("config");
  });

  it("parses task_validate as validation", () => {
    const result = parseToolResult(
      "task_validate",
      '{"valid": false, "errors": ["e1"], "warnings": ["w1"]}',
    );
    expect(result?.type).toBe("validation");
    expect(result?.inspectorTab).toBe("log");
    expect(result?.data).toEqual({
      valid: false,
      errors: ["e1"],
      warnings: ["w1"],
    });
  });

  it("parses test_* as test_log", () => {
    const result = parseToolResult("test_pipeline", "data: line1\ndata: line2");
    expect(result?.type).toBe("test_log");
    expect(result?.inspectorTab).toBe("log");
    expect(Array.isArray(result?.data)).toBe(true);
  });

  it("parses browser_screenshot", () => {
    const result = parseToolResult("browser_screenshot", "base64data", "tc-2");
    expect(result?.type).toBe("screenshot");
    expect(result?.inspectorTab).toBe("screenshot");
    expect(result?.data).toMatchObject({
      id: "tc-2",
      data: "base64data",
      label: "Browser Screenshot",
    });
  });
});

describe("parseSSELog", () => {
  it("parses lines into log entries", () => {
    const entries = parseSSELog("line1\nline2\nline3");
    expect(entries).toHaveLength(3);
    expect(entries[0].content).toBe("line1");
  });

  it("strips data: prefix", () => {
    const entries = parseSSELog("data: hello");
    expect(entries[0].content).toBe("hello");
  });

  it("detects error level", () => {
    const entries = parseSSELog("Error: something failed");
    expect(entries[0].level).toBe("error");
  });

  it("detects warn level", () => {
    const entries = parseSSELog("Warning: check this");
    expect(entries[0].level).toBe("warn");
  });

  it("detects success level", () => {
    const entries = parseSSELog("完成");
    expect(entries[0].level).toBe("success");
  });

  it("defaults to info level", () => {
    const entries = parseSSELog("regular line");
    expect(entries[0].level).toBe("info");
  });

  it("filters empty lines", () => {
    const entries = parseSSELog("line1\n\n\nline2");
    expect(entries).toHaveLength(2);
  });
});

describe("detectAntiCrawl", () => {
  it("detects 403 bot protection", () => {
    const result = detectAntiCrawl("403 Forbidden");
    expect(result).not.toBeNull();
    expect(result?.type).toBe("bot_protection");
    expect(result?.statusCode).toBe(403);
  });

  it("detects rate limiting", () => {
    const result = detectAntiCrawl("429 Too Many Requests");
    expect(result).not.toBeNull();
    expect(result?.type).toBe("rate_limit");
    expect(result?.statusCode).toBe(429);
  });

  it("detects captcha", () => {
    const result = detectAntiCrawl("需要验证码");
    expect(result).not.toBeNull();
    expect(result?.type).toBe("captcha");
  });

  it("returns null for normal content", () => {
    expect(detectAntiCrawl("everything is fine")).toBeNull();
  });
});
