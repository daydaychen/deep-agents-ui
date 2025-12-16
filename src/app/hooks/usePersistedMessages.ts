"use client";

import { Message } from "@langchain/langgraph-sdk";
import { useEffect, useRef, useState } from "react";

const DB_NAME = "deep-agents-ui";
const DB_VERSION = 1;
const STORE_NAME = "messages";

interface PersistedMessage {
  threadId: string;
  messageId: string;
  message: Message;
  timestamp: number;
}

/**
 * Custom hook to persist messages to IndexedDB
 * This ensures streaming messages (including subagent messages and tool calls)
 * are not lost when interrupts trigger history refetch
 *
 * @param threadId - Current thread ID (null means no persistence)
 * @param streamMessages - Messages from the stream (server source of truth)
 * @returns Merged messages and set of cache-only message IDs
 */
export function usePersistedMessages(
  threadId: string | null,
  streamMessages: Message[]
) {
  const dbRef = useRef<IDBDatabase | null>(null);
  const [mergedMessages, setMergedMessages] = useState<Message[]>([]);
  const [cacheOnlyMessageIds, setCacheOnlyMessageIds] = useState<Set<string>>(
    new Set()
  );
  const isInitialLoadRef = useRef(true);
  const lastStreamMessagesRef = useRef<Message[]>([]);

  // Initialize IndexedDB
  useEffect(() => {
    if (!threadId) return;

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

    openDB()
      .then((db) => {
        dbRef.current = db;
      })
      .catch((error) => {
        console.error("Failed to open IndexedDB:", error);
      });

    return () => {
      if (dbRef.current) {
        dbRef.current.close();
        dbRef.current = null;
      }
    };
  }, [threadId]);

  // Save messages to IndexedDB
  const saveMessages = async (messages: Message[]) => {
    if (!threadId || !dbRef.current) return;

    try {
      const transaction = dbRef.current.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      for (const message of messages) {
        if (!message.id) continue;

        const persistedMessage: PersistedMessage = {
          threadId,
          messageId: message.id,
          message,
          timestamp: Date.now(),
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
  };

  // Load messages from IndexedDB
  const loadMessages = async (): Promise<Message[]> => {
    if (!threadId || !dbRef.current) return [];

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

      result.sort((a, b) => a.timestamp - b.timestamp);
      return result.map((pm) => pm.message);
    } catch (error) {
      console.error("Failed to load messages from IndexedDB:", error);
      return [];
    }
  };

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

  // Auto-sync with stream messages
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
        lastStreamMessagesRef.current[lastStreamMessagesRef.current.length - 1] ===
          streamMessages[streamMessages.length - 1])
    ) {
      return;
    }

    const syncMessages = async () => {
      lastStreamMessagesRef.current = streamMessages;

      // Initial load: check cache first
      if (isInitialLoadRef.current) {
        const cachedMessages = await loadMessages();
        const streamSnapshot = [...streamMessages];

        if (cachedMessages.length > 0 && streamSnapshot.length === 0) {
          // Show cached messages while waiting for server
          setMergedMessages(cachedMessages);
          setCacheOnlyMessageIds(
            new Set(cachedMessages.map((msg) => msg.id).filter((id) => id != null))
          );
        } else if (streamSnapshot.length > 0) {
          // Merge and save
          const { messages, cacheOnlyMessageIds: cacheIds } = mergeWithHistory(
            streamSnapshot,
            cachedMessages
          );
          setMergedMessages(messages);
          setCacheOnlyMessageIds(cacheIds);
          await saveMessages(streamSnapshot);
        }
        isInitialLoadRef.current = false;
        return;
      }

      // Subsequent updates: merge and save
      if (streamMessages.length > 0) {
        const cachedMessages = await loadMessages();
        const streamSnapshot = [...streamMessages];
        const { messages, cacheOnlyMessageIds: cacheIds } = mergeWithHistory(
          streamSnapshot,
          cachedMessages
        );
        setMergedMessages(messages);
        setCacheOnlyMessageIds(cacheIds);
        await saveMessages(streamSnapshot);
      }
    };

    syncMessages();
  }, [streamMessages, threadId]);

  // Reset on thread change
  useEffect(() => {
    isInitialLoadRef.current = true;
    lastStreamMessagesRef.current = [];
    setMergedMessages([]);
    setCacheOnlyMessageIds(new Set());
  }, [threadId]);

  return {
    // When no threadId, return streamMessages directly; otherwise use merged state
    messages: !threadId
      ? streamMessages
      : mergedMessages.length > 0
      ? mergedMessages
      : streamMessages,
    cacheOnlyMessageIds: !threadId ? new Set() : cacheOnlyMessageIds,
  };
}
