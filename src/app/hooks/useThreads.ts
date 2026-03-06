import { getConfig } from "@/lib/config";
import useSWR from "swr";

export interface ThreadItem {
  id: string;
  updatedAt: Date;
  status: "idle" | "busy" | "interrupted" | "error";
  title: string;
  description: string;
  messageCount: number;
}

export function useThreads(props: {
  status?: string;
  limit?: number;
}) {
  return useSWR(
    () => {
      const config = getConfig();
      if (!config) return null;
      return { kind: "threads" as const, apiKey: config.apiKey, status: props?.status };
    },
    async ({ apiKey }: { kind: "threads"; apiKey: string; status?: string }) => {
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

      return allThreads.map(
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
