import type { Options } from "@anthropic-ai/claude-agent-sdk";

/**
 * Minimal SDK configuration for Phase 1A validation.
 * Subagents, skills, and system prompts will be added in Phase 1B.
 */
export function getAgentOptions(
  overrides?: Partial<Options>
): Options {
  return {
    model: process.env.ANTHROPIC_MODEL,
    systemPrompt: {
      type: "preset",
      preset: "claude_code",
      append: "You are a helpful assistant for the DataBus platform.",
    },
    // Auto-approve these tools without prompting
    allowedTools: [
      "mcp__databus__*",
      "mcp__playwright__*",
      "Agent",
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
    persistSession: true,
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
