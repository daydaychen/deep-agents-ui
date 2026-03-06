import type { UIMessage, UIToolCall, UISubAgent } from "@/app/types/messages";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function formatDate(date: string | number | Date): string {
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/**
 * Extract subagent information from tool calls.
 * Filters for "Agent" tool calls (was "task" in LangGraph).
 */
export function extractSubAgents(
  toolCalls: UIToolCall[],
  subagentMessagesMap?: Map<string, UIMessage[]>
): UISubAgent[] {
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

export function extractStringFromMessageContent(message: UIMessage): string {
  return message.content ?? "";
}

export function extractSubAgentContent(data: unknown): string {
  if (typeof data === "string") {
    return data;
  }

  if (data && typeof data === "object") {
    const dataObj = data as Record<string, unknown>;

    if (dataObj.description && typeof dataObj.description === "string") {
      return dataObj.description;
    }
    if (dataObj.prompt && typeof dataObj.prompt === "string") {
      return dataObj.prompt;
    }
    if (dataObj.result && typeof dataObj.result === "string") {
      return dataObj.result;
    }

    return JSON.stringify(data, null, 2);
  }

  return JSON.stringify(data, null, 2);
}

export function isPreparingToCallAgentTool(messages: UIMessage[]): boolean {
  const lastMessage = messages[messages.length - 1];
  return (
    (lastMessage?.role === "assistant" &&
      lastMessage.toolCalls?.some((call) => call.name === "Agent")) ||
    false
  );
}
