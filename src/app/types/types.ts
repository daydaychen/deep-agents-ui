import type { Message } from "@langchain/langgraph-sdk";
import type { UIMessage } from "@langchain/langgraph-sdk/react-ui";

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: string;
  status: "pending" | "completed" | "error" | "interrupted";
  subAgentMessages?: Message[]; // Messages from subagents (for task tool calls)
}

export interface SubAgent {
  id: string;
  name: string;
  subAgentName: string; // The type/purpose from tool args
  agentName?: string; // The semantic name from lc_agent_name metadata
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  status: "pending" | "active" | "completed" | "error" | "interrupted";
  messages?: Message[]; // Messages from the subagent execution
}

export interface FileItem {
  path: string;
  content: string;
}

export interface TodoItem {
  id: string;
  content: string;
  status: "pending" | "in_progress" | "completed";
  updatedAt?: Date;
}

export interface Thread {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InterruptData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value?: any;
  ns?: string[];
  scope?: string;
}

export interface ActionRequest {
  name: string;
  args: Record<string, unknown>;
  description?: string;
}

export interface ReviewConfig {
  action_name: string;
  allowed_decisions?: string[];
}

export interface ToolApprovalInterruptData {
  action_requests: ActionRequest[];
  review_configs?: ReviewConfig[];
}

export interface MemoryItem {
  namespace: string[];
  key: string;
  value: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface UiComponent extends UIMessage {
  id: string;
  metadata?: {
    message_id?: string;
    tool_call_id?: string;
    [key: string]: unknown;
  };
}
