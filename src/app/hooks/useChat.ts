"use client";

import type { TodoItem } from "@/app/types/types";
import type { StandaloneConfig } from "@/lib/config";
import { useClient } from "@/providers/client-context";
import {
  type Assistant,
  type Checkpoint,
  type Message,
} from "@langchain/langgraph-sdk";
import type { UseStreamThread } from "@langchain/langgraph-sdk/react";
import { useStream } from "@langchain/langgraph-sdk/react";
import { useQueryState } from "nuqs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
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

export type LLMOverrideConfig = {
  model?: string;
  temperature?: number;
  max_completion_tokens?: number;
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
};

export function useChat({
  activeAssistant,
  onHistoryRevalidate,
  thread,
  recursionLimit = 100,
  recursionMultiplier = 6,
  config,
}: {
  activeAssistant: Assistant | null;
  onHistoryRevalidate?: () => void;
  thread?: UseStreamThread<StateType>;
  recursionLimit?: number;
  recursionMultiplier?: number;
  config: StandaloneConfig;
}) {
  const [threadId, setThreadId] = useQueryState("threadId");
  const client = useClient();
  const [sessionId, setSessionId] = useState<string>(() => uuidv4());
  const isSubmittingRef = useRef(false);
  const [overrideConfig, setOverrideConfig] = useState<OverrideConfig>({});

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
        } catch {
          // Failed to fetch thread, generate new session_id
          console.warn("Failed to fetch thread metadata:");
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
    fetchStateHistory: { limit: 100 },
    thread: thread,
    filterSubagentMessages: true,
    streamSubgraphs: true,
  // as any: SDK types don't export DeepAgent-specific options (filterSubagentMessages, streamSubgraphs)
  } as any);

  // Reset submit guard when stream finishes
  useEffect(() => {
    if (!stream.isLoading) {
      isSubmittingRef.current = false;
    }
  }, [stream.isLoading]);

  // Helper to map overrides to configurable with prefixes
  const getFinalConfigurable = useCallback((): Record<string, any> => {
    const finalConfigurable = { ...(activeAssistant?.config?.configurable ?? {}) };
    
    const prefixes = {
      model: "llm_",
      small_model: "small_llm_",
      analyst: "analyst_",
      config_validator: "config_validator_",
      databus_specialist: "databus_specialist_",
    };

    const configKeys: (keyof LLMOverrideConfig)[] = [
      "model",
      "temperature",
      "max_completion_tokens",
      "top_p",
      "presence_penalty",
    ];

    Object.entries(prefixes).forEach(([key, prefix]) => {
      const overrides = overrideConfig[key as keyof typeof prefixes];
      if (overrides) {
        configKeys.forEach((configKey) => {
          if (overrides[configKey] !== undefined) {
            finalConfigurable[`${prefix}${configKey}`] = overrides[configKey];
          }
        });
      }
    });

    return finalConfigurable;
  }, [activeAssistant, overrideConfig]);

  // 消息持久化和缓存 - 返回 subagentMessagesMap
  const { subagentMessagesMap } = usePersistedMessages(
    threadId,
    stream.subagents,
    stream.isLoading
  );

  const sendMessage = useCallback(
    (content: string) => {
      if (stream.isLoading || isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      setActiveSubAgentId(null);
      const newMessage: Message = { id: uuidv4(), type: "human", content };
      
      const finalRecursionLimit = (overrideConfig.recursionLimit || recursionLimit) * recursionMultiplier;
      const finalInterruptBefore = overrideConfig.interruptBefore;
      const finalInterruptAfter = overrideConfig.interruptAfter;
      
      const assistantConfig = { 
        ...(activeAssistant?.config ?? {}),
        configurable: getFinalConfigurable()
      };

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
            ...assistantConfig,
            recursion_limit: finalRecursionLimit,
          },
          streamMode: ["messages", "updates"],
          streamSubgraphs: true,
          streamResumable: true,
          ...(finalInterruptBefore ? { interruptBefore: finalInterruptBefore } : {}),
          ...(finalInterruptAfter ? { interruptAfter: finalInterruptAfter } : {}),
        }
      );
    },
    [stream, sessionId, config.userId, activeAssistant?.config, recursionLimit, recursionMultiplier, overrideConfig, getFinalConfigurable]
  );

  const runSingleStep = useCallback(
    (
      messages: Message[],
      checkpoint?: Checkpoint,
      isRerunningSubagent?: boolean,
      optimisticMessages?: Message[]
    ) => {
      if (stream.isLoading || isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      setActiveSubAgentId(null);

      const finalRecursionLimit = (overrideConfig.recursionLimit || recursionLimit) * recursionMultiplier;
      const finalInterruptBefore = overrideConfig.interruptBefore || (isRerunningSubagent ? undefined : ["tools"]);
      const finalInterruptAfter = overrideConfig.interruptAfter || (isRerunningSubagent ? ["tools"] : undefined);

      const assistantConfig = { 
        ...(activeAssistant?.config ?? {}),
        configurable: getFinalConfigurable()
      };

      if (checkpoint) {
        stream.submit(undefined, {
          ...(optimisticMessages
            ? { optimisticValues: { messages: optimisticMessages } }
            : {}),
          metadata: {
            langfuse_session_id: sessionId,
            langfuse_user_id: config.userId || "user",
          },
          config: {
            ...assistantConfig,
            recursion_limit: finalRecursionLimit,
          },
          checkpoint: checkpoint,
          streamMode: ["messages", "updates"],
          streamSubgraphs: true,
          streamResumable: true,
          ...(finalInterruptBefore ? { interruptBefore: finalInterruptBefore } : {}),
          ...(finalInterruptAfter ? { interruptAfter: finalInterruptAfter } : {}),
        });
      } else {
        stream.submit(
          { messages },
          {
            metadata: {
              langfuse_session_id: sessionId,
              langfuse_user_id: config.userId || "user",
            },
            config: {
              ...assistantConfig,
              recursion_limit: finalRecursionLimit,
            },
            streamMode: ["messages", "updates"],
            streamSubgraphs: true,
            streamResumable: true,
            ...(finalInterruptBefore ? { interruptBefore: finalInterruptBefore } : { interruptBefore: ["tools"] }),
            ...(finalInterruptAfter ? { interruptAfter: finalInterruptAfter } : {}),
          }
        );
      }
    },
    [stream, sessionId, config.userId, activeAssistant?.config, recursionLimit, recursionMultiplier, overrideConfig, getFinalConfigurable]
  );

  const setFiles = useCallback(
    async (files: Record<string, string>) => {
      if (!threadId || !client) return;
      await client.threads.updateState(threadId, { values: { files } });
    },
    [client, threadId]
  );

  const continueStream = useCallback(
    (hasTaskToolCall?: boolean) => {
      if (stream.isLoading || isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      // We don't reset activeSubAgentId here because continue often means 
      // resuming a subagent or the next step in the same chain

      const finalRecursionLimit = (overrideConfig.recursionLimit || recursionLimit) * recursionMultiplier;
      const finalInterruptBefore = overrideConfig.interruptBefore || (hasTaskToolCall ? undefined : ["tools"]);
      const finalInterruptAfter = overrideConfig.interruptAfter || (hasTaskToolCall ? ["tools"] : undefined);

      const assistantConfig = { 
        ...(activeAssistant?.config ?? {}),
        configurable: getFinalConfigurable()
      };

      stream.submit(undefined, {
        metadata: {
          langfuse_session_id: sessionId,
          langfuse_user_id: config.userId || "user",
        },
        config: {
          ...assistantConfig,
          recursion_limit: finalRecursionLimit,
        },
        streamMode: ["messages", "updates"],
        streamSubgraphs: true,
        streamResumable: true,
        ...(finalInterruptBefore ? { interruptBefore: finalInterruptBefore } : {}),
        ...(finalInterruptAfter ? { interruptAfter: finalInterruptAfter } : {}),
      });
    },
    [stream, sessionId, config.userId, activeAssistant?.config, recursionLimit, recursionMultiplier, overrideConfig, getFinalConfigurable]
  );

  const markCurrentThreadAsResolved = useCallback(() => {
    if (stream.isLoading || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setActiveSubAgentId(null);
    stream.submit(null, {
      command: { goto: "__end__", update: null },
      metadata: {
        langfuse_session_id: sessionId,
        langfuse_user_id: config.userId || "user",
      },
      streamResumable: true,
    });
  }, [stream, sessionId, config.userId]);

  const resumeInterrupt = useCallback(
    (value: any) => {
      if (stream.isLoading || isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      // Keep activeSubAgentId if any
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

  const resolveMessageIndex = useCallback(
    (message: Message, fallbackIndex: number) => {
      const actual = stream.messages.findIndex((msg) => msg.id === message.id);
      return actual !== -1 ? actual : fallbackIndex;
    },
    [stream.messages]
  );

  const retryFromMessage = useCallback(
    (message: Message, index: number) => {
      if (stream.isLoading || isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      setActiveSubAgentId(null);

      const indexToUse = resolveMessageIndex(message, index);

      const metadata = stream.getMessagesMetadata(message, indexToUse);
      const parentCheckpoint = metadata?.firstSeenState?.parent_checkpoint;

      if (!parentCheckpoint) {
        console.warn("No parent checkpoint found for message", message.id);
        toast.error("Unable to retry: checkpoint not found for this message");
        isSubmittingRef.current = false;
        return;
      }

      const finalRecursionLimit = (overrideConfig.recursionLimit || recursionLimit) * recursionMultiplier;
      const assistantConfig = { 
        ...(activeAssistant?.config ?? {}),
        configurable: getFinalConfigurable()
      };

      stream.submit(undefined, {
        checkpoint: parentCheckpoint,
        config: {
          ...assistantConfig,
          recursion_limit: finalRecursionLimit,
        },
        metadata: {
          langfuse_session_id: sessionId,
          langfuse_user_id: config.userId || "user",
        },
        streamMode: ["messages", "updates"],
        streamSubgraphs: true,
        streamResumable: true,
        ...(overrideConfig.interruptBefore ? { interruptBefore: overrideConfig.interruptBefore } : {}),
        ...(overrideConfig.interruptAfter ? { interruptAfter: overrideConfig.interruptAfter } : {}),
      });
    },
    [stream, activeAssistant?.config, sessionId, config.userId, recursionLimit, recursionMultiplier, resolveMessageIndex, overrideConfig, getFinalConfigurable]
  );

  const editMessage = useCallback(
    (message: Message, index: number) => {
      if (stream.isLoading || isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      setActiveSubAgentId(null);

      const indexToUse = resolveMessageIndex(message, index);

      const metadata = stream.getMessagesMetadata(message, indexToUse);
      const parentCheckpoint = metadata?.firstSeenState?.parent_checkpoint;

      if (!parentCheckpoint) {
        console.warn("No parent checkpoint found for message", message.id);
        toast.error("Unable to edit: checkpoint not found for this message");
        isSubmittingRef.current = false;
        return;
      }

      // Minimal message — do NOT spread original message properties
      const newMessage: Message = {
        type: "human",
        content: message.content,
      };

      const finalRecursionLimit = (overrideConfig.recursionLimit || recursionLimit) * recursionMultiplier;
      const assistantConfig = { 
        ...(activeAssistant?.config ?? {}),
        configurable: getFinalConfigurable()
      };

      stream.submit(
        { messages: [newMessage] },
        {
          checkpoint: parentCheckpoint,
          config: {
            ...assistantConfig,
            recursion_limit: finalRecursionLimit,
          },
          metadata: {
            langfuse_session_id: sessionId,
            langfuse_user_id: config.userId || "user",
          },
          streamMode: ["messages", "updates"],
          streamSubgraphs: true,
          streamResumable: true,
          ...(overrideConfig.interruptBefore ? { interruptBefore: overrideConfig.interruptBefore } : {}),
          ...(overrideConfig.interruptAfter ? { interruptAfter: overrideConfig.interruptAfter } : {}),
        }
      );
    },
    [stream, activeAssistant?.config, sessionId, config.userId, recursionLimit, recursionMultiplier, resolveMessageIndex, overrideConfig, getFinalConfigurable]
  );

  // Helper function to get branch information for a specific message
  const getMessageBranchInfo = useCallback(
    (message: Message, index: number) => {
      const indexToUse = resolveMessageIndex(message, index);

      const metadata = stream.getMessagesMetadata?.(message, indexToUse);

      // Get branch options from metadata
      const branchOptions =
        (metadata?.branchOptions as string[] | undefined) || [];

      // Find current branch index
      const currentBranch = metadata?.branch;
      const currentBranchIndex = currentBranch
        ? branchOptions.indexOf(currentBranch)
        : 0;

      // Determine if this message can be retried
      // User messages should only support editing, not retrying
      const hasParentCheckpoint = !!metadata?.firstSeenState?.parent_checkpoint;
      const isUserMessage = message.type === "human";
      const canRetry = hasParentCheckpoint && !isUserMessage;

      return {
        branchOptions,
        currentBranchIndex: currentBranchIndex >= 0 ? currentBranchIndex : 0,
        canRetry,
      };
    },
    [stream, resolveMessageIndex]
  );

  const latestError = useMemo(() => {
    const error = stream.error;
    if (!error) return undefined;

    let errorMessage =
      typeof error === "string"
        ? error
        : (error as any).message || JSON.stringify(error);

    // Try to parse JSON if the error message contains a JSON object
    if (errorMessage.includes("{") && errorMessage.includes("}")) {
      try {
        const startIdx = errorMessage.indexOf("{");
        const endIdx = errorMessage.lastIndexOf("}") + 1;
        if (startIdx !== -1 && endIdx > startIdx) {
          const jsonStr = errorMessage.substring(startIdx, endIdx);
          const parsed = JSON.parse(jsonStr);

          if (parsed.detail) {
            if (Array.isArray(parsed.detail)) {
              errorMessage = parsed.detail
                .map((d: any) =>
                  typeof d === "string" ? d : JSON.stringify(d)
                )
                .join(", ");
            } else if (typeof parsed.detail === "object") {
              errorMessage = JSON.stringify(parsed.detail);
            } else {
              errorMessage = String(parsed.detail);
            }
          } else if (parsed.message) {
            errorMessage = String(parsed.message);
          } else if (parsed.error) {
            errorMessage =
              typeof parsed.error === "string"
                ? parsed.error
                : JSON.stringify(parsed.error);
          }
        }
      } catch {
        // Ignore parsing errors and keep original
      }
    }

    // Filter out CancelledError as it's not a real error
    if (errorMessage && errorMessage.includes("CancelledError")) {
      return undefined;
    }
    return errorMessage;
  }, [stream.error]);

  useEffect(() => {
    if (latestError) {
      toast.error(latestError, {
        duration: 5000,
        id: `chat-error-${latestError.substring(0, 50)}`, // Avoid duplicate toasts for the same message
      });
    }
  }, [latestError]);

  const [activeSubAgentId, setActiveSubAgentId] = useState<string | null>(null);
  const lastAutoActivatedIdRef = useRef<string | null>(null);

  // Reset active subagent and tracking ref when thread changes
  useEffect(() => {
    setActiveSubAgentId(null);
    lastAutoActivatedIdRef.current = null;
  }, [threadId]);

  // Auto-activate subagent when it starts streaming
  useEffect(() => {
    if (stream.activeSubagents.length > 0) {
      const lastActive =
        stream.activeSubagents[stream.activeSubagents.length - 1];

      // Only auto-activate if it's a NEW subagent we haven't activated yet
      if (lastActive.id !== lastAutoActivatedIdRef.current) {
        lastAutoActivatedIdRef.current = lastActive.id;
        setActiveSubAgentId(lastActive.id);
      }
    } else if (!stream.isLoading && lastAutoActivatedIdRef.current) {
      // Clear the ref when streaming stops so we can re-activate if needed next time
      lastAutoActivatedIdRef.current = null;
    }
  }, [stream.activeSubagents, stream.isLoading]);


  // Stable return object to prevent downstream infinite loops in providers/consumers
  return useMemo(
    () => ({
      stream,
      todos: stream.values.todos ?? [],
      files: stream.values.files ?? {},
      email: stream.values.email,
      ui: stream.values.ui,
      setFiles,
      messages: stream.messages,
      subagents: stream.subagents,
      subagentMessagesMap,
      activeSubAgentId,
      setActiveSubAgentId,
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
      overrideConfig,
      setOverrideConfig,
      config,
      threadId,
    }),
    [
      stream,
      subagentMessagesMap,
      activeSubAgentId,
      latestError,
      setFiles,
      getMessageBranchInfo,
      sendMessage,
      runSingleStep,
      continueStream,
      stopStream,
      markCurrentThreadAsResolved,
      resumeInterrupt,
      retryFromMessage,
      editMessage,
      overrideConfig,
      config,
      threadId,
    ]
  );
}
