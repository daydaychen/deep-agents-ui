/**
 * UIMessage type system for Claude Agent SDK SSE integration.
 * Replaces LangGraph SDK's Message type throughout the frontend.
 */

// --- Tool Calls ---

export interface UIToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: string;
  status: "pending" | "completed" | "error" | "interrupted";
}

// --- SubAgent lifecycle ---

export interface UISubAgent {
  id: string;
  name: string; // tool name (always "Agent")
  subAgentName: string; // subagent_type from tool args
  agentName?: string; // resolved display name
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  status: "pending" | "active" | "completed" | "error" | "interrupted";
  messages?: UIMessage[];
}

// --- Unified message type ---

export interface UIMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  toolCalls?: UIToolCall[];
  isStreaming?: boolean;
  /** null = main agent, string = subagent parent tool_use ID */
  parentToolUseId?: string | null;
  metadata?: UIMessageMetadata;
}

export interface UIMessageMetadata {
  model?: string;
  usage?: { input_tokens: number; output_tokens: number };
  cost_usd?: number;
  session_id?: string;
  error?: string;
  stop_reason?: string;
  created_at?: string;
}

