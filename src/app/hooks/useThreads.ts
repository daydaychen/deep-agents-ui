import { getConfig } from "@/lib/config";
import useSWRInfinite from "swr/infinite";

export interface ThreadItem {
  id: string;
  updatedAt: Date;
  status: "idle" | "busy" | "interrupted" | "error";
  title: string;
  description: string;
  messageCount: number;
}

const DEFAULT_PAGE_SIZE = 20;

export function useThreads(props: {
  status?: string;
  limit?: number;
}) {
  const pageSize = props.limit || DEFAULT_PAGE_SIZE;

  return useSWRInfinite(
    (pageIndex: number, previousPageData: ThreadItem[] | null) => {
      const config = getConfig();
      if (!config) return null;

      // If previous page was empty, we've reached the end
      if (previousPageData && previousPageData.length === 0) return null;

      return {
        kind: "threads" as const,
        pageIndex,
        pageSize,
        apiKey: config.apiKey,
        status: props?.status,
      };
    },
    async ({
      apiKey,
      pageIndex,
      pageSize,
    }: {
      kind: "threads";
      pageIndex: number;
      pageSize: number;
      apiKey: string;
      status?: string;
    }) => {
      const response = await fetch("/api/threads", {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch threads: ${response.status}`);
      }

      const allThreads: Array<{
        id: string;
        title: string;
        description: string;
        updatedAt: string;
        status: string;
        messageCount: number;
      }> = await response.json();

      // Client-side pagination
      const start = pageIndex * pageSize;
      const page = allThreads.slice(start, start + pageSize);

      return page.map(
        (thread): ThreadItem => ({
          id: thread.id,
          updatedAt: new Date(thread.updatedAt),
          status: (thread.status as ThreadItem["status"]) || "idle",
          title: thread.title,
          description: thread.description,
          messageCount: thread.messageCount,
        })
      );
    },
    {
      revalidateFirstPage: true,
      revalidateOnFocus: true,
    }
  );
}

export function useDeleteThread() {
  // Stub — SDK sessions are file-based, no remote deletion
  return {
    trigger: async ({ threadId }: { threadId: string }) => {
      console.warn("Thread deletion not yet implemented for SDK sessions:", threadId);
    },
  };
}

export function useMarkThreadAsResolved() {
  // Stub — no LangGraph goto command in SDK
  return {
    trigger: async ({
      threadId,
    }: {
      threadId: string;
      assistantId?: string;
    }) => {
      console.warn("Mark as resolved not yet implemented for SDK sessions:", threadId);
    },
  };
}
