"use client";

import { Message } from "@langchain/langgraph-sdk";
import type { MessageMetadata } from "@langchain/langgraph-sdk/react";
import { useCallback, useEffect, useRef, useState } from "react";

const DB_NAME = "deep-agents-ui";
const DB_VERSION = 2; // 升级版本以支持 metadata 字段
const STORE_NAME = "messages";

interface PersistedMessage {
  threadId: string;
  messageId: string;
  message: Message;
  metadata: MessageMetadata<any> | null; // 新增：缓存 metadata（特别是 streamMetadata.tool_call_id）
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
 * @param isLoading - Whether the stream is currently loading (true during streaming)
 * @param getMessagesMetadata - Function to get metadata for a message (needed to identify subagent messages)
 * @returns Merged messages, metadata map, cache-only message IDs, and sync status
 */
export function usePersistedMessages(
  threadId: string | null,
  streamMessages: Message[],
  isLoading: boolean,
  getMessagesMetadata?: (
    message: Message,
    index?: number
  ) => MessageMetadata<any> | undefined
) {
  const dbRef = useRef<IDBDatabase | null>(null);
  const dbReadyPromiseRef = useRef<Promise<IDBDatabase | null> | null>(null);
  const [mergedMessages, setMergedMessages] = useState<Message[]>([]);
  const [metadataMap, setMetadataMap] = useState<
    Map<string, MessageMetadata<any> | null>
  >(new Map());
  const [cacheOnlyMessageIds, setCacheOnlyMessageIds] = useState<Set<string>>(
    new Set()
  );
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const hasCacheLoadedRef = useRef(false); // Track if cache was ever loaded
  const isInitialLoadRef = useRef(true);
  const lastStreamMessagesRef = useRef<Message[]>([]);
  const previousIsLoadingRef = useRef<boolean>(isLoading); // Track previous isLoading state
  const pendingSaveMessagesRef = useRef<Message[]>([]); // Track messages to save when stream ends

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

          // 获取并保存 metadata，特别是 streamMetadata.tool_call_id
          const metadata = getMessagesMetadata
            ? getMessagesMetadata(message, i)
            : null;

          const persistedMessage: PersistedMessage = {
            threadId,
            messageId: message.id,
            message,
            metadata: metadata || null, // 保存 metadata
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
    [threadId, getMessagesMetadata]
  );

  // Load messages from IndexedDB
  const loadMessages = useCallback(async (): Promise<{
    messages: Message[];
    metadataMap: Map<string, MessageMetadata<any> | null>;
  }> => {
    if (!threadId) return { messages: [], metadataMap: new Map() };

    // Wait for DB to be ready if it's still initializing
    if (dbReadyPromiseRef.current) {
      await dbReadyPromiseRef.current;
    }

    if (!dbRef.current) return { messages: [], metadataMap: new Map() };

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

      // 构建 metadata map
      const loadedMetadataMap = new Map<string, MessageMetadata<any> | null>();
      result.forEach((pm) => {
        if (pm.message.id && pm.metadata) {
          loadedMetadataMap.set(pm.message.id, pm.metadata);
        }
      });

      return {
        messages: result.map((pm) => pm.message),
        metadataMap: loadedMetadataMap,
      };
    } catch (error) {
      console.error("Failed to load messages from IndexedDB:", error);
      return { messages: [], metadataMap: new Map() };
    }
  }, [threadId]);

  const mergeWithHistory = useCallback(
    (
      serverMessages: Message[],
      cachedMessages: Message[],
      cachedMetadataMap: Map<string, MessageMetadata<any> | null>
    ): {
      messages: Message[];
      metadataMap: Map<string, MessageMetadata<any> | null>;
      cacheOnlyMessageIds: Set<string>;
    } => {
      // Server messages are the source of truth - they already contain only the current branch
      const serverMessageIds = new Set(
        serverMessages.map((msg) => msg.id).filter((id) => id != null)
      );

      const cacheOnlyIds = new Set<string>();
      const mergedMetadataMap = new Map<string, MessageMetadata<any> | null>();

      // Get the checkpoint of the LAST server message - this is the current branch tip
      // Only cache messages that are direct continuations of this tip should be merged
      let lastServerCheckpointId: string | null = null;
      if (getMessagesMetadata && serverMessages.length > 0) {
        const lastMsg = serverMessages[serverMessages.length - 1];
        const lastMetadata = getMessagesMetadata(
          lastMsg,
          serverMessages.length - 1
        );
        lastServerCheckpointId =
          lastMetadata?.firstSeenState?.checkpoint?.checkpoint_id || null;
      }

      // Find cache-only messages that are direct continuations of the current branch tip
      const cacheOnlyMessages: Message[] = [];
      cachedMessages.forEach((msg) => {
        if (msg.id && !serverMessageIds.has(msg.id)) {
          const cachedMetadata = cachedMetadataMap.get(msg.id);
          const cachedParentCheckpoint =
            cachedMetadata?.firstSeenState?.parent_checkpoint?.checkpoint_id;

          // Only add cache message if:
          // 1. We have a last server checkpoint to compare against
          // 2. The cache message's PARENT checkpoint equals the last server checkpoint
          //    (meaning this message is a direct child of the current branch tip)
          if (
            lastServerCheckpointId &&
            cachedParentCheckpoint === lastServerCheckpointId
          ) {
            cacheOnlyMessages.push(msg);
            cacheOnlyIds.add(msg.id);

            if (cachedMetadata) {
              mergedMetadataMap.set(msg.id, cachedMetadata);
            }
          }
          // If no server messages yet, don't add any cache messages
          // (cache will be shown via the initial load effect)
        }
      });

      // Return server messages followed by cache-only messages
      return {
        messages: [...serverMessages, ...cacheOnlyMessages],
        metadataMap: mergedMetadataMap,
        cacheOnlyMessageIds: cacheOnlyIds,
      };
    },
    [getMessagesMetadata]
  );

