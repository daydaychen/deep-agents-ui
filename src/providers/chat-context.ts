"use client";

import { createContext, useContext } from "react";
import type { useChat } from "@/app/hooks/useChat";

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
