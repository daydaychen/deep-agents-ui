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
    (serverMessages: Message[], cachedMessages: Message[]): Message[] => {
      // Create a map of server messages by ID for quick lookup
      const serverMessageMap = new Map(
        serverMessages.map((msg) => [msg.id, msg])
      );

      // Create a map to track unique messages
      const mergedMap = new Map<string, Message>();

      // Add all server messages first (they are the source of truth)
      serverMessages.forEach((msg) => {
        if (msg.id) {
          mergedMap.set(msg.id, msg);
        }
      });

      // Add cached messages that are not in server history
      // This preserves streaming messages that haven't been saved to backend
      cachedMessages.forEach((msg) => {
        if (msg.id && !serverMessageMap.has(msg.id)) {
          mergedMap.set(msg.id, msg);
        }
      });

      // Convert back to array and sort by timestamp/order
      // Note: This is a simplified sort - you may need more sophisticated logic
      // depending on how messages should be ordered
      return Array.from(mergedMap.values());
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
