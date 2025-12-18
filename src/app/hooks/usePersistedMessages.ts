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

/**
 * Custom hook to split messages and persist subagent messages to IndexedDB
 *
 * 缓存逻辑：
 * 1. Thread 打开时：从 IndexedDB 加载缓存 → 显示到 UI
 * 2. 流式过程中：将 stream 数据合并到缓存（更新已有消息内容）→ UI 显示合并后的数据
 * 3. 定期/流结束后：将缓存提交到 IndexedDB
 *
 * 性能优化：
 * - 使用 useMemo 计算拆分结果，只在 streamMessages 变化时重新计算
 * - 异步批量写入 IndexedDB，不阻塞 UI
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

  // 缓存的 subagent 消息（从 IndexedDB 加载 + 流式合并）
  const [cachedMessages, setCachedMessages] = useState<Map<string, Message[]>>(
    new Map()
  );

  // 性能优化：使用 ref 跟踪状态
  const hasCacheLoadedRef = useRef(false);
  const previousIsLoadingRef = useRef<boolean>(isLoading);

  // 批量写入相关
  const batchWriteTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingWriteRef = useRef(false);

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

  // ============ 合并 stream 数据到缓存 ============

  // 流式过程中，将 streamSubagentMap 合并到 cachedMessages
  useEffect(() => {
    if (!isLoading || streamSubagentMap.size === 0) return;

    setCachedMessages((prev) => {
      const newMap = new Map(prev);
      let hasChanges = false;

      streamSubagentMap.forEach((streamMsgs, toolCallId) => {
        const cachedMsgs = prev.get(toolCallId) || [];

        // 合并逻辑：按 messageId 更新或添加
        const mergedMsgs = [...cachedMsgs];
        const cachedIds = new Map(cachedMsgs.map((m, i) => [m.id, i]));

        streamMsgs.forEach((streamMsg) => {
          if (!streamMsg.id) return;

          const existingIndex = cachedIds.get(streamMsg.id);
          if (existingIndex !== undefined) {
            // 更新已有消息（流式内容更新）
            if (mergedMsgs[existingIndex] !== streamMsg) {
              mergedMsgs[existingIndex] = streamMsg;
              hasChanges = true;
            }
          } else {
            // 添加新消息
            mergedMsgs.push(streamMsg);
            hasChanges = true;
          }
        });

        if (hasChanges || !prev.has(toolCallId)) {
          newMap.set(toolCallId, mergedMsgs);
        }
      });

      // 标记需要写入 IndexedDB
      if (hasChanges) {
        pendingWriteRef.current = true;
      }

      return hasChanges ? newMap : prev;
    });
  }, [isLoading, streamSubagentMap]);

  // UI 显示：直接使用 cachedMessages
  // 因为流式数据已经合并到 cachedMessages 中了
  const subagentMessagesMap = cachedMessages;

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
    async (messagesMap: Map<string, Message[]>) => {
      if (!threadId || !dbRef.current || messagesMap.size === 0) return;

      try {
        const transaction = dbRef.current.transaction(
          [STORE_NAME],
          "readwrite"
        );
        const store = transaction.objectStore(STORE_NAME);
        const now = Date.now();

        messagesMap.forEach((msgs, toolCallId) => {
          msgs.forEach((message, idx) => {
            if (!message.id) return;

            const persistedMessage: PersistedSubagentMessage = {
              threadId,
              messageId: message.id,
              toolCallId,
              message,
              timestamp: now,
              index: idx,
            };

            store.put(persistedMessage);
          });
        });

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
      });

      return subagentMap;
    } catch (error) {
      console.error("Failed to load subagent messages from IndexedDB:", error);
      return new Map();
    }
  }, [threadId]);

  // ============ 缓存管理逻辑 ============

  // 初始加载缓存（thread 打开时）
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

  // 定期写入 IndexedDB（流式过程中）
  useEffect(() => {
    if (!isLoading || !pendingWriteRef.current) return;

    // 启动定时器批量写入
    if (!batchWriteTimerRef.current) {
      batchWriteTimerRef.current = setTimeout(() => {
        if (pendingWriteRef.current && cachedMessages.size > 0) {
          batchSaveToIndexedDB(cachedMessages);
          pendingWriteRef.current = false;
        }
        batchWriteTimerRef.current = null;
      }, BATCH_WRITE_INTERVAL);
    }
  }, [isLoading, cachedMessages, batchSaveToIndexedDB]);

  // 流结束后，确保写入 IndexedDB
  useEffect(() => {
    const wasLoading = previousIsLoadingRef.current;
    const isNowIdle = !isLoading;

    if (wasLoading && isNowIdle && threadId) {
      // 清除定时器
      if (batchWriteTimerRef.current) {
        clearTimeout(batchWriteTimerRef.current);
        batchWriteTimerRef.current = null;
      }

      // 写入最终状态到 IndexedDB
      if (cachedMessages.size > 0) {
        batchSaveToIndexedDB(cachedMessages);
        pendingWriteRef.current = false;
      }
    }

    previousIsLoadingRef.current = isLoading;
  }, [isLoading, threadId, cachedMessages, batchSaveToIndexedDB]);

  // Reset on thread change
  useEffect(() => {
    hasCacheLoadedRef.current = false;
    pendingWriteRef.current = false;

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
    // subagent 消息（缓存 + 流式合并）
    subagentMessagesMap,
    // subagent 消息的 ID 集合（用于过滤）
    subagentMessageIds,
  };
}
