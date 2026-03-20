import type { Item } from "@langchain/langgraph-sdk";
import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";
import { DEFAULT_MEMORY_LIMIT } from "@/lib/constants";

/**
 * Manage namespace selection and item loading for memory component
 */
export function useMemoryNamespace(
  searchItems: (namespace: string[], options?: { limit?: number }) => Promise<Item[]>,
) {
  const [selectedNamespace, setSelectedNamespace] = useState<string[] | null>(null);
  const [namespaceItems, setNamespaceItems] = useState<Item[]>([]);
  const [isLoadingItems, startLoadingItems] = useTransition();

  const handleNamespaceClick = useCallback(
    (namespace: string[]) => {
      if (selectedNamespace?.join(".") === namespace.join(".")) {
        setSelectedNamespace(null);
        setNamespaceItems([]);
      } else {
        setSelectedNamespace(namespace);
        startLoadingItems(async () => {
          try {
            const items = await searchItems(namespace, {
              limit: DEFAULT_MEMORY_LIMIT,
            });
            setNamespaceItems(items);
          } catch (error) {
            toast.error(`加载项目失败: ${error}`);
            setNamespaceItems([]);
          }
        });
      }
    },
    [searchItems, selectedNamespace],
  );

  const refreshItems = useCallback(
    async (namespace: string[]) => {
      if (selectedNamespace?.join(".") === namespace.join(".")) {
        const items = await searchItems(namespace, { limit: 100 });
        setNamespaceItems(items);
      }
    },
    [searchItems, selectedNamespace],
  );

  return {
    selectedNamespace,
    namespaceItems,
    isLoadingItems,
    handleNamespaceClick,
    refreshItems,
  };
}
