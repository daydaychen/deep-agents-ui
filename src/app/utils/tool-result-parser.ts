import type {
  LogEntry,
  Screenshot,
  ValidationResult,
} from "@/app/components/inspector/inspector-context";

// --- Types ---

export interface ParsedMetadata {
  taskName?: string;
  stageName?: string;
  toolCallId?: string;
}

export type ParsedToolResult =
  | {
      type: "config";
      inspectorTab: "config";
      summary: string;
      data: Record<string, unknown>;
      metadata?: ParsedMetadata;
    }
  | {
      type: "test_log";
      inspectorTab: "log";
      summary: string;
      data: LogEntry[];
      metadata?: ParsedMetadata;
    }
  | {
      type: "validation";
      inspectorTab: "log";
      summary: string;
      data: ValidationResult;
      metadata?: ParsedMetadata;
    }
  | {
      type: "screenshot";
      inspectorTab: "screenshot";
      summary: string;
      data: Screenshot;
      metadata?: ParsedMetadata;
    }
  | {
      type: "data";
      inspectorTab: "data";
      summary: string;
      data: unknown;
      metadata?: ParsedMetadata;
    }
  | { type: "raw"; inspectorTab: "log"; summary: string; data: string; metadata?: ParsedMetadata };

export type ToolCategory = "task" | "test" | "hook" | "template" | "browser" | "unknown";

// --- Tool Category Detection ---

export function getToolCategory(toolName: string): ToolCategory {
  if (toolName.startsWith("task_")) return "task";
  if (toolName.startsWith("test_")) return "test";
  if (toolName.startsWith("hook_")) return "hook";
  if (toolName.startsWith("template_")) return "template";
  if (toolName.startsWith("browser_") || toolName.startsWith("agent_browser")) return "browser";
  return "unknown";
}

// --- Safe JSON parse ---

function tryParseJSON(str: string): unknown | null {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

// --- Tool Summary Generators ---

function summarizeTaskCreate(parsed: Record<string, unknown>): string {
  if (parsed.existed) return `任务 '${parsed.task_name}' 已存在`;
  return `任务 '${parsed.task_name || "unknown"}' 创建成功`;
}

function summarizeTaskValidate(parsed: Record<string, unknown>): string {
  if (parsed.valid) return "✓ 验证通过";
  const errors = Array.isArray(parsed.errors) ? parsed.errors.length : 0;
  const warnings = Array.isArray(parsed.warnings) ? parsed.warnings.length : 0;
  const parts = [];
  if (errors > 0) parts.push(`${errors} 个错误`);
  if (warnings > 0) parts.push(`${warnings} 个警告`);
  return `✗ ${parts.join(", ")}`;
}

function summarizeStageConfig(parsed: Record<string, unknown>): string {
  if (parsed.success === false) return "修改失败";
  return "配置修改成功";
}

function summarizeStageAdd(parsed: Record<string, unknown>): string {
  return `节点创建成功: ${parsed.vfs_path || parsed.stage_name || ""}`;
}

function summarizeParserFields(parsed: Record<string, unknown>): string {
  const count = parsed.fields_count ?? (Array.isArray(parsed.fields) ? parsed.fields.length : "?");
  return `${count} 个字段已配置`;
}

function summarizeTestPipeline(raw: string): string {
  // Try to extract summary from the end of SSE log text
  const lines = raw.trim().split("\n").filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (
      line.includes("items") ||
      line.includes("条数据") ||
      line.includes("records") ||
      line.includes("完成")
    ) {
      return line.substring(0, 80);
    }
  }
  return `测试完成 (${lines.length} 行日志)`;
}

function summarizeTaskStart(parsed: Record<string, unknown>): string {
  if (parsed.success) return `任务启动成功 (ID: ${parsed.task_id || ""})`;
  return "启动失败";
}

function summarizeTaskStop(parsed: Record<string, unknown>): string {
  return String(parsed.message || "任务已停止");
}

function summarizeHookCreate(parsed: Record<string, unknown>): string {
  return `Hook '${parsed.name || ""}' 创建成功`;
}

function summarizeHookRelease(parsed: Record<string, unknown>): string {
  return `Hook '${parsed.name || ""}' 已发布`;
}

function summarizeHookAttach(parsed: Record<string, unknown>): string {
  if (parsed.warning) return `已绑定 (⚠ ${parsed.warning})`;
  return "绑定成功";
}

function summarizeTemplateApply(_parsed: Record<string, unknown>): string {
  return "基于模板创建任务成功";
}

function summarizeBrowserScreenshot(_raw: string): string {
  return "浏览器截图";
}

function summarizeStagesGet(parsed: Record<string, unknown>): string {
  const count = typeof parsed === "object" ? Object.keys(parsed).length : 0;
  return `配置包含 ${count} 个节点`;
}

// --- Summary dispatch ---

