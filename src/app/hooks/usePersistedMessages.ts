"use client";

import { Message } from "@langchain/langgraph-sdk";
import type { SubagentStreamInterface } from "@langchain/langgraph-sdk/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DB_NAME, DB_VERSION, STORE_NAME } from "@/app/utils/db";

// 批量写入的间隔时间（毫秒）
const BATCH_WRITE_INTERVAL = 1000;
// UI 更新的节流时间
const UI_UPDATE_THROTTLE = 100;

interface PersistedSubagentMessage {
  threadId: string;
  messageId: string;
  toolCallId: string;
  message: Message;
  timestamp: number;
  index: number;
}

export function usePersistedMessages(
  threadId: string | null,
  subagents: Map<string, SubagentStreamInterface<any, any, any>>,
  isLoading: boolean
) {
  const dbRef = useRef<IDBDatabase | null>(null);
  const dbReadyPromiseRef = useRef<Promise<IDBDatabase | null> | null>(null);

  // Use ref for the actual data to avoid rapid re-renders during streaming
  const messagesCacheRef = useRef<Map<string, Message[]>>(new Map());
  const [subagentMessagesMap, setSubagentMessagesMap] = useState<Map<string, Message[]>>(new Map());

  const pendingWriteRef = useRef(false);
  const lastUpdateRef = useRef(0);

  // ============ 合并逻辑 (节流更新 UI) ============
  useEffect(() => {
    if (subagents.size === 0) return;

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
        messagesCacheRef.current.set(toolCallId, [...incoming]);
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
  }, [isLoading, subagents]);

  // Ensure UI is updated when loading finishes
  useEffect(() => {
    if (!isLoading && pendingWriteRef.current) {
      setSubagentMessagesMap(new Map(messagesCacheRef.current));
    }
  }, [isLoading]);

  // ============ IndexedDB (保持原有逻辑) ============
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
    async (messagesMap: Map<string, Message[]>) => {
      if (!threadId || !dbRef.current || messagesMap.size === 0) return;

      let transaction: IDBTransaction | null = null;
      try {
        transaction = dbRef.current.transaction([STORE_NAME], "readwrite");
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
        // Wait for transaction to complete
        await new Promise<void>((resolve, reject) => {
          transaction!.oncomplete = () => resolve();
          transaction!.onerror = () => reject(transaction!.error);
        });
      } catch (error) {
        console.error("Failed to batch save subagent messages:", error);
      } finally {
        // Transaction will auto-close, but ensure null check for TypeScript
        transaction = null;
      }
    },
    [threadId]
  );

  const loadSubagentMessages = useCallback(async (): Promise<Map<string, Message[]>> => {
    if (!threadId || !dbReadyPromiseRef.current) return new Map();
    const db = await dbReadyPromiseRef.current;
    if (!db) return new Map();

    let transaction: IDBTransaction | null = null;
    try {
      transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index("threadId");
      const result = await new Promise<PersistedSubagentMessage[]>((resolve, reject) => {
        const request = index.getAll(threadId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      const subagentMap = new Map<string, Message[]>();
      result.sort((a, b) => (a.timestamp - b.timestamp) || (a.index - b.index));
      result.forEach(pm => {
        if (!subagentMap.has(pm.toolCallId)) subagentMap.set(pm.toolCallId, []);
        subagentMap.get(pm.toolCallId)!.push(pm.message);
      });
      return subagentMap;
    } catch {
      return new Map();
    } finally {
      // Ensure transaction is closed
      transaction = null;
    }
  }, [threadId]);

  useEffect(() => {
    if (!threadId) {
      messagesCacheRef.current = new Map();
      setSubagentMessagesMap(new Map());
      return;
    }
    loadSubagentMessages().then(map => {
      messagesCacheRef.current = map;
      setSubagentMessagesMap(new Map(map));
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
    subagentMessagesMap,
  }), [subagentMessagesMap]);
}
