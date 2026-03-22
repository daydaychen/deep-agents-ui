"use client";

import { Message } from "@langchain/langgraph-sdk";
import type { SubagentStreamInterface } from "@langchain/langgraph-sdk/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadThreadMessages, saveThreadMessages } from "@/app/utils/db";

// UI 更新的节流时间
const UI_UPDATE_THROTTLE = 100;
// 批量写入的间隔时间（毫秒）
const BATCH_WRITE_INTERVAL = 1000;

export function usePersistedMessages(
  threadId: string | null,
  subagents: Map<string, SubagentStreamInterface<unknown, unknown, string>>,
  isLoading: boolean,
) {
  // Use ref for the actual data to avoid rapid re-renders during streaming
  const messagesCacheRef = useRef<Map<string, Message[]>>(new Map());
  const [subagentMessagesMap, setSubagentMessagesMap] = useState<Map<string, Message[]>>(new Map());

  const pendingWriteRef = useRef(false);
  const lastUpdateRef = useRef(0);

  // ============ 合并逻辑 (节流更新 UI) ============
  // Extract primitive dependencies from subagents Map to avoid unnecessary re-runs
  const subagentSize = subagents.size;

  // biome-ignore lint/correctness/useExhaustiveDependencies: <ignore reason>
  useEffect(() => {
    if (subagentSize === 0) return;

    let hasChanges = false;
    subagents.forEach((subagent, toolCallId) => {
      if (!subagent.messages || subagent.messages.length === 0) return;

      const cached = messagesCacheRef.current.get(toolCallId) || [];
      const incoming = subagent.messages;

      // Simple content/length check to avoid unnecessary updates
      const lastCached = cached[cached.length - 1];
      const lastIncoming = incoming[incoming.length - 1];

      if (
        cached.length !== incoming.length ||
        lastCached?.id !== lastIncoming?.id ||
        lastCached?.content !== lastIncoming?.content
      ) {
        messagesCacheRef.current.set(toolCallId, [...incoming] as Message[]);
        hasChanges = true;
      }
    });

    if (hasChanges) {
      pendingWriteRef.current = true;

      // Throttle UI updates to avoid "Maximum update depth exceeded"
      const now = Date.now();
      if (now - lastUpdateRef.current > UI_UPDATE_THROTTLE) {
        setSubagentMessagesMap(new Map(messagesCacheRef.current));
        lastUpdateRef.current = now;
      }
    }
  }, [isLoading, subagentSize, subagents]);

  // Ensure UI is updated when loading finishes
  useEffect(() => {
    if (!isLoading && pendingWriteRef.current) {
      setSubagentMessagesMap(new Map(messagesCacheRef.current));
    }
  }, [isLoading]);

  // ============ Load from IndexedDB on thread change ============
  useEffect(() => {
    if (!threadId) {
      messagesCacheRef.current = new Map();
      setSubagentMessagesMap(new Map());
      return;
    }
    loadThreadMessages(threadId).then((map) => {
      messagesCacheRef.current = map;
      setSubagentMessagesMap(new Map(map));
    });
  }, [threadId]);

  // ============ Persist to IndexedDB ============
  const saveMessages = useCallback(() => {
    if (!threadId) return;
    saveThreadMessages(threadId, messagesCacheRef.current);
    pendingWriteRef.current = false;
  }, [threadId]);

  useEffect(() => {
    if (!pendingWriteRef.current) return;

    if (!isLoading) {
      // Stream finished - save immediately
      saveMessages();
      return;
    }

    const timer = setTimeout(() => {
      if (pendingWriteRef.current) {
        saveMessages();
      }
    }, BATCH_WRITE_INTERVAL);
    return () => clearTimeout(timer);
  }, [isLoading, saveMessages]);

  return useMemo(
    () => ({
      subagentMessagesMap,
    }),
    [subagentMessagesMap],
  );
}
