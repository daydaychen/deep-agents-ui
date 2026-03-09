"use client";

import { MemoryItemCard } from "@/app/components/memory/MemoryItemCard";
import type { Item } from "@langchain/langgraph-sdk";
import { Loader2 } from "lucide-react";
import React from "react";

interface MemoryItemsListProps {
  items: Item[];
  isLoading: boolean;
  onSelectItem: (item: Item) => void;
  onDeleteItem: (
    namespace: string[],
    key: string,
    event: React.MouseEvent
  ) => void;
  isDeleting?: boolean;
}

export const MemoryItemsList = React.memo<MemoryItemsListProps>(
  ({ items, isLoading, onSelectItem, onDeleteItem, isDeleting }) => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-4">
          <Loader2
            size={16}
            className="animate-spin text-muted-foreground"
          />
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <p className="px-2 py-2 text-xs text-muted-foreground">
          此命名空间下暂无项目
        </p>
      );
    }

    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2">
        {items.map((item) => (
          <MemoryItemCard
            key={item.key}
            item={item}
            onSelect={onSelectItem}
            onDelete={onDeleteItem}
            isDeleting={isDeleting}
          />
        ))}
      </div>
    );
  }
);

MemoryItemsList.displayName = "MemoryItemsList";
