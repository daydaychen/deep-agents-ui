"use client";

import { Message } from "@langchain/langgraph-sdk";
import type { BaseStream, MessageMetadata } from "@langchain/langgraph-sdk/react";
import { Bot, Clock, GitFork, User } from "lucide-react";
import { useTranslations } from "next-intl";
import React, { useMemo } from "react";
import { MessageToolbar } from "@/app/components/MessageToolbar";
import { MessageContent } from "@/app/components/message/MessageContent";
import { OrphanedApprovals } from "@/app/components/message/OrphanedApprovals";
import { SubAgentSection } from "@/app/components/message/SubAgentSection";
import { ToolCallBox } from "@/app/components/ToolCallBox";
import { useOrphanedActionRequests } from "@/app/hooks/message/useOrphanedActionRequests";
import type { StateType } from "@/app/hooks/useChat";
import type {
  ActionRequest,
  ReviewConfig,
  SubAgent,
  ToolCall,
  UiComponent,
} from "@/app/types/types";
import { extractStringFromMessageContent, formatDate } from "@/app/utils/utils";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/providers/chat-store-provider";

const DEFAULT_SUB_AGENTS: SubAgent[] = [];
const DEFAULT_BRANCH_OPTIONS: string[] = [];

interface ChatMessageProps {
  message: Message;
  messageIndex: number;
  toolCalls: ToolCall[];
  subAgents?: SubAgent[];
  isLoading?: boolean;
  isStreaming?: boolean;
  actionRequestsMap?: Map<string, ActionRequest>;
  reviewConfigsMap?: Map<string, ReviewConfig>;
  ui?: UiComponent[];
  stream?: BaseStream<StateType>;
  onResumeInterrupt?: (value: unknown) => void;
  onRetry?: (message: Message, index: number) => void;
  onEdit?: (editedMessage: Message, index: number) => void;
  getMessagesMetadata?: (
    message: Message,
    index?: number,
  ) => MessageMetadata<StateType> | undefined;
  setBranch?: (branch: string) => void;
  graphId?: string;
  branchOptions?: string[];
  currentBranchIndex?: number;
  canRetry?: boolean;
  activeSubAgentId?: string | null;
  setActiveSubAgentId?: (id: string | null) => void;
}

