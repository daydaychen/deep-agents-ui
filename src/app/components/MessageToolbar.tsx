"use client";

import { BranchSwitcher } from "@/app/components/BranchSwitcher";
import { EditMessage } from "@/app/components/EditMessage";
import { formatTokenCount } from "@/app/utils/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { COPY_SUCCESS_DURATION_MS } from "@/lib/constants";
import { useLatest } from "@/lib/hooks/useLatest";
import { AIMessage, Message } from "@langchain/langgraph-sdk";
import { Check, Copy, Cpu, RotateCcw, Zap } from "lucide-react";
import React, { useCallback, useState } from "react";

const DEFAULT_BRANCH_OPTIONS: string[] = [];

interface MessageToolbarProps {
  // Message content
  messageContent: string;
  isUser: boolean;
  isLoading?: boolean;

  // Copy functionality
  onCopy?: () => void;

  // Edit functionality
  onEdit?: (message: Message) => void;
  showEdit?: boolean;

  // Retry functionality
  onRetry?: () => void;
  showRetry?: boolean;

  // Branch functionality
  branchOptions?: string[];
  currentBranchIndex: number;
  onSelectBranch?: (branch: string) => void;
  showBranchSwitcher?: boolean;

  // UI customization
  className?: string;
  // For EditMessage component
  message?: Message;
}

