"use client";

import { createContext, type ReactNode, useContext, useState } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { type ChatStore, type ChatStoreState, createChatStore } from "@/stores/chat-store";

const ChatStoreContext = createContext<ChatStore | undefined>(undefined);

export function ChatStoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => createChatStore());

  return <ChatStoreContext.Provider value={store}>{children}</ChatStoreContext.Provider>;
}

/** Select a single value from the chat store. Only re-renders when the selected value changes (Object.is). */
export function useChatStore<T>(selector: (state: ChatStoreState) => T): T {
  const store = useContext(ChatStoreContext);
  if (!store) {
    throw new Error("useChatStore must be used within a ChatStoreProvider");
  }
  return useStore(store, selector);
}

/** Select multiple values from the chat store with shallow equality. Use for destructuring patterns. */
export function useChatStoreShallow<T>(selector: (state: ChatStoreState) => T): T {
  const store = useContext(ChatStoreContext);
  if (!store) {
    throw new Error("useChatStoreShallow must be used within a ChatStoreProvider");
  }
  return useStore(store, useShallow(selector));
}

/**
 * Get the raw store reference for imperative sync (used by ChatProvider).
 * Not for general consumption — use useChatStore/useChatStoreShallow instead.
 */
export function useChatStoreApi(): ChatStore {
  const store = useContext(ChatStoreContext);
  if (!store) {
    throw new Error("useChatStoreApi must be used within a ChatStoreProvider");
  }
  return store;
}
