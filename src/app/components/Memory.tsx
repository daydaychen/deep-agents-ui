"use client";

import { MemoryItemDialog } from "@/app/components/MemoryItemDialog";
import { MemoryItemsList } from "@/app/components/memory/MemoryItemsList";
import { MemoryNamespaceItem } from "@/app/components/memory/MemoryNamespaceItem";
import { useMemoryNamespace } from "@/app/hooks/memory/useMemoryNamespace";
import { useMemory } from "@/app/hooks/useMemory";
import type { MemoryItem } from "@/app/types/types";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Item } from "@langchain/langgraph-sdk";
import { Loader2, Plus, Brain, Trash2, AlertCircle } from "lucide-react";
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
  const [itemToDelete, setItemToDelete] = useState<{ namespace: string[]; key: string } | null>(null);

  const handleSaveItem = useCallback(
    async (
      namespace: string[],
      key: string,
      value: Record<string, unknown>
    ) => {
      try {
        await putItem({ namespace, key, value });
        toast.success("Item saved successfully");
        setIsCreatingNew(false);
        setSelectedItem(null);
        mutateNamespaces();
        await refreshItems(namespace);
      } catch (error) {
        toast.error(`Failed to save: ${error}`);
        throw error;
      }
    },
    [putItem, mutateNamespaces, refreshItems]
  );

  const confirmDelete = useCallback(async () => {
    if (!itemToDelete) return;
    
    try {
      await deleteItem({ namespace: itemToDelete.namespace, key: itemToDelete.key });
      toast.success("Item deleted successfully");
      mutateNamespaces();
      await refreshItems(itemToDelete.namespace);
      setItemToDelete(null);
    } catch (error) {
      toast.error(`Failed to delete: ${error}`);
    }
  }, [deleteItem, mutateNamespaces, refreshItems, itemToDelete]);

  const handleDeleteItem = useCallback(
    (namespace: string[], key: string, event: React.MouseEvent) => {
      event.stopPropagation();
      setItemToDelete({ namespace, key });
    },
    []
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
      <div className="flex items-center justify-between px-4 pb-3 pt-2">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Long-term Memory</h2>
        </div>
        <Button
          onClick={handleCreateNew}
          variant="outline"
          size="sm"
          className="h-7 border-dashed px-2.5 text-[11px]"
          disabled={isPuttingItem || isDeletingItem}
        >
          <Plus
            size={12}
            className="mr-1"
          />
          Add Entry
        </Button>
      </div>
      <ScrollArea className="h-full px-1">
        {isLoadingNamespaces ? (
          <div className="flex h-full items-center justify-center p-8">
            <Loader2
              size={24}
              className="animate-spin text-muted-foreground/50"
            />
          </div>
        ) : namespaces.length === 0 ? (
          <div className="flex flex-col h-full items-center justify-center p-8 text-center opacity-60">
            <Brain size={32} className="mb-3 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">No memory entries found</p>
          </div>
        ) : (
          <div className="space-y-1 pb-4">
            {sortedNamespaces.map((ns) => {
              const namespaceStr = ns.namespace.join(".");
              const isExpanded = selectedNamespace?.join(".") === namespaceStr;

              return (
                <div
                  key={namespaceStr}
                  className="space-y-0.5"
                >
                  <MemoryNamespaceItem
                    namespace={namespaceStr}
                    isExpanded={isExpanded}
                    onClick={() => handleNamespaceClick(ns.namespace)}
                  />

                  {isExpanded && (
                    <div className="ml-3 pl-2 border-l border-zinc-200 dark:border-zinc-800 my-1 space-y-1">
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

      <Dialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <DialogTitle>Confirm Deletion</DialogTitle>
            </div>
            <DialogDescription className="pt-2">
              Are you sure you want to delete the entry <code className="text-xs font-mono bg-muted px-1 rounded">"{itemToDelete?.key}"</code>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="ghost" size="sm" onClick={() => setItemToDelete(null)}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={confirmDelete} disabled={isDeletingItem}>
              {isDeletingItem ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Trash2 className="h-3 w-3 mr-2" />}
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

Memory.displayName = "Memory";
