"use client";

import type { Assistant, Message } from "@langchain/langgraph-sdk";
import type { useChat } from "@/app/hooks/useChat";
import type { TodoItem } from "@/app/types/types";

export type StateType = {
  messages: Message[];
  todos: TodoItem[];
  files: Record<string, string>;
  email?: {
    id?: string;
    subject?: string;
    page_content?: string;
  };
  ui?: unknown;
};

export type LLMOverrideConfig = {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  presence_penalty?: number;
};

export type OverrideConfig = {
  model?: LLMOverrideConfig;
  small_model?: LLMOverrideConfig;
  analyst?: LLMOverrideConfig;
  config_validator?: LLMOverrideConfig;
  databus_specialist?: LLMOverrideConfig;
  recursionLimit?: number;
  thinking?: boolean;
  authMode?: "ask" | "read" | "auto";
};

// Re-export Assistant type for convenience
export type { Assistant };

export type ChatStateContextType = Omit<
  ReturnType<typeof useChat>,
  | "sendMessage"
  | "runSingleStep"
  | "continueStream"
  | "stopStream"
  | "markCurrentThreadAsResolved"
  | "resumeInterrupt"
  | "retryFromMessage"
  | "editMessage"
  | "setFiles"
  | "setActiveSubAgentId"
  | "setBranch"
  | "setOverrideConfig"
>;

export type ChatActionsContextType = Pick<
  ReturnType<typeof useChat>,
  | "sendMessage"
  | "runSingleStep"
  | "continueStream"
  | "stopStream"
  | "markCurrentThreadAsResolved"
  | "resumeInterrupt"
  | "retryFromMessage"
  | "editMessage"
  | "setFiles"
  | "setActiveSubAgentId"
  | "setBranch"
  | "setOverrideConfig"
>;
