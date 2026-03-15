import type { SubAgent, ToolCall } from "@/app/types/types";
import { Message } from "@langchain/langgraph-sdk";
import { useMemo } from "react";

/**
 * Extract subagent information from tool calls
 * - Filters for "task" tool calls with subagent_type
 * - Transforms tool calls into SubAgent objects
 * - Includes subagent messages from the provided map
 */
export function useSubAgents(
  toolCalls: ToolCall[],
  subagentMessagesMap?: Map<string, Message[]>
): SubAgent[] {
  return useMemo(() => {
    const result: SubAgent[] = [];
    for (const toolCall of toolCalls) {
      // Filter: only process "task" tool calls with subagent_type
      if (
        toolCall.name !== "task" ||
        !toolCall.args["subagent_type"] ||
        toolCall.args["subagent_type"] === "" ||
        toolCall.args["subagent_type"] === null
      ) {
        continue;
      }

      const subagentType = (toolCall.args as Record<string, unknown>)[
        "subagent_type"
      ] as string;

      // Get messages for this subagent from the map or toolCall
      const messages =
        subagentMessagesMap?.get(toolCall.id) ||
        toolCall.subAgentMessages ||
        [];

      // Try to find agentName from the messages metadata
      let agentName = subagentType; // Default to subagent_type from args
      if (messages.length > 0) {
        // Check the first few messages for the actual agent name from metadata
        for (const msg of messages) {
          if (msg.metadata?.lc_agent_name) {
            agentName = msg.metadata.lc_agent_name;
            break;
          }
        }
      }

      result.push({
        id: toolCall.id,
        name: toolCall.name,
        subAgentName: subagentType,
        agentName: agentName,
        input: toolCall.args,
        output: toolCall.result ? { result: toolCall.result } : undefined,
        status: toolCall.status,
        messages: messages,
      } as SubAgent);
    }
    return result;
  }, [toolCalls, subagentMessagesMap]);
}
