"use client";

import { type StateType, useChat } from "@/app/hooks/useChat";
import type { StandaloneConfig } from "@/lib/config";
import { Assistant } from "@langchain/langgraph-sdk";
import type { UseStreamThread } from "@langchain/langgraph-sdk/react";
import { ReactNode, useMemo } from "react";
import {
  ChatActionsContext,
  ChatActionsContextType,
  ChatStateContext,
  ChatStateContextType,
} from "./chat-context";

interface ChatProviderProps {
  children: ReactNode;
  activeAssistant: Assistant | null;
  onHistoryRevalidate?: () => void;
  thread?: UseStreamThread<StateType>;
  recursionLimit?: number;
  recursionMultiplier?: number;
  config: StandaloneConfig;
}

export function ChatProvider({
  children,
  activeAssistant,
  onHistoryRevalidate,
  thread,
  recursionLimit,
  recursionMultiplier,
  config,
}: ChatProviderProps) {
  const chat = useChat({
    activeAssistant,
    onHistoryRevalidate,
    thread,
    recursionLimit,
    recursionMultiplier,
    config,
  });

  const state: ChatStateContextType = useMemo(
    () => ({
      stream: chat.stream,
      todos: chat.todos,
      files: chat.files,
      email: chat.email,
      ui: chat.ui,
      messages: chat.messages,
      subagents: chat.subagents,
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
      overrideConfig: chat.overrideConfig,
      config: chat.config,
    }),
    [
      chat.stream,
      chat.todos,
      chat.files,
      chat.email,
      chat.ui,
      chat.messages,
      chat.subagents,
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
