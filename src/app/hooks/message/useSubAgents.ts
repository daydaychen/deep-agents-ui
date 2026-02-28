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
        
        // Try to find lc_agent_name from the messages metadata
        let agentName = subagentType; // Default to subagent_type from args
        if (toolCall.subAgentMessages && toolCall.subAgentMessages.length > 0) {
          // Check the first few messages for the actual agent name from metadata
          for (const msg of toolCall.subAgentMessages) {
            if (msg.metadata?.lc_agent_name) {
              agentName = msg.metadata.lc_agent_name;
              break;
            }
          }
        }

        return {
          id: toolCall.id,
          name: toolCall.name,
          subAgentName: subagentType,
          agentName: agentName,
          input: toolCall.args,
          output: toolCall.result ? { result: toolCall.result } : undefined,
          status: toolCall.status,
          messages: toolCall.subAgentMessages || [],
        } as SubAgent;
      });
  }, [toolCalls]);
}
