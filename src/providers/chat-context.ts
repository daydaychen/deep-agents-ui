"use client";

import type { Assistant, Message } from "@langchain/langgraph-sdk";
import type { TodoItem } from "@/app/types/types";
import { createContext, useContext } from "react";
import type { useChat } from "@/app/hooks/useChat";

export type StateType = {
  messages: Message[];
  todos: TodoItem[];
  files: Record<string, string>;
  email?: {
    id?: string;
    subject?: string;
    page_content?: string;
  };
  ui?: any;
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
  interruptBefore?: string[];
  interruptAfter?: string[];
  thinking?: boolean;
  authMode?: "ask" | "read" | "auto";
};

// Re-export Assistant type for convenience
export type { Assistant };

// 拆分 Context 以优化性能：State 频繁变化，Actions 基本稳定
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

export const ChatStateContext = createContext<ChatStateContextType | undefined>(
  undefined
);
export const ChatActionsContext = createContext<
  ChatActionsContextType | undefined
>(undefined);

export function useChatState() {
  const context = useContext(ChatStateContext);
  if (context === undefined) {
    throw new Error("useChatState must be used within a ChatProvider");
  }
  return context;
}

export function useChatActions() {
  const context = useContext(ChatActionsContext);
  if (context === undefined) {
    throw new Error("useChatActions must be used within a ChatProvider");
  }
  return context;
}
