"use client";

import type { TodoItem } from "@/app/types/types";
import type { StandaloneConfig } from "@/lib/config";
import { useClient } from "@/providers/ClientProvider";
import {
  type Assistant,
  type Checkpoint,
  type Message,
} from "@langchain/langgraph-sdk";
import type { UseStreamThread } from "@langchain/langgraph-sdk/react";
import { useStream } from "@langchain/langgraph-sdk/react";
import { useQueryState } from "nuqs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { usePersistedMessages } from "./usePersistedMessages";

export type StateType = {
  messages: Message[];
  todos: TodoItem[];
  files: Record<string, string>;
  email?: {
    id?: string;
    subject?: string;
    page_content?: string;
  };
  ui?: any;
};

export function useChat({
  activeAssistant,
  onHistoryRevalidate,
  thread,
  recursionLimit = 100,
  config,
}: {
  activeAssistant: Assistant | null;
  onHistoryRevalidate?: () => void;
  thread?: UseStreamThread<StateType>;
  recursionLimit?: number;
  config: StandaloneConfig;
}) {
  const [threadId, setThreadId] = useQueryState("threadId");
  const client = useClient();
  const [sessionId, setSessionId] = useState<string>(() => uuidv4());

  // Manage session_id: reuse from thread metadata or generate new one
  useEffect(() => {
    const fetchSessionId = async () => {
      if (threadId && client) {
        try {
          const threadData = await client.threads.get(threadId);
          const existingSessionId = threadData.metadata?.langfuse_session_id as
            | string
            | undefined;
          if (existingSessionId) {
            setSessionId(existingSessionId);
          } else {
            // Thread exists but no session_id, generate and potentially update
            setSessionId(uuidv4());
          }
        } catch (error) {
          // Failed to fetch thread, generate new session_id
          console.warn("Failed to fetch thread metadata:", error);
          setSessionId(uuidv4());
        }
      } else {
        // New thread, generate new session_id
        setSessionId(uuidv4());
      }
    };

    fetchSessionId();
  }, [threadId, client]);

  const stream = useStream<StateType>({
    assistantId: activeAssistant?.assistant_id || "",
    client: client ?? undefined,
    reconnectOnMount: true,
    threadId: threadId ?? null,
    onThreadId: setThreadId,
    defaultHeaders: { "x-auth-scheme": "langsmith" },
    // Revalidate thread list when stream finishes, errors, or creates new thread
    onFinish: onHistoryRevalidate,
    onError: onHistoryRevalidate,
    onCreated: onHistoryRevalidate,
    fetchStateHistory: true,
    thread: thread,
  });

  // Use persisted messages to maintain continuity during interrupt/history refetch
  const {
    messages: persistedMessages,
    metadataMap,
    cacheOnlyMessageIds,
    syncStatus,
  } = usePersistedMessages(
    threadId,
    stream.messages,
    stream.isLoading,
    stream.getMessagesMetadata
  );

  // Compute branch information from experimental_branchTree
  // Parse experimental_branchTree for advanced branch management
  const branchTreeInfo = useMemo(() => {
    const tree = stream.experimental_branchTree;

    if (!tree) {
      return {
        branches: ["main"],
        branchMap: new Map<
          string,
          { branch: string; branchOptions: string[] }
        >(),
        activePath: [],
        treeStructure: null,
        messageBranchInfo: new Map<
          string,
          { branch: string; branchOptions: string[] }
        >(),
      };
    }

    // Helper to parse tree structure
    const parseBranchTree = (
      node: any,
      parentPath: string[] = [],
      parentForkCheckpoint: string | null = null
    ): any => {
      if (!node || typeof node !== "object") {
        return null;
      }

      // Extract checkpoint information from path array
      // path[0] = parent_checkpoint_id, path[1] = this node's checkpoint_id
      let checkpoint = node.value?.checkpoint?.checkpoint_id;
      let parentCheckpointFromPath: string | null = null;

      if (Array.isArray(node.path) && node.path.length >= 2) {
        // path[0] is parent_checkpoint_id, path[1] is this node's checkpoint_id
        parentCheckpointFromPath = node.path[0];
        if (!checkpoint && node.path[1]) {
          checkpoint = node.path[1];
        }
      }

      const result: any = {
        type: node.type,
        path: node.path || [],
        checkpoint,
        parentCheckpointFromPath,
        parentPath: [...parentPath],
        parentForkCheckpoint,
        children: [],
        isFork: node.type === "fork",
        isSequence: node.type === "sequence",
        isNode: node.type === "node",
      };

      // For fork nodes, each child is a branch
      if (node.type === "fork" && Array.isArray(node.items)) {
        const forkCheckpoint =
          checkpoint || node.value?.checkpoint?.checkpoint_id;
        result.children = node.items
          .map((child: any, index: number) =>
            parseBranchTree(
              child,
              [...parentPath, `fork-${index}`],
              forkCheckpoint
            )
          )
          .filter(Boolean);
        result.branchOptions = result.children
          .map((child: any) => child.checkpoint)
          .filter(Boolean);
      }
      // For sequence nodes, items are in order
      else if (node.type === "sequence" && Array.isArray(node.items)) {
        // Only the first node in sequence has path property
        let sequenceParentCheckpoint = parentForkCheckpoint;
        result.children = node.items
          .map((item: any, index: number) => {
            // For first item in sequence, use its path info
            if (
              index === 0 &&
              Array.isArray(item.path) &&
              item.path.length >= 2
            ) {
              sequenceParentCheckpoint = item.path[0];
            }
            return parseBranchTree(
              item,
              [...parentPath, `seq-${index}`],
              sequenceParentCheckpoint
            );
          })
          .filter(Boolean);
      }

      return result;
    };

    const parsedTree = parseBranchTree(tree);

    // Build map from checkpoints to branch info
    const branchMap = new Map<
      string,
      { branch: string; branchOptions: string[] }
    >();
    const messageBranchInfo = new Map<
      string,
      { branch: string; branchOptions: string[] }
    >();

    const buildBranchMaps = (node: any) => {
      if (!node) return;

      // If this is a fork node, its children are branches
      if (node.isFork && node.items) {
        const forkCheckpoint = node.checkpoint;
        const branchOptions = node.items
          .map((child: any) => child.checkpoint)
          .filter(Boolean);

        // Add fork node itself to branchMap
        if (forkCheckpoint) {
          branchMap.set(forkCheckpoint, {
            branch: forkCheckpoint,
            branchOptions,
          });
        }

        // Add each child branch
        node.items.forEach((child: any) => {
          if (child.checkpoint) {
            branchMap.set(child.checkpoint, {
              branch: child.checkpoint,
              branchOptions,
            });
          }
        });
      }

      // For node items, record their branch info
      if (node.isNode && node.checkpoint) {
        // Priority: parentCheckpointFromPath (from path array) > parentForkCheckpoint > "main"
        const parentCheckpoint =
          node.parentCheckpointFromPath || node.parentForkCheckpoint;

        if (parentCheckpoint) {
          // This node is part of a branch
          const parentInfo = branchMap.get(parentCheckpoint);
          if (parentInfo) {
            messageBranchInfo.set(node.checkpoint, {
              branch: parentCheckpoint,
              branchOptions: parentInfo.branchOptions,
            });
          } else {
            // If parent not in branchMap, check if it's a fork node
            messageBranchInfo.set(node.checkpoint, {
              branch: parentCheckpoint,
              branchOptions: [],
            });
          }
        } else if (node.checkpoint) {
          // This node is in the main branch
          messageBranchInfo.set(node.checkpoint, {
            branch: "main",
            branchOptions: [],
          });
        }
      }

      // Recursively process children
      if (Array.isArray(node.items)) {
        node.items.forEach(buildBranchMaps);
      }
    };

    buildBranchMaps(parsedTree);

    // Also process messages to get branch info from metadata
    stream.messages.forEach((message, index) => {
      const metadata = stream.getMessagesMetadata(message, index);
      const checkpointId = metadata?.firstSeenState?.checkpoint?.checkpoint_id;

      if (checkpointId && !messageBranchInfo.has(checkpointId)) {
        // Try to find branch info from metadata
        const branchFromMeta = metadata?.branch;
        const branchOptionsFromMeta = metadata?.branchOptions;

        if (branchFromMeta && typeof branchFromMeta === "string") {
          messageBranchInfo.set(checkpointId, {
            branch: branchFromMeta,
            branchOptions: Array.isArray(branchOptionsFromMeta)
              ? branchOptionsFromMeta.filter((b: any) => typeof b === "string")
              : [],
          });
        }
      }
    });

    // Calculate active path based on current branch
    let activePath: string[] = [];
    if (stream.branch && typeof stream.branch === "string") {
      const findPathToCheckpoint = (
        node: any,
        targetCheckpoint: string,
        currentPath: string[] = []
      ): string[] | null => {
        if (!node) return null;

        // Add this node's checkpoint to path if it exists
        const newPath = node.checkpoint
          ? [...currentPath, node.checkpoint]
          : [...currentPath];

        if (node.checkpoint === targetCheckpoint) {
          return newPath;
        }

        // Also check parentCheckpointFromPath for nodes that might be referenced by their parent
        if (
          node.parentCheckpointFromPath === targetCheckpoint &&
          node.checkpoint
        ) {
          return [
            ...currentPath,
            node.parentCheckpointFromPath,
            node.checkpoint,
          ];
        }

        if (Array.isArray(node.items)) {
          for (const child of node.items) {
            const childPath = findPathToCheckpoint(
              child,
              targetCheckpoint,
              newPath
            );
            if (childPath) return childPath;
          }
        }

        return null;
      };

      const path = findPathToCheckpoint(parsedTree, stream.branch);
      if (path) {
        activePath = path;
      }
    }

    // Collect all unique branches
    const branches = new Set<string>();
    branches.add("main");

    // Add branches from branchMap
    branchMap.forEach((value) => {
      branches.add(value.branch);
      value.branchOptions.forEach((branch) => branches.add(branch));
    });

    // Also add from messages metadata as fallback
    stream.messages.forEach((message, index) => {
      const metadata = stream.getMessagesMetadata(message, index);
      if (metadata?.branch && typeof metadata.branch === "string") {
        branches.add(metadata.branch.trim());
      }
      if (metadata?.branchOptions && Array.isArray(metadata.branchOptions)) {
        metadata.branchOptions.forEach((branch) => {
          if (typeof branch === "string") {
            branches.add(branch.trim());
          }
        });
      }
    });

    return {
      branches: Array.from(branches).sort(),
      branchMap,
      activePath,
      treeStructure: parsedTree,
      messageBranchInfo,
    };
  }, [stream]);

  const sendMessage = useCallback(
    (content: string) => {
      const newMessage: Message = { id: uuidv4(), type: "human", content };
      stream.submit(
        { messages: [newMessage] },
        {
          optimisticValues: (prev) => ({
            messages: [...(prev.messages ?? []), newMessage],
          }),
          metadata: {
            langfuse_session_id: sessionId,
            langfuse_user_id: config.userId || "user",
          },
          config: {
            ...(activeAssistant?.config ?? {}),
            recursion_limit: recursionLimit,
          },
          streamMode: ["messages", "updates"],
          streamSubgraphs: true,
          streamResumable: true,
        }
      );
    },
    [stream, sessionId, config.userId, activeAssistant?.config, recursionLimit]
  );

  const runSingleStep = useCallback(
    (
      messages: Message[],
      checkpoint?: Checkpoint,
      isRerunningSubagent?: boolean,
      optimisticMessages?: Message[]
    ) => {
      if (checkpoint) {
        stream.submit(undefined, {
          ...(optimisticMessages
            ? { optimisticValues: { messages: optimisticMessages } }
            : {}),
          metadata: {
            langfuse_session_id: sessionId,
            langfuse_user_id: config.userId || "user",
          },
          config: activeAssistant?.config,
          checkpoint: checkpoint,
          streamMode: ["messages", "updates"],
          streamSubgraphs: true,
          streamResumable: true,
          ...(isRerunningSubagent
            ? { interruptAfter: ["tools"] }
            : { interruptBefore: ["tools"] }),
        });
      } else {
        stream.submit(
          { messages },
          {
            metadata: {
              langfuse_session_id: sessionId,
              langfuse_user_id: config.userId || "user",
            },
            config: activeAssistant?.config,
            interruptBefore: ["tools"],
            streamMode: ["messages", "updates"],
            streamSubgraphs: true,
            streamResumable: true,
          }
        );
      }
    },
    [stream, sessionId, config.userId, activeAssistant?.config]
  );

  const setFiles = useCallback(
    async (files: Record<string, string>) => {
      if (!threadId) return;
      // TODO: missing a way how to revalidate the internal state
      // I think we do want to have the ability to externally manage the state
      await client.threads.updateState(threadId, { values: { files } });
    },
    [client, threadId]
  );

  const continueStream = useCallback(
    (hasTaskToolCall?: boolean) => {
      stream.submit(undefined, {
        metadata: {
          langfuse_session_id: sessionId,
          langfuse_user_id: config.userId || "user",
        },
        config: {
          ...(activeAssistant?.config || {}),
          recursion_limit: recursionLimit,
        },
        streamMode: ["messages", "updates"],
        streamSubgraphs: true,
        streamResumable: true,
        ...(hasTaskToolCall
          ? { interruptAfter: ["tools"] }
          : { interruptBefore: ["tools"] }),
      });
    },
    [stream, sessionId, config.userId, activeAssistant?.config, recursionLimit]
  );

  const markCurrentThreadAsResolved = useCallback(() => {
    stream.submit(null, {
      command: { goto: "__end__", update: null },
      metadata: {
        langfuse_session_id: sessionId,
        langfuse_user_id: config.userId || "user",
      },
    });
    // Update thread list when marking thread as resolved
    onHistoryRevalidate?.();
  }, [stream, sessionId, config.userId, onHistoryRevalidate]);

  const resumeInterrupt = useCallback(
    (value: any) => {
      stream.submit(null, {
        command: { resume: value },
        metadata: {
          langfuse_session_id: sessionId,
          langfuse_user_id: config.userId || "user",
        },
        streamMode: ["messages", "updates"],
        streamSubgraphs: true,
        streamResumable: true,
      });
    },
    [stream, sessionId, config.userId]
  );

  const stopStream = useCallback(() => {
    stream.stop();
  }, [stream]);

  const retryFromMessage = useCallback(
    (message: Message, index: number) => {
      const metadata = stream.getMessagesMetadata(message, index);
      if (!metadata?.firstSeenState?.parent_checkpoint) {
        console.warn("No parent checkpoint found for message", message.id);
        return;
      }

      // Submit from the parent checkpoint to re-execute from that point
      // This creates a new branch in the conversation
      stream.submit(undefined, {
        config: activeAssistant?.config,
        checkpoint: metadata.firstSeenState.parent_checkpoint,
        metadata: {
          langfuse_session_id: sessionId,
          langfuse_user_id: config.userId || "user",
        },
        streamMode: ["messages", "updates"],
        streamSubgraphs: true,
        streamResumable: true,
      });

      // Update thread list when retrying
      onHistoryRevalidate?.();
    },
    [
      stream,
      activeAssistant?.config,
      sessionId,
      config.userId,
      onHistoryRevalidate,
    ]
  );

  const editMessage = useCallback(
    (message: Message, index: number) => {
      const metadata = stream.getMessagesMetadata(message, index);
      if (!metadata?.firstSeenState?.parent_checkpoint) {
        console.warn("No parent checkpoint found for message", message.id);
        return;
      }

      // Submit the edited message from the parent checkpoint
      // This creates a new branch with the edited message
      stream.submit(
        { messages: [message] },
        {
          config: activeAssistant?.config,
          checkpoint: metadata.firstSeenState.parent_checkpoint,
          metadata: {
            langfuse_session_id: sessionId,
            langfuse_user_id: config.userId || "user",
          },
          streamMode: ["messages", "updates"],
          streamSubgraphs: true,
          streamResumable: true,
        }
      );

      // Update thread list when editing
      onHistoryRevalidate?.();
    },
    [
      stream,
      activeAssistant?.config,
      sessionId,
      config.userId,
      onHistoryRevalidate,
    ]
  );

  // Helper function to get branch information for a specific message
  const getMessageBranchInfo = useCallback(
    (message: Message, index: number) => {
      const metadata = stream.getMessagesMetadata?.(message, index);

      // Get branch information for this message
      // Priority: messageBranchInfo (from experimental_branchTree) > branchMap > metadata.branchOptions > ["main"]
      let messageBranch = metadata?.branch || stream?.branch;
      let messageBranchOptions = metadata?.branchOptions || ["main"];

      // First try to get branch info from messageBranchInfo using checkpoint

      if (
        branchTreeInfo.messageBranchInfo &&
        metadata?.firstSeenState?.checkpoint
      ) {
        const checkpoint = metadata.firstSeenState.checkpoint;
        // Convert checkpoint to string (checkpoint_id)
        const checkpointId = checkpoint.checkpoint_id || "";
        const branchInfo = branchTreeInfo.messageBranchInfo.get(checkpointId);
        if (branchInfo) {
          messageBranch = branchInfo.branch;
          messageBranchOptions =
            branchInfo.branchOptions.length > 0
              ? branchInfo.branchOptions
              : messageBranchOptions;
        }
      }
      // Fallback to branchMap
      else if (
        branchTreeInfo.branchMap &&
        metadata?.firstSeenState?.checkpoint
      ) {
        const checkpoint = metadata.firstSeenState.checkpoint;
        const checkpointId = checkpoint.checkpoint_id || "";
        const branchInfo = branchTreeInfo.branchMap.get(checkpointId);
        if (branchInfo) {
          messageBranch = branchInfo.branch;
          messageBranchOptions =
            branchInfo.branchOptions.length > 0
              ? branchInfo.branchOptions
              : messageBranchOptions;
        }
      }

      // Ensure we always have at least the stream branch

      if (!messageBranch && stream?.branch) {
        messageBranch = stream.branch;
      }

      // Ensure we always have branch options

      if (!messageBranchOptions || messageBranchOptions.length === 0) {
        messageBranchOptions = ["main"];
      }

      // Format branch names: convert UUIDs to meaningful names like "分支1", "分支2"
      const formatBranchName = (branch: string): string => {
        if (branch === "main") return "主分支";

        // Check if it's a UUID-like string
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(branch)) {
          // Generate a deterministic number from the UUID
          const hash = branch.split("").reduce((acc, char) => {
            return acc + char.charCodeAt(0);
          }, 0);
          const branchNumber = (hash % 100) + 1;
          return `分支${branchNumber}`;
        }

        return branch;
      };

      const formatBranchOptions = (options: string[]): string[] => {
        return options.map(formatBranchName);
      };

      // Check if this message is cache-only (not in server history)
      const isCacheOnly = message.id && cacheOnlyMessageIds.has(message.id);

      // Determine if this message can be retried
      // Messages can only be retried if they:
      // 1. Exist in server history (not cache-only)
      // 2. Have a parent checkpoint to retry from
      // 3. Have retry functionality available
      const hasParentCheckpoint = !!metadata?.firstSeenState?.parent_checkpoint;
      const canRetry =
        !isCacheOnly && hasParentCheckpoint && !!retryFromMessage;

      return {
        branch: formatBranchName(messageBranch || "main"),

        branchOptions: formatBranchOptions(messageBranchOptions),

        canRetry,
      };
    },
    [stream, branchTreeInfo, retryFromMessage, cacheOnlyMessageIds]
  );

  const latestError = useMemo(() => {
    const error = stream.error as string | undefined;
    // Filter out CancelledError as it's not a real error
    if (error && error?.includes("CancelledError")) {
      return undefined;
    }
    return error;
  }, [stream.error]);

  return {
    stream,
    todos: stream.values.todos ?? [],
    files: stream.values.files ?? {},
    email: stream.values.email,
    ui: stream.values.ui,
    setFiles,
    messages: persistedMessages,
    metadataMap, // Expose cached metadata map for subagent messages
    syncStatus, // Expose sync status for UI indicators
    isLoading: stream.isLoading,
    isThreadLoading: stream.isThreadLoading,
    interrupt: stream.interrupt,
    getMessagesMetadata: stream.getMessagesMetadata,
    error: latestError,
    branch: stream.branch,
    setBranch: stream.setBranch,
    history: stream.history,
    getMessageBranchInfo,
    sendMessage,
    runSingleStep,
    continueStream,
    stopStream,
    markCurrentThreadAsResolved,
    resumeInterrupt,
    retryFromMessage,
    editMessage,
  };
}
