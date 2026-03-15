"use client";

import type { StandaloneConfig } from "@/lib/config";
import {
  DEFAULT_MESSAGE_LIMIT,
  DEFAULT_RECURSION_LIMIT,
  ERROR_MESSAGE_TRUNCATION_LENGTH,
  TOAST_DURATION_MS,
} from "@/lib/constants";
import { generateId } from "@/lib/id-utils";
import {
  LLMOverrideConfig,
  OverrideConfig,
  StateType,
} from "@/providers/chat-context";
import { useClient } from "@/providers/client-context";
import {
  type Assistant,
  type Checkpoint,
  type Message,
} from "@langchain/langgraph-sdk";
import type {
  UseStreamOptions,
  UseStreamThread,
  SubagentStreamInterface,
} from "@langchain/langgraph-sdk/react";
import { useStream } from "@langchain/langgraph-sdk/react";
import type { BaseStream } from "@langchain/langgraph-sdk/react";
import { useQueryState } from "nuqs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { usePersistedMessages } from "./usePersistedMessages";
import { getInterruptBefore as getInterruptBeforeFromUtils } from "@/lib/auth-mode-utils";

// Extend useStream options with DeepAgent-specific options not yet exported in SDK types
interface UseStreamOptionsWithDeepAgentExtensions
  extends UseStreamOptions<StateType> {
  filterSubagentMessages?: boolean;
  streamSubgraphs?: boolean;
}

// Extended stream type that includes subagents property
type ExtendedStream = BaseStream<StateType> & {
  subagents: Map<string, SubagentStreamInterface<any, any, any>>;
  activeSubagents: { id: string }[];
};

// Re-export types from chat-context as the single source of truth
export type {
  LLMOverrideConfig,
  OverrideConfig,
  StateType,
} from "@/providers/chat-context";

