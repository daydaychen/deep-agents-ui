"use client";

import { Button } from "@/components/ui/button";
import type { Item } from "@langchain/langgraph-sdk";
import { Database, Trash2 } from "lucide-react";
import React from "react";
import { useTranslations } from "next-intl";

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface MemoryItemCardProps {
  item: Item;
  onSelect: (item: Item) => void;
  onDelete: (namespace: string[], key: string, event: React.MouseEvent) => void;
  isDeleting?: boolean;
}

export const MemoryItemCard = React.memo<MemoryItemCardProps>(
  ({ item, onSelect, onDelete, isDeleting }) => {
    const t = useTranslations("memory");

    return (
      <div
        className="group relative cursor-pointer space-y-2 rounded-md border border-border px-3 py-3 shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        onClick={() => onSelect(item)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(item);
          }
        }}
        role="button"
        tabIndex={0}
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
            aria-label={t("deleteMemoryItem", { key: item.key })}
            onClick={(e) => onDelete(item.namespace, item.key, e)}
            disabled={isDeleting}
          >
            <Trash2
              size={14}
              className="text-destructive"
            />
          </Button>
        </div>
        <div className="space-y-1">
          <span className="block w-full truncate break-words text-sm font-medium text-foreground">
            {item.key}
          </span>
          {item.createdAt && (
            <p className="text-[10px] text-muted-foreground">
              {t("created")}: {formatDate(item.createdAt)}
            </p>
          )}
          {item.updatedAt && (
            <p className="text-[10px] text-muted-foreground">
              {t("updated")}: {formatDate(item.updatedAt)}
            </p>
          )}
        </div>
      </div>
    );
  }
);

MemoryItemCard.displayName = "MemoryItemCard";
