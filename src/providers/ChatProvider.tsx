"use client";

import { Assistant } from "@langchain/langgraph-sdk";
import type { UseStreamThread } from "@langchain/langgraph-sdk/react";
import { type ReactNode, useEffect } from "react";
import { type StateType, useChat } from "@/app/hooks/useChat";
import type { StandaloneConfig } from "@/lib/config";
import { ChatStoreProvider, useChatStoreApi } from "./chat-store-provider";

interface ChatProviderProps {
  children: ReactNode;
  activeAssistant: Assistant | null;
  onHistoryRevalidateAction?: () => void;
  thread?: UseStreamThread<StateType>;
  recursionLimit?: number;
  recursionMultiplier?: number;
  config: StandaloneConfig;
}

/**
 * Inner component that calls useChat and syncs its output into the Zustand store.
 * Must be rendered inside ChatStoreProvider.
 */
function ChatSync({
  children,
  activeAssistant,
  onHistoryRevalidateAction,
  thread,
  recursionLimit,
  recursionMultiplier,
  config,
}: ChatProviderProps) {
  const chat = useChat({
    activeAssistant,
    onHistoryRevalidateAction,
    thread,
    recursionLimit,
    recursionMultiplier,
    config,
  });

  const store = useChatStoreApi();

  // Sync useChat output into Zustand store
  useEffect(() => {
    store.getState()._sync(chat);
  }, [chat, store]);

  return children;
}

export function ChatProvider(props: ChatProviderProps) {
  return (
    <ChatStoreProvider>
      <ChatSync {...props} />
    </ChatStoreProvider>
  );
}
