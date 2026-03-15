"use client";

import { MarkdownContent } from "@/app/components/MarkdownContent";
import { cn } from "@/lib/utils";
import React, { useState } from "react";
import { Brain, ChevronDown, ChevronRight } from "lucide-react";

interface MessageContentProps {
  content: string;
  isUser: boolean;
  isStreaming?: boolean;
  reasoningContent?: string;
}

export const MessageContent = React.memo<MessageContentProps>(
  ({ content, isUser, isStreaming, reasoningContent }) => {
    const [isReasoningExpanded, setIsReasoningExpanded] = useState(true);
    return (
      <div className={cn("relative flex flex-col gap-3 group")}>
        {!isUser && reasoningContent && (
          <div className="flex flex-col gap-2 overflow-hidden rounded-xl border border-primary/10 bg-primary/5 transition-all duration-300">
            <button
              onClick={() => setIsReasoningExpanded(!isReasoningExpanded)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-primary/70 hover:bg-primary/5 transition-colors"
            >
              {isReasoningExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
              <Brain className="h-3.5 w-3.5" />
              <span>思考过程</span>
            </button>
            
            <div 
              className={cn(
                "grid transition-[grid-template-rows,opacity] duration-300 ease-in-out",
                isReasoningExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              )}
            >
              <div className="overflow-hidden">
                <div className="px-3 pb-3 pt-1 text-sm text-primary/60 italic leading-relaxed border-t border-primary/5">
                  <MarkdownContent content={reasoningContent} isStreaming={isStreaming} />
                </div>
              </div>
            </div>
          </div>
        )}

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
