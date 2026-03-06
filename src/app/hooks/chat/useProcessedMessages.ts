import type { UIMessage, UIToolCall, UISubAgent } from "@/app/types/messages";
import { extractSubAgents } from "@/app/utils/utils";
import { useMemo } from "react";

export interface ProcessedMessage {
  message: UIMessage;
  toolCalls: UIToolCall[];
  subAgents: UISubAgent[];
  showAvatar: boolean;
}

/**
 * Process UIMessage[] into a format easier to render.
 * - Tool calls are already extracted in the message processor; just pass them through.
 * - Determines when to show avatars (role change).
 * - Extracts subagents from "Agent" tool calls.
 */
export function useProcessedMessages(
  messages: UIMessage[],
  subagentMessagesMap?: Map<string, UIMessage[]>,
  _interrupt?: unknown
): ProcessedMessage[] {
  return useMemo(() => {
    return messages.map((message, index) => {
      const prevMessage = index > 0 ? messages[index - 1] : null;
      const toolCalls = message.toolCalls ?? [];

      // Extract subagents from tool calls
      const subAgents = extractSubAgents(toolCalls, subagentMessagesMap);

      return {
        message,
        toolCalls,
        subAgents,
        showAvatar: message.role !== prevMessage?.role,
      };
    });
  }, [messages, subagentMessagesMap]);
}
