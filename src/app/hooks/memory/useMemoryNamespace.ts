import type { MemoryStoreItem } from "@/app/hooks/useMemory";
import { useCallback, useState } from "react";
import { toast } from "sonner";

/**
 * Manage namespace selection and item loading for memory component
 */
export function useMemoryNamespace(
  searchItems: (
    namespace: string[],
    options?: { limit?: number }
  ) => Promise<MemoryStoreItem[]>
) {
  const [selectedNamespace, setSelectedNamespace] = useState<string[] | null>(
    null
  );
  const [namespaceItems, setNamespaceItems] = useState<MemoryStoreItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  const handleNamespaceClick = useCallback(
    async (namespace: string[]) => {
      if (selectedNamespace?.join(".") === namespace.join(".")) {
        setSelectedNamespace(null);
        setNamespaceItems([]);
      } else {
        setSelectedNamespace(namespace);
        setIsLoadingItems(true);
        try {
          const items = await searchItems(namespace, { limit: 100 });
          setNamespaceItems(items);
        } catch (error) {
          toast.error(`加载项目失败: ${error}`);
          setNamespaceItems([]);
        } finally {
          setIsLoadingItems(false);
        }
      }
    },
    [searchItems, selectedNamespace]
  );

  const refreshItems = useCallback(
    async (namespace: string[]) => {
      if (selectedNamespace?.join(".") === namespace.join(".")) {
        const items = await searchItems(namespace, { limit: 100 });
        setNamespaceItems(items);
      }
    },
    [searchItems, selectedNamespace]
  );

  return {
    selectedNamespace,
    namespaceItems,
    isLoadingItems,
    handleNamespaceClick,
    refreshItems,
  };
}
