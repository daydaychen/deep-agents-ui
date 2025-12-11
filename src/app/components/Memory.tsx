"use client";

import { MemoryItemDialog } from "@/app/components/MemoryItemDialog";
import { useMemory } from "@/app/hooks/useMemory";
import type { MemoryItem } from "@/app/types/types";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Item } from "@langchain/langgraph-sdk";
import { ChevronDown, Database, Loader2, Plus, Trash2 } from "lucide-react";
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

  const [selectedNamespace, setSelectedNamespace] = useState<string[] | null>(null);
  const [namespaceItems, setNamespaceItems] = useState<Item[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MemoryItem | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

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

  const handleSaveItem = useCallback(
    async (namespace: string[], key: string, value: Record<string, unknown>) => {
      try {
        await putItem({ namespace, key, value });
        toast.success("项目已保存");
        setIsCreatingNew(false);
        setSelectedItem(null);
        mutateNamespaces();
        // Refresh items if we're viewing this namespace
        if (selectedNamespace?.join(".") === namespace.join(".")) {
          const items = await searchItems(namespace, { limit: 100 });
          setNamespaceItems(items);
        }
      } catch (error) {
        toast.error(`保存失败: ${error}`);
        throw error;
      }
    },
    [putItem, mutateNamespaces, searchItems, selectedNamespace]
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
        if (selectedNamespace?.join(".") === namespace.join(".")) {
          const items = await searchItems(namespace, { limit: 100 });
          setNamespaceItems(items);
        }
      } catch (error) {
        toast.error(`删除失败: ${error}`);
      }
    },
    [deleteItem, mutateNamespaces, searchItems, selectedNamespace]
  );

  const handleCreateNew = useCallback(() => {
    setIsCreatingNew(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setSelectedItem(null);
    setIsCreatingNew(false);
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
          <Plus size={14} className="mr-1" />
          新建项目
        </Button>
      </div>
      <ScrollArea className="h-full">
        {isLoadingNamespaces ? (
          <div className="flex h-full items-center justify-center p-4">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
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
                <div key={namespaceStr} className="space-y-2">
                  <button
                    onClick={() => handleNamespaceClick(ns.namespace)}
                    className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm font-medium transition-colors hover:bg-muted"
                  >
                    <div className="flex items-center gap-2">
                      <Database size={14} className="text-muted-foreground" />
                      <span className="text-foreground">{namespaceStr}</span>
                    </div>
                    <ChevronDown
                      size={14}
                      className={cn(
                        "text-muted-foreground transition-transform duration-200",
                        isExpanded ? "rotate-180" : "rotate-0"
                      )}
                    />
                  </button>

                  {isExpanded && (
                    <div className="ml-4 space-y-2">
                      {isLoadingItems ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 size={16} className="animate-spin text-muted-foreground" />
                        </div>
                      ) : namespaceItems.length === 0 ? (
                        <p className="px-2 py-2 text-xs text-muted-foreground">
                          此命名空间下暂无项目
                        </p>
                      ) : (
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2">
                          {namespaceItems.map((item) => (
                            <div
                              key={item.key}
                              className="group relative cursor-pointer space-y-2 rounded-md border border-border px-3 py-3 shadow-sm transition-colors hover:bg-accent"
                              onClick={() =>
                                setSelectedItem({
                                  namespace: item.namespace,
                                  key: item.key,
                                  value: item.value,
                                  createdAt: item.createdAt,
                                  updatedAt: item.updatedAt,
                                })
                              }
                            >
                              <div className="flex items-center justify-between">
                                <Database
                                  size={18}
                                  className="text-muted-foreground"
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                                  onClick={(e) =>
                                    handleDeleteItem(item.namespace, item.key, e)
                                  }
                                  disabled={isDeletingItem}
                                >
                                  <Trash2 size={14} className="text-destructive" />
                                </Button>
                              </div>
                              <div className="space-y-1">
                                <span className="block w-full truncate break-words text-sm font-medium text-foreground">
                                  {item.key}
                                </span>
                                {item.createdAt && (
                                  <p className="text-[10px] text-muted-foreground">
                                    创建: {new Date(item.createdAt).toLocaleString('zh-CN', {
                                      year: 'numeric',
                                      month: '2-digit',
                                      day: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                )}
                                {item.updatedAt && (
                                  <p className="text-[10px] text-muted-foreground">
                                    更新: {new Date(item.updatedAt).toLocaleString('zh-CN', {
                                      year: 'numeric',
                                      month: '2-digit',
                                      day: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
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
