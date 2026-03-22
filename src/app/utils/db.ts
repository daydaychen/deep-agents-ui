import type { Message } from "@langchain/langgraph-sdk";

export const DB_NAME = "deep-agents-ui";
export const DB_VERSION = 3;
export const STORE_NAME = "subagent_messages";

export interface PersistedSubagentMessage {
  threadId: string;
  messageId: string;
  toolCallId: string;
  message: Message;
  timestamp: number;
  index: number;
}

// Singleton connection — lazily opened on first use, cached for app lifetime.
// Follows the config.ts module-level cache pattern.
let connectionPromise: Promise<IDBDatabase> | null = null;

/**
 * Get (or lazily open) the shared IndexedDB connection.
 * Multiple concurrent callers all await the same promise — no duplicate opens.
 */
export function getConnection(): Promise<IDBDatabase> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available in SSR"));
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      connectionPromise = null;
      reject(request.error);
    };

    request.onsuccess = () => {
      const db = request.result;

      // If another tab upgrades the DB, close and invalidate so the next
      // getConnection() call reopens with the new version.
      db.onversionchange = () => {
        db.close();
        connectionPromise = null;
      };

      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (db.objectStoreNames.contains(STORE_NAME)) {
        db.deleteObjectStore(STORE_NAME);
      }
      const objectStore = db.createObjectStore(STORE_NAME, {
        keyPath: ["threadId", "messageId"],
      });
      objectStore.createIndex("threadId", "threadId", { unique: false });
      objectStore.createIndex("toolCallId", ["threadId", "toolCallId"], {
        unique: false,
      });
      objectStore.createIndex("timestamp", "timestamp", { unique: false });
    };
  });

  return connectionPromise;
}

/**
 * Load all persisted subagent messages for a thread, grouped by toolCallId.
 */
export async function loadThreadMessages(threadId: string): Promise<Map<string, Message[]>> {
  try {
    const db = await getConnection();
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index("threadId");

    const result = await new Promise<PersistedSubagentMessage[]>((resolve, reject) => {
      const request = index.getAll(threadId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const subagentMap = new Map<string, Message[]>();
    const sortedResult = result.toSorted((a, b) => a.timestamp - b.timestamp || a.index - b.index);
    for (const pm of sortedResult) {
      if (!subagentMap.has(pm.toolCallId)) {
        subagentMap.set(pm.toolCallId, []);
      }
      // biome-ignore lint/style/noNonNullAssertion: key guaranteed by has() check above
      subagentMap.get(pm.toolCallId)!.push(pm.message);
    }
    return subagentMap;
  } catch (error) {
    console.error("Failed to load subagent messages:", error);
    return new Map();
  }
}

/**
 * Batch save subagent messages for a thread.
 */
export async function saveThreadMessages(
  threadId: string,
  messagesMap: Map<string, Message[]>,
): Promise<void> {
  if (messagesMap.size === 0) return;

  const now = Date.now();
  const records: PersistedSubagentMessage[] = [];

  messagesMap.forEach((msgs, toolCallId) => {
    for (let idx = 0; idx < msgs.length; idx++) {
      const message = msgs[idx];
      if (!message.id) continue;
      records.push({
        threadId,
        messageId: message.id,
        toolCallId,
        message,
        timestamp: now,
        index: idx,
      });
    }
  });

  if (records.length === 0) return;

  try {
    const db = await getConnection();
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    for (let i = 0; i < records.length; i++) {
      store.put(records[i]);
    }

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error("Failed to batch save subagent messages:", error);
  }
}

/**
 * Delete all subagent messages associated with a specific thread.
 */
export async function deleteThreadData(threadId: string): Promise<void> {
  const db = await getConnection();
  const transaction = db.transaction([STORE_NAME], "readwrite");
  const store = transaction.objectStore(STORE_NAME);
  const index = store.index("threadId");

  const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
    const request = index.getAllKeys(threadId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  if (keys.length === 0) return;

  await new Promise<void>((resolve, reject) => {
    let deletedCount = 0;
    for (const key of keys) {
      const deleteRequest = store.delete(key);
      deleteRequest.onsuccess = () => {
        deletedCount++;
        if (deletedCount === keys.length) {
          resolve();
        }
      };
      deleteRequest.onerror = () => reject(deleteRequest.error);
    }
  });
}
