import { Message } from "@langchain/langgraph-sdk";
import { useMemo } from "react";
import type { InterruptData, SubAgent, ToolCall } from "@/app/types/types";
import { extractStringFromMessageContent, extractSubAgents } from "@/app/utils/utils";

interface ProcessedMessage {
  message: Message;
  toolCalls: ToolCall[];
  subAgents: SubAgent[];
  showAvatar: boolean;
  reasoningContent?: string;
}

/**
 * Process main messages into a format that's easier to render
 * - Matches tool calls with their results
 * - Determines when to show avatars
 * - Extracts subagents for single-pass processing
 *
 * Note: This hook expects mainMessages (already filtered, without subagent messages)
 * Subagent messages should be handled separately via subagentMessagesMap
 */
export function useProcessedMessages(
  mainMessages: Message[],
  subagentMessagesMap?: Map<string, Message[]>,
  interrupt?: InterruptData,
): ProcessedMessage[] {
  return useMemo(() => {
    // Single-pass processing: build processed messages array directly
    const toolCallLookup = new Map<string, ToolCall>();
    const subAgentLookup = new Map<string, SubAgent>();
    let lastMessageInGroup: Message | null = null;

    const processedArray = mainMessages.reduce<ProcessedMessage[]>((acc, message) => {
      // Skip tool messages entirely from the final rendered array
      if (message.type === "tool") {
        const toolCallId = message.tool_call_id;
        if (toolCallId) {
          const tc = toolCallLookup.get(toolCallId);
          const sa = subAgentLookup.get(toolCallId);

          const result = extractStringFromMessageContent(message);

          if (tc) {
            tc.status = "completed" as const;
            tc.result = result;
          }

          if (sa) {
            sa.status = "completed";
            sa.output = { result };
          }
        }
        return acc;
      }

      // Determine if avatar should be shown
      // Show if:
      // 1. It's the first message
      // 2. The message type is different from the previous one
      // 3. The sender ID (if available, e.g., for different users/agents) is different
      const showAvatar = Boolean(
        !lastMessageInGroup ||
          message.type !== lastMessageInGroup.type ||
          (message.additional_kwargs?.sender_id &&
            message.additional_kwargs.sender_id !==
              lastMessageInGroup.additional_kwargs?.sender_id),
      );

      let toolCallsWithStatus: ToolCall[] = [];
      let subAgents: SubAgent[] = [];
      let reasoningContent: string | undefined;

      if (message.type === "ai") {
        const toolCallsInMessage: Array<{
          id?: string;
          function?: { name?: string; arguments?: unknown };
          name?: string;
          type?: string;
          args?: unknown;
          input?: unknown;
        }> = [];

        if (
          message.additional_kwargs?.tool_calls &&
          Array.isArray(message.additional_kwargs.tool_calls)
        ) {
          toolCallsInMessage.push(...message.additional_kwargs.tool_calls);
        } else if (message.tool_calls && Array.isArray(message.tool_calls)) {
          toolCallsInMessage.push(
            ...message.tool_calls.filter((toolCall: { name?: string }) => toolCall.name !== ""),
          );
        } else if (Array.isArray(message.content)) {
          const toolUseBlocks = message.content.filter(
            (block: { type?: string }) => block.type === "tool_use",
          );
          toolCallsInMessage.push(...toolUseBlocks);
        }

        toolCallsWithStatus = toolCallsInMessage.map(
          (
            toolCall: {
              id?: string;
              function?: { name?: string; arguments?: unknown };
              name?: string;
              type?: string;
              args?: unknown;
              input?: unknown;
            },
            tcIndex,
          ) => {
            const toolCallFunction = toolCall.function;
            const name = toolCallFunction?.name || toolCall.name || toolCall.type || "unknown";
            const args = toolCallFunction?.arguments || toolCall.args || toolCall.input || {};

            const id = toolCall.id || `${message.id}-tool-${tcIndex}`;

            const tc = {
              id,
              name,
              args,
              status: interrupt ? "interrupted" : ("pending" as const),
            } as ToolCall;

            toolCallLookup.set(id, tc);
            return tc;
          },
        );

        reasoningContent = message.additional_kwargs?.reasoning_content as string | undefined;

        subAgents = extractSubAgents(toolCallsWithStatus, subagentMessagesMap);

        subAgents.forEach((sa) => {
          if (sa.id) {
            subAgentLookup.set(sa.id, sa);
          }
        });
      }

      acc.push({
        message,
        toolCalls: toolCallsWithStatus,
        subAgents,
        showAvatar,
        reasoningContent,
      });

      // Update the last message for the next iteration
      lastMessageInGroup = message;
      return acc;
    }, []);

    return processedArray;
  }, [mainMessages, subagentMessagesMap, interrupt]);
}
