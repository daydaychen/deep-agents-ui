"use client";

import { type Assistant, type Checkpoint, type Message } from "@langchain/langgraph-sdk";
import type {
  BaseStream,
  SubagentStreamInterface,
  UseStreamOptions,
  UseStreamThread,
} from "@langchain/langgraph-sdk/react";
import { useStream } from "@langchain/langgraph-sdk/react";
import { useQueryState } from "nuqs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { StandaloneConfig } from "@/lib/config";
import {
  DEFAULT_MESSAGE_LIMIT,
  DEFAULT_RECURSION_LIMIT,
  ERROR_MESSAGE_TRUNCATION_LENGTH,
  TOAST_DURATION_MS,
} from "@/lib/constants";
import { useLatest } from "@/lib/hooks/useLatest";
import { generateId } from "@/lib/id-utils";
import { LLMOverrideConfig, OverrideConfig, StateType } from "@/providers/chat-context";
import { useClient } from "@/providers/client-context";
import { usePersistedMessages } from "./usePersistedMessages";

// Extend useStream options with DeepAgent-specific options not yet exported in SDK types
interface UseStreamOptionsWithDeepAgentExtensions extends UseStreamOptions<StateType> {
  filterSubagentMessages?: boolean;
  streamSubgraphs?: boolean;
}

