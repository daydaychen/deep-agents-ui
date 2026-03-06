import type { Options } from "@anthropic-ai/claude-agent-sdk";
import { readFileSync } from "fs";
import { join } from "path";
import { getSubagentDefinitions } from "./agents";

function loadClaudeMd(): string {
  return readFileSync(
    join(process.cwd(), "src/lib/agent/prompts/CLAUDE.md"),
    "utf-8"
  );
}

/**
 * SDK configuration with subagents, system prompts, and skills.
 */
export function getAgentOptions(overrides?: Partial<Options>): Options {
  return {
    model: process.env.ANTHROPIC_MODEL,
    systemPrompt: {
      type: "preset",
      preset: "claude_code",
      append: loadClaudeMd(),
    },
    // Auto-approve these tools without prompting
    allowedTools: [
      "mcp__databus__*",
      "mcp__playwright__*",
      "Agent",
      "TodoWrite",
      "Read",
      "Glob",
      "Grep",
    ],
    // Block dangerous tools
    disallowedTools: ["Bash", "Edit", "Write"],
    // Auto-deny anything not in allowedTools (headless API - no user to prompt)
    canUseTool: async () => ({
      behavior: "deny" as const,
      message: "Tool not in allowlist",
    }),
    includePartialMessages: true,
    maxTurns: overrides?.maxTurns ?? 100,
    mcpServers: buildMcpServers(),
    agents: getSubagentDefinitions(),
    persistSession: true,
    cwd: join(process.cwd(), "src/lib/agent"),
    ...overrides,
  };
}

function buildMcpServers(): Options["mcpServers"] {
  const servers: NonNullable<Options["mcpServers"]> = {};

  if (process.env.DATABUS_MCP_URL) {
    servers.databus = {
      type: "http",
      url: process.env.DATABUS_MCP_URL,
      ...(process.env.DATABUS_API_KEY && {
        headers: { Authorization: `Bearer ${process.env.DATABUS_API_KEY}` },
      }),
    };
  }

  if (process.env.PLAYWRIGHT_MCP_URL) {
    servers.playwright = {
      type: "http",
      url: process.env.PLAYWRIGHT_MCP_URL,
    };
  }

  return servers;
}
