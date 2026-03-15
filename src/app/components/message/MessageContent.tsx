"use client";

import { MarkdownContent } from "@/app/components/MarkdownContent";
import { cn } from "@/lib/utils";
import React, { useState } from "react";
import { Brain, ChevronDown, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

interface MessageContentProps {
  content: string;
  isUser: boolean;
  isStreaming?: boolean;
  reasoningContent?: string;
}

export const MessageContent = React.memo<MessageContentProps>(
  ({ content, isUser, isStreaming, reasoningContent }) => {
    const t = useTranslations("chat");
    const [isReasoningExpanded, setIsReasoningExpanded] = useState(true);
    return (
      <div className={cn("group relative flex flex-col gap-3")}>
        {!isUser && reasoningContent && (
          <div className="border-primary/10 bg-primary/5 flex flex-col gap-2 overflow-hidden rounded-xl border transition-all duration-200">
            <button
              onClick={() => setIsReasoningExpanded(!isReasoningExpanded)}
              aria-expanded={isReasoningExpanded}
              className="text-primary/90 hover:bg-primary/5 flex items-center gap-2 px-3 py-2 text-xs font-semibold transition-colors"
            >
              {isReasoningExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
              <Brain className="h-3.5 w-3.5" />
              <span>{t("reasoningProcess")}</span>
            </button>

            <div
              className={cn(
                "grid transition-[grid-template-rows,opacity] duration-200 ease-in-out",
                isReasoningExpanded
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0"
              )}
            >
              <div className="overflow-hidden">
                <div className="text-primary/80 border-primary/5 border-t px-3 pb-3 pt-1 text-sm italic leading-relaxed">
                  <MarkdownContent
                    content={reasoningContent}
                    isStreaming={isStreaming}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <div
          className={cn(
            "mt-0.5 overflow-hidden break-words text-sm font-normal leading-relaxed",
            isUser
              ? "border-primary/20 dark:border-primary/30 rounded-2xl rounded-tr-none border bg-user-message px-3 py-2 text-foreground shadow-sm"
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
            <MarkdownContent
              content={content}
              isStreaming={isStreaming}
            />
          )}
        </div>
      </div>
    );
  }
);

MessageContent.displayName = "MessageContent";
