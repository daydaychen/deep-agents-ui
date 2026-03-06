"use client";

import { useCallback } from "react";

export interface Namespace {
  namespace: string[];
  count: number;
}

/**
 * Memory store hook — stubbed for Claude Agent SDK migration.
 * The LangGraph store API is no longer available. Memory is deferred to P3.
 */
export function useMemory() {
  const searchItems = useCallback(
    async (
      _namespacePrefix: string[],
      _options?: {
        filter?: Record<string, unknown>;
        limit?: number;
        offset?: number;
        query?: string;
      }
    ) => {
      return [] as MemoryStoreItem[];
    },
    []
  );

  const getItem = useCallback(
    async (_namespace: string[], _key: string) => {
      return null;
    },
    []
  );

  const putItem = useCallback(
    async (_arg: {
      namespace: string[];
      key: string;
      value: Record<string, unknown>;
      ttl?: number | null;
    }) => {
      console.warn("Memory store not available in Claude Agent SDK mode");
    },
    []
  );

  const deleteItem = useCallback(
    async (_arg: { namespace: string[]; key: string }) => {
      console.warn("Memory store not available in Claude Agent SDK mode");
    },
    []
  );

  const mutateNamespaces = useCallback(() => {}, []);

  return {
    namespaces: [] as Namespace[],
    isLoadingNamespaces: false,
    searchItems,
    getItem,
    putItem,
    isPuttingItem: false,
    deleteItem,
    isDeletingItem: false,
    mutateNamespaces,
  };
}

/**
 * Local Item type replacing @langchain/langgraph-sdk's Item.
 * Used by memory components.
 */
export interface MemoryStoreItem {
  namespace: string[];
  key: string;
  value: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}
