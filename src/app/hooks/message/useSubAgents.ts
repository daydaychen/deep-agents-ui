import type { SubAgent, ToolCall } from "@/app/types/types";
import { useMemo } from "react";

/**
 * Extract subagent information from tool calls
 * - Filters for "task" tool calls with subagent_type
 * - Transforms tool calls into SubAgent objects
 * - Includes subagent messages from streaming
 */
export function useSubAgents(toolCalls: ToolCall[]): SubAgent[] {
  return useMemo(() => {
    return toolCalls
      .filter((toolCall: ToolCall) => {
        return (
          toolCall.name === "task" &&
          toolCall.args["subagent_type"] &&
          toolCall.args["subagent_type"] !== "" &&
          toolCall.args["subagent_type"] !== null
        );
      })
      .map((toolCall: ToolCall) => {
        const subagentType = (toolCall.args as Record<string, unknown>)[
          "subagent_type"
        ] as string;
        return {
          id: toolCall.id,
          name: toolCall.name,
          subAgentName: subagentType,
          input: toolCall.args,
          output: toolCall.result ? { result: toolCall.result } : undefined,
          status: toolCall.status,
          messages: toolCall.subAgentMessages || [],
        } as SubAgent;
      });
  }, [toolCalls]);
}
