"use client";

import { useClient } from "@/providers/ClientProvider";
import { useCallback } from "react";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";

interface Namespace {
  namespace: string[];
  count: number;
}

export function useMemory() {
  const client = useClient();

  // 列出所有命名空间
  const {
    data: namespaces,
    mutate: mutateNamespaces,
    isLoading: isLoadingNamespaces,
  } = useSWR(
    { kind: "memory-namespaces" },
    async () => {
      const result = await client.store.listNamespaces({
        limit: 100,
        offset: 0,
      });
      return result.namespaces.map(
        (ns): Namespace => ({
          namespace: ns,
          count: 0, // Note: The API doesn't return count, we'll need to fetch items to get accurate count
        })
      );
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  // 搜索指定命名空间下的项目
  const searchItems = useCallback(
    async (
      namespacePrefix: string[],
      options?: {
        filter?: Record<string, unknown>;
        limit?: number;
        offset?: number;
        query?: string;
      }
    ) => {
      const result = await client.store.searchItems(namespacePrefix, {
        limit: options?.limit ?? 10,
        offset: options?.offset ?? 0,
        filter: options?.filter,
        query: options?.query,
      });
      return result.items;
    },
    [client]
  );

  // 获取单个项目
  const getItem = useCallback(
    async (namespace: string[], key: string) => {
      return await client.store.getItem(namespace, key);
    },
    [client]
  );

  // 创建或更新项目
  const { trigger: putItem, isMutating: isPuttingItem } = useSWRMutation(
    { kind: "memory-put-item" },
    async (
      _,
      {
        arg,
      }: {
        arg: {
          namespace: string[];
          key: string;
          value: Record<string, unknown>;
          ttl?: number | null;
        };
      }
    ) => {
      await client.store.putItem(arg.namespace, arg.key, arg.value, {
        ttl: arg.ttl,
      });
      // 重新加载命名空间列表
      mutateNamespaces();
    }
  );

  // 删除项目
  const { trigger: deleteItem, isMutating: isDeletingItem } = useSWRMutation(
    { kind: "memory-delete-item" },
    async (_, { arg }: { arg: { namespace: string[]; key: string } }) => {
      await client.store.deleteItem(arg.namespace, arg.key);
      // 重新加载命名空间列表
      mutateNamespaces();
    }
  );

  return {
    namespaces: namespaces ?? [],
    isLoadingNamespaces,
    searchItems,
    getItem,
    putItem,
    isPuttingItem,
    deleteItem,
    isDeletingItem,
    mutateNamespaces,
  };
}
