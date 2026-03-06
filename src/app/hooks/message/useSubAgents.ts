import type { UIMessage, UIToolCall, UISubAgent } from "@/app/types/messages";
import { useMemo } from "react";

/**
 * Extract subagent information from tool calls.
 * Filters for "Agent" tool calls with subagent_type arg.
 */
export function useSubAgents(
  toolCalls: UIToolCall[],
  subagentMessagesMap?: Map<string, UIMessage[]>
): UISubAgent[] {
  return useMemo(() => {
    return toolCalls
      .filter((toolCall) => {
        return (
          toolCall.name === "Agent" &&
          toolCall.args["subagent_type"] &&
          toolCall.args["subagent_type"] !== "" &&
          toolCall.args["subagent_type"] !== null
        );
      })
      .map((toolCall) => {
        const subagentType = toolCall.args["subagent_type"] as string;
        const messages = subagentMessagesMap?.get(toolCall.id) || [];

        return {
          id: toolCall.id,
          name: toolCall.name,
          subAgentName: subagentType,
          agentName: subagentType,
          input: toolCall.args,
          output: toolCall.result ? { result: toolCall.result } : undefined,
          status: toolCall.status as UISubAgent["status"],
          messages,
        };
      });
  }, [toolCalls, subagentMessagesMap]);
}
