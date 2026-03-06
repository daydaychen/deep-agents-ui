"use client";

import type { UIMessage, UISubAgent } from "@/app/types/messages";
import type { TodoItem } from "@/app/types/types";
import type { StandaloneConfig } from "@/lib/config";
import { parseSSEStream } from "@/lib/sse-parser";
import {
  createProcessorState,
  getMainMessages,
  getSubagentMessagesMap,
  getSubagents,
  processSDKMessage,
  type ProcessorState,
} from "@/lib/sdk-message-processor";
import { useQueryState } from "nuqs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

// ---- Public API types ----

export type OverrideConfig = {
  maxTurns?: number;
  model?: string;
};

export function useChat({
  onHistoryRevalidate,
  config,
}: {
  onHistoryRevalidate?: () => void;
  config: StandaloneConfig;
}) {
  const [threadId, setThreadId] = useQueryState("threadId");
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [subagents, setSubagents] = useState<UISubAgent[]>([]);
  const [subagentMessagesMap, setSubagentMessagesMap] = useState<Map<string, UIMessage[]>>(new Map());
  const [activeSubAgentId, setActiveSubAgentId] = useState<string | null>(null);
  const [overrideConfig, setOverrideConfig] = useState<OverrideConfig>({});

  const abortRef = useRef<AbortController | null>(null);
  const processorRef = useRef<ProcessorState>(createProcessorState());
  const isSubmittingRef = useRef(false);
  const lastAutoActivatedIdRef = useRef<string | null>(null);

  // Reset state when thread changes
  useEffect(() => {
    setMessages([]);
    setTodos([]);
    setSubagents([]);
    setSubagentMessagesMap(new Map());
    setActiveSubAgentId(null);
    setError(undefined);
    lastAutoActivatedIdRef.current = null;
    processorRef.current = createProcessorState();
  }, [threadId]);

  // ---- Core SSE streaming function ----
  const streamSSE = useCallback(
    async (body: { message: string; threadId?: string; config?: Record<string, unknown> }) => {
      const abortController = new AbortController();
      abortRef.current = abortController;

      setIsLoading(true);
      setError(undefined);

      // Reset processor state for new stream but keep existing messages
      const processor = createProcessorState();
      // Carry over existing finalized messages
      processor.messages = [...processorRef.current.messages];
      processor.todos = [...processorRef.current.todos];
      // Copy subagents
      processorRef.current.subagents.forEach((v, k) => processor.subagents.set(k, v));
      processorRef.current = processor;

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify(body),
          signal: abortController.signal,
        });

        if (!response.ok) {
          const errorBody = await response.text();
          let errorMessage: string;
          try {
            const parsed = JSON.parse(errorBody);
            errorMessage = parsed.error || parsed.message || `HTTP ${response.status}`;
          } catch {
            errorMessage = errorBody || `HTTP ${response.status}`;
          }
          throw new Error(errorMessage);
        }

        // Extract thread ID from response header
        const responseThreadId = response.headers.get("X-Thread-Id");
        if (responseThreadId && !threadId) {
          setThreadId(responseThreadId);
        }

        // Stream SSE events
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        for await (const sseEvent of parseSSEStream(reader)) {
          if (abortController.signal.aborted) break;

          // Handle special SSE events
          if (sseEvent.event === "done") break;
          if (sseEvent.event === "aborted") break;
          if (sseEvent.event === "error") {
            const errorData = JSON.parse(sseEvent.data);
            throw new Error(errorData.error || "Stream error");
          }

          // Parse and process the SDK message
          try {
            const sdkMessage = JSON.parse(sseEvent.data);
            processSDKMessage(processor, sdkMessage);

            // Update React state from processor
            setMessages(getMainMessages(processor));
            setTodos([...processor.todos]);
            setSubagents(getSubagents(processor));
            setSubagentMessagesMap(getSubagentMessagesMap(processor));

            // Auto-activate subagent
            const currentSubagents = getSubagents(processor);
            const activeOnes = currentSubagents.filter((s) => s.status === "active");
            if (activeOnes.length > 0) {
              const lastActive = activeOnes[activeOnes.length - 1];
              if (lastActive.id !== lastAutoActivatedIdRef.current) {
                lastAutoActivatedIdRef.current = lastActive.id;
                setActiveSubAgentId(lastActive.id);
              }
            }
          } catch {
            // Skip unparseable events
          }
        }

        // Final state sync
        setMessages(getMainMessages(processor));
        setTodos([...processor.todos]);
        setSubagents(getSubagents(processor));
        setSubagentMessagesMap(getSubagentMessagesMap(processor));
        onHistoryRevalidate?.();
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // User cancelled — not an error
        } else {
          const errorMessage = err instanceof Error ? err.message : String(err);
          setError(errorMessage);
          toast.error(errorMessage, {
            duration: 5000,
            id: `chat-error-${errorMessage.substring(0, 50)}`,
          });
        }
        onHistoryRevalidate?.();
      } finally {
        setIsLoading(false);
        isSubmittingRef.current = false;
        abortRef.current = null;
      }
    },
    [config.apiKey, threadId, setThreadId, onHistoryRevalidate]
  );

  // ---- Public actions ----

  const sendMessage = useCallback(
    (content: string) => {
      if (isLoading || isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      setActiveSubAgentId(null);

      // Optimistically add user message
      const userMessage: UIMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        parentToolUseId: null,
      };

      const processor = processorRef.current;
      processor.messages.push(userMessage);
      setMessages(getMainMessages(processor));

      // Build request body
      const body: Record<string, unknown> = {
        message: content,
      };
      if (threadId) {
        body.threadId = threadId;
      }
      const reqConfig: Record<string, unknown> = {};
      if (overrideConfig.maxTurns) reqConfig.maxTurns = overrideConfig.maxTurns;
      if (overrideConfig.model) reqConfig.model = overrideConfig.model;
      if (Object.keys(reqConfig).length > 0) body.config = reqConfig;

      streamSSE(body as { message: string; threadId?: string; config?: Record<string, unknown> });
    },
    [isLoading, threadId, overrideConfig, streamSSE]
  );

  const stopStream = useCallback(() => {
    abortRef.current?.abort();

    // Also POST to stop endpoint if we have a threadId
    const tid = threadId;
    if (tid) {
      fetch(`/api/chat/${tid}/stop`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
        },
      }).catch(() => {
        // Best effort — ignore errors
      });
    }
  }, [threadId, config.apiKey]);

  // ---- P2 stubs ----

  const continueStream = useCallback(() => {
    // No-op stub — deferred to P3
  }, []);

  const editMessage = useCallback((_message: UIMessage, _index: number) => {
    // No-op stub — requires forkSession (deferred to P3)
  }, []);

  const retryFromMessage = useCallback((_message: UIMessage, _index: number) => {
    // No-op stub — requires resumeSessionAt (deferred to P3)
  }, []);

  const setBranch = useCallback((_branch: string) => {
    // No-op stub — branching deferred to P3
  }, []);

  const markCurrentThreadAsResolved = useCallback(() => {
    // No-op stub
  }, []);

  const resumeInterrupt = useCallback((_value: unknown) => {
    // No-op stub — tool approval deferred to P2
  }, []);

  const runSingleStep = useCallback(() => {
    // No-op stub — single-step execution deferred to P3
  }, []);

  const setFiles = useCallback(async (_files: Record<string, string>) => {
    // No-op stub
  }, []);

  // ---- Derived state ----

  const getMessageBranchInfo = useCallback(
    (_message: UIMessage, _index: number) => ({
      branchOptions: [] as string[],
      currentBranchIndex: 0,
      canRetry: false,
    }),
    []
  );

  // Error toast effect
  useEffect(() => {
    if (error) {
      toast.error(error, {
        duration: 5000,
        id: `chat-error-${error.substring(0, 50)}`,
      });
    }
  }, [error]);

  // Stable return object
  return useMemo(
    () => ({
      messages,
      todos,
      files: {} as Record<string, string>,
      subagents,
      subagentMessagesMap,
      activeSubAgentId,
      setActiveSubAgentId,
      isLoading,
      error,
      threadId,
      getMessageBranchInfo,
      sendMessage,
      stopStream,
      continueStream,
      editMessage,
      retryFromMessage,
      setBranch,
      markCurrentThreadAsResolved,
      resumeInterrupt,
      runSingleStep,
      setFiles,
      overrideConfig,
      setOverrideConfig,
      config,
    }),
    [
      messages,
      todos,
      subagents,
      subagentMessagesMap,
      activeSubAgentId,
      isLoading,
      error,
      threadId,
      getMessageBranchInfo,
      sendMessage,
      stopStream,
      continueStream,
      editMessage,
      retryFromMessage,
      setBranch,
      markCurrentThreadAsResolved,
      resumeInterrupt,
      runSingleStep,
      setFiles,
      overrideConfig,
      config,
    ]
  );
}
