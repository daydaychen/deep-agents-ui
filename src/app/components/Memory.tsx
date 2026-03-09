"use client";

import { MemoryItemDialog } from "@/app/components/MemoryItemDialog";
import { MemoryItemsList } from "@/app/components/memory/MemoryItemsList";
import { MemoryNamespaceItem } from "@/app/components/memory/MemoryNamespaceItem";
import { useMemoryNamespace } from "@/app/hooks/memory/useMemoryNamespace";
import { useMemory } from "@/app/hooks/useMemory";
import type { MemoryItem } from "@/app/types/types";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Item } from "@langchain/langgraph-sdk";
import {
  Loader2,
  Plus,
  Brain,
  Trash2,
  AlertCircle,
  Search,
  Sparkles,
  Filter,
} from "lucide-react";
import React, { useCallback, useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export const Memory = React.memo(() => {
  const t = useTranslations("memory");
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

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const {
    selectedNamespace,
    namespaceItems,
    isLoadingItems,
    handleNamespaceClick,
    refreshItems,
  } = useMemoryNamespace(searchItems);

  const [selectedItem, setSelectedItem] = useState<MemoryItem | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{
    namespace: string[];
    key: string;
  } | null>(null);

  const handleSaveItem = useCallback(
    async (
      namespace: string[],
      key: string,
      value: Record<string, unknown>
    ) => {
      try {
        await putItem({ namespace, key, value });
        toast.success(t("itemSaved"));
        setIsCreatingNew(false);
        setSelectedItem(null);
        mutateNamespaces();
        await refreshItems(namespace);
      } catch (error) {
        toast.error(t("saveFailed", { error: String(error) }));
        throw error;
      }
    },
    [putItem, mutateNamespaces, refreshItems, t]
  );

  const confirmDelete = useCallback(async () => {
    if (!itemToDelete) return;

    try {
      await deleteItem({
        namespace: itemToDelete.namespace,
        key: itemToDelete.key,
      });
      toast.success(t("itemDeleted"));
      mutateNamespaces();
      await refreshItems(itemToDelete.namespace);
      setItemToDelete(null);
    } catch (error) {
      toast.error(t("deleteFailed", { error: String(error) }));
    }
  }, [deleteItem, mutateNamespaces, refreshItems, itemToDelete, t]);

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

  // Performance: Filtered results based on semantic query if provided
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedQuery) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        // Search globally across all namespaces (empty prefix)
        const items = await searchItems([], {
          query: debouncedQuery,
          limit: 20,
        });
        setSearchResults(items);
      } catch (error) {
        console.error("Semantic search failed:", error);
      } finally {
        setIsSearching(false);
      }
    };
    performSearch();
  }, [debouncedQuery, searchItems]);

  const sortedNamespaces = useMemo(() => {
    return [...namespaces].sort((a, b) => {
      return a.namespace.join(".").localeCompare(b.namespace.join("."));
    });
  }, [namespaces]);

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col gap-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
            {t("longTermMemory")}
          </h2>
        </div>
        <Button
          onClick={handleCreateNew}
          variant="outline"
          size="sm"
          className="hover:bg-primary/5 h-7 border-dashed px-2.5 text-[11px] transition-colors hover:text-primary"
          disabled={isPuttingItem || isDeletingItem}
        >
          <Plus
            size={12}
            className="mr-1"
          />
          {t("addEntry")}
        </Button>
      </div>

      <div className="group relative px-1">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
        <Input
          placeholder={t("searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 border-none bg-muted/30 pl-9 text-xs shadow-sm transition-all focus-visible:ring-1 focus-visible:ring-primary/30"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      <ScrollArea className="-mx-1 h-full px-1">
        {debouncedQuery ? (
          <div className="space-y-4 pb-4">
            <div className="flex items-center gap-2 px-2 text-[10px] font-semibold uppercase tracking-tighter text-muted-foreground">
              <Sparkles className="h-3 w-3 text-orange-400" />
              {t("semanticSearchResults")}
            </div>
            {isSearching ? (
              <div className="flex justify-center p-8">
                <Loader2
                  size={20}
                  className="animate-spin text-muted-foreground/30"
                />
              </div>
            ) : searchResults.length === 0 ? (
              <div className="p-8 text-center opacity-60">
                <p className="text-xs text-muted-foreground">
                  {t("noMatchingMemories")}
                </p>
              </div>
            ) : (
              <div className="grid gap-2">
                <MemoryItemsList
                  items={searchResults}
                  isLoading={false}
                  onSelectItem={handleSelectItem}
                  onDeleteItem={handleDeleteItem}
                  isDeleting={isDeletingItem}
                />
              </div>
            )}
          </div>
        ) : isLoadingNamespaces ? (
          <div className="flex h-full items-center justify-center p-8">
            <Loader2
              size={24}
              className="animate-spin text-muted-foreground/50"
            />
          </div>
        ) : namespaces.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center opacity-60">
            <Brain
              size={32}
              className="mb-3 text-muted-foreground/30"
            />
            <p className="text-xs text-muted-foreground">
              {t("noMemoryEntries")}
            </p>
          </div>
        ) : (
          <div className="space-y-2 pb-4">
            <div className="flex items-center gap-2 px-2 text-[10px] font-semibold uppercase tracking-tighter text-muted-foreground">
              <Filter className="h-3 w-3" />
              {t("hierarchicalNamespaces")}
            </div>
            <div className="grid gap-1.5">
              {sortedNamespaces.map((ns) => {
                const namespaceStr = ns.namespace.join(".");
                const isExpanded =
                  selectedNamespace?.join(".") === namespaceStr;

                return (
                  <div
                    key={namespaceStr}
                    className={cn(
                      "overflow-hidden rounded-xl border border-border/40 transition-all",
                      isExpanded
                        ? "border-primary/20 bg-muted/10 shadow-sm"
                        : "hover:bg-muted/5"
                    )}
                  >
                    <MemoryNamespaceItem
                      namespace={namespaceStr}
                      isExpanded={isExpanded}
                      onClick={() => handleNamespaceClick(ns.namespace)}
                    />

                    {isExpanded && (
                      <div className="border-t border-border/20 bg-background/40 px-3 pb-3 pt-1">
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

      <Dialog
        open={!!itemToDelete}
        onOpenChange={(open) => !open && setItemToDelete(null)}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <DialogTitle>{t("confirmDeletion")}</DialogTitle>
            </div>
            <DialogDescription
              className="pt-2"
              dangerouslySetInnerHTML={{
                __html: t("deleteConfirm", { key: itemToDelete?.key }),
              }}
            />
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setItemToDelete(null)}
            >
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={confirmDelete}
              disabled={isDeletingItem}
            >
              {isDeletingItem ? (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-3 w-3" />
              )}
              {t("deletePermanently")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

Memory.displayName = "Memory";