export function useChat({
  activeAssistant,
  onHistoryRevalidate,
  thread,
  recursionLimit = DEFAULT_RECURSION_LIMIT,
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
  const [sessionId, setSessionId] = useState<string>(() => generateId());
  const isSubmittingRef = useRef(false);
  const [overrideConfig, setOverrideConfig] = useState<OverrideConfig>({});

  // Sync overrideConfig with assistant defaults on change
  useEffect(() => {
    if (activeAssistant) {
      const assistantConfig = activeAssistant.config?.configurable || {};
      const assistantMetadata = activeAssistant.metadata || {};

      // Safely extract thinking value (handle empty object case)
      const thinkingValue = assistantConfig.thinking ?? assistantMetadata.thinking;
      const thinking = typeof thinkingValue === "boolean" ? thinkingValue : false;

      // Safely extract authMode value (handle empty object case)
      const validAuthModes = ["ask", "read", "auto"] as const;
      const authModeValue = String(assistantMetadata.authMode || "");
      const authMode = validAuthModes.includes(authModeValue as typeof validAuthModes[number])
        ? authModeValue as typeof validAuthModes[number]
        : "ask";

      setOverrideConfig({
        // 显式重置所有字段，不保留之前的覆盖配置
        model: undefined,
        small_model: undefined,
        analyst: undefined,
        config_validator: undefined,
        databus_specialist: undefined,
        thinking,
        authMode,
        recursionLimit: undefined,
        interruptBefore: undefined,
        interruptAfter: undefined,
      });
    }
  }, [activeAssistant]);

  const getInterruptBefore = useCallback(
    (mode: OverrideConfig["authMode"]) => {
      return getInterruptBeforeFromUtils(mode);
    },
    []
  );

  const metadata = useMemo(
    () => ({
      langfuse_session_id: sessionId,
      langfuse_user_id: config.userId || "user",
      user_id: config.userId || "user",
    }),
    [sessionId, config.userId]
  );

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
            setSessionId(generateId());
          }
        } catch {
          // Failed to fetch thread, generate new session_id
          console.warn("Failed to fetch thread metadata:");
          setSessionId(generateId());
        }
      } else {
        // New thread, generate new session_id
        setSessionId(generateId());
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
    // Revalidate thread list when stream finishes, errors, or creates new thread
    onFinish: onHistoryRevalidate,
    onError: onHistoryRevalidate,
    onCreated: onHistoryRevalidate,
    fetchStateHistory: { limit: DEFAULT_MESSAGE_LIMIT },
    thread: thread,
    filterSubagentMessages: true,
    streamSubgraphs: true,
  } as UseStreamOptionsWithDeepAgentExtensions);

  // Reset submit guard when stream finishes
  useEffect(() => {
    if (!stream.isLoading) {
      isSubmittingRef.current = false;
    }
  }, [stream.isLoading]);

  // Helper to map overrides to configurable with prefixes
  const getFinalConfigurable = useCallback((): Record<string, any> => {
    const finalConfigurable: Record<string, any> = {
      ...(activeAssistant?.config?.configurable ?? {}),
      thinking: overrideConfig.thinking ?? false,
    };

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
      "max_tokens",
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
    (stream as ExtendedStream).subagents,
    stream.isLoading
  );

  const sendMessage = useCallback(
    (content: string) => {
      if (stream.isLoading || isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      setActiveSubAgentId(null);
      const newMessage: Message = { id: generateId(), type: "human", content };

      const finalRecursionLimit =
        (overrideConfig.recursionLimit || recursionLimit) * recursionMultiplier;
      const finalInterruptBefore =
        overrideConfig.interruptBefore ||
        getInterruptBefore(overrideConfig.authMode);
      const finalInterruptAfter = overrideConfig.interruptAfter;

      stream.submit(
        { messages: [newMessage] },
        {
          optimisticValues: (prev) => ({
            messages: [...(prev.messages ?? []), newMessage],
          }),
          metadata,
          config: {
            ...(activeAssistant?.config ?? {}),
            recursion_limit: finalRecursionLimit,
            configurable: {
              ...getFinalConfigurable(),
              user_id: metadata.user_id,
            },
          },
          streamMode: ["messages", "updates"],
          streamSubgraphs: true,
          streamResumable: true,
          ...(finalInterruptBefore
            ? { interruptBefore: finalInterruptBefore }
            : {}),
          ...(finalInterruptAfter
            ? { interruptAfter: finalInterruptAfter }
            : {}),
        }
      );
    },
    [
      stream,
      overrideConfig.recursionLimit,
      overrideConfig.interruptBefore,
      overrideConfig.interruptAfter,
      overrideConfig.authMode,
      recursionLimit,
      recursionMultiplier,
      activeAssistant?.config,
      getFinalConfigurable,
      metadata,
      getInterruptBefore,
    ]
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

      const finalRecursionLimit =
        (overrideConfig.recursionLimit || recursionLimit) * recursionMultiplier;
      const computedInterruptBefore = getInterruptBefore(overrideConfig.authMode);
      const finalInterruptBefore =
        overrideConfig.interruptBefore ||
        computedInterruptBefore ||
        (isRerunningSubagent ? undefined : ["tools"]);
      const finalInterruptAfter =
        overrideConfig.interruptAfter ||
        (isRerunningSubagent ? ["tools"] : undefined);

      const assistantConfig = {
        ...(activeAssistant?.config ?? {}),
        configurable: getFinalConfigurable(),
      };

      if (checkpoint) {
        stream.submit(undefined, {
          ...(optimisticMessages
            ? { optimisticValues: { messages: optimisticMessages } }
            : {}),
          metadata,
          config: {
            ...assistantConfig,
            recursion_limit: finalRecursionLimit,
          },
          checkpoint: checkpoint,
          streamMode: ["messages", "updates"],
          streamSubgraphs: true,
          streamResumable: true,
          ...(finalInterruptBefore
            ? { interruptBefore: finalInterruptBefore }
            : {}),
          ...(finalInterruptAfter
            ? { interruptAfter: finalInterruptAfter }
            : {}),
        });
      } else {
        stream.submit(
          { messages },
          {
            metadata,
            config: {
              ...assistantConfig,
              recursion_limit: finalRecursionLimit,
            },
            streamMode: ["messages", "updates"],
            streamSubgraphs: true,
            streamResumable: true,
            ...(finalInterruptBefore
              ? { interruptBefore: finalInterruptBefore }
              : { interruptBefore: ["tools"] }),
            ...(finalInterruptAfter
              ? { interruptAfter: finalInterruptAfter }
              : {}),
          }
        );
      }
    },
    [
      stream,
      overrideConfig.recursionLimit,
      overrideConfig.interruptBefore,
      overrideConfig.interruptAfter,
      recursionLimit,
      recursionMultiplier,
      activeAssistant?.config,
      getFinalConfigurable,
      metadata,
      getInterruptBefore,
      overrideConfig.authMode,
    ]
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

      const finalRecursionLimit =
        (overrideConfig.recursionLimit || recursionLimit) * recursionMultiplier;
      const computedInterruptBefore = getInterruptBefore(overrideConfig.authMode);
      const finalInterruptBefore =
        overrideConfig.interruptBefore ||
        computedInterruptBefore ||
        (hasTaskToolCall ? undefined : ["tools"]);
      const finalInterruptAfter =
        overrideConfig.interruptAfter ||
        (hasTaskToolCall ? ["tools"] : undefined);

      const assistantConfig = {
        ...(activeAssistant?.config ?? {}),
        configurable: getFinalConfigurable(),
      };

      stream.submit(undefined, {
        metadata,
        config: {
          ...assistantConfig,
          recursion_limit: finalRecursionLimit,
        },
        streamMode: ["messages", "updates"],
        streamSubgraphs: true,
        streamResumable: true,
        ...(finalInterruptBefore
          ? { interruptBefore: finalInterruptBefore }
          : {}),
        ...(finalInterruptAfter ? { interruptAfter: finalInterruptAfter } : {}),
      });
    },
    [
      stream,
      overrideConfig.recursionLimit,
      overrideConfig.interruptBefore,
      overrideConfig.interruptAfter,
      overrideConfig.authMode,
      recursionLimit,
      recursionMultiplier,
      activeAssistant?.config,
      getFinalConfigurable,
      metadata,
      getInterruptBefore,
    ]
  );

  const markCurrentThreadAsResolved = useCallback(() => {
    if (stream.isLoading || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setActiveSubAgentId(null);
    stream.submit(null, {
      command: { goto: "__end__", update: null },
      metadata,
      streamResumable: true,
    });
  }, [stream, metadata]);

  const resumeInterrupt = useCallback(
    (value: any) => {
      if (stream.isLoading || isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      // Keep activeSubAgentId if any
      stream.submit(null, {
        command: { resume: value },
        metadata,
        streamMode: ["messages", "updates"],
        streamSubgraphs: true,
        streamResumable: true,
      });
    },
    [stream, metadata]
  );

  const stopStream = useCallback(() => {
    stream.stop();
  }, [stream]);

  // O(1) message lookup index by ID - rebuilds when messages change
  const messageIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    stream.messages.forEach((msg, idx) => {
      if (msg.id) {
        map.set(msg.id, idx);
      }
    });
    return map;
  }, [stream.messages]);

  const resolveMessageIndex = useCallback(
    (message: Message, fallbackIndex: number) => {
      // O(1) lookup using Map instead of O(n) findIndex
      const actual = message.id ? messageIndexMap.get(message.id) : -1;
      return actual !== undefined ? actual : fallbackIndex;
    },
    [messageIndexMap]
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

      const finalRecursionLimit =
        (overrideConfig.recursionLimit || recursionLimit) * recursionMultiplier;
      const assistantConfig = {
        ...(activeAssistant?.config ?? {}),
        configurable: getFinalConfigurable(),
      };

      stream.submit(undefined, {
        checkpoint: parentCheckpoint,
        config: {
          ...assistantConfig,
          recursion_limit: finalRecursionLimit,
        },
        metadata,
        streamMode: ["messages", "updates"],
        streamSubgraphs: true,
        streamResumable: true,
        ...(overrideConfig.interruptBefore
          ? { interruptBefore: overrideConfig.interruptBefore }
          : {}),
        ...(overrideConfig.interruptAfter
          ? { interruptAfter: overrideConfig.interruptAfter }
          : {}),
      });
    },
    [
      stream,
      activeAssistant?.config,
      recursionLimit,
      recursionMultiplier,
      resolveMessageIndex,
      overrideConfig,
      getFinalConfigurable,
    ]
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

      const finalRecursionLimit =
        (overrideConfig.recursionLimit || recursionLimit) * recursionMultiplier;
      const assistantConfig = {
        ...(activeAssistant?.config ?? {}),
        configurable: getFinalConfigurable(),
      };

      stream.submit(
        { messages: [newMessage] },
        {
          checkpoint: parentCheckpoint,
          config: {
            ...assistantConfig,
            recursion_limit: finalRecursionLimit,
          },
          metadata,
          streamMode: ["messages", "updates"],
          streamSubgraphs: true,
          streamResumable: true,
          ...(overrideConfig.interruptBefore
            ? { interruptBefore: overrideConfig.interruptBefore }
            : {}),
          ...(overrideConfig.interruptAfter
            ? { interruptAfter: overrideConfig.interruptAfter }
            : {}),
        }
      );
    },
    [
      stream,
      activeAssistant?.config,
      recursionLimit,
      recursionMultiplier,
      resolveMessageIndex,
      overrideConfig,
      getFinalConfigurable,
    ]
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

    // Type guard for API error objects
    interface ApiError {
      message?: string;
      detail?: string | string[] | Record<string, unknown>;
      error?: string;
    }

    function isApiError(err: unknown): err is ApiError {
      return (
        typeof err === "object" &&
        err !== null &&
        ("message" in err || "detail" in err || "error" in err)
      );
    }

    let errorMessage =
      typeof error === "string"
        ? error
        : isApiError(error)
          ? error.message || JSON.stringify(error)
          : JSON.stringify(error);

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
                .map((d: unknown) =>
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
        duration: TOAST_DURATION_MS,
        id: `chat-error-${latestError.substring(
          0,
          ERROR_MESSAGE_TRUNCATION_LENGTH
        )}`, // Avoid duplicate toasts for the same message
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
    const extendedStream = stream as ExtendedStream;
    if (extendedStream.activeSubagents.length > 0) {
      const lastActive =
        extendedStream.activeSubagents[extendedStream.activeSubagents.length - 1];

      // Only auto-activate if it's a NEW subagent we haven't activated yet
      if (lastActive.id !== lastAutoActivatedIdRef.current) {
        lastAutoActivatedIdRef.current = lastActive.id;
        setActiveSubAgentId(lastActive.id);
      }
    } else if (!stream.isLoading && lastAutoActivatedIdRef.current) {
      // Clear the ref when streaming stops so we can re-activate if needed next time
      lastAutoActivatedIdRef.current = null;
    }
  }, [stream, stream.isLoading]);

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
      subagents: (stream as ExtendedStream).subagents,
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
