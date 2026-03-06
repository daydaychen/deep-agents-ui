import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import { readFileSync } from "fs";
import { join } from "path";

function loadPrompt(name: string): string {
  return readFileSync(
    join(process.cwd(), `src/lib/agent/prompts/subagent/${name}.md`),
    "utf-8"
  );
}

export function getSubagentDefinitions(): Record<string, AgentDefinition> {
  return {
    analyst: {
      description:
        "网站结构分析专家，负责 XPath/JSONPath 生成和爬取策略制定。委派时需提供目标URL和分析意图。",
      prompt: loadPrompt("analyst"),
      model: "inherit",
      mcpServers: ["playwright"],
      tools: [
        "mcp__playwright__*",
        "Read",
        "Glob",
        "Grep",
        "TodoWrite",
      ],
      disallowedTools: [
        "mcp__playwright__browser_run_code",
        "Bash",
        "Edit",
        "Write",
      ],
      skills: [
        "website-analysis-workflow",
        "browser-dom-analyzer",
        "element-extractor",
        "network-request-analyzer",
        "xpath-validator",
        "jsonpath-validator",
        "js-reverse-engineer",
        "scraping-strategist",
        "playwright-operations",
      ],
      maxTurns: 50,
    },
    databus_specialist: {
      description:
        "DataBus 平台配置专家，负责任务创建、模板应用、Hook开发和配置修复。委派时需提供任务名、目标网址和技能提示。",
      prompt: loadPrompt("databus_specialist"),
      model: "inherit",
      mcpServers: ["databus"],
      tools: [
        "mcp__databus__task_*",
        "mcp__databus__template_*",
        "mcp__databus__hook_*",
        "Read",
        "Glob",
        "Grep",
        "TodoWrite",
      ],
      disallowedTools: [
        "mcp__databus__task_delete",
        "mcp__databus__task_start",
        "mcp__databus__task_stop",
        "mcp__databus__task_stage_delete",
        "mcp__databus__hook_delete",
        "Bash",
        "Edit",
        "Write",
      ],
      skills: ["create-task", "use-template", "hook-dev"],
      maxTurns: 30,
    },
    config_validator: {
      description:
        "配置验证与诊断专家。委派时必须提供 task_name。执行测试、分析日志并生成结构化诊断报告，绝不执行修复操作。",
      prompt: loadPrompt("config_validator"),
      model: "inherit",
      mcpServers: ["databus"],
      tools: [
        "mcp__databus__test_*",
        "mcp__databus__task_validate",
        "mcp__databus__task_stages_get",
        "TodoWrite",
      ],
      disallowedTools: ["Bash", "Edit", "Write"],
      skills: ["test-iterate"],
      maxTurns: 15,
    },
  };
}
