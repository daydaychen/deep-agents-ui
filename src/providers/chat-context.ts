"use client";

import { createContext, useContext } from "react";
import type { UIMessage, UISubAgent } from "@/app/types/messages";
import type { TodoItem } from "@/app/types/types";
import type { OverrideConfig } from "@/app/hooks/useChat";
import type { StandaloneConfig } from "@/lib/config";

// Split Context for performance: State changes frequently, Actions are stable

export interface ChatStateContextType {
  messages: UIMessage[];
  todos: TodoItem[];
  files: Record<string, string>;
  subagents: UISubAgent[];
  subagentMessagesMap: Map<string, UIMessage[]>;
  activeSubAgentId: string | null;
  isLoading: boolean;
  error: string | undefined;
  threadId: string | null;
  getMessageBranchInfo: (
    message: UIMessage,
    index: number
  ) => { branchOptions: string[]; currentBranchIndex: number; canRetry: boolean };
  overrideConfig: OverrideConfig;
  config: StandaloneConfig;
}

export interface ChatActionsContextType {
  sendMessage: (content: string) => void;
  runSingleStep: () => void;
  continueStream: () => void;
  stopStream: () => void;
  markCurrentThreadAsResolved: () => void;
  resumeInterrupt: (value: unknown) => void;
  retryFromMessage: (message: UIMessage, index: number) => void;
  editMessage: (message: UIMessage, index: number) => void;
  setFiles: (files: Record<string, string>) => Promise<void>;
  setActiveSubAgentId: (id: string | null) => void;
  setBranch: (branch: string) => void;
  setOverrideConfig: (config: OverrideConfig) => void;
}

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
