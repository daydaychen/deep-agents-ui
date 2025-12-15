"use client";

import { useEffect, useRef, useCallback } from "react";
import { Message } from "@langchain/langgraph-sdk";

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
 */
export function usePersistedMessages(threadId: string | null) {
  const dbRef = useRef<IDBDatabase | null>(null);

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
  const saveMessages = useCallback(
    async (messages: Message[]) => {
      if (!threadId || !dbRef.current) return;

      try {
        const transaction = dbRef.current.transaction(
          [STORE_NAME],
          "readwrite"
        );
        const store = transaction.objectStore(STORE_NAME);

        for (const message of messages) {
          if (!message.id) {
            console.warn("Message without ID skipped during persistence:", message);
            continue;
          }

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
    },
    [threadId]
  );

  // Load messages from IndexedDB
  const loadMessages = useCallback(async (): Promise<Message[]> => {
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

      // Sort by timestamp to maintain order
      result.sort((a, b) => a.timestamp - b.timestamp);
      return result.map((pm) => pm.message);
    } catch (error) {
      console.error("Failed to load messages from IndexedDB:", error);
      return [];
    }
  }, [threadId]);

  // Clear messages for a thread
  const clearMessages = useCallback(async () => {
    if (!threadId || !dbRef.current) return;

    try {
      const transaction = dbRef.current.transaction(
        [STORE_NAME],
        "readwrite"
      );
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index("threadId");
      const request = index.openCursor(IDBKeyRange.only(threadId));

      await new Promise<void>((resolve, reject) => {
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          }
        };
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.error("Failed to clear messages from IndexedDB:", error);
    }
  }, [threadId]);

  // Merge server history with local cached messages
  const mergeWithHistory = useCallback(
    (
      serverMessages: Message[],
      cachedMessages: Message[]
    ): { messages: Message[]; cacheOnlyMessageIds: Set<string> } => {
      // Create a map of server messages by ID for quick lookup
      const serverMessageMap = new Map(
        serverMessages.map((msg) => [msg.id, msg])
      );

      // Track which messages are cache-only (not in server history)
      const cacheOnlyMessageIds = new Set<string>();

      // Create a map to track unique messages with their source and order
      const mergedMap = new Map<
        string,
        { message: Message; serverIndex: number; cachedIndex: number }
      >();

      // Add all server messages first (they are the source of truth)
      serverMessages.forEach((msg, index) => {
        if (msg.id) {
          mergedMap.set(msg.id, {
            message: msg,
            serverIndex: index,
            cachedIndex: -1,
          });
        }
      });

      // Add cached messages that are not in server history
      // This preserves streaming messages that haven't been saved to backend
      cachedMessages.forEach((msg, index) => {
        if (msg.id && !serverMessageMap.has(msg.id)) {
          mergedMap.set(msg.id, {
            message: msg,
            serverIndex: -1,
            cachedIndex: index,
          });
          // Track this as a cache-only message
          cacheOnlyMessageIds.add(msg.id);
        }
      });

      // Convert back to array and sort by original order
      // Server messages maintain their order, cached messages are inserted at the end
      const merged = Array.from(mergedMap.values()).sort((a, b) => {
        // If both are from server, maintain server order
        if (a.serverIndex >= 0 && b.serverIndex >= 0) {
          return a.serverIndex - b.serverIndex;
        }
        // If both are cached only, maintain cached order
        if (a.cachedIndex >= 0 && b.cachedIndex >= 0) {
          return a.cachedIndex - b.cachedIndex;
        }
        // Server messages come first
        if (a.serverIndex >= 0) return -1;
        if (b.serverIndex >= 0) return 1;
        return 0;
      });

      return {
        messages: merged.map((item) => item.message),
        cacheOnlyMessageIds,
      };
    },
    []
  );

  return {
    saveMessages,
    loadMessages,
    clearMessages,
    mergeWithHistory,
  };
}
