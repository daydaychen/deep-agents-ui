"use client";

import { MessageContent } from "@/app/components/message/MessageContent";
import { SubAgentSection } from "@/app/components/message/SubAgentSection";
import { MessageToolbar } from "@/app/components/MessageToolbar";
import { ToolCallBox } from "@/app/components/ToolCallBox";
import type { UIMessage, UIToolCall, UISubAgent } from "@/app/types/messages";
import { extractStringFromMessageContent, formatDate } from "@/app/utils/utils";
import { cn } from "@/lib/utils";
import { useChatState } from "@/providers/chat-context";
import { Bot, Clock, GitFork, User } from "lucide-react";
import React, { useMemo } from "react";

const ASSISTANT_NAME = "Databus Pilot";

interface ChatMessageProps {
  message: UIMessage;
  messageIndex: number;
  toolCalls: UIToolCall[];
  subAgents?: UISubAgent[];
  isLoading?: boolean;
  isStreaming?: boolean;
  onRetry?: (message: UIMessage, index: number) => void;
  onEdit?: (editedMessage: UIMessage, index: number) => void;
  setBranch?: (branch: string) => void;
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
    subAgents = [],
    isLoading,
    isStreaming,
    onRetry,
    onEdit,
    branchOptions = [],
    currentBranchIndex = 0,
    setBranch,
    canRetry = false,
    activeSubAgentId,
    setActiveSubAgentId,
  }) => {
    const { config } = useChatState();

    const isUser = message.role === "user";
    const userName = config?.userId || "User Protocol";
    const displayName = isUser ? userName : ASSISTANT_NAME;
    const messageContent = useMemo(
      () => extractStringFromMessageContent(message),
      [message]
    );
    const hasContent = messageContent && messageContent.trim() !== "";
    const hasToolCalls = toolCalls.length > 0;

    const hasMultipleBranches = branchOptions && branchOptions.length > 1;

    // Get timestamp from metadata
    const createdAt = message.metadata?.created_at;

    return (
      <div
        className={cn(
          "group flex w-full max-w-full overflow-x-hidden gap-3 py-2.5 px-4 transition-colors hover:bg-muted/5"
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
            "flex min-w-0 flex-col gap-0.5",
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
              <div className="flex items-center px-1 text-2xs font-bold uppercase tracking-[0.15em] text-muted-foreground/40">
                {displayName}
              </div>
              {createdAt && (
                <div className="flex items-center gap-1 text-2xs text-muted-foreground/30 font-medium">
                  <Clock className="h-2 w-2" />
                  <span>{formatDate(createdAt)}</span>
                </div>
              )}
            </div>

            {hasMultipleBranches && (
              <div className={cn(
                "flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-accent/20 border border-accent/30 text-2xs font-medium text-muted-foreground/60 transition-opacity group-hover:opacity-0",
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
                isStreaming={isStreaming}
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
                <div className="flex items-center gap-2 px-1 mb-0.5 opacity-20">
                  <div className="h-[1px] flex-1 bg-border" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Core Execution</span>
                  <div className="h-[1px] flex-1 bg-border" />
                </div>
              )}
              {toolCalls.map((toolCall) => {
                if (toolCall.name === "Agent") return null;
                return (
                  <ToolCallBox
                    key={toolCall.id}
                    toolCall={toolCall}
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
              isLoading={isLoading}
              messageId={message.id}
            />
          )}

          {/* 4. Message Toolbar */}
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
                  ? (editedMessage) => onEdit(editedMessage as UIMessage, messageIndex)
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
