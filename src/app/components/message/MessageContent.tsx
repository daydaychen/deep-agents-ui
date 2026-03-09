"use client";

import { MarkdownContent } from "@/app/components/MarkdownContent";
import { cn } from "@/lib/utils";
import React from "react";

interface MessageContentProps {
  content: string;
  isUser: boolean;
  isStreaming?: boolean;
}

export const MessageContent = React.memo<MessageContentProps>(
  ({ content, isUser, isStreaming }) => {
    return (
      <div className={cn("relative flex flex-col gap-2 group")}>
        <div
          className={cn(
            "mt-0.5 overflow-hidden break-words text-sm font-normal leading-relaxed",
            isUser
              ? "rounded-2xl rounded-tr-none border border-primary/20 bg-user-message px-3 py-2 text-foreground shadow-sm dark:border-primary/30"
              : "rounded-2xl rounded-tl-none bg-accent/30 px-4 py-3 text-primary"
          )}
        >
          {isUser ? (
            <div className="flex flex-col gap-2">
              <p className="m-0 whitespace-pre-wrap break-words leading-relaxed">
                {content}
              </p>
            </div>
          ) : (
            <MarkdownContent content={content} isStreaming={isStreaming} />
          )}
        </div>
      </div>
    );
  }
);

MessageContent.displayName = "MessageContent";
