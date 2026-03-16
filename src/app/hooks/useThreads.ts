import { getConfig } from "@/lib/config";
import { THREAD_TITLE_MAX_LENGTH, DEFAULT_THREAD_LIMIT } from "@/lib/constants";
import type { Message, Thread } from "@langchain/langgraph-sdk";
import { Client } from "@langchain/langgraph-sdk";
import useSWRInfinite from "swr/infinite";
import { deleteThreadData } from "@/app/utils/db";
import type { StateType } from "@/providers/chat-context";

export interface ThreadItem {
  id: string;
  updatedAt: Date;
  status: Thread["status"];
  title: string;
  description: string;
  messageCount: number;
  assistantId?: string;
}

const DEFAULT_PAGE_SIZE = 20;

export function useThreads(props: {
  status?: Thread["status"];
  limit?: number;
}) {
  const pageSize = props.limit || DEFAULT_PAGE_SIZE;

  return useSWRInfinite(
    (pageIndex: number, previousPageData: ThreadItem[] | null) => {
      const config = getConfig();

      if (!config) {
        return null;
      }

      // If the previous page returned no items, we've reached the end
      if (previousPageData && previousPageData.length === 0) {
        return null;
      }

      return {
        kind: "threads" as const,
        pageIndex,
        pageSize,
        deploymentUrl: config.deploymentUrl,
        assistantId: config.assistantId,
        status: props?.status,
      };
    },
    async ({
      deploymentUrl,
      assistantId,
      status,
      pageIndex,
      pageSize,
    }: {
      kind: "threads";
      pageIndex: number;
      pageSize: number;
      deploymentUrl: string;
      assistantId: string;
      status?: Thread["status"];
    }) => {
      const client = new Client({
        apiUrl: deploymentUrl,
      });

      // Check if assistantId is a UUID (deployed) or graph name (local)
      const isUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          assistantId
        );

      const threads = await client.threads.search({
        limit: pageSize,
        offset: pageIndex * pageSize,
        sortBy: "updated_at" as const,
        sortOrder: "desc" as const,
        status,
        // Only filter by assistant_id metadata for deployed graphs (UUIDs)
        // Local dev graphs don't set this metadata
        ...(isUUID ? { metadata: { assistant_id: assistantId } } : {}),
      });

      return threads.map((thread): ThreadItem => {
        let title = "Untitled Thread";
        let description = "";
        let messageCount = 0;

        try {
          if (thread.values && typeof thread.values === "object") {
            const values = thread.values as unknown as StateType;
            // Count messages
            if (Array.isArray(values.messages)) {
              messageCount = values.messages.length;
            }

            const firstHumanMessage = values.messages.find(
              (m: Message) => m.type === "human"
            );
            if (firstHumanMessage?.content) {
              const content =
                typeof firstHumanMessage.content === "string"
                  ? firstHumanMessage.content
                  : // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (firstHumanMessage.content[0] as any)?.text || "";
              title = content.slice(0, THREAD_TITLE_MAX_LENGTH) + (content.length > THREAD_TITLE_MAX_LENGTH ? "…" : "");
            }
            const firstAiMessage = values.messages.find(
              (m: Message) => m.type === "ai"
            );
            if (firstAiMessage?.content) {
              const content =
                typeof firstAiMessage.content === "string"
                  ? firstAiMessage.content
                  : // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (firstAiMessage.content[0] as any)?.text || "";
              description = content.slice(0, DEFAULT_THREAD_LIMIT);
            }
          }
        } catch {
          // Fallback to thread ID
          title = `Thread ${thread.thread_id.slice(0, 8)}`;
        }

        return {
          id: thread.thread_id,
          updatedAt: new Date(thread.updated_at),
          status: thread.status,
          title,
          description,
          messageCount,
          assistantId,
        };
      });
    },
    {
      revalidateFirstPage: true,
      revalidateOnFocus: true,
    }
  );
}

export function useDeleteThread() {
  const config = getConfig();

  if (!config) {
    throw new Error("Configuration not found");
  }

  return {
    trigger: async ({ threadId }: { threadId: string }) => {
      const client = new Client({
        apiUrl: config.deploymentUrl,
      });

      await client.threads.delete(threadId);

      // Also delete data from IndexedDB
      try {
        await deleteThreadData(threadId);
      } catch (error) {
        console.error(
          `Failed to delete IndexedDB data for thread ${threadId}:`,
          error
        );
      }
    },
  };
}

export function useMarkThreadAsResolved() {
  const config = getConfig();

  if (!config) {
    throw new Error("Configuration not found");
  }

  return {
    trigger: async ({
      threadId,
      assistantId,
    }: {
      threadId: string;
      assistantId?: string;
    }) => {
      const client = new Client({
        apiUrl: config.deploymentUrl,
      });

      // Get the assistant ID from config if not provided
      const finalAssistantId = assistantId || config.assistantId;

      // Mark thread as resolved by sending a goto command
      await client.runs.create(threadId, finalAssistantId, {
        command: { goto: "__end__", update: null },
        metadata: {
          langfuse_user_id: config.userId || "user",
        },
      });
    },
  };
}
