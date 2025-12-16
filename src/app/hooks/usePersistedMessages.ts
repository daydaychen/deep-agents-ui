"use client";

import { Message } from "@langchain/langgraph-sdk";
import { useCallback, useEffect, useRef, useState } from "react";

const DB_NAME = "deep-agents-ui";
const DB_VERSION = 1;
const STORE_NAME = "messages";

interface PersistedMessage {
  threadId: string;
  messageId: string;
  message: Message;
  timestamp: number;
  index: number; // 添加索引字段以保持顺序
}

type SyncStatus = "idle" | "syncing" | "synced";

/**
 * Custom hook to persist messages to IndexedDB
 * This ensures streaming messages (including subagent messages and tool calls)
 * are not lost when interrupts trigger history refetch
 *
 * @param threadId - Current thread ID (null means no persistence)
 * @param streamMessages - Messages from the stream (server source of truth)
 * @returns Merged messages, cache-only message IDs, and sync status
 */
export function usePersistedMessages(
  threadId: string | null,
  streamMessages: Message[]
) {
  const dbRef = useRef<IDBDatabase | null>(null);
  const dbReadyPromiseRef = useRef<Promise<IDBDatabase | null> | null>(null);
  const [mergedMessages, setMergedMessages] = useState<Message[]>([]);
  const [cacheOnlyMessageIds, setCacheOnlyMessageIds] = useState<Set<string>>(
    new Set()
  );
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const hasCacheLoadedRef = useRef(false); // Track if cache was ever loaded
  const isInitialLoadRef = useRef(true);
  const lastStreamMessagesRef = useRef<Message[]>([]);

  // Initialize IndexedDB
  useEffect(() => {
    if (!threadId) {
      dbReadyPromiseRef.current = null;
      return;
    }

    // Create a promise that resolves when DB is ready
    const openDB = (): Promise<IDBDatabase> => {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const objectStore = db.createObjectStore(STORE_NAME, {
              keyPath: ["threadId", "messageId"],
            });
            objectStore.createIndex("threadId", "threadId", { unique: false });
            objectStore.createIndex("timestamp", "timestamp", {
              unique: false,
            });
          }
        };
      });
    };

    const dbPromise = openDB()
      .then((db) => {
        dbRef.current = db;
        return db;
      })
      .catch((error) => {
        console.error("Failed to open IndexedDB:", error);
        return null;
      });

    dbReadyPromiseRef.current = dbPromise;

    return () => {
      if (dbRef.current) {
        dbRef.current.close();
        dbRef.current = null;
      }
      dbReadyPromiseRef.current = null;
    };
  }, [threadId]);

  // Save messages to IndexedDB
  const saveMessages = useCallback(
    async (messages: Message[]) => {
      if (!threadId || !dbRef.current) return;

      try {
        const transaction = dbRef.current.transaction(
          [STORE_NAME],
          "readwrite"
        );
        const store = transaction.objectStore(STORE_NAME);
        const now = Date.now();

        for (let i = 0; i < messages.length; i++) {
          const message = messages[i];
          if (!message.id) continue;

          const persistedMessage: PersistedMessage = {
            threadId,
            messageId: message.id,
            message,
            timestamp: now,
            index: i, // 保存消息在数组中的索引
          };

          store.put(persistedMessage);
        }

        await new Promise<void>((resolve, reject) => {
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
        });
      } catch (error) {
        console.error("Failed to save messages to IndexedDB:", error);
      }
    },
    [threadId]
  );

  // Load messages from IndexedDB
  const loadMessages = useCallback(async (): Promise<Message[]> => {
    if (!threadId) return [];

    // Wait for DB to be ready if it's still initializing
    if (dbReadyPromiseRef.current) {
      await dbReadyPromiseRef.current;
    }

    if (!dbRef.current) return [];

    try {
      const transaction = dbRef.current.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index("threadId");
      const request = index.getAll(threadId);

      const result = await new Promise<PersistedMessage[]>(
        (resolve, reject) => {
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        }
      );

      // 先按时间戳排序，再按索引排序以保持原始顺序
      result.sort((a, b) => {
        if (a.timestamp !== b.timestamp) {
          return a.timestamp - b.timestamp;
        }
        // 如果索引存在则使用索引，否则视为相等
        const indexA = a.index ?? 0;
        const indexB = b.index ?? 0;
        return indexA - indexB;
      });
      return result.map((pm) => pm.message);
    } catch (error) {
      console.error("Failed to load messages from IndexedDB:", error);
      return [];
    }
  }, [threadId]);

  // Merge server messages with cached messages
  const mergeWithHistory = (
    serverMessages: Message[],
    cachedMessages: Message[]
  ): { messages: Message[]; cacheOnlyMessageIds: Set<string> } => {
    const serverMessageMap = new Map(
      serverMessages.map((msg) => [msg.id, msg])
    );

    const cacheOnlyIds = new Set<string>();
    const mergedMap = new Map<
      string,
      { message: Message; serverIndex: number; cachedIndex: number }
    >();

    // Add server messages (source of truth)
    serverMessages.forEach((msg, index) => {
      if (msg.id) {
        mergedMap.set(msg.id, {
          message: msg,
          serverIndex: index,
          cachedIndex: -1,
        });
      }
    });

    // Add cache-only messages (not yet in server history)
    cachedMessages.forEach((msg, index) => {
      if (msg.id && !serverMessageMap.has(msg.id)) {
        mergedMap.set(msg.id, {
          message: msg,
          serverIndex: -1,
          cachedIndex: index,
        });
        cacheOnlyIds.add(msg.id);
      }
    });

    // Sort: server messages first, then cache-only messages
    const merged = Array.from(mergedMap.values()).sort((a, b) => {
      if (a.serverIndex >= 0 && b.serverIndex >= 0) {
        return a.serverIndex - b.serverIndex;
      }
      if (a.cachedIndex >= 0 && b.cachedIndex >= 0) {
        return a.cachedIndex - b.cachedIndex;
      }
      if (a.serverIndex >= 0) return -1;
      if (b.serverIndex >= 0) return 1;
      return 0;
    });

    return {
      messages: merged.map((item) => item.message),
      cacheOnlyMessageIds: cacheOnlyIds,
    };
  };

  // Priority 1: Load cache immediately when thread changes
  useEffect(() => {
    if (!threadId) {
      setSyncStatus("idle");
      hasCacheLoadedRef.current = false;
      return;
    }

    const loadCacheImmediately = async () => {
      const cachedMessages = await loadMessages();
      if (cachedMessages.length > 0) {
        // Show cached data immediately
        setMergedMessages(cachedMessages);
        setCacheOnlyMessageIds(
          new Set(
            cachedMessages.map((msg) => msg.id).filter((id) => id != null)
          )
        );
        // Mark as syncing (waiting for server data)
        setSyncStatus("syncing");
        hasCacheLoadedRef.current = true; // Cache was loaded
      }
    };

    loadCacheImmediately();
  }, [loadMessages, threadId]);

  // Priority 2: Sync with server data when available
  useEffect(() => {
    // No persistence without threadId - skip state updates
    if (!threadId) {
      return;
    }

    // Skip if messages haven't changed
    if (
      lastStreamMessagesRef.current === streamMessages ||
      (lastStreamMessagesRef.current.length === streamMessages.length &&
        lastStreamMessagesRef.current.length > 0 &&
        lastStreamMessagesRef.current[
          lastStreamMessagesRef.current.length - 1
        ] === streamMessages[streamMessages.length - 1])
    ) {
      return;
    }

    const syncMessages = async () => {
      lastStreamMessagesRef.current = streamMessages;

      // Server data arrived
      if (streamMessages.length > 0) {
        const cachedMessages = await loadMessages();
        const streamSnapshot = [...streamMessages];
        const { messages, cacheOnlyMessageIds: cacheIds } = mergeWithHistory(
          streamSnapshot,
          cachedMessages
        );

        // Check if data is consistent with current UI
        const isDataConsistent =
          mergedMessages.length === messages.length &&
          mergedMessages.every((msg, i) => msg.id === messages[i].id);

        if (!isDataConsistent) {
          // Data changed - update UI
          setMergedMessages(messages);
          setCacheOnlyMessageIds(cacheIds);
        } else {
          // Data consistent - only update cache-only IDs if needed
          const idsChanged =
            cacheOnlyMessageIds.size !== cacheIds.size ||
            Array.from(cacheIds).some((id) => !cacheOnlyMessageIds.has(id));
          if (idsChanged) {
            setCacheOnlyMessageIds(cacheIds);
          }
        }

        // Save to cache for next time
        await saveMessages(streamSnapshot);

        // Only mark as synced if cache was previously loaded
        if (hasCacheLoadedRef.current) {
          setSyncStatus("synced");
        }
        isInitialLoadRef.current = false;
      }
    };

    syncMessages();
  }, [
    streamMessages,
    threadId,
    cacheOnlyMessageIds,
    mergedMessages,
    loadMessages,
    saveMessages,
  ]);

  // Reset on thread change
  useEffect(() => {
    isInitialLoadRef.current = true;
    hasCacheLoadedRef.current = false;
    lastStreamMessagesRef.current = [];
    setMergedMessages([]);
    setCacheOnlyMessageIds(new Set());
    setSyncStatus("idle");
  }, [threadId]);

  return {
    // When no threadId, return streamMessages directly; otherwise use merged state
    messages: !threadId
      ? streamMessages
      : mergedMessages.length > 0
      ? mergedMessages
      : streamMessages,
    cacheOnlyMessageIds: !threadId ? new Set() : cacheOnlyMessageIds,
    syncStatus: !threadId ? "idle" : syncStatus,
  };
}