export const ChatMessage = React.memo<ChatMessageProps>(
  ({
    message,
    messageIndex,
    toolCalls,
    subAgents = DEFAULT_SUB_AGENTS,
    isLoading,
    isStreaming,
    actionRequestsMap,
    reviewConfigsMap,
    ui,
    stream,
    onResumeInterrupt,
    onRetry,
    onEdit,
    graphId,
    branchOptions = DEFAULT_BRANCH_OPTIONS,
    currentBranchIndex = 0,
    setBranch,
    canRetry = false,
    activeSubAgentId,
    setActiveSubAgentId,
    getMessagesMetadata,
  }) => {
    const config = useChatStore((s) => s.config);
    const tChat = useTranslations("chat");
    const tCommon = useTranslations("common");

    // Memoize computed values to prevent unnecessary re-computations
    const isUser = message.type === "human";
    const userName = config?.userId || tCommon("appName");
    const displayName = isUser ? userName : tCommon("appName");
    const messageContent = useMemo(() => extractStringFromMessageContent(message), [message]);
    const hasContent = messageContent && messageContent.trim() !== "";
    const hasToolCalls = toolCalls.length > 0;

    // Memoize UI lookup map for O(1) access instead of .find() per tool call
    const uiByToolCallId = useMemo(() => {
      if (!ui) return new Map<string, UiComponent>();
      const map = new Map<string, UiComponent>();
      for (const u of ui) {
        const toolCallId = u.metadata?.tool_call_id;
        if (toolCallId) {
          map.set(toolCallId, u);
        }
      }
      return map;
    }, [ui]);

    // Find orphaned action requests
    const orphanedApprovals = useOrphanedActionRequests(
      actionRequestsMap,
      reviewConfigsMap,
      toolCalls,
    );

    const hasMultipleBranches = branchOptions && branchOptions.length > 1;

    // Get metadata for timestamp
    const metadata = getMessagesMetadata?.(message, messageIndex);
    const createdAt = metadata?.firstSeenState?.created_at;

    return (
      <div
        className={cn(
          "group flex w-full max-w-full gap-3 overflow-x-hidden px-4 py-2.5 transition-colors hover:bg-muted/5",
        )}
      >
        {/* Avatar Container */}
        <div className="flex flex-shrink-0 flex-col items-center pt-0.5">
          <div
            className={cn(
              "flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border shadow-sm transition-[background-color,border-color,color,box-shadow] duration-200",
              isUser
                ? "border-zinc-800 bg-zinc-900 text-white dark:border-zinc-200 dark:bg-zinc-100 dark:text-zinc-900"
                : "bg-primary/10 border-primary/20 text-primary shadow-primary/5",
            )}
          >
            {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
          </div>
        </div>

        {/* Message Content Area */}
        <div
          className={cn(
            "flex min-w-0 flex-col gap-0.5",
            isUser ? "max-w-[85%] items-start" : "max-w-[95%] flex-1",
          )}
        >
          {/* Sender Name/Label & Branch Indicator */}
          <div className={cn("mb-0.5 flex w-full items-center justify-between")}>
            <div className="flex items-center gap-2">
              <div className="flex items-center px-1 text-2xs font-bold uppercase tracking-[0.15em] text-muted-foreground/40">
                {displayName}
              </div>
              {createdAt && (
                <div className="flex items-center gap-1 text-2xs font-medium text-muted-foreground/30">
                  <Clock className="h-2 w-2" />
                  <span>{formatDate(createdAt)}</span>
                </div>
              )}
            </div>

            {hasMultipleBranches && (
              <div
                className={cn(
                  "flex items-center gap-1 rounded-full border border-accent/30 bg-accent/20 px-1.5 py-0.5 text-2xs font-medium text-muted-foreground/60 transition-opacity group-hover:opacity-0",
                  "ml-2",
                )}
              >
                <GitFork className="h-2 w-2 opacity-50" />
                <span>
                  {currentBranchIndex + 1} / {branchOptions.length}
                </span>
              </div>
            )}
          </div>

          {(hasContent ||
            (!isUser && (message.additional_kwargs?.reasoning_content as string | undefined))) && (
            <div
              className={cn(
                "relative min-w-0 overflow-hidden",
                "ml-0.5 w-full border-l-2 border-muted/30 pl-2 text-left !dark:border-white/5",
              )}
            >
              <MessageContent
                content={messageContent}
                isUser={isUser}
                isStreaming={isStreaming}
                reasoningContent={
                  message.additional_kwargs?.reasoning_content as string | undefined
                }
              />
            </div>
          )}

          {/* 2. Tool Calls */}
          {hasToolCalls && (
            <div
              className={cn(
                "flex w-full min-w-0 flex-col gap-2",
                hasContent ? "mt-2" : "mt-0.5",
                !isUser && "ml-0.5 border-l-2 border-muted/30 pl-2 !dark:border-white/5",
              )}
            >
              {!isUser && (
                <div className="mb-0.5 flex items-center gap-2 px-1">
                  <div className="h-[1px] flex-1 bg-border/40 dark:bg-border/30" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 dark:text-muted-foreground/50">
                    {tChat("coreExecution")}
                  </span>
                  <div className="h-[1px] flex-1 bg-border/40 dark:bg-border/30" />
                </div>
              )}
              {toolCalls.map((toolCall: ToolCall) => {
                if (toolCall.name === "task") return null;
                // O(1) lookup from memoized map instead of .find()
                const toolCallGenUiComponent = uiByToolCallId.get(toolCall.id);
                const actionRequest = actionRequestsMap?.get(toolCall.name);
                const reviewConfig = reviewConfigsMap?.get(toolCall.name);
                return (
                  <ToolCallBox
                    key={toolCall.id}
                    toolCall={toolCall}
                    uiComponent={toolCallGenUiComponent}
                    stream={stream}
                    graphId={graphId}
                    actionRequest={actionRequest}
                    reviewConfig={reviewConfig}
                    onResume={onResumeInterrupt}
                    isLoading={isLoading}
                    messageId={message.id}
                  />
                );
              })}
            </div>
          )}

          {/* 3. SubAgent Section */}
          {!isUser && (
            <div
              className={cn(
                "flex w-full min-w-0 flex-col",
                "ml-0.5 border-l-2 border-muted/30 pl-2 !dark:border-white/5",
              )}
            >
              <SubAgentSection
                subAgents={subAgents}
                activeSubAgentId={activeSubAgentId}
                setActiveSubAgentId={setActiveSubAgentId}
                actionRequestsMap={actionRequestsMap}
                reviewConfigsMap={reviewConfigsMap}
                onResumeInterrupt={onResumeInterrupt}
                isLoading={isLoading}
                messageId={message.id}
              />
            </div>
          )}

          {/* 4. Orphaned Approvals */}
          {!isUser && onResumeInterrupt && (
            <OrphanedApprovals
              orphanedApprovals={orphanedApprovals}
              onResumeInterrupt={onResumeInterrupt}
              isLoading={isLoading}
            />
          )}

          {/* 5. Message Toolbar */}
          <div
            className={cn(
              "mt-1.5 translate-y-1 transform opacity-0 transition-[opacity,transform] duration-300 group-hover:translate-y-0 group-hover:opacity-100",
            )}
          >
            <MessageToolbar
              messageContent={messageContent}
              isUser={isUser}
              isLoading={isLoading}
              onRetry={canRetry && onRetry ? () => onRetry(message, messageIndex) : undefined}
              showRetry={canRetry}
              onEdit={onEdit ? (editedMessage) => onEdit(editedMessage, messageIndex) : undefined}
              showEdit={isUser}
              branchOptions={branchOptions}
              currentBranchIndex={currentBranchIndex}
              onSelectBranch={setBranch}
              showBranchSwitcher={!!setBranch && branchOptions.length > 0}
              message={message}
            />
          </div>
        </div>
      </div>
    );
  },
);

ChatMessage.displayName = "ChatMessage";
