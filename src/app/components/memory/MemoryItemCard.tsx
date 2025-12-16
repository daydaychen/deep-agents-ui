"use client";

import { Button } from "@/components/ui/button";
import type { Item } from "@langchain/langgraph-sdk";
import { Database, Trash2 } from "lucide-react";
import React from "react";

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
    return (
      <div
        className="group relative cursor-pointer space-y-2 rounded-md border border-border px-3 py-3 shadow-sm transition-colors hover:bg-accent"
        onClick={() => onSelect(item)}
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
              创建: {formatDate(item.createdAt)}
            </p>
          )}
          {item.updatedAt && (
            <p className="text-[10px] text-muted-foreground">
              更新: {formatDate(item.updatedAt)}
            </p>
          )}
        </div>
      </div>
    );
  }
);

MemoryItemCard.displayName = "MemoryItemCard";
