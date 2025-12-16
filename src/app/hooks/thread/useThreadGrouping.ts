import type { ThreadGroupType } from "@/app/components/thread/ThreadGroup";
import type { ThreadItem } from "@/app/hooks/useThreads";
import { useMemo } from "react";

export interface GroupedThreads {
  interrupted: ThreadItem[];
  today: ThreadItem[];
  yesterday: ThreadItem[];
  week: ThreadItem[];
  older: ThreadItem[];
}

/**
 * Custom hook to group threads by status and time
 * - Interrupted threads get their own priority group
 * - Other threads are grouped by time: today, yesterday, this week, older
 */
export function useThreadGrouping(threads: ThreadItem[]): GroupedThreads {
  return useMemo(() => {
    const now = new Date();
    const groups: GroupedThreads = {
      interrupted: [],
      today: [],
      yesterday: [],
      week: [],
      older: [],
    };

    threads.forEach((thread) => {
      // Priority: interrupted status gets its own group
      if (thread.status === "interrupted") {
        groups.interrupted.push(thread);
        return;
      }

      // Group by time for non-interrupted threads
      const diff = now.getTime() - thread.updatedAt.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      if (days === 0) {
        groups.today.push(thread);
      } else if (days === 1) {
        groups.yesterday.push(thread);
      } else if (days < 7) {
        groups.week.push(thread);
      } else {
        groups.older.push(thread);
      }
    });

    return groups;
  }, [threads]);
}

/**
 * Get the keys for iterating over thread groups in display order
 */
export function getThreadGroupKeys(): ThreadGroupType[] {
  return ["interrupted", "today", "yesterday", "week", "older"];
}
