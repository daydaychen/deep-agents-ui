"use client";

import { MemoryItemCard } from "@/app/components/memory/MemoryItemCard";
import type { Item } from "@langchain/langgraph-sdk";
import { Loader2 } from "lucide-react";
import React from "react";
import { useTranslations } from "next-intl";

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
    const t = useTranslations("memory");

    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin">
            <Loader2
              size={16}
              className="text-muted-foreground"
            />
          </div>
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <p className="px-2 py-2 text-xs text-muted-foreground">
          {t("noItemsInNamespace")}
        </p>
      );
    }

    return (
      <div
        className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2"
        style={{ contentVisibility: "auto" }}
      >
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
