"use client";

import type { Message } from "@langchain/langgraph-sdk";
import { createStore } from "zustand/vanilla";
import type { useChat } from "@/app/hooks/useChat";
import type { OverrideConfig, StateType } from "@/providers/chat-context";

/**
 * The store state type is derived from useChat's return type to stay in sync automatically.
 * This prevents the maintenance trap where adding a field to useChat silently misses the store.
 */
type UseChatReturn = ReturnType<typeof useChat>;

export type ChatStoreState = UseChatReturn & {
  /** Bulk-sync all fields from a useChat return value. This is the only mutation path. */
  _sync: (chat: UseChatReturn) => void;
};

// Stable defaults to avoid creating new references on every sync
const EMPTY_MESSAGES: Message[] = [];
const EMPTY_TODOS: StateType["todos"] = [];
const EMPTY_FILES: Record<string, string> = {};
const EMPTY_MAP = new Map() as UseChatReturn["subagentMessagesMap"];
const EMPTY_SUBAGENTS = new Map() as UseChatReturn["subagents"];
const NOOP = (() => {}) as any;
const NOOP_PROMISE = (() => Promise.resolve()) as any;

export const createChatStore = () =>
  createStore<ChatStoreState>()((set) => ({
    // --- Data fields (will be overwritten by first _sync) ---
    stream: null as any,
    todos: EMPTY_TODOS,
    files: EMPTY_FILES,
    email: undefined,
    ui: undefined,
    messages: EMPTY_MESSAGES,
    subagents: EMPTY_SUBAGENTS,
    subagentMessagesMap: EMPTY_MAP,
    activeSubAgentId: null,
    isLoading: false,
    isThreadLoading: false,
    interrupt: undefined,
    getMessagesMetadata: NOOP,
    error: undefined,
    branch: "" as any,
    history: undefined as any,
    getMessageBranchInfo: NOOP,
    overrideConfig: {} as OverrideConfig,
    config: {} as any,
    threadId: null,

    // --- Action fields (stable callbacks from useChat, overwritten by first _sync) ---
    sendMessage: NOOP_PROMISE,
    runSingleStep: NOOP_PROMISE,
    continueStream: NOOP_PROMISE,
    stopStream: NOOP,
    markCurrentThreadAsResolved: NOOP_PROMISE,
    resumeInterrupt: NOOP_PROMISE,
    retryFromMessage: NOOP_PROMISE,
    editMessage: NOOP_PROMISE,
    setFiles: NOOP,
    setActiveSubAgentId: NOOP,
    setBranch: NOOP,
    setOverrideConfig: NOOP,

    // --- Sync action ---
    _sync: (chat: UseChatReturn) => {
      set(chat);
    },
  }));

export type ChatStore = ReturnType<typeof createChatStore>;
