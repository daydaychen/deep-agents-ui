"use client";

import { BranchSwitcher } from "@/app/components/BranchSwitcher";
import { EditMessage } from "@/app/components/EditMessage";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, Copy, RotateCcw } from "lucide-react";
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

    // Check if we have any visible actions (for showing placeholder when none exist)
    const hasVisibleCopyButton = hasContent && !isLoading;
    const hasVisibleEditButton =
      isUser && showEdit && hasContent && !isLoading && onEdit && message;
    const hasVisibleRetryButton = showRetry && !isLoading && onRetry;
    const hasAnyVisibleAction =
      hasVisibleCopyButton || hasVisibleEditButton || hasVisibleRetryButton;

    return (
      <div className={className}>
        <div
          className={cn(
            "flex items-center gap-2",
            isUser ? "flex-row-reverse justify-between" : "justify-between"
          )}
        >
          {/* Action buttons - order depends on message type */}
          <div
            className={cn(
              "flex items-center gap-1",
              isUser && "flex-row-reverse"
            )}
          >
            {!hasAnyVisibleAction && (
              <Button
                variant="ghost"
                size="sm"
                disabled
                className="h-7 gap-1 px-2 text-xs opacity-0"
                aria-hidden="true"
              ></Button>
            )}

            {/* Copy button - always visible for messages with content */}
            {hasContent && !isLoading && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className={`group h-7 gap-1 px-2 text-xs transition-all duration-200 hover:bg-accent/50 ${
                  copySuccess
                    ? "text-success hover:text-success"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title={copySuccess ? "Copied!" : "Copy message"}
              >
                {copySuccess ? (
                  <Check className="h-3 w-3 transition-transform duration-200 group-hover:scale-110" />
                ) : (
                  <Copy className="h-3 w-3 transition-transform duration-200 group-hover:scale-110" />
                )}
                <span className="transition-all duration-200">
                  {copySuccess ? "Copied" : "Copy"}
                </span>
              </Button>
            )}

            {/* Edit button - only visible for user messages when editing is enabled */}
            {isUser &&
              showEdit &&
              hasContent &&
              !isLoading &&
              onEdit &&
              message && (
                <EditMessage
                  message={message}
                  onEdit={onEdit}
                  className="self-start"
                />
              )}

            {/* Retry button - only visible when retry is available */}
            {showRetry && !isLoading && onRetry && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRetry}
                className="group h-7 gap-1 px-2 text-xs text-muted-foreground transition-all duration-200 hover:bg-accent/50 hover:text-foreground"
                title="Retry from this message"
              >
                <RotateCcw className="h-3 w-3 transition-transform duration-200 group-hover:scale-110" />
                <span className="transition-all duration-200">Retry</span>
              </Button>
            )}
          </div>

          {/* Branch switcher - only show when multiple branches exist */}
          {showBranchSwitcher && onSelectBranch && branchOptions.length > 1 && (
            <BranchSwitcher
              branchOptions={branchOptions}
              currentIndex={currentBranchIndex}
              onSelect={onSelectBranch}
              className={cn("ml-2", isUser && "ml-0 mr-2")}
            />
          )}
        </div>
      </div>
    );
  }
);

MessageToolbar.displayName = "MessageToolbar";
