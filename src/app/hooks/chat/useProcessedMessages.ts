import type { StateType } from "@/app/hooks/useChat";
import type { ToolCall } from "@/app/types/types";
import { extractStringFromMessageContent } from "@/app/utils/utils";
import { Message } from "@langchain/langgraph-sdk";
import type { MessageMetadata } from "@langchain/langgraph-sdk/react";
import { useMemo } from "react";

interface ProcessedMessage {
  message: Message;
  toolCalls: ToolCall[];
  showAvatar: boolean;
}

/**
 * Process raw messages into a format that's easier to render
 * - Matches tool calls with their results
 * - Determines when to show avatars
 * - Attaches subagent messages to their corresponding tool calls
 */
export function useProcessedMessages(
  messages: Message[],
  interrupt?: any,
  getMessagesMetadata?: (
    message: Message,
    index?: number
  ) => MessageMetadata<StateType> | undefined
): ProcessedMessage[] {
  return useMemo(() => {
    /*
     1. First, identify and group subagent messages by tool_call_id
     2. Loop through main messages
     3. For each AI message, add the AI message, and any tool calls to the messageMap
     4. For each tool message, find the corresponding tool call in the messageMap and update the status and output
    */

    // Step 1: Group subagent messages by tool_call_id
    const subAgentMessagesMap = new Map<string, Message[]>();
    const subAgentMessageIds = new Set<string>();

    if (getMessagesMetadata) {
      messages.forEach((message: Message, index: number) => {
        const metadata = getMessagesMetadata(message, index);
        const toolCallId = metadata?.streamMetadata?.tool_call_id as
          | string
          | undefined;

        if (toolCallId) {
          // This message belongs to a subagent
          if (!subAgentMessagesMap.has(toolCallId)) {
            subAgentMessagesMap.set(toolCallId, []);
          }
          subAgentMessagesMap.get(toolCallId)!.push(message);
          if (message.id) {
            subAgentMessageIds.add(message.id);
          }
        }
      });
    }

    // Step 2: Process main messages (excluding subagent messages)
    const messageMap = new Map<
      string,
      { message: Message; toolCalls: ToolCall[] }
    >();

    messages.forEach((message: Message) => {
      // Skip messages that belong to subagents
      if (message.id && subAgentMessageIds.has(message.id)) {
        return;
      }

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
          }) => {
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
            return {
              id: toolCall.id || `tool-${Math.random()}`,
              name,
              args,
              status: interrupt ? "interrupted" : ("pending" as const),
            } as ToolCall;
          }
        );

        messageMap.set(message.id!, {
          message,
          toolCalls: toolCallsWithStatus,
        });
      } else if (message.type === "tool") {
        const toolCallId = message.tool_call_id;
        if (!toolCallId) {
          return;
        }

        for (const [, data] of messageMap.entries()) {
          const toolCallIndex = data.toolCalls.findIndex(
            (tc: ToolCall) => tc.id === toolCallId
          );
          if (toolCallIndex === -1) {
            continue;
          }

          data.toolCalls[toolCallIndex] = {
            ...data.toolCalls[toolCallIndex],
            status: "completed" as const,
            result: extractStringFromMessageContent(message),
          };
          break;
        }
      } else if (message.type === "human") {
        messageMap.set(message.id!, {
          message,
          toolCalls: [],
        });
      }
    });

    const processedArray = Array.from(messageMap.values());

    // Step 3: Attach subagent messages to their corresponding tool calls
    processedArray.forEach((data) => {
      data.toolCalls.forEach((toolCall) => {
        if (subAgentMessagesMap.has(toolCall.id)) {
          toolCall.subAgentMessages = subAgentMessagesMap.get(toolCall.id);
        }
      });
    });

    return processedArray.map((data, index) => {
      const prevMessage = index > 0 ? processedArray[index - 1].message : null;
      return {
        ...data,
        showAvatar: data.message.type !== prevMessage?.type,
      };
    });
  }, [messages, interrupt, getMessagesMetadata]);
}
