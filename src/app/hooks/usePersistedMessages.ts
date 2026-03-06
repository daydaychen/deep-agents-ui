"use client";

import type { UIMessage } from "@/app/types/messages";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DB_NAME, DB_VERSION, STORE_NAME } from "@/app/utils/db";

// Batch write interval (milliseconds)
const BATCH_WRITE_INTERVAL = 1000;
// UI update throttle time
const UI_UPDATE_THROTTLE = 100;

interface PersistedSubagentMessage {
  threadId: string;
  messageId: string;
  toolCallId: string;
  message: UIMessage;
  timestamp: number;
  index: number;
}

export function usePersistedMessages(
  threadId: string | null,
  subagentMessagesMap: Map<string, UIMessage[]>,
  isLoading: boolean
) {
  const dbRef = useRef<IDBDatabase | null>(null);
  const dbReadyPromiseRef = useRef<Promise<IDBDatabase | null> | null>(null);

  // Use ref for the actual data to avoid rapid re-renders during streaming
  const messagesCacheRef = useRef<Map<string, UIMessage[]>>(new Map());
  const [mergedSubagentMessages, setMergedSubagentMessages] = useState<Map<string, UIMessage[]>>(new Map());

  const pendingWriteRef = useRef(false);
  const lastUpdateRef = useRef(0);

  // ============ Merge logic (throttle UI updates) ============
  useEffect(() => {
    if (subagentMessagesMap.size === 0) return;

    let hasChanges = false;
    subagentMessagesMap.forEach((messages, toolCallId) => {
      if (!messages || messages.length === 0) return;

      const cached = messagesCacheRef.current.get(toolCallId) || [];
      const incoming = messages;

      // Simple content/length check to avoid unnecessary updates
      const lastCached = cached[cached.length - 1];
      const lastIncoming = incoming[incoming.length - 1];

      if (
        cached.length !== incoming.length ||
        lastCached?.id !== lastIncoming?.id ||
        lastCached?.content !== lastIncoming?.content
      ) {
        messagesCacheRef.current.set(toolCallId, [...incoming]);
        hasChanges = true;
      }
    });

    if (hasChanges) {
      pendingWriteRef.current = true;

      // Throttle UI updates to avoid "Maximum update depth exceeded"
      const now = Date.now();
      if (now - lastUpdateRef.current > UI_UPDATE_THROTTLE) {
        setMergedSubagentMessages(new Map(messagesCacheRef.current));
        lastUpdateRef.current = now;
      }
    }
  }, [isLoading, subagentMessagesMap]);

  // Ensure UI is updated when loading finishes
  useEffect(() => {
    if (!isLoading && pendingWriteRef.current) {
      setMergedSubagentMessages(new Map(messagesCacheRef.current));
    }
  }, [isLoading]);

  // ============ IndexedDB persistence ============
  useEffect(() => {
    if (!threadId) {
      dbReadyPromiseRef.current = null;
      return;
    }

    const openDB = (): Promise<IDBDatabase> => {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (db.objectStoreNames.contains(STORE_NAME)) {
            db.deleteObjectStore(STORE_NAME);
          }
          const objectStore = db.createObjectStore(STORE_NAME, {
            keyPath: ["threadId", "messageId"],
          });
          objectStore.createIndex("threadId", "threadId", { unique: false });
          objectStore.createIndex("toolCallId", ["threadId", "toolCallId"], { unique: false });
          objectStore.createIndex("timestamp", "timestamp", { unique: false });
        };
      });
    };

    dbReadyPromiseRef.current = openDB().then(db => {
      dbRef.current = db;
      return db;
    }).catch(() => null);

    return () => {
      dbRef.current?.close();
      dbRef.current = null;
    };
  }, [threadId]);

  const batchSaveToIndexedDB = useCallback(
    async (messagesMap: Map<string, UIMessage[]>) => {
      if (!threadId || !dbRef.current || messagesMap.size === 0) return;
      try {
        const transaction = dbRef.current.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const now = Date.now();
        messagesMap.forEach((msgs, toolCallId) => {
          msgs.forEach((message, idx) => {
            if (!message.id) return;
            store.put({
              threadId,
              messageId: message.id,
              toolCallId,
              message,
              timestamp: now,
              index: idx,
            });
          });
        });
      } catch (error) {
        console.error("Failed to batch save subagent messages:", error);
      }
    },
    [threadId]
  );

  const loadSubagentMessages = useCallback(async (): Promise<Map<string, UIMessage[]>> => {
    if (!threadId || !dbReadyPromiseRef.current) return new Map();
    const db = await dbReadyPromiseRef.current;
    if (!db) return new Map();

    try {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index("threadId");
      const result = await new Promise<PersistedSubagentMessage[]>((resolve, reject) => {
        const request = index.getAll(threadId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      const subagentMap = new Map<string, UIMessage[]>();
      result.sort((a, b) => (a.timestamp - b.timestamp) || (a.index - b.index));
      result.forEach(pm => {
        if (!subagentMap.has(pm.toolCallId)) subagentMap.set(pm.toolCallId, []);
        subagentMap.get(pm.toolCallId)!.push(pm.message);
      });
      return subagentMap;
    } catch {
      return new Map();
    }
  }, [threadId]);

  useEffect(() => {
    if (!threadId) {
      messagesCacheRef.current = new Map();
      setMergedSubagentMessages(new Map());
      return;
    }
    loadSubagentMessages().then(map => {
      messagesCacheRef.current = map;
      setMergedSubagentMessages(new Map(map));
    });
  }, [threadId, loadSubagentMessages]);

  useEffect(() => {
    if (!pendingWriteRef.current) return;

    if (!isLoading) {
      // Stream finished - save immediately
      batchSaveToIndexedDB(messagesCacheRef.current);
      pendingWriteRef.current = false;
      return;
    }

    const timer = setTimeout(() => {
      if (pendingWriteRef.current) {
        batchSaveToIndexedDB(messagesCacheRef.current);
        pendingWriteRef.current = false;
      }
    }, BATCH_WRITE_INTERVAL);
    return () => clearTimeout(timer);
  }, [isLoading, batchSaveToIndexedDB]);

  return useMemo(() => ({
    subagentMessagesMap: mergedSubagentMessages,
  }), [mergedSubagentMessages]);
}
