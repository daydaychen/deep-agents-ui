import type { SubAgent, ToolCall } from "@/app/types/types";
import { extractStringFromMessageContent, extractSubAgents } from "@/app/utils/utils";
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

    const messageMap = new Map<
      string,
      { message: Message; toolCalls: ToolCall[]; reasoningContent?: string }
    >();

    // Map to quickly find and update a ToolCall by its ID
    const toolCallLookup = new Map<string, ToolCall>();

    mainMessages.forEach((message: Message) => {
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
          (toolCall: {
            id?: string;
            function?: { name?: string; arguments?: unknown };
            name?: string;
            type?: string;
            args?: unknown;
            input?: unknown;
          }, tcIndex) => {
            const name =
              toolCall.function?.name ||
              toolCall.name ||
              toolCall.type ||
              "unknown";
            const args =
              toolCall.function?.arguments ||
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

        const reasoningContent = message.additional_kwargs?.reasoning_content as string | undefined;

        messageMap.set(message.id!, {
          message,
          toolCalls: toolCallsWithStatus,
          reasoningContent,
        });
      } else if (message.type === "tool") {
        const toolCallId = message.tool_call_id;
        if (!toolCallId) {
          return;
        }

        const tc = toolCallLookup.get(toolCallId);
        if (tc) {
          tc.status = "completed" as const;
          tc.result = extractStringFromMessageContent(message);
        }
      } else if (message.type === "human") {
        messageMap.set(message.id!, {
          message,
          toolCalls: [],
        });
      }
    });

    const processedArray = Array.from(messageMap.values());

    return processedArray.map((data, index) => {
      const prevMessage = index > 0 ? processedArray[index - 1].message : null;
      
      // Extract subagents for this message using the unified utility
      const subAgents = extractSubAgents(data.toolCalls, subagentMessagesMap);

      return {
        ...data,
        subAgents,
        showAvatar: data.message.type !== prevMessage?.type,
        reasoningContent: data.reasoningContent,
      };
    });
  }, [mainMessages, subagentMessagesMap, interrupt]);
}
