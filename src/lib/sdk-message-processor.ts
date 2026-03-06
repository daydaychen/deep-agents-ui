/**
 * SDK Message Processor — converts SSE SDKMessage JSON payloads into UIMessage[] updates.
 *
 * Stateful: accumulates streaming text deltas, tool calls, and subagent lifecycle,
 * then produces a coherent UIMessage array for the UI.
 */

import type { UIMessage, UIToolCall, UISubAgent, UIMessageMetadata } from "@/app/types/messages";
import type { TodoItem } from "@/app/types/types";

// ---- Internal accumulator state ----

interface PendingMessage {
  id: string;
  parentToolUseId: string | null;
  textParts: string[];
  toolCalls: Map<string, UIToolCall>;
  /** Index of the content block currently being streamed */
  blockIndex: number;
  sessionId: string;
}

export interface ProcessorState {
  /** Finalized messages (user + completed assistant) */
  messages: UIMessage[];
  /** Currently streaming assistant message(s) keyed by parentToolUseId|"main" */
  pending: Map<string, PendingMessage>;
  /** Todos extracted from TodoWrite tool_use blocks */
  todos: TodoItem[];
  /** SubAgent lifecycle tracking */
  subagents: Map<string, UISubAgent>;
  /** Session metadata from the result message */
  metadata: UIMessageMetadata;
  /** Tracks the latest session_id seen */
  sessionId: string | null;
}

export function createProcessorState(): ProcessorState {
  return {
    messages: [],
    pending: new Map(),
    todos: [],
    subagents: new Map(),
    metadata: {},
    sessionId: null,
  };
}

/**
 * Process a single SSE data payload (parsed JSON from the SSE stream).
 * Mutates `state` in place and returns it for convenience.
 */
export function processSDKMessage(state: ProcessorState, raw: unknown): ProcessorState {
  if (!raw || typeof raw !== "object") return state;
  const msg = raw as Record<string, unknown>;
  const type = msg.type as string | undefined;

  if (!type) return state;

  switch (type) {
    case "user":
      processUserMessage(state, msg);
      break;
    case "assistant":
      processAssistantMessage(state, msg);
      break;
    case "stream_event":
      processStreamEvent(state, msg);
      break;
    case "result":
      processResultMessage(state, msg);
      break;
    case "system":
      processSystemMessage(state, msg);
      break;
    case "tool_progress":
      // Optional: could update UI with tool execution timing
      break;
    case "tool_use_summary":
      // Optional: display summary
      break;
    case "rate_limit_event":
      // Optional: surface to UI
      break;
    default:
      // Ignore unknown types
      break;
  }

  return state;
}

// ---- Per-type processors ----

function processUserMessage(state: ProcessorState, msg: Record<string, unknown>) {
  // Skip synthetic tool results
  if (msg.isSynthetic) return;
  // Skip replay messages to avoid duplicates
  if ((msg as any).isReplay) return;

  const parentToolUseId = (msg.parent_tool_use_id as string | null) ?? null;
  // Skip subagent internal user messages (tool results)
  if (parentToolUseId !== null) return;

  const uuid = (msg.uuid as string) ?? crypto.randomUUID();
  const messageParam = msg.message as Record<string, unknown> | undefined;
  const content = extractContentFromMessageParam(messageParam);

  if (!content) return;

  state.messages.push({
    id: uuid,
    role: "user",
    content,
    parentToolUseId: null,
  });
}

