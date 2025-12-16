"use client";

import type { ThreadItem } from "@/app/hooks/useThreads";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { MoreHorizontal } from "lucide-react";
import React from "react";

const STATUS_COLORS: Record<ThreadItem["status"], string> = {
  idle: "bg-green-500",
  busy: "bg-blue-500",
  interrupted: "bg-orange-500",
  error: "bg-red-600",
};

function getThreadColor(status: ThreadItem["status"]): string {
  return STATUS_COLORS[status] ?? "bg-gray-400";
}

function formatTime(date: Date, now = new Date()): string {
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return format(date, "HH:mm");
  if (days === 1) return "Yesterday";
  if (days < 7) return format(date, "EEEE");
  return format(date, "MM/dd");
}

interface ThreadListItemProps {
  thread: ThreadItem;
  isActive: boolean;
  onSelect: (id: string) => void;
  onMarkAsResolved: (threadId: string, assistantId?: string) => void;
  onDelete: (threadId: string) => void;
}

export const ThreadListItem = React.memo<ThreadListItemProps>(
  ({ thread, isActive, onSelect, onMarkAsResolved, onDelete }) => {
    return (
      <div
        className={cn(
          "group grid w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors duration-200",
          "hover:bg-accent",
          isActive
            ? "border border-primary bg-accent hover:bg-accent"
            : "border border-transparent bg-transparent"
        )}
        onClick={() => onSelect(thread.id)}
        aria-current={isActive}
      >
        <div className="min-w-0 flex-1">
          {/* Title + Timestamp Row */}
          <div className="mb-1 flex items-center justify-between">
            <h3 className="truncate text-sm font-semibold">{thread.title}</h3>
            <div className="ml-2 flex flex-shrink-0 items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {formatTime(thread.updatedAt)}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkAsResolved(thread.id, thread.assistantId);
                    }}
                  >
                    Make as Resolved
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(thread.id);
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    Delete Thread
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {/* Description + Status Row */}
          <div className="flex items-center justify-between">
            <p className="flex-1 truncate text-sm text-muted-foreground">
              {thread.description}
            </p>
            <div className="ml-2 flex items-center gap-2">
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs">
                {thread.messageCount}{" "}
                {thread.messageCount === 1 ? "message" : "messages"}
              </span>
              <div
                className={cn(
                  "h-2 w-2 rounded-full",
                  getThreadColor(thread.status)
                )}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ThreadListItem.displayName = "ThreadListItem";
