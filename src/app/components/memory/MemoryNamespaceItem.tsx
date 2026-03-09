"use client";

import { cn } from "@/lib/utils";
import { ChevronDown, Database } from "lucide-react";
import React from "react";

interface MemoryNamespaceItemProps {
  namespace: string;
  isExpanded: boolean;
  onClick: () => void;
}

export const MemoryNamespaceItem = React.memo<MemoryNamespaceItemProps>(
  ({ namespace, isExpanded, onClick }) => {
    return (
      <button
        onClick={onClick}
        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm font-medium transition-colors hover:bg-muted"
      >
        <div className="flex items-center gap-2">
          <Database
            size={14}
            className="text-muted-foreground"
          />
          <span className="text-foreground">{namespace}</span>
        </div>
        <ChevronDown
          size={14}
          className={cn(
            "text-muted-foreground transition-transform duration-200",
            isExpanded ? "rotate-180" : "rotate-0"
          )}
        />
      </button>
    );
  }
);

MemoryNamespaceItem.displayName = "MemoryNamespaceItem";
