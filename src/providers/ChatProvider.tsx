"use client";

import { useChat } from "@/app/hooks/useChat";
import type { StandaloneConfig } from "@/lib/config";
import { ReactNode, useMemo } from "react";
import {
  ChatActionsContext,
  ChatActionsContextType,
  ChatStateContext,
  ChatStateContextType,
} from "./chat-context";

interface ChatProviderProps {
  children: ReactNode;
  onHistoryRevalidate?: () => void;
  config: StandaloneConfig;
}

export function ChatProvider({
  children,
  onHistoryRevalidate,
  config,
}: ChatProviderProps) {
  const chat = useChat({
    onHistoryRevalidate,
    config,
  });

  const state: ChatStateContextType = useMemo(
    () => ({
      messages: chat.messages,
      todos: chat.todos,
      files: chat.files,
      subagents: chat.subagents,
      subagentMessagesMap: chat.subagentMessagesMap,
      activeSubAgentId: chat.activeSubAgentId,
      isLoading: chat.isLoading,
      error: chat.error,
      threadId: chat.threadId,
      getMessageBranchInfo: chat.getMessageBranchInfo,
      overrideConfig: chat.overrideConfig,
      config: chat.config,
    }),
    [
      chat.messages,
      chat.todos,
      chat.files,
      chat.subagents,
      chat.subagentMessagesMap,
      chat.activeSubAgentId,
      chat.isLoading,
      chat.error,
      chat.threadId,
      chat.getMessageBranchInfo,
      chat.overrideConfig,
      chat.config,
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
      setOverrideConfig: chat.setOverrideConfig,
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
      chat.setOverrideConfig,
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
