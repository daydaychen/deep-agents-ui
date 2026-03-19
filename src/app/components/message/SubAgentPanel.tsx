"use client";

import React, { useEffect, useRef, useMemo } from "react";
import { Message } from "@langchain/langgraph-sdk";
import { MessageContent } from "./MessageContent";
import { ToolCallBox } from "@/app/components/ToolCallBox";
import { useProcessedMessages } from "@/app/hooks/chat/useProcessedMessages";
import { extractStringFromMessageContent } from "@/app/utils/utils";
import { X, Loader2, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { SubAgent } from "@/app/types/types";

interface SubAgentPanelProps {
  subAgentId: string | null;
  subAgents: SubAgent[];
  subagentMessagesMap: Map<string, Message[]>;
  onClose: () => void;
}

const EMPTY_MESSAGES: Message[] = [];

export const SubAgentPanel = React.memo<SubAgentPanelProps>(
  ({ subAgentId, subAgents, subagentMessagesMap, onClose }) => {
    const bottomRef = useRef<HTMLDivElement>(null);

    const subAgent = useMemo(
      () => subAgents.find((s) => s.id === subAgentId),
      [subAgents, subAgentId]
    );

    // Robust message lookup with memoization to stabilize reference
    const rawMessages = useMemo(() => {
      if (!subAgentId) return EMPTY_MESSAGES;
      const fromMap = subagentMessagesMap.get(subAgentId);
      if (fromMap) return fromMap;
      if (subAgent?.agentName) {
        const fromAgentName = subagentMessagesMap.get(subAgent.agentName);
        if (fromAgentName) return fromAgentName;
      }
      return EMPTY_MESSAGES;
    }, [subAgentId, subagentMessagesMap, subAgent?.agentName]);

    // Use the hook to process subagent messages and extract tool calls
    const processedMessages = useProcessedMessages(rawMessages, undefined);

    const status = subAgent?.status || "pending";
    const name = subAgent?.agentName || subAgent?.subAgentName || "Subagent";

    // Auto-scroll to bottom when new messages or tool calls arrive
    useEffect(() => {
      if (processedMessages.length > 0) {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }, [processedMessages.length]);

    if (!subAgentId) return null;

    return (
      <div
        role="complementary"
        aria-label={`${name} details`}
        className="flex h-full w-full min-w-0 flex-col overflow-hidden bg-background"
      >
        {/* Panel Header - Fixed Height */}
        <div className="flex min-w-0 shrink-0 items-center justify-between border-b border-border/50 px-5 py-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-[0.5px] shadow-sm transition-all !dark:border-transparent",
                status === "active"
                  ? "bg-[color:color-mix(in_srgb,var(--color-primary),transparent_93%)] border-[color:color-mix(in_srgb,var(--color-primary),transparent_70%)] text-[var(--color-primary)] motion-safe:animate-pulse"
                  : "border-border bg-muted/50 text-muted-foreground"
              )}
            >
              {status === "active" ? (
                <div className="animate-spin">
                  <Loader2 className="h-4 w-4" />
                </div>
              ) : (
                <Terminal className="h-4 w-4" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="mb-1 text-sm font-bold uppercase leading-none tracking-[0.2em] text-foreground/80">
                {name}
              </h3>
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "h-1.5 w-1.5 shrink-0 rounded-full",
                    status === "active"
                      ? "animate-pulse bg-[var(--color-primary)]"
                      : status === "completed"
                      ? "bg-[var(--color-success)]"
                      : status === "error"
                      ? "bg-destructive"
                      : "bg-muted-foreground/30"
                  )}
                />
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 transition-colors">
                  {status === "active" ? "Processing…" : status}
                </span>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="ml-2 h-8 w-8 shrink-0 rounded-full hover:bg-muted"
            aria-label="Close panel"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Content Stream - Scrollable Area */}
        <div className="relative min-h-0 w-full flex-1 overflow-hidden">
          <ScrollArea className="h-full w-full rounded-[inherit]">
            <div className="flex w-full min-w-0 flex-col gap-8 overflow-hidden p-4 pb-20 md:p-6">
              {processedMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-4 py-20 text-center opacity-40">
                  <Terminal
                    size={32}
                    className="mb-4 text-muted-foreground/30"
                  />
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Waiting for activity…
                  </p>
                </div>
              ) : (
                processedMessages.map((data, idx) => {
                  const isUser = data.message.type === "human";
                  const messageContent = extractStringFromMessageContent(
                    data.message
                  );
                  const hasContent =
                    messageContent && messageContent.trim() !== "";
                  const hasToolCalls = data.toolCalls.length > 0;

                  return (
                    <div
                      key={data.message.id || `proc-msg-${idx}`}
                      className="flex w-full min-w-0 flex-col gap-3 overflow-hidden"
                    >
                      {/* Message Header Label */}
                      <div className="flex shrink-0 items-center gap-2 px-1">
                        <div
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            isUser ? "bg-primary/40" : "bg-blue-500/40"
                          )}
                        />
                        <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground/40">
                          {isUser ? "Instruction" : "Action Trace"}
                        </div>
                      </div>

                      <div className="ml-1 flex min-w-0 flex-1 flex-col gap-4 overflow-hidden border-l border-border/40 pl-3.5 pr-1.5 transition-colors hover:border-border/80">
                        {/* Text Content */}
                        {hasContent && (
                          <div className="min-w-0 overflow-hidden">
                            <MessageContent
                              content={messageContent}
                              isUser={isUser}
                            />
                          </div>
                        )}

                        {/* Tool Calls */}
                        {hasToolCalls && (
                          <div className="flex min-w-0 flex-col gap-3 overflow-hidden">
                            {data.toolCalls.map((toolCall) => (
                              <ToolCallBox
                                key={toolCall.id}
                                toolCall={toolCall}
                                isLoading={false}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div
                ref={bottomRef}
                className="h-px w-full shrink-0"
              />
            </div>
          </ScrollArea>
        </div>

        {/* Panel Footer - Fixed Height */}
        <div className="shrink-0 border-t border-border/30 bg-muted/5 p-2.5">
          <div className="flex items-center justify-center gap-2 opacity-30">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-muted-foreground/40 to-transparent" />
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground">
              Internal Agent Execution Trace
            </p>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-muted-foreground/40 to-transparent" />
          </div>
        </div>
      </div>
    );
  }
);

SubAgentPanel.displayName = "SubAgentPanel";
