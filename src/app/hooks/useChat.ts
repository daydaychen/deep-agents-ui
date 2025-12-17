"use client";

import type { TodoItem } from "@/app/types/types";
import type { StandaloneConfig } from "@/lib/config";
import { useClient } from "@/providers/ClientProvider";
import {
  type Assistant,
  type Checkpoint,
  type Message,
} from "@langchain/langgraph-sdk";
import type { UseStreamThread } from "@langchain/langgraph-sdk/react";
import { useStream } from "@langchain/langgraph-sdk/react";
import { useQueryState } from "nuqs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { usePersistedMessages } from "./usePersistedMessages";

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

export function useChat({
  activeAssistant,
  onHistoryRevalidate,
  thread,
  recursionLimit = 100,
  config,
}: {
  activeAssistant: Assistant | null;
  onHistoryRevalidate?: () => void;
  thread?: UseStreamThread<StateType>;
  recursionLimit?: number;
  config: StandaloneConfig;
}) {
  const [threadId, setThreadId] = useQueryState("threadId");
  const client = useClient();
  const [sessionId, setSessionId] = useState<string>(() => uuidv4());

  // Manage session_id: reuse from thread metadata or generate new one
  useEffect(() => {
    const fetchSessionId = async () => {
      if (threadId && client) {
        try {
          const threadData = await client.threads.get(threadId);
          const existingSessionId = threadData.metadata?.langfuse_session_id as
            | string
            | undefined;
          if (existingSessionId) {
            setSessionId(existingSessionId);
          } else {
            // Thread exists but no session_id, generate and potentially update
            setSessionId(uuidv4());
          }
        } catch (error) {
          // Failed to fetch thread, generate new session_id
          console.warn("Failed to fetch thread metadata:", error);
          setSessionId(uuidv4());
        }
      } else {
        // New thread, generate new session_id
        setSessionId(uuidv4());
      }
    };

    fetchSessionId();
  }, [threadId, client]);

  const stream = useStream<StateType>({
    assistantId: activeAssistant?.assistant_id || "",
    client: client ?? undefined,
    reconnectOnMount: true,
    threadId: threadId ?? null,
    onThreadId: setThreadId,
    defaultHeaders: { "x-auth-scheme": "langsmith" },
    // Revalidate thread list when stream finishes, errors, or creates new thread
    onFinish: onHistoryRevalidate,
    onError: onHistoryRevalidate,
    onCreated: onHistoryRevalidate,
    fetchStateHistory: true,
    thread: thread,
  });

  const {
    messages: persistedMessages,
    metadataMap,
    syncStatus,
  } = usePersistedMessages(
    threadId,
    stream.messages,
    stream.isLoading,
    stream.getMessagesMetadata
  );

  const sendMessage = useCallback(
    (content: string) => {
      const newMessage: Message = { id: uuidv4(), type: "human", content };
      stream.submit(
        { messages: [newMessage] },
        {
          optimisticValues: (prev) => ({
            messages: [...(prev.messages ?? []), newMessage],
          }),
          metadata: {
            langfuse_session_id: sessionId,
            langfuse_user_id: config.userId || "user",
          },
          config: {
            ...(activeAssistant?.config ?? {}),
            recursion_limit: recursionLimit,
          },
          streamMode: ["messages", "updates"],
          streamSubgraphs: true,
          streamResumable: true,
        }
      );
    },
    [stream, sessionId, config.userId, activeAssistant?.config, recursionLimit]
  );

  const runSingleStep = useCallback(
    (
      messages: Message[],
      checkpoint?: Checkpoint,
      isRerunningSubagent?: boolean,
      optimisticMessages?: Message[]
    ) => {
      if (checkpoint) {
        stream.submit(undefined, {
          ...(optimisticMessages
            ? { optimisticValues: { messages: optimisticMessages } }
            : {}),
          metadata: {
            langfuse_session_id: sessionId,
            langfuse_user_id: config.userId || "user",
          },
          config: activeAssistant?.config,
          checkpoint: checkpoint,
          streamMode: ["messages", "updates"],
          streamSubgraphs: true,
          streamResumable: true,
          ...(isRerunningSubagent
            ? { interruptAfter: ["tools"] }
            : { interruptBefore: ["tools"] }),
        });
      } else {
        stream.submit(
          { messages },
          {
            metadata: {
              langfuse_session_id: sessionId,
              langfuse_user_id: config.userId || "user",
            },
            config: activeAssistant?.config,
            interruptBefore: ["tools"],
            streamMode: ["messages", "updates"],
            streamSubgraphs: true,
            streamResumable: true,
          }
        );
      }
    },
    [stream, sessionId, config.userId, activeAssistant?.config]
  );

  const setFiles = useCallback(
    async (files: Record<string, string>) => {
      if (!threadId) return;
      // TODO: missing a way how to revalidate the internal state
      // I think we do want to have the ability to externally manage the state
      await client.threads.updateState(threadId, { values: { files } });
    },
    [client, threadId]
  );

  const continueStream = useCallback(
    (hasTaskToolCall?: boolean) => {
      stream.submit(undefined, {
        metadata: {
          langfuse_session_id: sessionId,
          langfuse_user_id: config.userId || "user",
        },
        config: {
          ...(activeAssistant?.config || {}),
          recursion_limit: recursionLimit,
        },
        streamMode: ["messages", "updates"],
        streamSubgraphs: true,
        streamResumable: true,
        ...(hasTaskToolCall
          ? { interruptAfter: ["tools"] }
          : { interruptBefore: ["tools"] }),
      });
    },
    [stream, sessionId, config.userId, activeAssistant?.config, recursionLimit]
  );

  const markCurrentThreadAsResolved = useCallback(() => {
    stream.submit(null, {
      command: { goto: "__end__", update: null },
      metadata: {
        langfuse_session_id: sessionId,
        langfuse_user_id: config.userId || "user",
      },
    });
  }, [stream, sessionId, config.userId]);

  const resumeInterrupt = useCallback(
    (value: any) => {
      stream.submit(null, {
        command: { resume: value },
        metadata: {
          langfuse_session_id: sessionId,
          langfuse_user_id: config.userId || "user",
        },
        streamMode: ["messages", "updates"],
        streamSubgraphs: true,
        streamResumable: true,
      });
    },
    [stream, sessionId, config.userId]
  );

  const stopStream = useCallback(() => {
    stream.stop();
  }, [stream]);

  const retryFromMessage = useCallback(
    async (message: Message, index: number) => {
      const actualIndex = stream.messages.findIndex(
        (msg) => msg.id === message.id
      );
      const indexToUse = actualIndex !== -1 ? actualIndex : index;

      const metadata = stream.getMessagesMetadata(message, indexToUse);
      if (!metadata?.firstSeenState?.parent_checkpoint) {
        console.warn("No parent checkpoint found for message", message.id);
        return;
      }

      const newConfig = await client.threads.updateState(threadId!, {
        values: null,
        checkpoint: metadata.firstSeenState.parent_checkpoint,
      });

      stream.submit(undefined, {
        config: activeAssistant?.config,
        checkpoint: {
          checkpoint_id: newConfig?.configurable?.checkpoint_id,
          checkpoint_ns: "",
          checkpoint_map: {},
        },
        metadata: {
          langfuse_session_id: sessionId,
          langfuse_user_id: config.userId || "user",
        },
        streamMode: ["messages", "updates"],
        streamSubgraphs: true,
        streamResumable: true,
      });
    },
    [
      stream,
      client.threads,
      threadId,
      activeAssistant?.config,
      sessionId,
      config.userId,
    ]
  );

  const editMessage = useCallback(
    (message: Message, index: number) => {
      // Find the actual index of this message in stream.messages by ID
      const actualIndex = stream.messages.findIndex(
        (msg) => msg.id === message.id
      );
      const indexToUse = actualIndex !== -1 ? actualIndex : index;

      const metadata = stream.getMessagesMetadata(message, indexToUse);
      if (!metadata?.firstSeenState?.parent_checkpoint) {
        console.warn("No parent checkpoint found for message", message.id);
        return;
      }

      // Submit the edited message from the parent checkpoint
      // This creates a new branch with the edited message
      stream.submit(
        { messages: [message] },
        {
          config: activeAssistant?.config,
          checkpoint: metadata.firstSeenState.parent_checkpoint,
          metadata: {
            langfuse_session_id: sessionId,
            langfuse_user_id: config.userId || "user",
          },
          streamMode: ["messages", "updates"],
          streamSubgraphs: true,
          streamResumable: true,
        }
      );
    },
    [stream, activeAssistant?.config, sessionId, config.userId]
  );

  // Helper function to get branch information for a specific message
  const getMessageBranchInfo = useCallback(
    (message: Message, index: number) => {
      // Find the actual index of this message in stream.messages by ID
      const actualIndex = stream.messages.findIndex(
        (msg) => msg.id === message.id
      );
      const indexToUse = actualIndex !== -1 ? actualIndex : index;

      // First try to get metadata from stream, then fallback to cached metadata
      const streamMetadata = stream.getMessagesMetadata?.(message, indexToUse);
      const cachedMetadata = message.id ? metadataMap.get(message.id) : null;
      const metadata = streamMetadata || cachedMetadata;

      // Get branch options from metadata
      const branchOptions =
        (metadata?.branchOptions as string[] | undefined) || [];

      // Find current branch index
      const currentBranch = metadata?.branch;
      const currentBranchIndex = currentBranch
        ? branchOptions.indexOf(currentBranch)
        : 0;

      // Determine if this message can be retried
      const hasParentCheckpoint = !!metadata?.firstSeenState?.parent_checkpoint;
      const canRetry = hasParentCheckpoint && !!retryFromMessage;

      return {
        branchOptions,
        currentBranchIndex: currentBranchIndex >= 0 ? currentBranchIndex : 0,
        canRetry,
      };
    },
    [stream, retryFromMessage, metadataMap]
  );

  const latestError = useMemo(() => {
    const error = stream.error as string | undefined;
    // Filter out CancelledError as it's not a real error
    if (error && error?.includes("CancelledError")) {
      return undefined;
    }
    return error;
  }, [stream.error]);

  return {
    stream,
    todos: stream.values.todos ?? [],
    files: stream.values.files ?? {},
    email: stream.values.email,
    ui: stream.values.ui,
    setFiles,
    messages: persistedMessages,
    metadataMap,
    syncStatus,
    isLoading: stream.isLoading,
    isThreadLoading: stream.isThreadLoading,
    interrupt: stream.interrupt,
    getMessagesMetadata: stream.getMessagesMetadata,
    error: latestError,
    branch: stream.branch,
    setBranch: stream.setBranch,
    history: stream.history,
    getMessageBranchInfo,
    sendMessage,
    runSingleStep,
    continueStream,
    stopStream,
    markCurrentThreadAsResolved,
    resumeInterrupt,
    retryFromMessage,
    editMessage,
  };
}
