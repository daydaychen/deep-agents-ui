import { Message } from "@langchain/langgraph-sdk";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { SubAgent, ToolCall } from "@/app/types/types";

export function formatDate(date: string | number | Date): string {
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/**
 * Extract subagent information from tool calls
 * - Filters for "task" tool calls with subagent_type
 * - Transforms tool calls into SubAgent objects
 * - Includes subagent messages from the provided map
 */
export function extractSubAgents(
  toolCalls: ToolCall[],
  subagentMessagesMap?: Map<string, Message[]>
): SubAgent[] {
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
      
      // Get messages for this subagent from the map or toolCall
      const messages = subagentMessagesMap?.get(toolCall.id) || toolCall.subAgentMessages || [];

      // Try to find agentName from the messages metadata
      let agentName = subagentType; // Default to subagent_type from args
      if (messages.length > 0) {
        // Check the first few messages for the actual agent name from metadata
        for (const msg of messages) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const msgAny = msg as any;
          if (msgAny.metadata?.lc_agent_name) {
            agentName = msgAny.metadata.lc_agent_name;
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
        status: toolCall.status as SubAgent["status"],
        messages: messages,
      } as SubAgent;
    });
}

export function formatTokenCount(count: number): string {
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + "k";
  }
  return count.toString();
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function extractStringFromMessageContent(message: Message): string {
  return typeof message.content === "string"
    ? message.content
    : Array.isArray(message.content)
    ? message.content
        .filter(
          (c: unknown) =>
            (typeof c === "object" &&
              c !== null &&
              "type" in c &&
              (c as { type: string }).type === "text") ||
            typeof c === "string"
        )
        .map((c: unknown) =>
          typeof c === "string"
            ? c
            : typeof c === "object" && c !== null && "text" in c
            ? (c as { text?: string }).text || ""
            : ""
        )
        .join("")
    : "";
}

export function extractSubAgentContent(data: unknown): string {
  if (typeof data === "string") {
    return data;
  }

  if (data && typeof data === "object") {
    const dataObj = data as Record<string, unknown>;

    // Try to extract description first
    if (dataObj.description && typeof dataObj.description === "string") {
      return dataObj.description;
    }

    // Then try prompt
    if (dataObj.prompt && typeof dataObj.prompt === "string") {
      return dataObj.prompt;
    }

    // For output objects, try result
    if (dataObj.result && typeof dataObj.result === "string") {
      return dataObj.result;
    }

    // Fallback to JSON stringification
    return JSON.stringify(data, null, 2);
  }

  // Fallback for any other type
  return JSON.stringify(data, null, 2);
}

export function isPreparingToCallTaskTool(messages: Message[]): boolean {
  const lastMessage = messages[messages.length - 1];
  return (
    (lastMessage.type === "ai" &&
      lastMessage.tool_calls?.some(
        (call: { name?: string }) => call.name === "task"
      )) ||
    false
  );
}

export function formatMessageForLLM(message: Message): string {
  let role: string;
  if (message.type === "human") {
    role = "Human";
  } else if (message.type === "ai") {
    role = "Assistant";
  } else if (message.type === "tool") {
    role = `Tool Result`;
  } else {
    role = message.type || "Unknown";
  }

  const timestamp = message.id ? ` (${message.id.slice(0, 8)})` : "";

  let contentText = "";

  // Extract content text
  if (typeof message.content === "string") {
    contentText = message.content;
  } else if (Array.isArray(message.content)) {
    const textParts: string[] = [];

    message.content.forEach((part: unknown) => {
      if (typeof part === "string") {
        textParts.push(part);
      } else if (part && typeof part === "object" && "type" in part && part.type === "text") {
        textParts.push((part as { text?: string }).text || "");
      }
      // Ignore other types like tool_use in content - we handle tool calls separately
    });

    contentText = textParts.join("\n\n").trim();
  }

  // For tool messages, include additional tool metadata
  if (message.type === "tool") {
    const messageAny = message as unknown as Record<string, unknown>;
    const toolName = messageAny.name || "unknown_tool";
    const toolCallId = messageAny.tool_call_id || "";
    role = `Tool Result [${String(toolName)}]`;
    if (toolCallId) {
      role += ` (call_id: ${String(toolCallId).slice(0, 8)})`;
    }
  }

  // Handle tool calls from .tool_calls property (for AI messages)
  const toolCallsText: string[] = [];
  if (
    message.type === "ai" &&
    message.tool_calls &&
    Array.isArray(message.tool_calls) &&
    message.tool_calls.length > 0
  ) {
    message.tool_calls.forEach((call: unknown) => {
      const callObj = call as Record<string, unknown>;
      const toolName = callObj.name || "unknown_tool";
      const toolArgs = callObj.args ? JSON.stringify(callObj.args, null, 2) : "{}";
      toolCallsText.push(`[Tool Call: ${String(toolName)}]\nArguments: ${toolArgs}`);
    });
  }

  // Combine content and tool calls
  const parts: string[] = [];
  if (contentText) {
    parts.push(contentText);
  }
  if (toolCallsText.length > 0) {
    parts.push(...toolCallsText);
  }

  if (parts.length === 0) {
    return `${role}${timestamp}: [Empty message]`;
  }

  if (parts.length === 1) {
    return `${role}${timestamp}: ${parts[0]}`;
  }

  return `${role}${timestamp}:\n${parts.join("\n\n")}`;
}

export function formatConversationForLLM(messages: Message[]): string {
  const formattedMessages = messages.map(formatMessageForLLM);
  return formattedMessages.join("\n\n---\n\n");
}
