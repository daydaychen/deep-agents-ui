"use client";

import { MemoryItemDialog } from "@/app/components/MemoryItemDialog";
import { MemoryItemsList } from "@/app/components/memory/MemoryItemsList";
import { MemoryNamespaceItem } from "@/app/components/memory/MemoryNamespaceItem";
import { useMemoryNamespace } from "@/app/hooks/memory/useMemoryNamespace";
import { useMemory } from "@/app/hooks/useMemory";
import type { MemoryItem } from "@/app/types/types";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Item } from "@langchain/langgraph-sdk";
import { Loader2, Plus } from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

export const Memory = React.memo(() => {
  const {
    namespaces,
    isLoadingNamespaces,
    searchItems,
    putItem,
    isPuttingItem,
    deleteItem,
    isDeletingItem,
    mutateNamespaces,
  } = useMemory();

  const {
    selectedNamespace,
    namespaceItems,
    isLoadingItems,
    handleNamespaceClick,
    refreshItems,
  } = useMemoryNamespace(searchItems);

  const [selectedItem, setSelectedItem] = useState<MemoryItem | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  const handleSaveItem = useCallback(
    async (
      namespace: string[],
      key: string,
      value: Record<string, unknown>
    ) => {
      try {
        await putItem({ namespace, key, value });
        toast.success("项目已保存");
        setIsCreatingNew(false);
        setSelectedItem(null);
        mutateNamespaces();
        // Refresh items if we're viewing this namespace
        await refreshItems(namespace);
      } catch (error) {
        toast.error(`保存失败: ${error}`);
        throw error;
      }
    },
    [putItem, mutateNamespaces, refreshItems]
  );

  const handleDeleteItem = useCallback(
    async (namespace: string[], key: string, event: React.MouseEvent) => {
      event.stopPropagation();
      if (!confirm(`确定要删除项目 "${key}" 吗？`)) {
        return;
      }
      try {
        await deleteItem({ namespace, key });
        toast.success("项目已删除");
        mutateNamespaces();
        // Refresh items
        await refreshItems(namespace);
      } catch (error) {
        toast.error(`删除失败: ${error}`);
      }
    },
    [deleteItem, mutateNamespaces, refreshItems]
  );

  const handleCreateNew = useCallback(() => {
    setIsCreatingNew(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setSelectedItem(null);
    setIsCreatingNew(false);
  }, []);

  const handleSelectItem = useCallback((item: Item) => {
    setSelectedItem({
      namespace: item.namespace,
      key: item.key,
      value: item.value,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    });
  }, []);

  const sortedNamespaces = useMemo(() => {
    return [...namespaces].sort((a, b) => {
      return a.namespace.join(".").localeCompare(b.namespace.join("."));
    });
  }, [namespaces]);

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col">
      <div className="flex items-center justify-end px-3 pb-2">
        <Button
          onClick={handleCreateNew}
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          disabled={isPuttingItem || isDeletingItem}
        >
          <Plus
            size={14}
            className="mr-1"
          />
          新建项目
        </Button>
      </div>
      <ScrollArea className="h-full">
        {isLoadingNamespaces ? (
          <div className="flex h-full items-center justify-center p-4">
            <Loader2
              size={20}
              className="animate-spin text-muted-foreground"
            />
          </div>
        ) : namespaces.length === 0 ? (
          <div className="flex h-full items-center justify-center p-4 text-center">
            <p className="text-xs text-muted-foreground">暂无存储内容</p>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            {sortedNamespaces.map((ns) => {
              const namespaceStr = ns.namespace.join(".");
              const isExpanded = selectedNamespace?.join(".") === namespaceStr;

              return (
                <div
                  key={namespaceStr}
                  className="space-y-2"
                >
                  <MemoryNamespaceItem
                    namespace={namespaceStr}
                    isExpanded={isExpanded}
                    onClick={() => handleNamespaceClick(ns.namespace)}
                  />

                  {isExpanded && (
                    <div className="ml-4 space-y-2">
                      <MemoryItemsList
                        items={namespaceItems}
                        isLoading={isLoadingItems}
                        onSelectItem={handleSelectItem}
                        onDeleteItem={handleDeleteItem}
                        isDeleting={isDeletingItem}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {(selectedItem || isCreatingNew) && (
        <MemoryItemDialog
          item={selectedItem}
          onSaveItem={handleSaveItem}
          onClose={handleCloseDialog}
          editDisabled={isPuttingItem || isDeletingItem}
        />
      )}
    </div>
  );
});

Memory.displayName = "Memory";
