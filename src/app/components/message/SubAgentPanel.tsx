"use client";

import { Message } from "@langchain/langgraph-sdk";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Loader2, Terminal } from "lucide-react";
import React, { useEffect, useMemo, useRef } from "react";
import { ToolCallBox } from "@/app/components/ToolCallBox";
import { useProcessedMessages } from "@/app/hooks/chat/useProcessedMessages";
import { SubAgent } from "@/app/types/types";
import { extractStringFromMessageContent } from "@/app/utils/utils";
import { cn } from "@/lib/utils";
import { MessageContent } from "./MessageContent";

interface SubAgentPanelProps {
  subAgentId: string | null;
  subAgents: SubAgent[];
  subagentMessagesMap: Map<string, Message[]>;
  onClose: () => void;
}

const EMPTY_MESSAGES: Message[] = [];

export const SubAgentPanel = React.memo<SubAgentPanelProps>(
  ({ subAgentId, subAgents, subagentMessagesMap }) => {
    const parentRef = useRef<HTMLDivElement>(null);

    const subAgent = useMemo(
      () => subAgents.find((s) => s.id === subAgentId),
      [subAgents, subAgentId],
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

    const virtualizer = useVirtualizer({
      count: processedMessages.length,
      getScrollElement: () => parentRef.current,
      estimateSize: () => 100,
      overscan: 3,
    });

    const status = subAgent?.status || "pending";
    const name = subAgent?.agentName || subAgent?.subAgentName || "Subagent";

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
      if (processedMessages.length > 0 && parentRef.current) {
        requestAnimationFrame(() => {
          if (parentRef.current) {
            parentRef.current.scrollTop = parentRef.current.scrollHeight;
          }
        });
      }
    }, [processedMessages.length]);

    if (!subAgentId) return null;

    return (
      <aside
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
                  : "border-border bg-muted/50 text-muted-foreground",
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
                          : "bg-muted-foreground/30",
                  )}
                />
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 transition-colors">
                  {status === "active" ? "Processing…" : status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Stream - Scrollable Area */}
        <div
          ref={parentRef}
          className="scrollbar-pretty relative min-h-0 w-full flex-1 overflow-y-auto overflow-x-hidden"
        >
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
            <div
              style={{
                height: virtualizer.getTotalSize(),
                width: "100%",
                position: "relative",
              }}
            >
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const idx = virtualRow.index;
                const data = processedMessages[idx];
                const isUser = data.message.type === "human";
                const messageContent = extractStringFromMessageContent(data.message);
                const hasContent = messageContent && messageContent.trim() !== "";
                const hasToolCalls = data.toolCalls.length > 0;

                return (
                  <div
                    key={data.message.id || `proc-msg-${idx}`}
                    data-index={idx}
                    ref={virtualizer.measureElement}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <div className="p-4 pb-0 md:px-6">
                      <div className="flex w-full min-w-0 flex-col gap-3 overflow-hidden">
                        {/* Message Header Label */}
                        <div className="flex shrink-0 items-center gap-2 px-1">
                          <div
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              isUser ? "bg-primary/40" : "bg-blue-500/40",
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
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
      </aside>
    );
  },
);

SubAgentPanel.displayName = "SubAgentPanel";
