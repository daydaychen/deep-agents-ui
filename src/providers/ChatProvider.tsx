"use client";

import { ReactNode, createContext, useContext, useMemo } from "react";
import { Assistant } from "@langchain/langgraph-sdk";
import { type StateType, useChat } from "@/app/hooks/useChat";
import type { UseStreamThread } from "@langchain/langgraph-sdk/react";
import type { StandaloneConfig } from "@/lib/config";

interface ChatProviderProps {
  children: ReactNode;
  activeAssistant: Assistant | null;
  onHistoryRevalidate?: () => void;
  thread?: UseStreamThread<StateType>;
  recursionLimit?: number;
  config: StandaloneConfig;
}

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
>;

export const ChatStateContext = createContext<ChatStateContextType | undefined>(
  undefined
);
export const ChatActionsContext = createContext<
  ChatActionsContextType | undefined
>(undefined);

export function ChatProvider({
  children,
  activeAssistant,
  onHistoryRevalidate,
  thread,
  recursionLimit,
  config,
}: ChatProviderProps) {
  const chat = useChat({
    activeAssistant,
    onHistoryRevalidate,
    thread,
    recursionLimit,
    config,
  });

  // 使用 useMemo 隔离 State 和 Actions
  const state: ChatStateContextType = useMemo(
    () => ({
      stream: chat.stream,
      todos: chat.todos,
      files: chat.files,
      email: chat.email,
      ui: chat.ui,
      messages: chat.messages,
      subagentMessagesMap: chat.subagentMessagesMap,
      activeSubAgentId: chat.activeSubAgentId,
      isLoading: chat.isLoading,
      isThreadLoading: chat.isThreadLoading,
      interrupt: chat.interrupt,
      getMessagesMetadata: chat.getMessagesMetadata,
      error: chat.error,
      branch: chat.branch,
      history: chat.history,
      getMessageBranchInfo: chat.getMessageBranchInfo,
    }),
    [
      chat.stream,
      chat.todos,
      chat.files,
      chat.email,
      chat.ui,
      chat.messages,
      chat.subagentMessagesMap,
      chat.activeSubAgentId,
      chat.isLoading,
      chat.isThreadLoading,
      chat.interrupt,
      chat.getMessagesMetadata,
      chat.error,
      chat.branch,
      chat.history,
      chat.getMessageBranchInfo,
    ]
  );

  const actions: ChatActionsContextType = useMemo(
    () => ({
      sendMessage: chat.sendMessage,
      runSingleStep: chat.runSingleStep,
      continueStream: chat.continueStream,
      stopStream: chat.stopStream,
      markCurrentThreadAsResolved: chat.markCurrentThreadAsResolved,
      resumeInterrupt: chat.resumeInterrupt,
      retryFromMessage: chat.retryFromMessage,
      editMessage: chat.editMessage,
      setFiles: chat.setFiles,
      setActiveSubAgentId: chat.setActiveSubAgentId,
      setBranch: chat.setBranch,
    }),
    [
      chat.sendMessage,
      chat.runSingleStep,
      chat.continueStream,
      chat.stopStream,
      chat.markCurrentThreadAsResolved,
      chat.resumeInterrupt,
      chat.retryFromMessage,
      chat.editMessage,
      chat.setFiles,
      chat.setActiveSubAgentId,
      chat.setBranch,
    ]
  );

  return (
    <ChatActionsContext.Provider value={actions}>
      <ChatStateContext.Provider value={state}>
        {children}
      </ChatStateContext.Provider>
    </ChatActionsContext.Provider>
  );
}

export type ChatContextType = ChatStateContextType & ChatActionsContextType;

export function useChatContext(): ChatContextType {
  const state = useContext(ChatStateContext);
  const actions = useContext(ChatActionsContext);
  
  if (state === undefined || actions === undefined) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
}

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
