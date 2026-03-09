"use client";

import type { ThreadItem } from "@/app/hooks/useThreads";
import React from "react";
import { ThreadListItem } from "./ThreadListItem";

const GROUP_LABELS = {
  interrupted: "Requiring Attention",
  today: "Today",
  yesterday: "Yesterday",
  week: "This Week",
  older: "Older",
} as const;

export type ThreadGroupType = keyof typeof GROUP_LABELS;

interface ThreadGroupProps {
  groupType: ThreadGroupType;
  threads: ThreadItem[];
  currentThreadId: string | null;
  onThreadSelect: (id: string) => void;
  onMarkAsResolved: (threadId: string, assistantId?: string) => void;
  onDeleteThread: (threadId: string) => void;
}

export const ThreadGroup = React.memo<ThreadGroupProps>(
  ({
    groupType,
    threads,
    currentThreadId,
    onThreadSelect,
    onMarkAsResolved,
    onDeleteThread,
  }) => {
    if (threads.length === 0) return null;

    return (
      <div className="mb-4">
        <h4 className="m-0 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {GROUP_LABELS[groupType]}
        </h4>
        <div className="flex flex-col gap-1">
          {threads.map((thread) => (
            <ThreadListItem
              key={thread.id}
              thread={thread}
              isActive={currentThreadId === thread.id}
              onSelect={onThreadSelect}
              onMarkAsResolved={onMarkAsResolved}
              onDelete={onDeleteThread}
            />
          ))}
        </div>
      </div>
    );
  }
);

ThreadGroup.displayName = "ThreadGroup";
