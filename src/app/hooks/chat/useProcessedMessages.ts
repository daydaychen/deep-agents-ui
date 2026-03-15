import type { SubAgent, ToolCall } from "@/app/types/types";
import {
  extractStringFromMessageContent,
  extractSubAgents,
} from "@/app/utils/utils";
import { Message } from "@langchain/langgraph-sdk";
import { useMemo } from "react";

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
  interrupt?: any
): ProcessedMessage[] {
  return useMemo(() => {
    /*
     1. Loop through main messages
     2. For each AI message, add the AI message, and any tool calls to the messageMap
     3. Keep a separate toolCallMap for O(1) lookup of tool calls by ID
     4. For each tool message, find the corresponding tool call in the toolCallMap and update it
    */

    // Map to quickly find and update a ToolCall by its ID
    const toolCallLookup = new Map<string, ToolCall>();

    // Single-pass processing: build processed messages array directly
    const processedArray = mainMessages.reduce<ProcessedMessage[]>(
      (acc, message, index) => {
        let processedMessage: ProcessedMessage;

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
              ...message.tool_calls.filter(
                (toolCall: { name?: string }) => toolCall.name !== ""
              )
            );
          } else if (Array.isArray(message.content)) {
            const toolUseBlocks = message.content.filter(
              (block: { type?: string }) => block.type === "tool_use"
            );
            toolCallsInMessage.push(...toolUseBlocks);
          }

          const toolCallsWithStatus = toolCallsInMessage.map(
            (
              toolCall: {
                id?: string;
                function?: { name?: string; arguments?: unknown };
                name?: string;
                type?: string;
                args?: unknown;
                input?: unknown;
              },
              tcIndex
            ) => {
              const toolCallFunction = toolCall.function;
              const name =
                toolCallFunction?.name ||
                toolCall.name ||
                toolCall.type ||
                "unknown";
              const args =
                toolCallFunction?.arguments ||
                toolCall.args ||
                toolCall.input ||
                {};

              const id = toolCall.id || `${message.id}-tool-${tcIndex}`;

              const tc = {
                id,
                name,
                args,
                status: interrupt ? "interrupted" : ("pending" as const),
              } as ToolCall;

              // Add to lookup map
              toolCallLookup.set(id, tc);

              return tc;
            }
          );

          const reasoningContent = message.additional_kwargs
            ?.reasoning_content as string | undefined;

          // Determine showAvatar by comparing with previous message
          const prevMessage = index > 0 ? acc[index - 1].message : null;
          const showAvatar = message.type !== prevMessage?.type;

          // Extract subagents for this message using the unified utility
          const subAgents = extractSubAgents(
            toolCallsWithStatus,
            subagentMessagesMap
          );

          processedMessage = {
            message,
            toolCalls: toolCallsWithStatus,
            subAgents,
            showAvatar,
            reasoningContent,
          };
        } else if (message.type === "tool") {
          const toolCallId = message.tool_call_id;
          if (toolCallId) {
            const tc = toolCallLookup.get(toolCallId);
            if (tc) {
              tc.status = "completed" as const;
              tc.result = extractStringFromMessageContent(message);
            }
          }
          // Tool messages are not added to the processed array directly
          // They only update the corresponding tool call status
          return acc;
        } else {
          // human message
          const prevMessage = index > 0 ? acc[index - 1]?.message : null;
          const showAvatar = message.type !== prevMessage?.type;

          processedMessage = {
            message,
            toolCalls: [],
            subAgents: [],
            showAvatar,
          };
        }

        acc.push(processedMessage);
        return acc;
      },
      []
    );

    return processedArray;
  }, [mainMessages, subagentMessagesMap, interrupt]);
}