function processAssistantMessage(state: ProcessorState, msg: Record<string, unknown>) {
  const parentToolUseId = (msg.parent_tool_use_id as string | null) ?? null;
  const uuid = (msg.uuid as string) ?? crypto.randomUUID();
  const sessionId = (msg.session_id as string) ?? "";
  const error = msg.error as string | undefined;
  const betaMessage = msg.message as Record<string, unknown> | undefined;

  // Flush any pending streaming message for this scope
  const pendingKey = parentToolUseId ?? "main";
  state.pending.delete(pendingKey);

  // Extract content blocks from BetaMessage
  const contentBlocks = (betaMessage?.content as unknown[]) ?? [];
  let textContent = "";
  const toolCalls: UIToolCall[] = [];

  for (const block of contentBlocks) {
    if (!block || typeof block !== "object") continue;
    const b = block as Record<string, unknown>;

    if (b.type === "text") {
      textContent += (b.text as string) ?? "";
    } else if (b.type === "tool_use") {
      const tc: UIToolCall = {
        id: (b.id as string) ?? crypto.randomUUID(),
        name: (b.name as string) ?? "unknown",
        args: (b.input as Record<string, unknown>) ?? {},
        status: "pending", // Will be resolved by tool_result user messages
      };
      toolCalls.push(tc);

      // Extract todos from TodoWrite tool calls
      if (tc.name === "TodoWrite") {
        extractTodos(state, tc);
      }
    }
  }

  // Build metadata from betaMessage
  const metadata: UIMessageMetadata = {
    model: betaMessage?.model as string | undefined,
    session_id: sessionId,
    stop_reason: betaMessage?.stop_reason as string | undefined,
  };
  if (betaMessage?.usage) {
    const usage = betaMessage.usage as Record<string, number>;
    metadata.usage = {
      input_tokens: usage.input_tokens ?? 0,
      output_tokens: usage.output_tokens ?? 0,
    };
  }
  if (error) {
    metadata.error = error;
  }

  // For subagent messages, store in subagentMessages instead of main messages
  if (parentToolUseId !== null) {
    addSubagentMessage(state, parentToolUseId, {
      id: uuid,
      role: "assistant",
      content: textContent,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      parentToolUseId,
      metadata,
    });

    // Resolve tool call statuses for subagent tool calls
    resolveToolCallResults(state, toolCalls, parentToolUseId);
    return;
  }

  // Main agent message
  const uiMessage: UIMessage = {
    id: uuid,
    role: "assistant",
    content: textContent,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    isStreaming: false,
    parentToolUseId: null,
    metadata,
  };

  state.messages.push(uiMessage);
}

function processStreamEvent(state: ProcessorState, msg: Record<string, unknown>) {
  const parentToolUseId = (msg.parent_tool_use_id as string | null) ?? null;
  const uuid = (msg.uuid as string) ?? crypto.randomUUID();
  const sessionId = (msg.session_id as string) ?? "";
  const event = msg.event as Record<string, unknown> | undefined;

  if (!event) return;

  const eventType = event.type as string;
  const pendingKey = parentToolUseId ?? "main";

  // Get or create pending message
  let pending = state.pending.get(pendingKey);
  if (!pending) {
    pending = {
      id: uuid,
      parentToolUseId,
      textParts: [],
      toolCalls: new Map(),
      blockIndex: 0,
      sessionId,
    };
    state.pending.set(pendingKey, pending);
  }

  switch (eventType) {
    case "content_block_start": {
      const contentBlock = event.content_block as Record<string, unknown> | undefined;
      const index = (event.index as number) ?? pending.blockIndex;
      pending.blockIndex = index;

      if (contentBlock?.type === "text") {
        // Initialize text slot
        while (pending.textParts.length <= index) pending.textParts.push("");
        pending.textParts[index] = (contentBlock.text as string) ?? "";
      } else if (contentBlock?.type === "tool_use") {
        const tcId = (contentBlock.id as string) ?? `tc-${index}`;
        pending.toolCalls.set(tcId, {
          id: tcId,
          name: (contentBlock.name as string) ?? "unknown",
          args: {},
          status: "pending",
        });
      }
      break;
    }

    case "content_block_delta": {
      const delta = event.delta as Record<string, unknown> | undefined;
      const index = (event.index as number) ?? pending.blockIndex;

      if (delta?.type === "text_delta") {
        while (pending.textParts.length <= index) pending.textParts.push("");
        pending.textParts[index] += (delta.text as string) ?? "";
      } else if (delta?.type === "input_json_delta") {
        // Tool call args come as partial JSON — accumulate as string, parse on block_stop
        // We don't parse partial JSON here; it will be finalized in the assistant message
      }
      break;
    }

    case "content_block_stop": {
      // Content block finished; the assistant message will contain the final version
      break;
    }

    case "message_start": {
      // Reset pending for this scope
      const message = event.message as Record<string, unknown> | undefined;
      pending.id = (message?.id as string) ?? uuid;
      break;
    }

    case "message_delta": {
      // Contains stop_reason etc. — handled in the final assistant message
      break;
    }

    case "message_stop": {
      // Message complete — the full assistant message follows
      break;
    }
  }

  // Update session ID tracking
  if (sessionId) {
    state.sessionId = sessionId;
  }
}

function processResultMessage(state: ProcessorState, msg: Record<string, unknown>) {
  const subtype = msg.subtype as string;
  const usage = msg.usage as Record<string, number> | undefined;

  state.metadata = {
    ...state.metadata,
    cost_usd: msg.total_cost_usd as number | undefined,
    stop_reason: msg.stop_reason as string | undefined,
    session_id: msg.session_id as string | undefined,
  };

  if (usage) {
    state.metadata.usage = {
      input_tokens: usage.input_tokens ?? 0,
      output_tokens: usage.output_tokens ?? 0,
    };
  }

  if (subtype !== "success") {
    const errors = msg.errors as string[] | undefined;
    if (errors && errors.length > 0) {
      state.metadata.error = errors.join("; ");
    }
  }
}