  // Priority 1: Load cache immediately when thread changes
  // NOTE: We load ALL cached messages initially, but when server data arrives,
  // it will be filtered to only show current branch messages
  useEffect(() => {
    if (!threadId) {
      setSyncStatus("idle");
      hasCacheLoadedRef.current = false;
      return;
    }

    const loadCacheImmediately = async () => {
      const { messages: cachedMessages, metadataMap: cachedMetadataMap } =
        await loadMessages();
      if (cachedMessages.length > 0) {
        // Show cached data immediately (will be replaced by server data when available)
        // Note: This may show all messages temporarily until server syncs and filters to current branch
        setMergedMessages(cachedMessages);
        setMetadataMap(cachedMetadataMap);
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
        if (isLoading) {
          // During streaming, show stream messages directly
          setMergedMessages(streamMessages);
          setCacheOnlyMessageIds(new Set()); // No cache-only messages during streaming
          // Clear metadata map during streaming (will be rebuilt when stream ends)
          setMetadataMap(new Map());
          pendingSaveMessagesRef.current = streamMessages;
          return;
        }

        // Only merge with cache when stream is idle (isLoading === false)
        const { messages: cachedMessages, metadataMap: cachedMetadataMap } =
          await loadMessages();
        const streamSnapshot = [...streamMessages];
        const {
          messages,
          metadataMap: mergedMetadata,
          cacheOnlyMessageIds: cacheIds,
        } = mergeWithHistory(streamSnapshot, cachedMessages, cachedMetadataMap);

        // Check if data is consistent with current UI
        const isDataConsistent =
          mergedMessages.length === messages.length &&
          mergedMessages.every((msg, i) => msg.id === messages[i].id);

        if (!isDataConsistent) {
          // Data changed - update UI
          setMergedMessages(messages);
          setMetadataMap(mergedMetadata);
          setCacheOnlyMessageIds(cacheIds);
        } else {
          // Data consistent - only update cache-only IDs and metadata if needed
          const idsChanged =
            cacheOnlyMessageIds.size !== cacheIds.size ||
            Array.from(cacheIds).some((id) => !cacheOnlyMessageIds.has(id));
          if (idsChanged) {
            setCacheOnlyMessageIds(cacheIds);
          }
          // Update metadata map if it changed
          if (mergedMetadata.size !== metadataMap.size) {
            setMetadataMap(mergedMetadata);
          }
        }

        // Store messages for saving when stream ends (instead of saving immediately)
        pendingSaveMessagesRef.current = streamSnapshot;

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
    metadataMap,
    loadMessages,
    isLoading,
    mergeWithHistory,
  ]);

  // Save to IndexedDB when stream ends (isLoading changes from true to false)
  useEffect(() => {
    const wasLoading = previousIsLoadingRef.current;
    const isNowIdle = !isLoading;

    // Detect transition from loading to idle
    if (wasLoading && isNowIdle && threadId) {
      // Stream just finished - save pending messages
      const messagesToSave = pendingSaveMessagesRef.current;
      if (messagesToSave.length > 0) {
        saveMessages(messagesToSave);
      }
    }

    // Update previous state
    previousIsLoadingRef.current = isLoading;
  }, [isLoading, threadId, saveMessages]);

  // Reset on thread change
  useEffect(() => {
    isInitialLoadRef.current = true;
    hasCacheLoadedRef.current = false;
    lastStreamMessagesRef.current = [];
    previousIsLoadingRef.current = isLoading;
    pendingSaveMessagesRef.current = [];
    setMergedMessages([]);
    setMetadataMap(new Map());
    setCacheOnlyMessageIds(new Set());
    setSyncStatus("idle");
  }, [threadId, isLoading]);

  return {
    // IMPORTANT: stream.messages already filters to show only the current branch
    // So we should prioritize streamMessages when available, and only use cache for supplementary data
    // When no threadId, return streamMessages directly
    // When streamMessages is available, use merged state (which prioritizes server data)
    // When only cache is available (during initial load), show cache temporarily
    messages: !threadId
      ? streamMessages
      : streamMessages.length > 0
      ? mergedMessages.length > 0
        ? mergedMessages
        : streamMessages
      : mergedMessages, // Fallback to cache when no stream data yet
    metadataMap: !threadId ? new Map() : metadataMap,
    cacheOnlyMessageIds: !threadId ? new Set() : cacheOnlyMessageIds,
    syncStatus: !threadId ? "idle" : syncStatus,
  };
}