const SUMMARY_MAP: Record<string, (parsed: Record<string, unknown>, raw: string) => string> = {
  task_create: (p) => summarizeTaskCreate(p),
  task_validate: (p) => summarizeTaskValidate(p),
  task_stage_config: (p) => summarizeStageConfig(p),
  task_stage_add: (p) => summarizeStageAdd(p),
  task_stage_parser_fields_setup: (p) => summarizeParserFields(p),
  test_pipeline: (_p, raw) => summarizeTestPipeline(raw),
  test_parser_node: (_p, raw) => summarizeTestPipeline(raw),
  test_start_node: (_p, raw) => summarizeTestPipeline(raw),
  test_condition_node: (_p, raw) => summarizeTestPipeline(raw),
  test_template_code: (_p, raw) => summarizeTestPipeline(raw),
  task_start: (p) => summarizeTaskStart(p),
  task_stop: (p) => summarizeTaskStop(p),
  task_stages_get: (p) => summarizeStagesGet(p),
  hook_create: (p) => summarizeHookCreate(p),
  hook_release: (p) => summarizeHookRelease(p),
  hook_attach: (p) => summarizeHookAttach(p),
  template_apply: (p) => summarizeTemplateApply(p),
  browser_screenshot: (_p, raw) => summarizeBrowserScreenshot(raw),
};

export function getToolSummary(toolName: string, result: string | undefined): string | null {
  if (!result) return null;
  const fn = SUMMARY_MAP[toolName];
  if (!fn) return null;
  const parsed = (typeof result === "string" ? tryParseJSON(result) : result) as Record<
    string,
    unknown
  > | null;
  try {
    return fn(parsed ?? {}, typeof result === "string" ? result : JSON.stringify(result));
  } catch {
    return null;
  }
}

// --- Full Result Parser ---

export function parseToolResult(
  toolName: string,
  result: string | undefined,
  toolCallId?: string,
): ParsedToolResult | null {
  if (!result) return null;

  const raw = typeof result === "string" ? result : JSON.stringify(result);
  const parsed = (typeof result === "string" ? tryParseJSON(result) : result) as Record<
    string,
    unknown
  > | null;

  // Config tools
  if (toolName === "task_stages_get") {
    return {
      type: "config",
      inspectorTab: "config",
      summary: summarizeStagesGet(parsed ?? {}),
      data: parsed ?? {},
      metadata: { toolCallId },
    };
  }

  if (
    toolName === "task_stage_config" ||
    toolName === "task_stage_add" ||
    toolName === "task_stage_parser_fields_setup"
  ) {
    return {
      type: "config",
      inspectorTab: "config",
      summary: getToolSummary(toolName, result) ?? "",
      data: parsed ?? {},
      metadata: { toolCallId },
    };
  }

  // Validation
  if (toolName === "task_validate") {
    const validationResult: ValidationResult = {
      valid: !!parsed?.valid,
      errors: Array.isArray(parsed?.errors) ? (parsed.errors as string[]) : [],
      warnings: Array.isArray(parsed?.warnings) ? (parsed.warnings as string[]) : [],
    };
    return {
      type: "validation",
      inspectorTab: "log",
      summary: summarizeTaskValidate(parsed ?? {}),
      data: validationResult,
      metadata: { toolCallId },
    };
  }

  // Test tools
  if (toolName.startsWith("test_")) {
    const logEntries = parseSSELog(raw);
    return {
      type: "test_log",
      inspectorTab: "log",
      summary: summarizeTestPipeline(raw),
      data: logEntries,
      metadata: { toolCallId },
    };
  }

  // Browser screenshot
  if (toolName === "browser_screenshot") {
    const screenshot: Screenshot = {
      id: toolCallId ?? `screenshot-${Date.now()}`,
      timestamp: Date.now(),
      data: raw,
      label: "Browser Screenshot",
    };
    return {
      type: "screenshot",
      inspectorTab: "screenshot",
      summary: "浏览器截图",
      data: screenshot,
      metadata: { toolCallId },
    };
  }

  return null;
}

// --- SSE Log Parser ---

export function parseSSELog(raw: string): LogEntry[] {
  const lines = raw.split("\n").filter((l) => l.trim());
  return lines.map((line, i) => {
    let level: LogEntry["level"] = "info";
    if (/error|fail|exception/i.test(line)) level = "error";
    else if (/warn/i.test(line)) level = "warn";
    else if (/success|完成|passed/i.test(line)) level = "success";

    return {
      id: `log-${Date.now()}-${i}`,
      timestamp: Date.now(),
      level,
      content: line.replace(/^data:\s*/, ""),
    };
  });
}

// --- Anti-Crawl Detection ---

export interface AntiCrawlDetection {
  type: "bot_protection" | "rate_limit" | "captcha" | "js_render" | "unknown";
  statusCode?: number;
  description: string;
  suggestions: string[];
}

export function detectAntiCrawl(logContent: string): AntiCrawlDetection | null {
  if (/403|forbidden/i.test(logContent)) {
    return {
      type: "bot_protection",
      statusCode: 403,
      description: "Cloudflare / Bot Protection detected",
      suggestions: ["切换 Browser Mode", "添加代理", "修改 User-Agent"],
    };
  }
  if (/429|too many requests|rate.?limit/i.test(logContent)) {
    return {
      type: "rate_limit",
      statusCode: 429,
      description: "请求频率过高",
      suggestions: ["降低并发", "添加延时", "使用代理池"],
    };
  }
  if (/captcha|验证码|challenge/i.test(logContent)) {
    return {
      type: "captcha",
      description: "需要验证码",
      suggestions: ["使用 Browser MCP 处理", "切换 IP"],
    };
  }
  return null;
}
