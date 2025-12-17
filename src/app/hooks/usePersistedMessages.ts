"use client";

import { Message } from "@langchain/langgraph-sdk";
import type { MessageMetadata } from "@langchain/langgraph-sdk/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const DB_NAME = "deep-agents-ui";
const DB_VERSION = 3;
const STORE_NAME = "subagent_messages";

// 批量写入的间隔时间（毫秒）
const BATCH_WRITE_INTERVAL = 500;

interface PersistedSubagentMessage {
  threadId: string;
  messageId: string;
  toolCallId: string;
  message: Message;
  timestamp: number;
  index: number;
}

// 待写入的消息
interface PendingMessage {
  message: Message;
  toolCallId: string;
  index: number;
}

/**
 * Custom hook to split messages and persist subagent messages to IndexedDB
 *
 * 功能：
 * 1. 拆分 streamMessages 为 mainMessages 和 subagentMessagesMap
 * 2. 缓存 subagent 消息到 IndexedDB，用于页面刷新后恢复
 * 3. 合并 stream 中的 subagent 消息和缓存的消息
 *
 * 性能优化：
 * - 使用 useMemo 计算拆分结果，只在 streamMessages 变化时重新计算
 * - 异步批量写入 IndexedDB，不阻塞 UI
 * - 使用 ref 跟踪已处理的消息，避免重复处理
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

  // 从 IndexedDB 加载的缓存消息
  const [cachedMessages, setCachedMessages] = useState<Map<string, Message[]>>(
    new Map()
  );

  // 性能优化：使用 ref 跟踪状态
  const hasCacheLoadedRef = useRef(false);
  const lastProcessedMessageIdsRef = useRef<Set<string>>(new Set());
  const previousIsLoadingRef = useRef<boolean>(isLoading);
  const knownToolCallIdsRef = useRef<Set<string>>(new Set());

  // 批量写入相关
  const pendingMessagesRef = useRef<PendingMessage[]>([]);
  const batchWriteTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ============ 消息拆分逻辑 (useMemo，同步计算) ============

  // 拆分 streamMessages 为 mainMessages 和 streamSubagentMap
  const { mainMessages, streamSubagentMap, subagentMessageIds } =
    useMemo(() => {
      const main: Message[] = [];
      const subagentMap = new Map<string, Message[]>();
      const subagentIds = new Set<string>();

      if (!getMessagesMetadata) {
        return {
          mainMessages: streamMessages,
          streamSubagentMap: subagentMap,
          subagentMessageIds: subagentIds,
        };
      }

      streamMessages.forEach((message, index) => {
        const metadata = getMessagesMetadata(message, index);
        const toolCallId = metadata?.streamMetadata?.tool_call_id as
          | string
          | undefined;

        if (toolCallId) {
          // subagent 消息
          if (!subagentMap.has(toolCallId)) {
            subagentMap.set(toolCallId, []);
          }
          subagentMap.get(toolCallId)!.push(message);
          if (message.id) {
            subagentIds.add(message.id);
          }
        } else {
          // 主消息
          main.push(message);
        }
      });

      return {
        mainMessages: main,
        streamSubagentMap: subagentMap,
        subagentMessageIds: subagentIds,
      };
    }, [streamMessages, getMessagesMetadata]);

  // 合并 stream 中的 subagent 消息和缓存的消息
  const subagentMessagesMap = useMemo(() => {
    const merged = new Map<string, Message[]>();

    // 先添加缓存的消息
    cachedMessages.forEach((msgs, toolCallId) => {
      merged.set(toolCallId, [...msgs]);
    });

    // 再添加 stream 中的消息（去重）
    streamSubagentMap.forEach((msgs, toolCallId) => {
      const existing = merged.get(toolCallId) || [];
      const existingIds = new Set(existing.map((m) => m.id));
      const newMsgs = msgs.filter((m) => !existingIds.has(m.id));
      if (newMsgs.length > 0 || existing.length === 0) {
        merged.set(toolCallId, [...existing, ...newMsgs]);
      }
    });

    return merged;
  }, [cachedMessages, streamSubagentMap]);

  // ============ IndexedDB 操作 (异步，不阻塞 UI) ============

  // Initialize IndexedDB
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
          if (db.objectStoreNames.contains("messages")) {
            db.deleteObjectStore("messages");
          }
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const objectStore = db.createObjectStore(STORE_NAME, {
              keyPath: ["threadId", "messageId"],
            });
            objectStore.createIndex("threadId", "threadId", { unique: false });
            objectStore.createIndex("toolCallId", ["threadId", "toolCallId"], {
              unique: false,
            });
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

  // 批量保存消息到 IndexedDB
  const batchSaveToIndexedDB = useCallback(
    async (messages: PendingMessage[]) => {
      if (!threadId || !dbRef.current || messages.length === 0) return;

      try {
        const transaction = dbRef.current.transaction(
          [STORE_NAME],
          "readwrite"
        );
        const store = transaction.objectStore(STORE_NAME);
        const now = Date.now();

        for (const { message, toolCallId, index } of messages) {
          if (!message.id) continue;

          const persistedMessage: PersistedSubagentMessage = {
            threadId,
            messageId: message.id,
            toolCallId,
            message,
            timestamp: now,
            index,
          };

          store.put(persistedMessage);
        }

        await new Promise<void>((resolve, reject) => {
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
        });
      } catch (error) {
        console.error("Failed to batch save subagent messages:", error);
      }
    },
    [threadId]
  );

  // 加载 subagent 消息
  const loadSubagentMessages = useCallback(async (): Promise<
    Map<string, Message[]>
  > => {
    if (!threadId) return new Map();

    if (dbReadyPromiseRef.current) {
      await dbReadyPromiseRef.current;
    }

    if (!dbRef.current) return new Map();

    try {
      const transaction = dbRef.current.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index("threadId");
      const request = index.getAll(threadId);

      const result = await new Promise<PersistedSubagentMessage[]>(
        (resolve, reject) => {
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        }
      );

      const subagentMap = new Map<string, Message[]>();

      result.sort((a, b) => {
        if (a.toolCallId !== b.toolCallId) {
          return a.toolCallId.localeCompare(b.toolCallId);
        }
        if (a.timestamp !== b.timestamp) {
          return a.timestamp - b.timestamp;
        }
        return (a.index ?? 0) - (b.index ?? 0);
      });

      result.forEach((pm) => {
        if (!subagentMap.has(pm.toolCallId)) {
          subagentMap.set(pm.toolCallId, []);
        }
        subagentMap.get(pm.toolCallId)!.push(pm.message);
        knownToolCallIdsRef.current.add(pm.toolCallId);
      });

      return subagentMap;
    } catch (error) {
      console.error("Failed to load subagent messages from IndexedDB:", error);
      return new Map();
    }
  }, [threadId]);

  // 清除指定 tool_call_id 的缓存
  const clearSubagentCache = useCallback(
    async (toolCallIds: string[]) => {
      if (!threadId || !dbRef.current || toolCallIds.length === 0) return;

      try {
        const transaction = dbRef.current.transaction(
          [STORE_NAME],
          "readwrite"
        );
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index("threadId");
        const request = index.getAll(threadId);

        const result = await new Promise<PersistedSubagentMessage[]>(
          (resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          }
        );

        const toolCallIdSet = new Set(toolCallIds);
        for (const pm of result) {
          if (toolCallIdSet.has(pm.toolCallId)) {
            store.delete([threadId, pm.messageId]);
          }
        }

        await new Promise<void>((resolve, reject) => {
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
        });

        toolCallIds.forEach((id) => knownToolCallIdsRef.current.delete(id));
      } catch (error) {
        console.error("Failed to clear subagent cache:", error);
      }
    },
    [threadId]
  );

  // ============ 缓存管理逻辑 ============

  // 初始加载缓存
  useEffect(() => {
    if (!threadId) {
      hasCacheLoadedRef.current = false;
      setCachedMessages(new Map());
      return;
    }

    const loadCache = async () => {
      const subagentMap = await loadSubagentMessages();
      if (subagentMap.size > 0) {
        setCachedMessages(subagentMap);
        hasCacheLoadedRef.current = true;
      }
    };

    loadCache();
  }, [threadId, loadSubagentMessages]);

  // 在 streaming 过程中收集新的 subagent 消息并异步写入缓存
  useEffect(() => {
    if (!threadId || !isLoading || !getMessagesMetadata) return;

    let hasNewMessages = false;

    streamSubagentMap.forEach((msgs, toolCallId) => {
      msgs.forEach((message, idx) => {
        if (message.id && !lastProcessedMessageIdsRef.current.has(message.id)) {
          lastProcessedMessageIdsRef.current.add(message.id);
          knownToolCallIdsRef.current.add(toolCallId);
          hasNewMessages = true;

          pendingMessagesRef.current.push({
            message,
            toolCallId,
            index: idx,
          });
        }
      });
    });

    // 启动批量写入定时器
    if (hasNewMessages && !batchWriteTimerRef.current) {
      batchWriteTimerRef.current = setTimeout(() => {
        const pending = pendingMessagesRef.current;
        if (pending.length > 0) {
          batchSaveToIndexedDB(pending);
          pendingMessagesRef.current = [];
        }
        batchWriteTimerRef.current = null;
      }, BATCH_WRITE_INTERVAL);
    }
  }, [
    threadId,
    streamSubagentMap,
    isLoading,
    getMessagesMetadata,
    batchSaveToIndexedDB,
  ]);

  // 当 stream 结束后，刷新待写入的消息并清理缓存
  useEffect(() => {
    const wasLoading = previousIsLoadingRef.current;
    const isNowIdle = !isLoading;

    if (wasLoading && isNowIdle && threadId) {
      // 清除定时器并立即写入
      if (batchWriteTimerRef.current) {
        clearTimeout(batchWriteTimerRef.current);
        batchWriteTimerRef.current = null;
      }

      const pending = pendingMessagesRef.current;
      if (pending.length > 0) {
        batchSaveToIndexedDB(pending);
        pendingMessagesRef.current = [];
      }

      // 清理缓存（stream 结束后，server 已返回完整数据）
      if (knownToolCallIdsRef.current.size > 0) {
        const toolCallIds = Array.from(knownToolCallIdsRef.current);
        clearSubagentCache(toolCallIds);

        setCachedMessages((prev) => {
          const newMap = new Map(prev);
          toolCallIds.forEach((id) => newMap.delete(id));
          return newMap;
        });
      }
    }

    previousIsLoadingRef.current = isLoading;
  }, [isLoading, threadId, batchSaveToIndexedDB, clearSubagentCache]);

  // Reset on thread change
  useEffect(() => {
    hasCacheLoadedRef.current = false;
    lastProcessedMessageIdsRef.current = new Set();
    knownToolCallIdsRef.current = new Set();
    pendingMessagesRef.current = [];

    if (batchWriteTimerRef.current) {
      clearTimeout(batchWriteTimerRef.current);
      batchWriteTimerRef.current = null;
    }

    setCachedMessages(new Map());
  }, [threadId]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (batchWriteTimerRef.current) {
        clearTimeout(batchWriteTimerRef.current);
      }
    };
  }, []);

  return {
    // 主消息（不包含 subagent 消息）
    mainMessages,
    // 合并后的 subagent 消息 (stream + cache)
    subagentMessagesMap,
    // subagent 消息的 ID 集合（用于过滤）
    subagentMessageIds,
  };
}