// Extended stream type that includes subagents property
type ExtendedStream = BaseStream<StateType> & {
  subagents: Map<string, SubagentStreamInterface<StateType, unknown, string>>;
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
  onHistoryRevalidateAction,
  thread,
  recursionLimit = DEFAULT_RECURSION_LIMIT,
  recursionMultiplier = 6,
  config,
}: {
  activeAssistant: Assistant | null;
  onHistoryRevalidateAction?: () => void;
  thread?: UseStreamThread<StateType>;
  recursionLimit?: number;
  recursionMultiplier?: number;
  config: StandaloneConfig;
}) {
  const [threadId, setThreadId] = useQueryState("threadId");
  const client = useClient();
  const [sessionId, setSessionId] = useState<string>(() => generateId());
  const isSubmittingRef = useRef(false);
  const [overrideConfig, setOverrideConfig] = useState<OverrideConfig>(() => ({}));

  // Derived values to avoid subscribing to entire activeAssistant object
  const hasActiveAssistant = !!activeAssistant;
  const assistantThinking =
    activeAssistant?.config?.configurable?.thinking ?? activeAssistant?.metadata?.thinking;
  const assistantThinkingBoolean =
    typeof assistantThinking === "boolean" ? assistantThinking : false;
  const assistantAuthMode = activeAssistant?.metadata?.authMode;

  // Sync overrideConfig with assistant defaults on change
  useEffect(() => {
    if (hasActiveAssistant) {
      // Safely extract authMode value (handle empty object case)
      const VALID_AUTH_MODES = new Set(["ask", "read", "auto"]);
      const authModeValue = String(assistantAuthMode || "");
      const authMode = VALID_AUTH_MODES.has(authModeValue)
        ? (authModeValue as "ask" | "read" | "auto")
        : "ask";

      setOverrideConfig({
        // 显式重置所有字段，不保留之前的覆盖配置
        model: undefined,
        small_model: undefined,
        analyst: undefined,
        config_validator: undefined,
        databus_specialist: undefined,
        thinking: assistantThinkingBoolean,
        authMode,
        recursionLimit: undefined,
      });
    }
  }, [hasActiveAssistant, assistantThinkingBoolean, assistantAuthMode]);

  const metadata = useMemo(
    () => ({
      langfuse_session_id: sessionId,
      langfuse_user_id: config.userId || "user",
      user_id: config.userId || "user",
    }),
    [sessionId, config.userId],
  );

  // Use useLatest to store frequently changing config values for stable callbacks
  const overrideConfigRef = useLatest(overrideConfig);
  const activeAssistantConfigRef = useLatest(activeAssistant?.config);
  const metadataRef = useLatest(metadata);
  const recursionLimitRef = useLatest(recursionLimit);
  const recursionMultiplierRef = useLatest(recursionMultiplier);

  // Manage session_id: reuse from thread metadata or generate new one
  useEffect(() => {
    const fetchSessionId = async () => {
      if (threadId && client) {
        try {
          const threadData = await client.threads.get(threadId);
          const existingSessionId = threadData.metadata?.langfuse_session_id as string | undefined;
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
    onFinish: onHistoryRevalidateAction,
    onError: onHistoryRevalidateAction,
    onCreated: onHistoryRevalidateAction,
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
  const getFinalConfigurable = useCallback((): Record<string, unknown> => {
    const finalConfigurable: Record<string, unknown> = {
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
          const overrideValue = overrides[configKey];
          if (overrideValue !== undefined) {
            finalConfigurable[`${prefix}${configKey}`] = overrideValue;
          }
        });
      }
    });

    return finalConfigurable;
  }, [activeAssistant, overrideConfig]);

  // Build the complete submit options shared by all config-assembled submit paths.
  const buildSubmitConfig = useCallback(() => {
    const currentOverrideConfig = overrideConfigRef.current;
    const currentMetadata = metadataRef.current;
    const currentRecursionLimit = recursionLimitRef.current;
    const currentRecursionMultiplier = recursionMultiplierRef.current;
    const currentAssistantConfig = activeAssistantConfigRef.current;

    const finalRecursionLimit =
      (currentOverrideConfig.recursionLimit || currentRecursionLimit) * currentRecursionMultiplier;

    const finalConfigurable = getFinalConfigurable();

    return {
      metadata: currentMetadata,
      config: {
        ...(currentAssistantConfig ?? {}),
        recursion_limit: finalRecursionLimit,
        configurable: {
          ...finalConfigurable,
          user_id: currentMetadata.user_id,
          auth_mode: currentOverrideConfig.authMode ?? "ask",
        },
      },
      streamMode: ["messages", "updates"] as ("messages" | "updates")[],
      streamSubgraphs: true,
      streamResumable: true,
    };
  }, [
    getFinalConfigurable,
    overrideConfigRef,
    metadataRef,
    recursionLimitRef,
    recursionMultiplierRef,
    activeAssistantConfigRef,
  ]);

  // 消息持久化和缓存 - 返回 subagentMessagesMap
  const { subagentMessagesMap } = usePersistedMessages(
    threadId,
    (stream as ExtendedStream).subagents,
    stream.isLoading,
  );

  // Store sendMessage handler in ref for stable reference
  const sendMessageRef = useRef<(content: string) => void>(() => {});

  // Update ref when dependencies change
  useEffect(() => {
    sendMessageRef.current = (content: string) => {
      if (stream.isLoading || isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      setActiveSubAgentId(null);
      const newMessage: Message = { id: generateId(), type: "human", content };

      const submitConfig = buildSubmitConfig();

      stream.submit(
        { messages: [newMessage] },
        {
          ...submitConfig,
          optimisticValues: (prev) => ({
            messages: [...(prev.messages ?? []), newMessage],
          }),
        },
      );
    };
  }, [stream, buildSubmitConfig]);

  // Stable callback that delegates to ref
  const sendMessage = useCallback((content: string) => {
    sendMessageRef.current(content);
  }, []);

  const runSingleStep = useCallback(
    (
      messages: Message[],
      checkpoint?: Checkpoint,

      optimisticMessages?: Message[],
    ) => {
      if (stream.isLoading || isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      setActiveSubAgentId(null);

      const submitConfig = buildSubmitConfig();

      if (checkpoint) {
        stream.submit(undefined, {
          ...submitConfig,
          ...(optimisticMessages ? { optimisticValues: { messages: optimisticMessages } } : {}),
          checkpoint: checkpoint,
        });
      } else {
        stream.submit({ messages }, submitConfig);
      }
    },
    [stream, buildSubmitConfig],
  );

  const setFiles = useCallback(
    async (files: Record<string, string>) => {
      if (!threadId || !client) return;
      await client.threads.updateState(threadId, { values: { files } });
    },
    [client, threadId],
  );

  const continueStream = useCallback(() => {
    if (stream.isLoading || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    // We don't reset activeSubAgentId here because continue often means
    // resuming a subagent or the next step in the same chain

    stream.submit(undefined, buildSubmitConfig());
  }, [stream, buildSubmitConfig]);

  const markCurrentThreadAsResolved = useCallback(() => {
    if (stream.isLoading || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setActiveSubAgentId(null);
    // Read current metadata from ref to avoid dependency on changing state
    const currentMetadata = metadataRef.current;
    stream.submit(null, {
      command: { goto: "__end__", update: null },
      metadata: currentMetadata,
      streamResumable: true,
    });
  }, [stream, metadataRef]);

  const resumeInterrupt = useCallback(
    (value: unknown) => {
      if (stream.isLoading || isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      // Keep activeSubAgentId if any
      // Read current metadata from ref to avoid dependency on changing state
      const currentMetadata = metadataRef.current;
      stream.submit(null, {
        command: { resume: value },
        metadata: currentMetadata,
        streamMode: ["messages", "updates"],
        streamSubgraphs: true,
        streamResumable: true,
      });
    },
    [stream, metadataRef],
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
    [messageIndexMap],
  );

  const retryFromMessage = useCallback(
    (message: Message, index: number) => {
      if (stream.isLoading || isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      setActiveSubAgentId(null);

      const indexToUse = resolveMessageIndex(message, index);

      const msgMetadata = stream.getMessagesMetadata(message, indexToUse);
      const parentCheckpoint = msgMetadata?.firstSeenState?.parent_checkpoint;

      if (!parentCheckpoint) {
        console.warn("No parent checkpoint found for message", message.id);
        toast.error("Unable to retry: checkpoint not found for this message");
        isSubmittingRef.current = false;
        return;
      }

      stream.submit(undefined, {
        ...buildSubmitConfig(),
        checkpoint: parentCheckpoint,
      });
    },
    [stream, resolveMessageIndex, buildSubmitConfig],
  );

  const editMessage = useCallback(
    (message: Message, index: number) => {
      if (stream.isLoading || isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      setActiveSubAgentId(null);

      const indexToUse = resolveMessageIndex(message, index);

      const msgMetadata = stream.getMessagesMetadata(message, indexToUse);
      const parentCheckpoint = msgMetadata?.firstSeenState?.parent_checkpoint;

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

      stream.submit(
        { messages: [newMessage] },
        {
          ...buildSubmitConfig(),
          checkpoint: parentCheckpoint,
        },
      );
    },
    [stream, resolveMessageIndex, buildSubmitConfig],
  );

  // Helper function to get branch information for a specific message
  const getMessageBranchInfo = useCallback(
    (message: Message, index: number) => {
      const indexToUse = resolveMessageIndex(message, index);

      const metadata = stream.getMessagesMetadata?.(message, indexToUse);

      // Get branch options from metadata
      const branchOptions = (metadata?.branchOptions as string[] | undefined) || [];

      // Find current branch index
      const currentBranch = metadata?.branch;
      const currentBranchIndex = currentBranch ? branchOptions.indexOf(currentBranch) : 0;

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
    [stream, resolveMessageIndex],
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
    if (!errorMessage.includes("{") || !errorMessage.includes("}")) {
      // Filter out CancelledError as it's not a real error
      if (errorMessage.includes("CancelledError")) {
        return undefined;
      }
      return errorMessage;
    }

    try {
      const startIdx = errorMessage.indexOf("{");
      const endIdx = errorMessage.lastIndexOf("}") + 1;
      if (startIdx === -1 || endIdx <= startIdx) {
        // Filter out CancelledError as it's not a real error
        if (errorMessage.includes("CancelledError")) {
          return undefined;
        }
        return errorMessage;
      }

      const jsonStr = errorMessage.substring(startIdx, endIdx);
      const parsed = JSON.parse(jsonStr);

      // Extract error message from parsed JSON with early exits
      if (parsed.detail) {
        if (Array.isArray(parsed.detail)) {
          errorMessage = parsed.detail
            .map((d: unknown) => (typeof d === "string" ? d : JSON.stringify(d)))
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
          typeof parsed.error === "string" ? parsed.error : JSON.stringify(parsed.error);
      }
    } catch {
      // Ignore parsing errors and keep original
    }

    // Filter out CancelledError as it's not a real error
    if (errorMessage.includes("CancelledError")) {
      return undefined;
    }
    return errorMessage;
  }, [stream.error]);

  useEffect(() => {
    if (latestError) {
      toast.error(latestError, {
        duration: TOAST_DURATION_MS,
        id: `chat-error-${latestError.substring(0, ERROR_MESSAGE_TRUNCATION_LENGTH)}`, // Avoid duplicate toasts for the same message
      });
    }
  }, [latestError]);

  const [activeSubAgentId, setActiveSubAgentId] = useState<string | null>(null);
  const lastAutoActivatedIdRef = useRef<string | null>(null);

  // Reset active subagent and tracking ref when thread changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: <- We only want to reset when threadId changes, not on every stream change>
  useEffect(() => {
    setActiveSubAgentId(null);
    lastAutoActivatedIdRef.current = null;
  }, [threadId]);

  // Auto-activate subagent when it starts streaming
  useEffect(() => {
    const extendedStream = stream as ExtendedStream;
    if (extendedStream.activeSubagents.length > 0) {
      const lastActive = extendedStream.activeSubagents[extendedStream.activeSubagents.length - 1];

      // Only auto-activate if it's a NEW subagent we haven't activated yet
      if (lastActive.id !== lastAutoActivatedIdRef.current) {
        lastAutoActivatedIdRef.current = lastActive.id;

        // Don't auto-activate if there's an interrupt (HITL approval pending)
        // The interrupt indicates the subagent is waiting for human input
        if (!stream.interrupt) {
          setActiveSubAgentId(lastActive.id);
        }
      }
    } else if (!stream.isLoading && lastAutoActivatedIdRef.current) {
      // Clear the ref when streaming stops so we can re-activate if needed next time
      lastAutoActivatedIdRef.current = null;
    }
  }, [stream, stream.isLoading, stream.interrupt]);

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
    ],
  );
}
