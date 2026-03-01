"use client";

import { BranchSwitcher } from "@/app/components/BranchSwitcher";
import { EditMessage } from "@/app/components/EditMessage";
import { formatTokenCount } from "@/app/utils/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { AIMessage } from "@langchain/langgraph-sdk";
import { Check, Copy, Cpu, RotateCcw, Zap } from "lucide-react";
import React, { useCallback, useState } from "react";

interface MessageToolbarProps {
  // Message content
  messageContent: string;
  isUser: boolean;
  isLoading?: boolean;

  // Copy functionality
  onCopy?: () => void;

  // Edit functionality
  onEdit?: (message: any) => void;
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
  message?: any;
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
    branchOptions = [],
    currentBranchIndex,
    onSelectBranch,
    showBranchSwitcher = false,
    className,
    message,
  }) => {
    const hasContent = messageContent && messageContent.trim() !== "";
    const [copySuccess, setCopySuccess] = useState(false);

    const handleCopy = useCallback(() => {
      if (messageContent && onCopy) {
        onCopy();
      } else if (messageContent) {
        navigator.clipboard
          .writeText(messageContent)
          .then(() => {
            setCopySuccess(true);
            // Reset success state after 2 seconds
            setTimeout(() => setCopySuccess(false), 2000);
          })
          .catch((err) => {
            console.error("Failed to copy message:", err);
          });
      }
    }, [messageContent, onCopy]);

    // Determine what's actually visible
    const hasVisibleCopyButton = hasContent && !isLoading;
    const hasVisibleEditButton = isUser && showEdit && hasContent && !isLoading && onEdit && message;
    const hasVisibleRetryButton = showRetry && !isLoading && onRetry;
    const hasVisibleBranchSwitcher = showBranchSwitcher && onSelectBranch && branchOptions.length > 0;
    
    // Metadata visibility - response_metadata is on BaseMessage, usage_metadata on AIMessage
    const modelName = (message?.response_metadata?.model_name || message?.response_metadata?.model) as string | undefined;
    const modelProvider = message?.response_metadata?.model_provider as string | undefined;
    const stopReason = message?.response_metadata?.stop_reason as string | undefined;
    const usage = message?.type === "ai" ? (message as AIMessage).usage_metadata : undefined;
    const hasMetadata = !isUser && (!!modelName || !!usage);

    const hasAnyVisibleAction = hasVisibleCopyButton || hasVisibleEditButton || hasVisibleRetryButton || hasVisibleBranchSwitcher || hasMetadata;

    // If nothing to show, don't render anything at all
    if (!hasAnyVisibleAction) return null;

    const hasVisibleActionButtons = hasVisibleCopyButton || hasVisibleEditButton || hasVisibleRetryButton;

    return (
      <div className={className}>
        <div
          className={cn(
            "flex items-center justify-between gap-4"
          )}
        >
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
              <div className="flex items-center gap-0.5 px-1 py-0.5 rounded-full bg-accent/30 border border-accent/50 transition-all duration-200">
                {/* Copy button */}
                {hasVisibleCopyButton && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCopy}
                        aria-label={copySuccess ? "Message copied" : "Copy message"}
                        className={cn(
                          "h-6 w-6 rounded-full transition-all duration-200",
                          copySuccess ? "text-success hover:bg-success/10" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                        )}
                      >
                        {copySuccess ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-[10px] px-2 py-1">
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
                    <TooltipContent side="bottom" className="text-[10px] px-2 py-1">
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
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground/40 font-medium cursor-help hover:text-muted-foreground/60 transition-colors">
                        <Cpu className="h-2.5 w-2.5" />
                        <span>{modelName.split("/").pop()}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="flex flex-col gap-1 p-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-primary-foreground/70">Provider:</span>
                        <span>{modelProvider || "Unknown"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-primary-foreground/70">Model:</span>
                        <span>{modelName}</span>
                      </div>
                      {stopReason && (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-primary-foreground/70">Stop Reason:</span>
                          <span>{stopReason}</span>
                        </div>
                      )}
                    </TooltipContent>
                  </Tooltip>
                )}

                {usage && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground/40 font-medium cursor-help hover:text-muted-foreground/60 transition-colors">
                        <Zap className="h-2.5 w-2.5" />
                        <span>{formatTokenCount(usage.total_tokens || 0)}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="flex flex-col gap-1 p-2">
                      <div className="flex items-center gap-4 justify-between">
                        <span className="font-semibold text-primary-foreground/70">Input:</span>
                        <span>{usage.input_tokens || 0}</span>
                      </div>
                      <div className="flex items-center gap-4 justify-between">
                        <span className="font-semibold text-primary-foreground/70">Output:</span>
                        <span>{usage.output_tokens || 0}</span>
                      </div>
                      <div className="border-t border-primary-foreground/10 my-1 pt-1 flex items-center gap-4 justify-between">
                        <span className="font-semibold text-primary-foreground/70">Total:</span>
                        <span>{usage.total_tokens || 0}</span>
                      </div>
                    </TooltipContent>
                  </Tooltip>
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
