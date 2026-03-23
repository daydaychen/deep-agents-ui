"use client";

import { Brain, ChevronDown, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import React, { useState } from "react";
import { MarkdownContent } from "@/app/components/MarkdownContent";
import { cn } from "@/lib/utils";

interface MessageContentProps {
  content: string;
  isUser: boolean;
  isStreaming?: boolean;
  reasoningContent?: string;
}

export const MessageContent = React.memo<MessageContentProps>(
  ({ content, isUser, isStreaming, reasoningContent }) => {
    const t = useTranslations("chat");
    const [isReasoningExpanded, setIsReasoningExpanded] = useState(false);

    return (
      <div className={cn("group relative flex flex-col gap-3")}>
        {!isUser && reasoningContent && (
          <div className="border-border/40 bg-muted/20 flex flex-col gap-2 overflow-hidden rounded-lg border transition-all duration-200">
            <button
              type="button"
              onClick={() => setIsReasoningExpanded(!isReasoningExpanded)}
              aria-expanded={isReasoningExpanded}
              className="text-muted-foreground hover:bg-muted/30 flex items-center gap-2 px-3 py-1.5 text-xs font-medium transition-colors"
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
                isReasoningExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden">
                <div className="text-muted-foreground border-border/20 border-t px-3 pb-3 pt-2 text-sm italic leading-relaxed">
                  <MarkdownContent
                    content={reasoningContent}
                    isStreaming={isStreaming}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {content && content.trim() !== "" && (
          <div
            className={cn(
              "mt-0.5 break-words text-[15px] font-normal leading-relaxed text-foreground",
            )}
          >
            {isUser ? (
              <div className="flex flex-col gap-2">
                <p className="m-0 whitespace-pre-wrap break-words leading-relaxed text-[15px]">
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
        )}
      </div>
    );
  },
);

MessageContent.displayName = "MessageContent";