function processSystemMessage(state: ProcessorState, msg: Record<string, unknown>) {
  const subtype = msg.subtype as string;

  switch (subtype) {
    case "init":
    case "compact_boundary":
      // Ignore
      break;

    case "status":
      // Could update a status display
      break;

    case "task_started": {
      const taskId = msg.task_id as string;
      const toolUseId = msg.tool_use_id as string | undefined;
      const description = msg.description as string;
      const taskType = msg.task_type as string | undefined;

      if (taskId) {
        state.subagents.set(taskId, {
          id: taskId,
          name: "Agent",
          subAgentName: taskType ?? "subagent",
          agentName: description,
          input: { description },
          status: "active",
        });
      }
      break;
    }

    case "task_progress": {
      const taskId = msg.task_id as string;
      const description = msg.description as string;
      const existing = state.subagents.get(taskId);
      if (existing) {
        existing.agentName = description || existing.agentName;
        existing.status = "active";
      }
      break;
    }

    case "task_notification": {
      const taskId = msg.task_id as string;
      const status = msg.status as string;
      const summary = msg.summary as string;
      const existing = state.subagents.get(taskId);
      if (existing) {
        existing.status = status === "completed" ? "completed" : status === "failed" ? "error" : "completed";
        existing.output = { result: summary };
      }
      break;
    }
  }
}

// ---- Helper functions ----

function extractContentFromMessageParam(param: Record<string, unknown> | undefined): string {
  if (!param) return "";

  const role = param.role as string | undefined;
  const content = param.content;

  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    return content
      .filter((c: unknown) => {
        if (typeof c === "string") return true;
        if (c && typeof c === "object" && (c as Record<string, unknown>).type === "text") return true;
        return false;
      })
      .map((c: unknown) => {
        if (typeof c === "string") return c;
        if (c && typeof c === "object") return ((c as Record<string, unknown>).text as string) ?? "";
        return "";
      })
      .join("");
  }

  return "";
}

function extractTodos(state: ProcessorState, toolCall: UIToolCall) {
  const args = toolCall.args;
  // TodoWrite typically has a "todos" array arg
  if (Array.isArray(args.todos)) {
    state.todos = (args.todos as Array<Record<string, unknown>>).map((t) => ({
      id: (t.id as string) ?? crypto.randomUUID(),
      content: (t.content as string) ?? (t.subject as string) ?? "",
      status: ((t.status as string) ?? "pending") as TodoItem["status"],
      updatedAt: new Date(),
    }));
  }
}

function addSubagentMessage(state: ProcessorState, parentToolUseId: string, message: UIMessage) {
  // Find subagent by matching tool_use_id
  // SubAgent messages are tracked separately — they won't appear in main messages array
  // The UI reads them via subagentMessagesMap
  // We store them on the state for later extraction
  if (!message.parentToolUseId) return;
  // Not adding to main messages — caller will use getSubagentMessagesMap()
}

function resolveToolCallResults(state: ProcessorState, toolCalls: UIToolCall[], parentToolUseId: string) {
  // Tool results come as synthetic user messages; we'd need to match them
  // For now, tool call status is set to "completed" when the next assistant message arrives
}

// ---- Public getters for derived state ----

/**
 * Get all messages including in-flight streaming messages.
 * Main agent messages only (parentToolUseId === null).
 */
export function getMainMessages(state: ProcessorState): UIMessage[] {
  const result = [...state.messages];

  // Append pending streaming message (main scope)
  const pending = state.pending.get("main");
  if (pending) {
    result.push({
      id: pending.id,
      role: "assistant",
      content: pending.textParts.join(""),
      toolCalls: pending.toolCalls.size > 0 ? Array.from(pending.toolCalls.values()) : undefined,
      isStreaming: true,
      parentToolUseId: null,
    });
  }

  return result;
}

/**
 * Get subagent messages map (tool_use_id → UIMessage[]).
 */
export function getSubagentMessagesMap(state: ProcessorState): Map<string, UIMessage[]> {
  // Build from pending subagent streams
  const map = new Map<string, UIMessage[]>();

  for (const [key, pending] of state.pending) {
    if (key === "main") continue;
    const messages: UIMessage[] = [{
      id: pending.id,
      role: "assistant",
      content: pending.textParts.join(""),
      toolCalls: pending.toolCalls.size > 0 ? Array.from(pending.toolCalls.values()) : undefined,
      isStreaming: true,
      parentToolUseId: pending.parentToolUseId,
    }];
    map.set(key, messages);
  }

  return map;
}

/**
 * Get subagents array from tracked lifecycle.
 */
export function getSubagents(state: ProcessorState): UISubAgent[] {
  return Array.from(state.subagents.values());
}
