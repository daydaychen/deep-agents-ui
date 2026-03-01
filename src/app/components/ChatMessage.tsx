"use client";

import { MessageContent } from "@/app/components/message/MessageContent";
import { OrphanedApprovals } from "@/app/components/message/OrphanedApprovals";
import { SubAgentSection } from "@/app/components/message/SubAgentSection";
import { MessageToolbar } from "@/app/components/MessageToolbar";
import { ToolCallBox } from "@/app/components/ToolCallBox";
import { useOrphanedActionRequests } from "@/app/hooks/message/useOrphanedActionRequests";
import { useSubAgents } from "@/app/hooks/message/useSubAgents";
import type { StateType } from "@/app/hooks/useChat";
import type { ActionRequest, ReviewConfig, ToolCall } from "@/app/types/types";
import { extractStringFromMessageContent, formatDate } from "@/app/utils/utils";
import { cn } from "@/lib/utils";
import { useChatState } from "@/providers/chat-context";
import { Message } from "@langchain/langgraph-sdk";
import type { MessageMetadata } from "@langchain/langgraph-sdk/react";
import { Bot, Clock, GitFork, User } from "lucide-react";
import React from "react";

const ASSISTANT_NAME = "Databus Pilot";

interface ChatMessageProps {
  message: Message;
  messageIndex: number;
  toolCalls: ToolCall[];
  isLoading?: boolean;
  actionRequestsMap?: Map<string, ActionRequest>;
  reviewConfigsMap?: Map<string, ReviewConfig>;
  ui?: any[];
  stream?: any;
  onResumeInterrupt?: (value: any) => void;
  onRetry?: (message: Message, index: number) => void;
  onEdit?: (editedMessage: Message, index: number) => void;
  getMessagesMetadata?: (
    message: Message,
    index?: number
  ) => MessageMetadata<StateType> | undefined;
  setBranch?: (branch: string) => void;
  graphId?: string;
  subagentMessagesMap?: Map<string, Message[]>;
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
    isLoading,
    actionRequestsMap,
    reviewConfigsMap,
    ui,
    stream,
    onResumeInterrupt,
    onRetry,
    onEdit,
    graphId,
    branchOptions = [],
    currentBranchIndex = 0,
    setBranch,
    canRetry = false,
    activeSubAgentId,
    setActiveSubAgentId,
    subagentMessagesMap,
    getMessagesMetadata,
  }) => {
    const { config } = useChatState();
    const isUser = message.type === "human";
    const userName = config?.userId || "User Protocol";
    const displayName = isUser ? userName : ASSISTANT_NAME;
    const messageContent = extractStringFromMessageContent(message);
    const hasContent = messageContent && messageContent.trim() !== "";
    const hasToolCalls = toolCalls.length > 0;

    // Use custom hook to extract subagents
    const subAgents = useSubAgents(toolCalls, subagentMessagesMap);

    // Find orphaned action requests
    const orphanedApprovals = useOrphanedActionRequests(
      actionRequestsMap,
      reviewConfigsMap,
      toolCalls
    );

    const hasMultipleBranches = branchOptions && branchOptions.length > 1;

    // Get metadata for timestamp
    const metadata = getMessagesMetadata?.(message, messageIndex);
    const createdAt = metadata?.firstSeenState?.created_at;

    return (
      <div
        className={cn(
          "group flex w-full max-w-full overflow-x-hidden gap-3 py-3 px-4 transition-colors hover:bg-muted/5"
        )}
      >
        {/* Avatar Container */}
        <div className="flex flex-shrink-0 flex-col items-center pt-0.5">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-xl border shadow-sm transition-[background-color,border-color,color,box-shadow,transform] duration-300",
              isUser
                ? "bg-zinc-900 border-zinc-800 text-white dark:bg-zinc-100 dark:border-zinc-200 dark:text-zinc-900"
                : "bg-primary/10 border-primary/20 text-primary shadow-primary/5"
            )}
          >
            {isUser ? (
              <User className="h-4 w-4" />
            ) : (
              <Bot className="h-4 w-4" />
            )}
          </div>
        </div>

        {/* Message Content Area */}
        <div
          className={cn(
            "flex min-w-0 flex-col gap-1",
            isUser ? "max-w-[85%] items-start" : "flex-1 max-w-[95%]"
          )}
        >
          {/* Sender Name/Label & Branch Indicator */}
          <div
            className={cn(
              "flex items-center justify-between w-full mb-0.5"
            )}
          >
            <div className="flex items-center gap-2">
              <div className="flex items-center px-1 text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/40">
                {displayName}
              </div>
              {createdAt && (
                <div className="flex items-center gap-1 text-[9px] text-muted-foreground/30 font-medium">
                  <Clock className="h-2 w-2" />
                  <span>{formatDate(createdAt)}</span>
                </div>
              )}
            </div>
            
            {hasMultipleBranches && (
              <div className={cn(
                "flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-accent/20 border border-accent/30 text-[9px] font-medium text-muted-foreground/60 transition-opacity group-hover:opacity-0",
                "ml-2"
              )}>
                <GitFork className="h-2 w-2 opacity-50" />
                <span>{currentBranchIndex + 1} / {branchOptions.length}</span>
              </div>
            )}
          </div>

          {/* 1. Text Content (Message Bubble) */}
          {hasContent && (
            <div className={cn(
              "relative min-w-0 overflow-hidden",
              "text-left w-full pl-2 border-l-2 border-muted/30 ml-0.5"
            )}>
              <MessageContent
                content={messageContent}
                isUser={isUser}
              />
            </div>
          )}

          {/* 2. Tool Calls */}
          {hasToolCalls && (
            <div className={cn(
              "flex w-full min-w-0 flex-col gap-2", 
              hasContent ? "mt-2" : "mt-0.5",
              !isUser && "pl-2 border-l-2 border-muted/30 ml-0.5"
            )}>
              {!isUser && (
                <div className="flex items-center gap-2 px-1 mb-0.5 opacity-40">
                  <div className="h-[1px] flex-1 bg-border" />
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em]">Core Execution</span>
                  <div className="h-[1px] flex-1 bg-border" />
                </div>
              )}
              {toolCalls.map((toolCall: ToolCall) => {
                if (toolCall.name === "task") return null;
                const toolCallGenUiComponent = ui?.find(
                  (u) => u.metadata?.tool_call_id === toolCall.id
                );
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
              "opacity-0 group-hover:opacity-100 transition-[opacity,transform] duration-300 mt-1.5 transform translate-y-1 group-hover:translate-y-0"
            )}
          >
            <MessageToolbar
              messageContent={messageContent}
              isUser={isUser}
              isLoading={isLoading}
              onRetry={
                canRetry && onRetry
                  ? () => onRetry(message, messageIndex)
                  : undefined
              }
              showRetry={canRetry}
              onEdit={
                onEdit
                  ? (editedMessage) => onEdit(editedMessage, messageIndex)
                  : undefined
              }
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
  }
);

ChatMessage.displayName = "ChatMessage";