export const MessageToolbar = React.memo<MessageToolbarProps>(
  ({
    messageContent,
    isUser,
    isLoading = false,
    onCopy,
    onEdit,
    showEdit = false,
    onRetry,
    showRetry = false,
    branchOptions = DEFAULT_BRANCH_OPTIONS,
    currentBranchIndex,
    onSelectBranch,
    showBranchSwitcher = false,
    className,
    message,
  }) => {
    const hasContent = messageContent && messageContent.trim() !== "";
    const [copySuccess, setCopySuccess] = useState(false);

    // Use refs for values only read inside callbacks to avoid unnecessary re-renders
    const messageContentRef = useLatest(messageContent);
    const onCopyRef = useLatest(onCopy);

    const handleCopy = useCallback(() => {
      const currentMessageContent = messageContentRef.current;
      const currentOnCopy = onCopyRef.current;
      if (currentMessageContent && currentOnCopy) {
        currentOnCopy();
      } else if (currentMessageContent) {
        navigator.clipboard
          .writeText(currentMessageContent)
          .then(() => {
            setCopySuccess(true);
            // Reset success state after 2 seconds
            setTimeout(() => setCopySuccess(false), COPY_SUCCESS_DURATION_MS);
          })
          .catch((err) => {
            console.error("Failed to copy message:", err);
          });
      }
    }, [messageContentRef, onCopyRef]); 

    // Determine what's actually visible
    const hasVisibleCopyButton = hasContent && !isLoading;
    const hasVisibleEditButton =
      isUser && showEdit && hasContent && !isLoading && onEdit && message;
    const hasVisibleRetryButton = showRetry && !isLoading && onRetry;
    const hasVisibleBranchSwitcher =
      showBranchSwitcher && onSelectBranch && branchOptions.length > 0;

    // Metadata visibility - response_metadata is on BaseMessage, usage_metadata on AIMessage
    const modelName = (message?.response_metadata?.model_name ||
      message?.response_metadata?.model) as string | undefined;
    const modelProvider = message?.response_metadata?.model_provider as
      | string
      | undefined;
    const stopReason = message?.response_metadata?.stop_reason as
      | string
      | undefined;
    const usage =
      message?.type === "ai"
        ? (message as AIMessage).usage_metadata
        : undefined;
    const hasMetadata = !isUser && (!!modelName || !!usage);

    const hasAnyVisibleAction =
      hasVisibleCopyButton ||
      hasVisibleEditButton ||
      hasVisibleRetryButton ||
      hasVisibleBranchSwitcher ||
      hasMetadata;

    // If nothing to show, don't render anything at all
    if (!hasAnyVisibleAction) return null;

    const hasVisibleActionButtons =
      hasVisibleCopyButton || hasVisibleEditButton || hasVisibleRetryButton;

    return (
      <div className={className}>
        <div className={cn("flex items-center justify-between gap-4")}>
          {/* Left Side: Branch Switcher and Action Buttons */}
          <div className="flex items-center gap-2">
            {/* 1. Branch switcher */}
            {hasVisibleBranchSwitcher && (
              <BranchSwitcher
                branchOptions={branchOptions}
                currentIndex={currentBranchIndex}
                onSelect={onSelectBranch}
                isLoading={isLoading}
              />
            )}

            {/* 2. Action buttons - Style aligned with BranchSwitcher */}
            {hasVisibleActionButtons && (
              <div className="flex items-center gap-0.5 rounded-full border border-accent/50 bg-accent/30 px-1 py-0.5 transition-all duration-200">
                {/* Copy button */}
                {hasVisibleCopyButton && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCopy}
                        aria-label={
                          copySuccess ? "Message copied" : "Copy message"
                        }
                        className={cn(
                          "h-6 w-6 rounded-full transition-all duration-200",
                          copySuccess
                            ? "hover:bg-success/10 text-success"
                            : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                        )}
                      >
                        {copySuccess ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      className="px-2 py-1 text-[10px]"
                    >
                      <span>{copySuccess ? "Copied!" : "Copy message"}</span>
                    </TooltipContent>
                  </Tooltip>
                )}

                {/* Edit button */}
                {hasVisibleEditButton && (
                  <EditMessage
                    message={message}
                    onEdit={onEdit}
                    showText={false}
                  />
                )}

                {/* Retry button */}
                {hasVisibleRetryButton && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={onRetry}
                        aria-label="Retry generation"
                        className="h-6 w-6 rounded-full text-muted-foreground transition-all duration-200 hover:bg-accent/60 hover:text-foreground"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      className="px-2 py-1 text-[10px]"
                    >
                      <span>Retry generation</span>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            )}
          </div>

          {/* Right Side: Metadata */}
          <div className="flex items-center">
            {hasMetadata && (
              <div className="flex items-center gap-3 px-2">
                {modelName && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <div className="flex cursor-pointer items-center gap-1 text-[10px] font-medium text-muted-foreground/40 transition-colors hover:text-muted-foreground/60">
                        <Cpu className="h-2.5 w-2.5" />
                        <span>{modelName.split("/").pop()}</span>
                      </div>
                    </PopoverTrigger>
                    <PopoverContent
                      side="bottom"
                      className="flex w-fit flex-col gap-1 p-2"
                    >
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-muted-foreground/70">
                          Provider:
                        </span>
                        <span className="text-foreground">
                          {modelProvider || "Unknown"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-muted-foreground/70">
                          Model:
                        </span>
                        <span className="text-foreground">{modelName}</span>
                      </div>
                      {stopReason && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-semibold text-muted-foreground/70">
                            Stop Reason:
                          </span>
                          <span className="text-foreground">{stopReason}</span>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                )}

                {usage && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <div className="flex cursor-pointer items-center gap-1 text-[10px] font-medium text-muted-foreground/40 transition-colors hover:text-muted-foreground/60">
                        <Zap className="h-2.5 w-2.5" />
                        <span>{formatTokenCount(usage.total_tokens || 0)}</span>
                      </div>
                    </PopoverTrigger>
                    <PopoverContent
                      side="bottom"
                      className="flex w-fit flex-col gap-1 p-2"
                    >
                      <div className="flex items-center justify-between gap-4 text-xs">
                        <span className="font-semibold text-muted-foreground/70">
                          Input:
                        </span>
                        <span className="text-foreground">
                          {usage.input_tokens || 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-xs">
                        <span className="font-semibold text-muted-foreground/70">
                          Output:
                        </span>
                        <span className="text-foreground">
                          {usage.output_tokens || 0}
                        </span>
                      </div>
                      <div className="my-1 flex items-center justify-between gap-4 border-t border-muted-foreground/10 pt-1 text-xs">
                        <span className="font-semibold text-muted-foreground/70">
                          Total:
                        </span>
                        <span className="font-medium text-foreground">
                          {usage.total_tokens || 0}
                        </span>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

MessageToolbar.displayName = "MessageToolbar";
