"use client";

import { MarkdownContent } from "@/app/components/MarkdownContent";
import { cn } from "@/lib/utils";
import React from "react";

interface MessageContentProps {
  content: string;
  isUser: boolean;
}

export const MessageContent = React.memo<MessageContentProps>(
  ({ content, isUser }) => {
    return (
      <div className={cn("relative flex flex-col gap-2")}>
        <div
          className={cn(
            "mt-4 overflow-hidden break-words text-sm font-normal leading-[150%]",
            isUser
              ? "rounded-xl rounded-br-none border border-border px-3 py-2 text-foreground"
              : "rounded-lg bg-accent/30 px-4 py-3 text-primary"
          )}
          style={
            isUser
              ? { backgroundColor: "var(--color-user-message-bg)" }
              : undefined
          }
        >
          {isUser ? (
            <div className="flex flex-col gap-2">
              <p className="m-0 whitespace-pre-wrap break-words text-sm leading-relaxed">
                {content}
              </p>
            </div>
          ) : (
            <MarkdownContent content={content} />
          )}
        </div>
      </div>
    );
  }
);

MessageContent.displayName = "MessageContent";
